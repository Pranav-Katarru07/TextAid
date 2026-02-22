const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// ─── Helper: Clean raw PDF text using Gemini ──────────────────────────────────
async function cleanText(rawText) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a text formatting assistant.
  The text below was extracted from a PDF and contains messy artifacts.
  
  Your job:
  - Remove page numbers (e.g. "Page 1 of 10", "— 42 —", standalone numbers on their own line)
  - Remove repeated headers and footers (e.g. book title or chapter name repeating every page)
  - Remove any copyright notices, publisher info, or ISBN lines
  - Fix broken sentences caused by line breaks mid-sentence
  - Remove excessive blank lines (keep paragraph breaks, remove the rest)
  - Keep ALL the actual content exactly as written — do not summarize, rephrase or remove real content
  - Do not add any commentary, just return the cleaned text
  
  RAW TEXT:
  ${rawText}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}


// ─── Helper: Generate a chunk title safely ────────────────────────────────────
async function generateChunkTitle(model, text, fallbackTitle) {
  try {
    const prompt = `Read this passage and give it a short descriptive title.
    Maximum 6 words. Write it like a chapter title, not a sentence.
    Return ONLY the title, nothing else.
    
    PASSAGE: ${text.slice(0, 900)}`;

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();

    // Make sure Gemini didn't return something empty
    if (!title || title.length === 0) {
      console.warn(`    ⚠️  Empty title returned — using fallback`);
      return fallbackTitle;
    }

    // Make sure the title isn't excessively long
    if (title.split(' ').length > 10) {
      console.warn(`    ⚠️  Title too long, trimming: "${title}"`);
      return title.split(' ').slice(0, 6).join(' ');
    }

    return title;

  } catch (error) {
    console.warn(`    ⚠️  Title generation failed — using fallback. Reason: ${error.message}`);
    return fallbackTitle;
  }
}


// ─── Helper: Detect chapter boundaries safely ─────────────────────────────────
async function detectChapterBoundaries(model, cleanedText) {
  try {
    const prompt = `You are analyzing a book or textbook.
    Find all chapter or section headings in the text below.
    
    Rules:
    - Return ONLY valid JSON, no markdown, no extra text
    - Each entry needs the exact heading text and the character position where it starts
    - If this is a textbook, treat major sections as chapters
    - If there are no clear chapters, return one entry called "Full Text" at position 0
    
    Format:
    {
      "chapters": [
        { "title": "Chapter 1: The Fundamentals", "startsAt": 0 },
        { "title": "Chapter 2: Make It Obvious", "startsAt": 3842 }
      ]
    }
    
    TEXT:
    ${cleanedText.slice(0, 8000)}`;

    const result = await model.generateContent(prompt);
    const cleaned = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Make sure we got chapters back in the right shape
    if (!parsed.chapters || !Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
      throw new Error('Gemini returned chapters in unexpected format');
    }

    // Make sure every chapter has the fields we need
    const valid = parsed.chapters.every(c =>
      typeof c.title === 'string' &&
      typeof c.startsAt === 'number'
    );

    if (!valid) {
      throw new Error('One or more chapters missing title or startsAt');
    }

    return parsed.chapters;

  } catch (error) {
    // If chapter detection fails, treat the whole book as one chapter
    console.warn(`  ⚠️  Chapter detection failed — treating as single chapter. Reason: ${error.message}`);
    return [{ title: 'Full Text', startsAt: 0 }];
  }
}


// ─── Helper: Generate a chapter summary ──────────────────────────────────────
async function generateChapterSummary(chapterTitle, chapterText, contentType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const isStory = contentType === 'fiction';

  const prompt = isStory
    ? `You are summarizing a chapter from a novel for a reader who just finished it.
       Write a recap that covers what happened, in an engaging way.
       
       Return ONLY valid JSON, no markdown:
       {
         "summary": "2-3 sentence recap of what happened",
         "keyEvents": ["event 1", "event 2", "event 3"],
         "characters": [
           { "name": "Character name", "role": "their role", "development": "how they changed or what they did" }
         ],
         "adhdRecap": "One punchy sentence capturing the essence of this chapter",
         "mood": "tense / lighthearted / mysterious / etc"
       }
       
       CHAPTER: ${chapterTitle}
       TEXT: ${chapterText}`

    : `You are summarizing a chapter from a non-fiction book or textbook.
       Help the reader consolidate what they just learned.
       
       Return ONLY valid JSON, no markdown:
       {
         "summary": "2-3 sentence overview of the main ideas",
         "keyPoints": ["point 1", "point 2", "point 3", "point 4"],
         "keyTerms": [
           { "term": "Important term", "definition": "Plain english definition" }
         ],
         "adhdRecap": "One punchy sentence capturing the core takeaway",
         "howItConnects": "One sentence on how this chapter connects to what came before"
       }
       
       CHAPTER: ${chapterTitle}
       TEXT: ${chapterText}`;

  const result = await model.generateContent(prompt);
  const cleaned = result.response.text().replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}


