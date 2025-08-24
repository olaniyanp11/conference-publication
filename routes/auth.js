const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/checkLog');
const getUser = require('../middlewares/getUser');
const Paper = require('../models/Paper');

// Pages
router.get('/', getUser, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Get all approved papers for current year
    let papers = await Paper.find({ status: 'approved', year: currentYear })
      .sort({ createdAt: -1 });

    // If no papers this year, fallback to all approved (sorted by latest uploads)
    if (papers.length === 0) {
      papers = await Paper.find({ status: 'approved' })
        .sort({ createdAt: -1 });
    }

    res.render('index', { 
      title: 'Home', 
      user: req.user, 
      papers 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.get('/register',getUser, (req, res) => {
    res.render('register', { title: 'Register', user: req.user });
});

router.get('/login',getUser, (req, res) => {
    res.render('login', { title: 'Login', user: req.user });
});

// POST /register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email already exists.');
            return res.redirect('/register');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long.');
            return res.redirect('/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        req.flash('success', 'Account created successfully. Please login.');
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while registering.');
        res.redirect('/register');
    }
});

// POST /login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const token = jsonwebtoken.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        if (user.role === "admin"){
        req.flash('success', 'Welcome back!');
        return res.redirect('/admin/dashboard'); 
        }
        req.flash('success', 'Welcome back!');
        return res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while logging in.');
        res.redirect('/login');
    }
});

// GET /dashboard
router.get(['/dashboard','/user/dashboard'],authenticateToken, getUser, async (req, res) => {
  try {
    const userId = req.user._id;

    const [total, approved, pending, rejected] = await Promise.all([
      Paper.countDocuments({ uploadedBy: userId }),
      Paper.countDocuments({ uploadedBy: userId, status: 'approved' }),
      Paper.countDocuments({ uploadedBy: userId, status: 'pending' }),
      Paper.countDocuments({ uploadedBy: userId, status: 'rejected' })
    ]);

    const papers = await Paper.find({ uploadedBy: userId }).sort({ createdAt: -1 }).limit(5);

    res.render('protected/dashboard', {
      title: 'My Dashboard',
      user: req.user,
      papers,
      total,
      approved,
      pending,
      rejected
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load dashboard.');
    res.redirect('/');
  }
});

// GET /logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.flash('success', 'You have logged out.');
    res.redirect('/login');
});

router.get('/papers', async (req, res) => {
  try {
    const papers = await Paper.find({ status: 'approved' }).sort({ createdAt: -1 });
    const token = req.cookies.token;
  let user = null;

  if (!token) {
    user = null;
    return res.render('protected/all-papers', {
      title: 'All Papers',
      papers,
      user: user
    });
  }
    const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    user = await User.findById(decoded.userId);
    if (!user) {
      user = null;
    return res.render('protected/all-papers', {
      title: 'All Papers',
      papers,
      user: user
    });
    }
    return res.render('protected/all-papers', {
      title: 'All Papers',
      papers,
      user: user
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load papers.');
   return res.redirect('/');
  }
});
// GET /papers/search?q=...
router.get('/papers/search', async (req, res) => {
  const q = req.query.q;
  const regex = { $regex: q, $options: 'i' };

  try {
    const conditions = [
      { title: regex },
      { authorName: regex },
      { keywords: regex }
    ];

    // Only add year search if q is a valid number
    const year = parseInt(q);
    if (!isNaN(year)) {
      conditions.push({ year });
    }

    const papers = await Paper.find({
      status: 'approved',
      $or: conditions
    });

    res.render('protected/all-papers', {
      title: 'Search Results',
      papers,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Search failed.');
    res.redirect('/papers');
  }
});
router.get('/view/:id', authenticateToken, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);

    if (!paper) {
      req.flash('error', 'Paper not found.');
      return res.redirect('/papers');
    }

    // Only show approved papers OR papers uploaded by the current user OR admin
    const isUploader = paper.uploadedBy.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (paper.status !== 'approved' && !isUploader && !isAdmin) {
      req.flash('error', 'Unauthorized to view this paper.');
      return res.redirect('/papers');
    }

    res.render('protected/view-paper', {
      title: paper.title,
      paper,
      user: req.user
    });

  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/papers');
  }
});
module.exports = router;
