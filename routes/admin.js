// routes/admin.js
const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const User = require('../models/User');

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

module.exports = router