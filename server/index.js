const express    = require('express');
const cors       = require('cors');
require('dotenv').config();

const connectDB = require('./db');
connectDB();

const app = express();


// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // allow large text payloads from the frontend


// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Text-Aid server is up',
    version: '1.0.0'
  });
});


// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/upload',    require('./routes/upload'));
app.use('/api/quiz',      require('./routes/quiz'));
app.use('/api/audio',     require('./routes/audio'));
app.use('/api/chat',      require('./routes/chat'));


// ─── 404 Handler (unknown routes) ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`
  });
});


// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('\n❌ Unhandled error:', err.message);
  res.status(500).json({
    error: err.message || 'An unexpected error occurred'
  });
});


// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n✅ Text-Aid server is running');
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log('\n   Routes ready:');
  console.log('   POST  /api/upload  — upload and process a PDF');
  console.log('   POST  /api/quiz    — generate quiz questions for a chunk');
  console.log('\n   Coming soon:');
  console.log('   POST  /api/audio   — generate ElevenLabs audio for a chunk');
  console.log('   POST  /api/chat    — AI reading assistant');
  console.log('\n─────────────────────────────────────────────────────');
});