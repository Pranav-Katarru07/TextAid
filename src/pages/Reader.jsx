// src/pages/Reader.jsx
import VoiceChatButton from '../components/VoiceChatButton';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import OriginButton from '../components/OriginButton';
import AudioPlayer from '../components/AudioPlayer';
import QuizModal from '../components/QuizModal';
import ChatPanel from '../components/ChatPanel';
import SummaryCard from '../components/SummaryCard';

export default function Reader({ book, onGoHome }) {
  // ── Navigation ───────────────────────────────────────────────────────────────
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chunkIndex, setChunkIndex]     = useState(0);

  // ── UI ────────────────────────────────────────────────────────────────────────
  const [showQuiz, setShowQuiz]         = useState(false);
  const [showSummary, setShowSummary]   = useState(false);
  const [showChat, setShowChat]         = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [audioError, setAudioError]     = useState(null);

  // ── Word highlighting ────────────────────────────────────────────────────────
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  // ── Score ────────────────────────────────────────────────────────────────────
  const [totalCorrect, setTotalCorrect]     = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const [chatHistory, setChatHistory] = useState([]);

  const contentRef = useRef(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const chapters = book?.chapters || [];
  const chapter  = chapters[chapterIndex];
  const chunks   = chapter?.chunks || [];
  const chunk    = chunks[chunkIndex];

  const isLastChunkInChapter = chunkIndex === chunks.length - 1;
  const isLastChapter        = chapterIndex === chapters.length - 1;

  const comprehensionScore = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : null;

  // ── Text read so far (for chat context) ──────────────────────────────────────
  const textReadSoFar = useMemo(() => {
    let text = '';
    for (let ci = 0; ci <= chapterIndex; ci++) {
      const ch = chapters[ci];
      if (!ch) continue;
      const maxChunk = ci === chapterIndex ? chunkIndex : (ch.chunks?.length || 0) - 1;
      for (let ki = 0; ki <= maxChunk; ki++) {
        if (ch.chunks?.[ki]) text += ch.chunks[ki].text + '\n\n';
      }
    }
    return text;
  }, [chapterIndex, chunkIndex, chapters]);

  const chatContext = useMemo(() => ({
    bookTitle:           book?.title || 'Unknown',
    contentType:         book?.contentType || 'nonfiction',
    currentChunkTitle:   chunk?.title || '',
    currentChapterTitle: chapter?.chapterTitle || '',
    textReadSoFar,
  }), [book, chunk, chapter, textReadSoFar]);

  // Reset chat and word index when book or chunk changes
  useEffect(() => { setChatHistory([]); }, [book?.id]);
  useEffect(() => { setActiveWordIndex(-1); }, [chapterIndex, chunkIndex]);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chunkIndex, chapterIndex]);

  // ── Navigation ────────────────────────────────────────────────────────────────
  function advanceToNextChunk() {
    if (!isLastChunkInChapter) {
      setChunkIndex(i => i + 1);
    } else if (!isLastChapter) {
      setShowSummary(true);
    }
  }

  function goToNextChapter() {
    setShowSummary(false);
    setChapterIndex(i => i + 1);
    setChunkIndex(0);
  }

  function goToChapter(ci) {
    setChapterIndex(ci);
    setChunkIndex(0);
    setShowQuiz(false);
    setShowSummary(false);
  }

  function goToChunk(ci, ki) {
    setChapterIndex(ci);
    setChunkIndex(ki);
    setShowQuiz(false);
    setShowSummary(false);
  }

  function goPrev() {
    if (chunkIndex > 0) {
      setChunkIndex(i => i - 1);
    } else if (chapterIndex > 0) {
      const prevChapter = chapters[chapterIndex - 1];
      setChapterIndex(i => i - 1);
      setChunkIndex((prevChapter?.chunks?.length || 1) - 1);
    }
  }

  function goNext() {
    if (chunk?.quizAfter) {
      setShowQuiz(true);
    } else {
      advanceToNextChunk();
    }
  }

  // ── Audio / quiz callbacks ────────────────────────────────────────────────────
  function handleChunkEnd() {
    if (chunk?.quizAfter) {
      setShowQuiz(true);
    } else {
      advanceToNextChunk();
    }
  }

  function handleQuizComplete({ score, total }) {
    setTotalCorrect(c => c + score);
    setTotalQuestions(t => t + total);
    setShowQuiz(false);
    advanceToNextChunk();
  }

  function handleQuizSkip() {
    setShowQuiz(false);
    advanceToNextChunk();
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (!book || chapters.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16,
      }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--ink)' }}>
          No content to display
        </p>
        <OriginButton variant="ghost" onClick={onGoHome}>← Back to Library</OriginButton>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--bg)', overflow: 'hidden',
    }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{
              width: 260, flexShrink: 0,
              background: 'var(--cream)',
              borderRight: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column',
              height: '100vh', overflow: 'hidden',
            }}
          >
            {/* Book info */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <button
                onClick={onGoHome}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--muted)', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginBottom: 14, transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                ← Library
              </button>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 15, color: 'var(--ink)',
                marginBottom: 2, lineHeight: 1.3,
              }}>
                {book.title}
              </p>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>
                {book.author || 'Unknown author'}
              </p>
            </div>

            {/* Comprehension score */}
            {comprehensionScore !== null && (
              <div style={{
                margin: '12px 14px',
                padding: '12px 14px',
                background: 'var(--amber-pale)',
                border: '1px solid var(--amber-border)',
                borderRadius: 12, flexShrink: 0,
              }}>
                <p style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '1px',
                  textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 4,
                }}>
                  ⚡ Comprehension
                </p>
                <motion.p
                  key={comprehensionScore}
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 34, color: 'var(--ink)', lineHeight: 1,
                  }}
                >
                  {comprehensionScore}%
                </motion.p>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  {totalCorrect} of {totalQuestions} correct
                </p>
              </div>
            )}

            {/* Chapter / chunk list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              {chapters.map((ch, ci) => (
                <div key={ci}>
                  <button
                    onClick={() => goToChapter(ci)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '8px 18px',
                      background: ci === chapterIndex
                        ? 'rgba(212,130,42,0.07)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'background 0.15s',
                    }}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: ci < chapterIndex
                        ? 'var(--sage)'
                        : ci === chapterIndex
                        ? 'var(--amber)'
                        : 'var(--border)',
                      transition: 'background 0.2s',
                    }} />
                    <span style={{
                      fontSize: 12,
                      fontWeight: ci === chapterIndex ? 500 : 400,
                      color: ci === chapterIndex ? 'var(--amber)' : 'var(--muted)',
                      lineHeight: 1.3,
                    }}>
                      {ch.chapterTitle}
                    </span>
                  </button>

                  {/* Chunks — only for active chapter */}
                  {ci === chapterIndex && (
                    <div style={{ paddingLeft: 24 }}>
                      {ch.chunks?.map((ck, ki) => (
                        <button
                          key={ki}
                          onClick={() => goToChunk(ci, ki)}
                          style={{
                            width: '100%', textAlign: 'left',
                            padding: '5px 16px 5px 10px',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            borderLeft: `2px solid ${ki === chunkIndex ? 'var(--amber)' : 'transparent'}`,
                            transition: 'border-color 0.15s',
                          }}
                        >
                          <span style={{
                            fontSize: 11, lineHeight: 1.3, display: 'block',
                            color: ki === chunkIndex ? 'var(--amber)' : 'var(--muted)',
                          }}>
                            {ck.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Tool buttons */}
            <div style={{
              padding: '12px 14px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <SidebarToolBtn
                icon="💬" label="Ask AI Assistant"
                color="var(--amber)"
                onClick={() => setShowChat(true)}
              />
              {chapter?.summary && (
                <SidebarToolBtn
                  icon="📋" label="Chapter Summary"
                  color="var(--sage)"
                  onClick={() => setShowSummary(true)}
                />
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main reading area ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex',
        flexDirection: 'column', overflow: 'hidden', minWidth: 0,
      }}>

        {/* Top bar */}
        <div style={{
          padding: '10px 22px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg)', flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            style={{
              width: 30, height: 30, borderRadius: 7,
              background: 'var(--cream)', border: '1px solid var(--border)',
              cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'var(--muted)',
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          {/* Breadcrumb */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            gap: 6, fontSize: 12, color: 'var(--muted)', overflow: 'hidden',
          }}>
            <span style={{
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {chapter?.chapterTitle}
            </span>
            <span style={{ opacity: 0.4 }}>›</span>
            <span style={{
              whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', color: 'var(--ink)', fontWeight: 500,
            }}>
              {chunk?.title}
            </span>
          </div>

          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
            {chunkIndex + 1} / {chunks.length}
          </span>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            <OriginButton
              variant="ghost" size="sm"
              onClick={() => setShowChat(o => !o)}
              icon="💬"
            >
              Chat
            </OriginButton>
            <ThemeToggle />
          </div>
        </div>

        {/* Audio player */}
        <AudioPlayer
          chunk={chunk}
          voice={book.voice || 'rachel'}
          onChunkEnd={handleChunkEnd}
          onError={setAudioError}
          onWordChange={setActiveWordIndex}
        />

        {/* Audio error banner */}
        <AnimatePresence>
          {audioError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: 'var(--red-pale)',
                borderBottom: '1px solid var(--red)',
                padding: '8px 22px',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--red)' }}>⚠ {audioError}</span>
              <button
                onClick={() => setAudioError(null)}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--red)', cursor: 'pointer', fontSize: 12,
                }}
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reading content */}
        <div
          ref={contentRef}
          style={{ flex: 1, overflowY: 'auto', padding: '48px 80px' }}
        >
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <AnimatePresence mode="wait">
              {chunk && (
                <motion.div
                  key={`${chapterIndex}-${chunkIndex}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.28 }}
                >
                  {/* Chapter label */}
                  <p style={{
                    fontSize: 10, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '2.5px',
                    color: 'var(--muted)', marginBottom: 10,
                  }}>
                    {chapter?.chapterTitle}
                  </p>

                  {/* Chunk title */}
                  <h1 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(22px, 3vw, 34px)',
                    fontWeight: 400, color: 'var(--ink)',
                    lineHeight: 1.2, marginBottom: 36,
                  }}>
                    {chunk.title}
                  </h1>

                  {/* Body text with word highlighting */}
                  <div style={{ fontSize: 17, lineHeight: 1.9 }}>
                    <WordHighlighter
                      text={chunk.text}
                      activeWordIndex={activeWordIndex}
                    />
                  </div>

                  {/* Bottom navigation */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginTop: 48,
                    paddingTop: 24, borderTop: '1px solid var(--border)',
                  }}>
                    <OriginButton
                      variant="ghost" size="sm"
                      disabled={chapterIndex === 0 && chunkIndex === 0}
                      onClick={goPrev}
                    >
                      ← Previous
                    </OriginButton>

                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {chunk.wordCount} words
                    </span>

                    <OriginButton
                      variant="ghost" size="sm"
                      disabled={isLastChunkInChapter && isLastChapter}
                      onClick={goNext}
                    >
                      Next →
                    </OriginButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Overlays ──────────────────────────────────────────────────────────── */}
      <QuizModal
        isVisible={showQuiz}
        chunk={chunk}
        onComplete={handleQuizComplete}
        onSkip={handleQuizSkip}
      />

      <SummaryCard
        isVisible={showSummary}
        chapter={chapter}
        onContinue={isLastChapter ? onGoHome : goToNextChapter}
      />

      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        context={chatContext}
        history={chatHistory}
        onHistoryUpdate={setChatHistory}
      />
    </div>
  );
}


// ── Word-by-word highlighter ───────────────────────────────────────────────────
// Splits text into tokens (words + whitespace), renders each word as a
// motion.span that glows amber when the audio cursor reaches it
function WordHighlighter({ text, activeWordIndex }) {
  const tokens = text.split(/(\s+)/);
  let wordCount = 0;

  return (
    <>
      {text.split('\n\n').map((paragraph, pi) => (
        <p key={pi} style={{ marginBottom: '1.4em' }}>
          {paragraph.split(/(\s+)/).map((token, ti) => {
            // Whitespace tokens pass through unstyled
            if (/^\s+$/.test(token)) {
              return <span key={ti}>{token}</span>;
            }

            const index    = wordCount++;
            const isActive = index === activeWordIndex;

            return (
              <motion.span
                key={ti}
                animate={isActive
                  ? { backgroundColor: 'rgba(212,130,42,0.25)', color: 'var(--ink)' }
                  : { backgroundColor: 'rgba(0,0,0,0)', color: 'var(--ink-soft)' }
                }
                transition={{ duration: 0.08 }}
                style={{
                  borderRadius: 3,
                  padding: '1px 2px',
                  margin: '0 -2px',
                  display: 'inline',
                }}
              >
                {token}
              </motion.span>
            );
          })}
        </p>
      ))}
    </>
  );
}


// ── Sidebar tool button ────────────────────────────────────────────────────────
function SidebarToolBtn({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '9px 12px',
        borderRadius: 8, border: '1px solid transparent',
        background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, fontWeight: 500, color,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}