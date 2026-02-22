const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// ─── System Prompt Builder ────────────────────────────────────────────────────
// Builds the instruction set Gemini receives before every conversation.
// Injecting the reading context here means Gemini always knows exactly
// what the user has read and can answer with full awareness of it.

function buildSystemPrompt(context) {
  const {
    bookTitle,
    contentType,      // 'fiction' or 'nonfiction'
    currentChunkTitle,
    currentChapterTitle,
    textReadSoFar,    // everything the user has read up to this point
  } = context;

  const basePrompt = `You are a reading assistant for "${bookTitle}", a ${contentType} book.
The user is currently reading the section titled "${currentChunkTitle}" in "${currentChapterTitle}".

Your role:
- Answer questions about anything the user has read so far
- Discuss ideas, themes, and arguments from the text
- Help the user understand difficult passages or concepts
- If the content is fiction, help them track characters, plot, and themes
- If the content is non-fiction, help them understand and apply concepts
- Encourage deeper thinking — don't just summarise, help them engage

Rules you must follow:
- Only discuss content the user has already read (provided below)
- If asked about content they haven't reached yet, say you don't want to spoil it
- Never make up content that isn't in the text
- Keep responses conversational and concise — this is a chat, not an essay
- If the user wants to discuss or debate an idea, engage with enthusiasm

EVERYTHING THE USER HAS READ SO FAR:
${textReadSoFar}`;

  return basePrompt;
}


// ─── Helper: Format conversation history for Gemini ───────────────────────────
// Gemini expects history in a specific format with 'user' and 'model' roles.
// We store it as { role: 'user' | 'assistant', content: '...' } on the frontend
// and convert it here before sending to Gemini.

function formatHistory(history) {
  if (!history || history.length === 0) return [];

  return history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
}


// ─── Route: POST /api/chat ────────────────────────────────────────────────────
//
// Expected request body:
// {
//   "message": "What does the author mean by marginal gains?",
//
//   "context": {
//     "bookTitle": "Atomic Habits",
//     "contentType": "nonfiction",
//     "currentChunkTitle": "The Dopamine Feedback Loop",
//     "currentChapterTitle": "Chapter 4: Make It Attractive",
//     "textReadSoFar": "The aggregation of marginal gains..."
//   },
//
//   "history": [                          ← full conversation so far
//     { "role": "user",      "content": "Who is the author?" },
//     { "role": "assistant", "content": "James Clear wrote Atomic Habits..." }
//   ]
// }
//
// Response:
// {
//   "success": true,
//   "reply": "Marginal gains refers to the idea that...",
//   "history": [ ...updatedHistory ]
// }

router.post('/', async (req, res) => {
  try {
    const { message, context, history } = req.body;

    // ── Validate request ──────────────────────────────────────────────────
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or empty message' });
    }

    if (!context) {
      return res.status(400).json({ error: 'Missing context object' });
    }

    if (!context.bookTitle) {
      return res.status(400).json({ error: 'context.bookTitle is required' });
    }

    if (!context.textReadSoFar || context.textReadSoFar.trim().length === 0) {
      return res.status(400).json({ error: 'context.textReadSoFar is required' });
    }

    // ── Build system prompt with reading context ──────────────────────────
    const systemPrompt = buildSystemPrompt(context);

    // ── Start a Gemini chat session with full history ─────────────────────
    // Passing history means Gemini remembers the whole conversation,
    // not just the last message — this is what makes it feel natural
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt
    });

    const chat = model.startChat({
      history: formatHistory(history || []),
      generationConfig: {
        maxOutputTokens: 512,    // keep replies concise — this is a chat sidebar
        temperature: 0.7,        // slightly creative but still grounded
      }
    });

    // ── Send the user's message ───────────────────────────────────────────
    console.log(`\n💬 Chat message for "${context.bookTitle}"`);
    console.log(`   Chapter: ${context.currentChapterTitle}`);
    console.log(`   Message: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`);

    let reply;
    try {
      const result = await chat.sendMessage(message);
      reply = result.response.text();

      if (!reply || reply.trim().length === 0) {
        throw new Error('Gemini returned an empty reply');
      }
    } catch (error) {
      console.error('  ❌ Gemini chat error:', error.message);
      return res.status(500).json({
        error: 'Failed to get a response from the AI assistant',
        detail: error.message
      });
    }

    console.log(`   ✅ Reply generated (${reply.length} chars)`);

    // ── Build updated history to send back ────────────────────────────────
    // We return the full updated history so the frontend can store it
    // and send it back with the next message — this is how memory works
    const updatedHistory = [
      ...(history || []),
      { role: 'user',      content: message },
      { role: 'assistant', content: reply   }
    ];

    res.json({
      success: true,
      reply,
      history: updatedHistory
    });

  } catch (error) {
    console.error('\n❌ Chat route error:', error.message);
    res.status(500).json({
      error: error.message || 'Something went wrong with the chat assistant'
    });
  }
});


module.exports = router;