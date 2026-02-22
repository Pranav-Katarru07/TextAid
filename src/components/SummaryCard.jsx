// src/components/SummaryCard.jsx
import { motion, AnimatePresence } from 'framer-motion';
import OriginButton from './OriginButton';

export default function SummaryCard({ isVisible, chapter, onContinue }) {
  const summary = chapter?.summary;
  const isFiction = !summary?.keyPoints;  // fiction has keyEvents, non-fiction has keyPoints

  return (
    <AnimatePresence>
      {isVisible && summary && (
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

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 301,
              width: '100%', maxWidth: 580,
              maxHeight: '85vh',
              background: 'var(--white)',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
              margin: '0 16px',
            }}
          >
            {/* Amber top bar */}
            <div style={{
              height: 4,
              background: 'linear-gradient(90deg, var(--amber), var(--sage))',
            }} />

            <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 4px)' }}>
              {/* Header */}
              <div style={{ padding: '28px 32px 20px' }}>
                <p style={{
                  fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '2px',
                  color: 'var(--amber)', marginBottom: 8,
                }}>
                  {isFiction ? '📖 Chapter Recap' : '📋 Chapter Summary'}
                </p>
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 26, fontWeight: 400,
                  color: 'var(--ink)', marginBottom: 4,
                }}>
                  {chapter?.chapterTitle}
                </h2>
                {summary.mood && (
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Mood: {summary.mood}
                  </p>
                )}
              </div>

              <div style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* ADHD one-liner */}
                {summary.adhdRecap && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                      background: 'linear-gradient(135deg, var(--amber-pale), #fff9f0)',
                      border: '1px solid var(--amber-border)',
                      borderRadius: 14, padding: '18px 20px',
                    }}
                  >
                    <p style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--amber)',
                      textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8,
                    }}>
                      ⚡ ADHD Recap
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 18, lineHeight: 1.5, color: 'var(--ink)',
                    }}>
                      {summary.adhdRecap}
                    </p>
                  </motion.div>
                )}

                {/* Summary paragraph */}
                {summary.summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <SectionLabel>Overview</SectionLabel>
                    <p style={{
                      fontSize: 14, lineHeight: 1.7,
                      color: 'var(--ink-soft)',
                    }}>
                      {summary.summary}
                    </p>
                  </motion.div>
                )}

                {/* Non-fiction: key points */}
                {summary.keyPoints && summary.keyPoints.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <SectionLabel>Key Points</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {summary.keyPoints.map((point, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.06 }}
                          style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
                        >
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--amber)', flexShrink: 0, marginTop: 7,
                          }} />
                          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
                            {point}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Non-fiction: key terms */}
                {summary.keyTerms && summary.keyTerms.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <SectionLabel>Key Terms</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {summary.keyTerms.map((item, i) => (
                        <div key={i} style={{
                          padding: '10px 14px',
                          background: 'var(--cream)',
                          borderRadius: 8,
                          display: 'flex', gap: 10,
                        }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', flexShrink: 0 }}>
                            {item.term}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                            — {item.definition}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Fiction: key events */}
                {summary.keyEvents && summary.keyEvents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <SectionLabel>Key Events</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {summary.keyEvents.map((event, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.06 }}
                          style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
                        >
                          <span style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }}>→</span>
                          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
                            {event}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Fiction: characters */}
                {summary.characters && summary.characters.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <SectionLabel>Characters</SectionLabel>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 10,
                    }}>
                      {summary.characters.map((char, i) => (
                        <div key={i} style={{
                          padding: '12px 14px',
                          background: 'var(--cream)',
                          borderRadius: 10,
                        }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>
                            {char.name}
                          </p>
                          <p style={{
                            fontSize: 11, color: 'var(--amber)',
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                            marginBottom: 6,
                          }}>
                            {char.role}
                          </p>
                          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
                            {char.development}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* How it connects (non-fiction) */}
                {summary.howItConnects && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--sage-pale)',
                      borderRadius: 10,
                      border: '1px solid rgba(107,143,113,0.2)',
                    }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage)', marginBottom: 4 }}>
                      🔗 How this connects
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                      {summary.howItConnects}
                    </p>
                  </motion.div>
                )}

                {/* Continue button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{ display: 'flex', justifyContent: 'flex-end' }}
                >
                  <OriginButton variant="amber" size="lg" onClick={onContinue}>
                    Next Chapter →
                  </OriginButton>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '1px',
      color: 'var(--muted)', marginBottom: 10,
    }}>
      {children}
    </p>
  );
}
