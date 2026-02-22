const express     = require('express');
const router      = express.Router();
const path        = require('path');
const fs          = require('fs');
const verifyToken = require('../middleware/auth');
const Document    = require('../models/Document');

// ─── GET /api/documents — list user's saved books ─────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.userId })
      .select('-chapters')          // don't send full chapter data in the list view
      .sort({ uploadedAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ─── GET /api/documents/:id — full book with all chapter/chunk data ────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// ─── GET /api/documents/:id/pdf — download the original PDF ──────────────────
router.get('/:id/pdf', verifyToken, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!doc.pdfPath || !fs.existsSync(doc.pdfPath))
      return res.status(404).json({ error: 'PDF file not found on disk' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
    fs.createReadStream(doc.pdfPath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download PDF' });
  }
});

// ─── DELETE /api/documents/:id ────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Also remove the PDF file from disk
    if (doc.pdfPath && fs.existsSync(doc.pdfPath)) {
      fs.unlinkSync(doc.pdfPath);
    }

    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
