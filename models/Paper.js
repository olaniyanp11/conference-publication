const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  abstract: { type: String, required: true },
  authors: [{ type: String, required: true }],
  keywords: [{ type: String, index: true }],
  year: { type: Number, required: true },
  fileUrl: { type: String, required: true },
  coverUrl: {
    type: String,
    default: '/uploads/covers/default-cover.png' // 👈 default image path
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  statusUpdatedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Paper', paperSchema);