// ─── Main: Detect chapters, split into chunks, title each chunk ───────────────
async function processIntoChapters(cleanedText) {

  // Safety check — make sure we have text to work with
  if (!cleanedText || cleanedText.trim().length === 0) {
    throw new Error('No text content found to process');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Step A: Detect chapters
  console.log('  📑 Detecting chapters...');
  const detectedChapters = await detectChapterBoundaries(model, cleanedText);
  console.log(`  📑 Found ${detectedChapters.length} chapter(s)`);

  const chapters = [];
  let globalChunkId = 0;
  const warnings = [];

  // Step B: Process each chapter
  for (let i = 0; i < detectedChapters.length; i++) {
    const chapter = detectedChapters[i];
    const nextChapter = detectedChapters[i + 1];

    try {
      // Slice out just this chapter's text
      const chapterText = nextChapter
        ? cleanedText.slice(chapter.startsAt, nextChapter.startsAt)
        : cleanedText.slice(chapter.startsAt);

      // Skip chapters that came back empty
      if (!chapterText || chapterText.trim().length === 0) {
        console.warn(`  ⚠️  Chapter "${chapter.title}" has no text — skipping`);
        warnings.push(`Chapter "${chapter.title}" was empty and skipped`);
        continue;
      }

      const chapterWordCount = chapterText.split(' ').length;
      console.log(`\n  📖 "${chapter.title}" — ${chapterWordCount} words`);

      let chapterChunks = [];

      if (chapterWordCount < 900) {
        // ── Short chapter: keep as one single chunk, no splitting ─────────────
        console.log(`    ⚡ Short chapter — keeping as single chunk`);

        const title = await generateChunkTitle(
          model,
          chapterText,
          chapter.title   // fallback to the chapter title itself
        );

        chapterChunks.push({
          id: globalChunkId++,
          title,
          text: chapterText,
          wordCount: chapterWordCount,
          quizAfter: true
        });

        console.log(`    📌 Chunk ${globalChunkId}: "${title}"`);

      } else {
        // ── Long chapter: split at paragraph boundaries every ~600 words ──────
        const paragraphs = chapterText
          .split(/\n\s*\n/)
          .map(p => p.trim())
          .filter(p => p.length > 0);

        // Edge case — if paragraph splitting gives us nothing, use full chapter text
        if (paragraphs.length === 0) {
          console.warn(`    ⚠️  No paragraphs found in "${chapter.title}" — using full chapter as one chunk`);
          warnings.push(`Chapter "${chapter.title}" had no paragraph breaks — kept as one chunk`);

          const title = await generateChunkTitle(model, chapterText, chapter.title);
          chapterChunks.push({
            id: globalChunkId++,
            title,
            text: chapterText,
            wordCount: chapterWordCount,
            quizAfter: true
          });

        } else {
          let currentChunkText = '';
          let currentWordCount = 0;

          for (const paragraph of paragraphs) {
            currentChunkText += (currentChunkText ? '\n\n' : '') + paragraph;
            currentWordCount += paragraph.split(' ').length;

            if (currentWordCount >= 600) {
              const fallback = `${chapter.title} — Part ${chapterChunks.length + 1}`;
              const title = await generateChunkTitle(model, currentChunkText, fallback);

              chapterChunks.push({
                id: globalChunkId++,
                title,
                text: currentChunkText,
                wordCount: currentWordCount,
                quizAfter: true
              });

              console.log(`    📌 Chunk ${globalChunkId}: "${title}"`);

              currentChunkText = '';
              currentWordCount = 0;
            }
          }

          // Last remaining chunk in this chapter
          if (currentChunkText.trim().length > 0) {
            const fallback = `${chapter.title} — Part ${chapterChunks.length + 1}`;
            const title = await generateChunkTitle(model, currentChunkText, fallback);

            chapterChunks.push({
              id: globalChunkId++,
              title,
              text: currentChunkText,
              wordCount: currentWordCount,
              quizAfter: true
            });

            console.log(`    📌 Chunk ${globalChunkId}: "${title}"`);
          }
        }
      }

      // Make sure we ended up with at least one chunk for this chapter
      if (chapterChunks.length === 0) {
        console.warn(`  ⚠️  Chapter "${chapter.title}" produced no chunks — skipping`);
        warnings.push(`Chapter "${chapter.title}" produced no chunks`);
        continue;
      }

      chapters.push({
        chapterId: i,
        chapterTitle: chapter.title,
        wordCount: chapterWordCount,
        chunks: chapterChunks
      });

    } catch (error) {
      // If an entire chapter fails, log it and keep going with the rest
      console.error(`  ❌ Failed to process chapter "${chapter.title}": ${error.message}`);
      warnings.push(`Chapter "${chapter.title}" failed to process: ${error.message}`);
      continue;
    }
  }

  // Make sure we ended up with at least something usable
  if (chapters.length === 0) {
    throw new Error('Processing failed — no chapters could be extracted from this document');
  }

  // Report any non-fatal warnings that happened along the way
  if (warnings.length > 0) {
    console.warn(`\n  ⚠️  Completed with ${warnings.length} warning(s):`);
    warnings.forEach(w => console.warn(`     • ${w}`));
  }

  return { chapters, totalChunks: globalChunkId, warnings };
}


// ─── Route: POST /api/upload ──────────────────────────────────────────────────
router.post('/', upload.single('file'), async (req, res) => {
  try {
    // Make sure a file was actually sent
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Make sure it's a PDF
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported right now' });
    }

    // Content type from the upload form ('fiction' or 'nonfiction')
    const contentType = req.body.contentType || 'nonfiction';

    // ── Step 1: Extract raw text from PDF ──────────────────────────────────
    console.log('\n📄 Parsing PDF...');
    let rawText;
    try {
      const data = await pdfParse(req.file.buffer);
      rawText = data.text;

      if (!rawText || rawText.trim().length === 0) {
        return res.status(422).json({
          error: 'This PDF appears to have no readable text. It may be a scanned image PDF.'
        });
      }
    } catch (error) {
      return res.status(422).json({
        error: `Failed to read PDF: ${error.message}`
      });
    }

    // ── Step 2: Clean the text with Gemini ─────────────────────────────────
    console.log('🧹 Cleaning text with Gemini...');
    let cleanedText;
    try {
      if (rawText.length < 20000) {
        // Short document — clean in one go
        cleanedText = await cleanText(rawText);
      } else {
        // Long document — clean in sections to stay within token limits
        const sections = [];
        for (let i = 0; i < rawText.length; i += 15000) {
          sections.push(rawText.slice(i, i + 15000));
        }
        console.log(`  📚 Large document — cleaning in ${sections.length} sections...`);
        const cleanedSections = await Promise.all(sections.map(cleanText));
        cleanedText = cleanedSections.join('\n\n');
      }
    } catch (error) {
      // If cleaning fails, fall back to raw text rather than failing the whole upload
      console.warn(`  ⚠️  Text cleaning failed — using raw text. Reason: ${error.message}`);
      cleanedText = rawText;
    }

    // ── Step 3: Process chapters, chunks and titles ─────────────────────────
    console.log('\n📑 Processing chapters and chunks...');
    const { chapters, totalChunks, warnings } = await processIntoChapters(cleanedText);

    // ── Step 4: Generate chapter summaries ─────────────────────────────────
    console.log('\n📋 Generating chapter summaries...');
    for (const chapter of chapters) {
      try {
        const chapterText = chapter.chunks.map(c => c.text).join('\n\n');
        chapter.summary = await generateChapterSummary(
          chapter.chapterTitle,
          chapterText,
          contentType
        );
        console.log(`  ✅ Summary done: "${chapter.chapterTitle}"`);

      } catch (error) {
        // A failed summary shouldn't break the whole upload
        console.error(`  ❌ Summary failed for "${chapter.chapterTitle}": ${error.message}`);
        chapter.summary = null;   // frontend will handle this gracefully
      }
    }

    console.log(`\n✅ All done — ${chapters.length} chapters, ${totalChunks} total chunks`);

    // ── Step 5: Save to MongoDB + write PDF to disk if user is logged in ────
    let savedDocumentId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Write PDF buffer to disk
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const pdfFilename = `${Date.now()}-${safeName}`;
        const pdfPath = path.join(UPLOADS_DIR, pdfFilename);
        fs.writeFileSync(pdfPath, req.file.buffer);
        console.log(`  📁 PDF saved: ${pdfFilename}`);

        const doc = await Document.create({
          userId:        decoded.id,
          filename:      req.file.originalname,
          contentType,
          totalChapters: chapters.length,
          totalChunks,
          chapters,
          pdfPath,
        });
        savedDocumentId = doc._id;
        console.log(`  💾 Saved to library (doc ${savedDocumentId})`);
      } catch {
        // Invalid/expired token — just skip saving, don't fail the request
        console.warn('  ⚠️  Auth token invalid — skipping DB save');
      }
    }

    // ── Step 6: Send everything back ────────────────────────────────────────
    res.json({
      success: true,
      contentType,
      totalChapters: chapters.length,
      totalChunks,
      chapters,
      ...(savedDocumentId && { savedDocumentId }),
      ...(warnings.length > 0 && { warnings })
    });

  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    res.status(500).json({
      error: error.message || 'Something went wrong while processing your file'
    });
  }
});

module.exports = router;