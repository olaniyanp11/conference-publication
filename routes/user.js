const express = require("express");
const router = express.Router();
const Paper = require('../models/Paper');
const upload = require("../middlewares/config"); // multer config
const fs = require('fs');
const path = require('path');

// Render submit form
router.get('/submit-paper', (req, res) => {
  res.render('protected/submit-paper', { title: 'Submit Paper', user: req.user });
});

router.post(
  '/submit-paper',
  upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { title, abstract, authorName, keywords, year } = req.body;

      // ✅ required paper file
      const fileUrl = `/uploads/${req.files['pdf'][0].filename}`;

      // ✅ optional cover file
      let coverUrl = '/uploads/covers/default-cover.png';
      if (req.files['cover']) {
        coverUrl = `/uploads/covers/${req.files['cover'][0].filename}`;
      }

      const paper = new Paper({
        title,
        abstract,
        authorName,
        keywords: keywords.split(',').map(k => k.trim()),
        year,
        fileUrl,
        coverUrl,
        uploadedBy: req.user._id
      });

      await paper.save();
      req.flash('success', 'Paper submitted successfully!');
      res.redirect('/my-submissions');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Something went wrong.');
      res.redirect('/user/submit-paper');
    }
  }
);

// My submissions
router.get('/my-submissions', async (req, res) => {
  try {
    const papers = await Paper.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    res.render('protected/my-submissions', {
      title: 'My Submissions',
      papers,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Unable to fetch submissions.');
    res.redirect('/');
  }
});

// View single paper
router.get('/view/:id', async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper || paper.uploadedBy.toString() !== req.user._id.toString()) {
      req.flash('error', 'Unauthorized or not found.');
      return res.redirect('/my-submissions');
    }

    res.render('protected/view-paper', {
      title: 'View Paper',
      paper,
      user: req.user
    });
  } catch (error) {
    req.flash('error', 'Error Getting Submissions');
    return res.redirect('/my-submissions');
  }
});

// All approved papers
router.get('/papers', async (req, res) => {
  try {
    const papers = await Paper.find({ status: 'approved' }).sort({ createdAt: -1 });
    res.render('protected/all-papers', {
      title: 'All Papers',
      papers,
      user: req.user
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load papers.');
    res.redirect('/');
  }
});

// Accepted papers (for logged-in user)
router.get('/accepted', async (req, res) => {
  try {
    const papers = await Paper.find({
      uploadedBy: req.user._id,
      status: 'approved'
    }).sort({ createdAt: -1 });

    res.render('protected/accepted', {
      title: 'Accepted Papers',
      papers,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not fetch accepted papers.');
    res.redirect('/user/dashboard');
  }
});

// ✅ Update paper (replace pdf + optional cover)

module.exports = router;
