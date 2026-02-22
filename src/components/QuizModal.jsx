// src/components/QuizModal.jsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OriginButton from './OriginButton';

export default function QuizModal({
  isVisible,
  chunk,          // current chunk — used to fetch quiz
  onComplete,     // called when user finishes quiz (passes { score, total })
  onSkip,         // called when user skips the quiz
}) {
  const [questions, setQuestions]     = useState([]);
  const [currentQ, setCurrentQ]       = useState(0);
  const [selected, setSelected]       = useState(null);   // index of chosen option
  const [answered, setAnswered]       = useState(false);
  const [score, setScore]             = useState(0);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState(null);

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // ── Fetch questions when modal opens ────────────────────────────────────────
  useEffect(() => {
    if (!isVisible || !chunk) return;

    setQuestions([]);
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setError(null);
    setIsLoading(true);

    fetchQuestions();
  }, [isVisible, chunk?.id]);

  async function fetchQuestions() {
    try {
      const res = await fetch(`${BASE_URL}/api/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunkId:       chunk.id,
          chunkTitle:    chunk.title,
          chunkText:     chunk.text,
          questionCount: 3,
        }),
      });

      if (!res.ok) throw new Error('Failed to load questions');

      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Answer handling ──────────────────────────────────────────────────────────
  function handleAnswer(optionIndex) {
    if (answered) return;
    setSelected(optionIndex);
    setAnswered(true);

    const q = questions[currentQ];
    if (optionIndex === q.correct) {
      setScore(s => s + 1);
    }
  }

  function handleNext() {
    if (currentQ + 1 < questions.length) {
      setCurrentQ(q => q + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      // All questions done
      const finalScore = answered && selected === questions[currentQ].correct
        ? score + 1
        : score;
      // Use state score which was already updated
      onComplete?.({ score: finalScore, total: questions.length });
    }
  }

  const q = questions[currentQ];
  const isLastQuestion = currentQ + 1 === questions.length;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(26,22,20,0.7)',
              backdropFilter: 'blur(8px)',
            }}
          />

          {/* Modal sheet — springs up from bottom */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              zIndex: 301, maxHeight: '85vh',
              background: 'var(--white)',
              borderRadius: '24px 24px 0 0',
              overflow: 'hidden',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'var(--border)',
              margin: '12px auto 0',
            }} />

            <div style={{ padding: '20px 28px 32px', overflowY: 'auto', maxHeight: '80vh' }}>

              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 20,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    background: 'var(--amber-pale)',
                    color: 'var(--amber)',
                    border: '1px solid var(--amber-border)',
                    fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '1px',
                    padding: '4px 12px', borderRadius: 20,
                  }}>
                    🧠 Comprehension Check
                  </span>
                  {!isLoading && questions.length > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {currentQ + 1} / {questions.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={onSkip}
                  style={{
                    background: 'none', border: 'none',
                    fontSize: 13, color: 'var(--muted)',
                    cursor: 'pointer', padding: '4px 8px',
                  }}
                >
                  Skip
                </button>
              </div>

              {/* Progress dots */}
              {questions.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: 3, borderRadius: 3,
                        background: i < currentQ
                          ? 'var(--sage)'
                          : i === currentQ
                          ? 'var(--amber)'
                          : 'var(--border)',
                        transition: 'background 0.3s',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      border: '3px solid var(--border)',
                      borderTopColor: 'var(--amber)',
                      margin: '0 auto 16px',
                    }}
                  />
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>
                    Generating questions...
                  </p>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div style={{
                  padding: '20px', background: 'var(--red-pale)',
                  borderRadius: 12, textAlign: 'center', marginBottom: 16,
                }}>
                  <p style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</p>
                  <OriginButton variant="ghost" onClick={onSkip}>
                    Continue Reading
                  </OriginButton>
                </div>
              )}

              {/* Question */}
              {!isLoading && !error && q && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQ}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 22, lineHeight: 1.4,
                      color: 'var(--ink)', marginBottom: 24,
                    }}>
                      {q.q}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {q.options.map((option, i) => {
                        let bg     = 'var(--bg)';
                        let border = 'var(--border)';
                        let color  = 'var(--ink)';

                        if (answered) {
                          if (i === q.correct) {
                            bg = 'var(--sage-pale)'; border = 'var(--sage)'; color = 'var(--sage)';
                          } else if (i === selected && i !== q.correct) {
                            bg = 'var(--red-pale)'; border = 'var(--red)'; color = 'var(--red)';
                          }
                        }

                        return (
                          <motion.button
                            key={i}
                            onClick={() => handleAnswer(i)}
                            disabled={answered}
                            whileHover={!answered ? { scale: 1.01, x: 4 } : {}}
                            whileTap={!answered ? { scale: 0.99 } : {}}
                            style={{
                              padding: '14px 18px',
                              borderRadius: 12,
                              border: `1.5px solid ${border}`,
                              background: bg, color,
                              textAlign: 'left',
                              fontFamily: 'var(--font-sans)',
                              fontSize: 15, cursor: answered ? 'default' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: 12,
                              transition: 'all 0.2s',
                            }}
                          >
                            <span style={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: answered && i === q.correct
                                ? 'var(--sage)'
                                : answered && i === selected && i !== q.correct
                                ? 'var(--red)'
                                : 'var(--cream)',
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12, fontWeight: 600,
                              flexShrink: 0,
                              color: answered && (i === q.correct || (i === selected && i !== q.correct))
                                ? 'white' : 'var(--muted)',
                              transition: 'all 0.2s',
                            }}>
                              {answered && i === q.correct
                                ? '✓'
                                : answered && i === selected && i !== q.correct
                                ? '✗'
                                : ['A','B','C','D'][i]}
                            </span>
                            {option}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Explanation after answering */}
                    <AnimatePresence>
                      {answered && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{
                            marginTop: 16,
                            padding: '14px 16px',
                            borderRadius: 12,
                            background: selected === q.correct ? 'var(--sage-pale)' : 'var(--red-pale)',
                            border: `1px solid ${selected === q.correct ? 'var(--sage)' : 'var(--red)'}`,
                            fontSize: 14, lineHeight: 1.6,
                            color: 'var(--ink-soft)',
                          }}
                        >
                          <strong style={{
                            color: selected === q.correct ? 'var(--sage)' : 'var(--red)',
                            display: 'block', marginBottom: 4,
                          }}>
                            {selected === q.correct ? '✓ Correct!' : '✗ Not quite'}
                          </strong>
                          {q.explanation}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Next / Finish button */}
                    {answered && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}
                      >
                        <OriginButton variant="amber" onClick={handleNext}>
                          {isLastQuestion ? 'Continue Reading →' : 'Next Question →'}
                        </OriginButton>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
