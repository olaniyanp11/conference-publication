const express = require("express")
const router =express.Router();
const Paper = require('../models/Paper')
const upload = require("../middlewares/config")

router.get('/submit-paper',  (req, res) => {
  res.render('protected/submit-paper', { title: 'Submit Paper', user: req.user });
});

// POST form
router.post('/submit-paper',  upload.single('pdf'), async (req, res) => {
  try {
    const { title, abstract, authorName, keywords, year } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;

    const paper = new Paper({
      title,
      abstract,
      authorName,
      keywords: keywords.split(',').map(k => k.trim()),
      year,
      fileUrl,
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
});

router.get('/my-submissions', async (req, res) => {
  try {
    const papers = await Paper.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    console.log(papers)
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
router.get('/view/:id',  async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    console.log(paper)
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
          req.flash('error', 'Error Getting Submssions ');
      return res.redirect('/my-submissions');
  }
});
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


module.exports = router