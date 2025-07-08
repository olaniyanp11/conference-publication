// models/Paper.js
const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  title: String,
  abstract: String,
  authorName: String,
  keywords: [String],
  year: Number,
  fileUrl: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Paper', paperSchema);
