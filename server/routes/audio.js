const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Cache Setup ──────────────────────────────────────────────────────────────
const CACHE_DIR = path.join(__dirname, '..', 'cache', 'audio');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log('📁 Audio cache folder created at', CACHE_DIR);
}


// ─── Available Voices ─────────────────────────────────────────────────────────
const VOICES = {
  rachel:    '21m00Tcm4TlvDq8ikWAM',   // Warm, clear — good for non-fiction
  callum:    'N2lVS1w4EtoT3dr4eOWO',   // Deep, measured — good for textbooks
  charlotte: 'XB0fDUnXU5powFXDhCwa',   // Expressive — good for fiction
  daniel:    'onwK4e9ZLuTAKqWW03F9',   // Authoritative — good for academic
};

const DEFAULT_VOICE = 'rachel';


// ─── Cache Helpers ────────────────────────────────────────────────────────────
function getCacheKey(text, voiceId) {
  return crypto.createHash('md5').update(`${voiceId}:${text}`).digest('hex');
}

function getCachePath(cacheKey) {
  return path.join(CACHE_DIR, `${cacheKey}.mp3`);
}

function getTimingPath(cacheKey) {
  return path.join(CACHE_DIR, `${cacheKey}.json`);
}

function isCached(cacheKey) {
  return fs.existsSync(getCachePath(cacheKey)) && fs.existsSync(getTimingPath(cacheKey));
}


// ─── Convert character-level alignment → word-level timings ──────────────────
// ElevenLabs returns timing for every character — we group them into words
function getWordTimings(alignment) {
  const chars      = alignment.characters;
  const startTimes = alignment.character_start_times_seconds;
  const endTimes   = alignment.character_end_times_seconds;

  const words = [];
  let wordChars     = '';
  let wordStartTime = 0;
  let wordEndTime   = 0;
  let inWord        = false;

  for (let i = 0; i < chars.length; i++) {
    const char    = chars[i];
    const isSpace = char === ' ' || char === '\n' || char === '\r';

    if (!isSpace) {
      if (!inWord) {
        wordStartTime = startTimes[i];
        inWord = true;
      }
      wordChars  += char;
      wordEndTime = endTimes[i];
    } else if (inWord) {
      words.push({ word: wordChars, start: wordStartTime, end: wordEndTime });
      wordChars = '';
      inWord    = false;
    }
  }

  // Push the final word if text doesn't end with a space
  if (inWord && wordChars.length > 0) {
    words.push({ word: wordChars, start: wordStartTime, end: wordEndTime });
  }

  return words;
}


// ─── Route: POST /api/audio ───────────────────────────────────────────────────
//
// Request body: { text, voice }
//
// Response JSON: { audioBase64, wordTimings, cached }
//   audioBase64  — the mp3 as a base64 string (decoded on the frontend)
//   wordTimings  — [{ word, start, end }] for word-by-word highlighting
//   cached       — true if served from disk

router.post('/', async (req, res) => {
  try {
    const { text, voice } = req.body;

    // ── Validate ──────────────────────────────────────────────────────────
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or empty text' });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        error: `Text too long (${text.length} chars). Maximum is 5000 per request.`
      });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not set in your .env file' });
    }

    const voiceName = voice && VOICES[voice] ? voice : DEFAULT_VOICE;
    const voiceId   = VOICES[voiceName];
    const cacheKey  = getCacheKey(text, voiceId);

    // ── Serve from cache ──────────────────────────────────────────────────
    if (isCached(cacheKey)) {
      console.log(`\n🎧 Cache HIT — ${voiceName}`);
      const audioBase64 = fs.readFileSync(getCachePath(cacheKey)).toString('base64');
      const wordTimings = JSON.parse(fs.readFileSync(getTimingPath(cacheKey), 'utf8'));
      return res.json({ audioBase64, wordTimings, cached: true });
    }

    // ── Generate from ElevenLabs with timestamps ──────────────────────────
    console.log(`\n🎙️  Generating audio — ${voiceName} | ${text.length} chars`);

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
      {
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability:         0.5,
          similarity_boost:  0.75,
          style:             0.0,
          use_speaker_boost: true,
        }
      },
      {
        headers: {
          'xi-api-key':   process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000
      }
    );

    const { audio_base64, alignment } = response.data;

    if (!audio_base64) {
      throw new Error('ElevenLabs returned no audio data');
    }

    // Convert character alignment to word timings
    const wordTimings = getWordTimings(alignment);

    // Cache both to disk
    fs.writeFileSync(getCachePath(cacheKey), Buffer.from(audio_base64, 'base64'));
    fs.writeFileSync(getTimingPath(cacheKey), JSON.stringify(wordTimings));

    console.log(`   ✅ Done — ${wordTimings.length} words timed and cached`);

    res.json({ audioBase64: audio_base64, wordTimings, cached: false });

  } catch (error) {
    console.error('\n❌ Audio route error:', error.message);

    if (error.response) {
      const status = error.response.status;
      if (status === 401) return res.status(401).json({ error: 'Invalid ElevenLabs API key' });
      if (status === 429) return res.status(429).json({ error: 'ElevenLabs quota reached' });
      if (status === 422) return res.status(422).json({ error: 'ElevenLabs rejected the text' });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'ElevenLabs timed out — try again' });
    }

    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Something went wrong generating audio' });
    }
  }
});


// ─── Route: DELETE /api/audio/cache ──────────────────────────────────────────
// Clears all cached audio and timing files

router.delete('/cache', (req, res) => {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    let deleted = 0;

    for (const file of files) {
      if (file.endsWith('.mp3') || file.endsWith('.json')) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
        deleted++;
      }
    }

    console.log(`\n🗑️  Cache cleared — ${deleted} file(s) deleted`);
    res.json({ success: true, deleted });

  } catch (error) {
    console.error('❌ Failed to clear cache:', error.message);
    res.status(500).json({ error: 'Failed to clear audio cache' });
  }
});


module.exports = router;