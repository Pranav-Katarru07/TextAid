const mongoose = require('mongoose');

// Stores the processed book returned by /api/upload, linked to a user.
const documentSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename:    { type: String, required: true },   // original PDF file name
  title:       { type: String, default: '' },
  author:      { type: String, default: '' },
  contentType: { type: String, enum: ['fiction', 'nonfiction'], default: 'nonfiction' },
  voice:       { type: String, default: 'rachel' },
  totalChapters: Number,
  totalChunks:   Number,
  chapters:    { type: Array, default: [] },       // full processed chapter/chunk data
  pdfPath:     { type: String, default: null },    // path to the stored PDF on disk
  uploadedAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('Document', documentSchema);
