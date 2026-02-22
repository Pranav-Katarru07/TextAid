const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Cache Setup ──────────────────────────────────────────────────────────────
// Audio files are saved here so the same chunk is never generated twice
const CACHE_DIR = path.join(__dirname, '..', 'cache', 'audio');

// Create the cache folder if it doesn't exist yet
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log('📁 Audio cache folder created at', CACHE_DIR);
}


// ─── Available Voices ─────────────────────────────────────────────────────────
// These are ElevenLabs voice IDs. The user picks one on the upload form.
// You can find more voice IDs at elevenlabs.io/voice-library
const VOICES = {
  rachel:    '21m00Tcm4TlvDq8ikWAM',   // Warm, clear — good for non-fiction
  callum:    'N2lVS1w4EtoT3dr4eOWO',   // Deep, measured — good for textbooks
  charlotte: 'XB0fDUnXU5powFXDhCwa',   // Expressive — good for fiction
  daniel:    'onwK4e9ZLuTAKqWW03F9',   // Authoritative — good for academic
};

const DEFAULT_VOICE = 'rachel';


// ─── Helper: Generate a cache key for a chunk + voice combination ─────────────
// If the text and voice are the same, the cache key will be the same
// so we never call ElevenLabs twice for identical audio
function getCacheKey(text, voiceId) {
  return crypto
    .createHash('md5')
    .update(`${voiceId}:${text}`)
    .digest('hex');
}


// ─── Helper: Get the full file path for a cache key ──────────────────────────
function getCachePath(cacheKey) {
  return path.join(CACHE_DIR, `${cacheKey}.mp3`);
}


// ─── Helper: Check if audio is already cached ─────────────────────────────────
function isCached(cacheKey) {
  return fs.existsSync(getCachePath(cacheKey));
}


// ─── Helper: Stream cached audio file to the response ────────────────────────
function streamFromCache(cacheKey, res) {
  const filePath = getCachePath(cacheKey);
  const stat = fs.statSync(filePath);

  res.set({
    'Content-Type': 'audio/mpeg',
    'Content-Length': stat.size,
    'X-Cache': 'HIT',              // lets you see in DevTools whether cache was used
    'Cache-Control': 'no-store'
  });

  const readStream = fs.createReadStream(filePath);

  readStream.on('error', (err) => {
    console.error('  ❌ Error reading cached file:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream cached audio' });
    }
  });

  readStream.pipe(res);
}


// ─── Helper: Fetch audio from ElevenLabs, cache it, and stream it ─────────────
async function streamFromElevenLabs(text, voiceId, cacheKey, res) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

  const elevenLabsResponse = await axios.post(
    url,
    {
      text,
      model_id: 'eleven_turbo_v2',    // fastest model — lowest latency
      voice_settings: {
        stability: 0.5,               // 0 = more expressive, 1 = more consistent
        similarity_boost: 0.75,       // how closely to match the original voice
        style: 0.0,
        use_speaker_boost: true
      }
    },
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      responseType: 'stream',         // stream the response instead of buffering it
      timeout: 30000                  // 30 second timeout
    }
  );

  // Set response headers before piping
  res.set({
    'Content-Type': 'audio/mpeg',
    'X-Cache': 'MISS',
    'Cache-Control': 'no-store'
  });

  // Write to cache file at the same time as streaming to frontend
  // This way the user hears audio immediately AND we save it for next time
  const cacheWriteStream = fs.createWriteStream(getCachePath(cacheKey));

  elevenLabsResponse.data.on('error', (err) => {
    console.error('  ❌ ElevenLabs stream error:', err.message);
    cacheWriteStream.destroy();

    // Delete incomplete cache file so we don't serve corrupt audio next time
    const cachePath = getCachePath(cacheKey);
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }

    if (!res.headersSent) {
      res.status(500).json({ error: 'Audio stream interrupted' });
    }
  });

  cacheWriteStream.on('error', (err) => {
    // Cache write failing is non-fatal — audio still plays, just won't be cached
    console.warn('  ⚠️  Failed to write audio to cache:', err.message);
  });

  // Pipe to both the frontend response and the cache file simultaneously
  elevenLabsResponse.data.pipe(res);
  elevenLabsResponse.data.pipe(cacheWriteStream);
}


// ─── Route: POST /api/audio ───────────────────────────────────────────────────
//
// Expected request body:
// {
//   "text": "The full text of the chunk to be read aloud...",
//   "voice": "rachel"     (optional — defaults to rachel)
// }
//
// Response: streams audio/mpeg directly
// Headers include X-Cache: HIT or MISS so you can see in DevTools

router.post('/', async (req, res) => {
  try {
    const { text, voice } = req.body;

    // ── Validate request ──────────────────────────────────────────────────
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or empty text' });
    }

    // ElevenLabs has a per-request character limit of 5000 on turbo
    if (text.length > 5000) {
      return res.status(400).json({
        error: `Text is too long (${text.length} chars). Maximum is 5000 characters per request. Split into smaller chunks.`
      });
    }

    // Resolve the voice ID — fall back to default if unknown voice name sent
    const voiceName = voice && VOICES[voice] ? voice : DEFAULT_VOICE;
    const voiceId = VOICES[voiceName];

    // ── Check cache ───────────────────────────────────────────────────────
    const cacheKey = getCacheKey(text, voiceId);

    if (isCached(cacheKey)) {
      console.log(`\n🎧 Audio request for cached chunk — streaming from disk`);
      console.log(`   Voice: ${voiceName} | Cache: HIT`);
      streamFromCache(cacheKey, res);
      return;
    }

    // ── Generate fresh audio from ElevenLabs ──────────────────────────────
    console.log(`\n🎙️  Generating audio with ElevenLabs...`);
    console.log(`   Voice: ${voiceName} | Chars: ${text.length} | Cache: MISS`);

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not set in your .env file' });
    }

    await streamFromElevenLabs(text, voiceId, cacheKey, res);
    console.log(`   ✅ Audio streamed and cached`);

  } catch (error) {
    console.error('\n❌ Audio route error:', error.message);

    // ElevenLabs specific errors
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        return res.status(401).json({ error: 'Invalid ElevenLabs API key — check your .env file' });
      }
      if (status === 429) {
        return res.status(429).json({ error: 'ElevenLabs rate limit reached — you have used your quota for this period' });
      }
      if (status === 422) {
        return res.status(422).json({ error: 'ElevenLabs rejected the text — it may contain unsupported characters' });
      }
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'ElevenLabs took too long to respond — try again' });
    }

    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || 'Something went wrong while generating audio'
      });
    }
  }
});


// ─── Route: DELETE /api/audio/cache ──────────────────────────────────────────
// Utility route to clear the audio cache during development
// Useful if you change voice settings and want fresh audio for all chunks

router.delete('/cache', (req, res) => {
  try {
    const files = fs.readdirSync(CACHE_DIR);

    let deleted = 0;
    for (const file of files) {
      if (file.endsWith('.mp3')) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
        deleted++;
      }
    }

    console.log(`\n🗑️  Audio cache cleared — ${deleted} file(s) deleted`);
    res.json({ success: true, deleted });

  } catch (error) {
    console.error('❌ Failed to clear cache:', error.message);
    res.status(500).json({ error: 'Failed to clear audio cache' });
  }
});


module.exports = router;