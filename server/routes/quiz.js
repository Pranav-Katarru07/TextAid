const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// ─── Helper: Generate questions for a single chunk ────────────────────────────
async function generateQuestions(chunkText, chunkTitle, questionCount) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a reading comprehension tutor.
  The user just finished reading the passage below titled "${chunkTitle}".
  Generate exactly ${questionCount} multiple choice questions to test their understanding.
  
  Rules:
  - Questions should test key ideas, not trivial details or specific numbers
  - Make all 4 options plausible — wrong answers should not be obviously silly
  - Vary the difficulty: include at least one straightforward recall question
    and one that requires understanding or inference
  - Keep questions concise and clearly worded
  - Explanations should teach, not just restate the correct answer
  - Return ONLY valid JSON — no markdown, no extra text, nothing else
  
  Format:
  {
    "chunkTitle": "${chunkTitle}",
    "questions": [
      {
        "q": "Question here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": 0,
        "explanation": "Clear explanation of why this is correct and why the others aren't"
      }
    ]
  }
  
  The "correct" field is the index (0, 1, 2, or 3) of the correct option in the options array.
  
  PASSAGE:
  ${chunkText}`;

  const result = await model.generateContent(prompt);
  const cleaned = result.response.text().replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  // Validate the response shape
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('Gemini returned questions in unexpected format');
  }

  if (parsed.questions.length === 0) {
    throw new Error('Gemini returned an empty questions array');
  }

  // Validate each question has what we need
  for (const q of parsed.questions) {
    if (!q.q || !Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error('One or more questions are missing required fields');
    }
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
      throw new Error('One or more questions have an invalid correct index');
    }
  }

  return parsed.questions;
}


// ─── Route: POST /api/quiz ────────────────────────────────────────────────────
//
// Expected request body:
// {
//   "chunkId": 3,
//   "chunkTitle": "The Dopamine Feedback Loop",
//   "chunkText": "The full text of this chunk...",
//   "questionCount": 2    (optional — defaults to 2, max 3)
// }
//
// Response:
// {
//   "success": true,
//   "chunkId": 3,
//   "chunkTitle": "The Dopamine Feedback Loop",
//   "questions": [
//     {
//       "q": "...",
//       "options": ["...", "...", "...", "..."],
//       "correct": 1,
//       "explanation": "..."
//     }
//   ]
// }

router.post('/', async (req, res) => {
  try {
    const { chunkId, chunkTitle, chunkText, questionCount } = req.body;

    // ── Validate incoming request ───────────────────────────────────────────
    if (chunkId === undefined || chunkId === null) {
      return res.status(400).json({ error: 'Missing chunkId' });
    }

    if (!chunkTitle || typeof chunkTitle !== 'string' || chunkTitle.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or invalid chunkTitle' });
    }

    if (!chunkText || typeof chunkText !== 'string' || chunkText.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or invalid chunkText' });
    }

    // Clamp question count between 2 and 3
    const count = Math.min(Math.max(parseInt(questionCount) || 2, 2), 3);

    // ── Generate questions ──────────────────────────────────────────────────
    console.log(`\n🧠 Generating ${count} questions for chunk ${chunkId}: "${chunkTitle}"`);

    let questions;
    try {
      questions = await generateQuestions(chunkText, chunkTitle, count);
    } catch (error) {
      console.error(`  ❌ Question generation failed: ${error.message}`);
      return res.status(500).json({
        error: 'Failed to generate questions for this chunk',
        detail: error.message
      });
    }

    // Trim to requested count in case Gemini returned extras
    const trimmed = questions.slice(0, count);

    console.log(`  ✅ Generated ${trimmed.length} questions`);

    res.json({
      success: true,
      chunkId,
      chunkTitle,
      questions: trimmed
    });

  } catch (error) {
    console.error('\n❌ Quiz route error:', error.message);
    res.status(500).json({
      error: error.message || 'Something went wrong while generating the quiz'
    });
  }
});


module.exports = router;