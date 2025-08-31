// routes/admin.js
const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const User = require('../models/User');
const upload = require("../middlewares/config"); // multer config
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken')

// GET /admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [total, approved, pending] = await Promise.all([
      Paper.countDocuments(),
      Paper.countDocuments({ status: 'approved' }),
      Paper.countDocuments({ status: 'pending' })
    ]);

    const papers = await Paper.find().sort({ createdAt: -1 }).limit(5); // recent 5

    res.render('protected/admin/dashboard', {
      title: 'Admin Dashboard',
      papers,
      total,
      approved,
      pending,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load dashboard.');
    res.redirect('/');
  }
});

router.get('/approved',  async (req, res) => {
  const papers = await Paper.find({ status: 'approved' }).sort({ createdAt: -1 });
  res.render('protected/admin/approve', { title: 'Approved Papers', papers, user: req.user });
});
router.get('/pending',  async (req, res) => {
  const papers = await Paper.find({ status: 'pending' }).sort({ createdAt: -1 });
  res.render('protected/admin/pending', { title: 'Pending Papers', papers, user: req.user });
});
router.post('/delete-user/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  req.flash('success', 'User deleted.');
  res.redirect('/admin/users');
});
router.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.render('protected/admin/users', { title: 'Manage Users', users, user: req.user });
});

router.post('/approve/:id',  async (req, res) => {
  try {
    await Paper.findByIdAndUpdate(req.params.id, { status: 'approved' });
    req.flash('success', 'Paper approved successfully.');
    res.redirect('/admin/dashboard'); // or redirect back to the referring page
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to approve paper.');
    res.redirect('/admin/dashboard');
  }
});
router.post('/reject/:id',  async (req, res) => {
  try {
    await Paper.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    req.flash('success', 'Paper rejected successfully.');
    res.redirect('/admin/dashboard'); // or redirect back to the referring page
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to approve paper.');
    res.redirect('/admin/dashboard');
  }
});


router.post('/update-paper/:id', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) {
      req.flash('error', 'Paper not found.');
      return res.redirect('/admin/dashboard');
    }

    // --- Replace PDF if uploaded
    if (req.files['pdf']) {
      // delete old file if exists
      if (paper.fileUrl) {
        const oldPdf = path.join(__dirname, '..', paper.fileUrl);
        if (fs.existsSync(oldPdf)) fs.unlinkSync(oldPdf);
      }
      paper.fileUrl = `/uploads/${req.files['pdf'][0].filename}`;
    }

    // --- Replace Cover if uploaded
    if (req.files['cover']) {
      if (paper.coverUrl && paper.coverUrl !== '/uploads/covers/default-cover.png') {
        const oldCover = path.join(__dirname, '..', paper.coverUrl);
        if (fs.existsSync(oldCover)) fs.unlinkSync(oldCover);
      }
      paper.coverUrl = `/uploads/${req.files['cover'][0].filename}`;
    }

    // set back to pending (so it can be re-approved after update)
    paper.statusUpdatedAt = new Date();

    await paper.save();

    req.flash('success', 'Paper updated successfully and set to pending.');
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update paper.');
    res.redirect('/admin/dashboard');
  }
});// GET /papers/all/:year?  → show all papers per year (any status)

router.get('/papers/all', async (req, res) => {
  try {
    let year = new Date().getFullYear();
    const query = {};

    if (req.query.q) {
      const q = req.query.q.trim();

      // If query looks like a 4-digit year, treat it as year
      if (/^\d{4}$/.test(q)) {
        year = q;
        query.year = year;
      } else {
        // Otherwise, search across title, author, and keywords
        const regex = new RegExp(q, 'i'); // case-insensitive
        query.$or = [
          { title: regex },
          { authorName: regex },
          { keywords: regex }
        ];
      }
    } else {
      // Default: filter by current year
      query.year = year;
    }

    const papers = await Paper.find(query).sort({ createdAt: -1 });

    res.render('protected/admin/all-papers', {
      title: `All Papers${req.query.q ? ` - ${req.query.q}` : ` - ${year}`}`,
      papers,
      user: req.user,
      year,
      q: req.query.q || ''
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load papers.');
    res.redirect('/');
  }
});

// Approve all papers for a specific year
router.post('/papers/approve-all/:year', async (req, res) => {
  try {
    let year = req.params.year;

    // validate year (must be 4 digits)
    if (!/^\d{4}$/.test(year)) {
      req.flash('error', 'Invalid year provided.');
      return res.redirect('/admin/papers/all');
    }

    const result = await Paper.updateMany(
      { year, status: { $ne: 'approved' } }, // only update non-approved
      { $set: { status: 'approved' } }
    );

    req.flash('success', `Approved ${result.modifiedCount} papers for ${year}.`);
    res.redirect(`/admin/papers/all/${year}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to approve papers.');
    res.redirect('/admin/papers/all');
  }
});

module.exports = router