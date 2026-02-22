// src/components/TypewriterHero.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const PHRASES = [
  'Read more. Remember everything.',
  'Your personal reading tutor.',
  'Learn deeper. Retain longer.',
  'Built for curious minds.',
];

export default function TypewriterHero({ stats = [] }) {
  const [displayText, setDisplayText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting]   = useState(false);
  const containerRef = useRef(null);
  const timeoutRef   = useRef(null);

  const { scrollY } = useScroll();
  const heroOpacity  = useTransform(scrollY, [0, 140], [1, 0]);
  const heroY        = useTransform(scrollY, [0, 140], [0, -30]);
  const statsOpacity = useTransform(scrollY, [80, 180], [0, 1]);
  const statsY       = useTransform(scrollY, [80, 180], [20, 0]);

  useEffect(() => {
    const phrase = PHRASES[phraseIndex];
    const speed  = isDeleting ? 28 : 58;

    timeoutRef.current = setTimeout(() => {
      if (!isDeleting) {
        const next = phrase.slice(0, displayText.length + 1);
        setDisplayText(next);
        if (next === phrase) setTimeout(() => setIsDeleting(true), 2000);
      } else {
        const next = phrase.slice(0, displayText.length - 1);
        setDisplayText(next);
        if (next === '') {
          setIsDeleting(false);
          setPhraseIndex(i => (i + 1) % PHRASES.length);
        }
      }
    }, speed);

    return () => clearTimeout(timeoutRef.current);
  }, [displayText, isDeleting, phraseIndex]);

  return (
    <div ref={containerRef} style={{ position: 'relative', height: 180 }}>

      {/* Typewriter — fades out on scroll */}
      <motion.div
        style={{
          opacity: heroOpacity, y: heroY,
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '0 24px',
        }}
      >
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '2.5px',
          textTransform: 'uppercase', color: 'var(--amber)',
          marginBottom: 14,
        }}>
          Welcome back
        </p>

        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(26px, 4vw, 42px)',
          color: 'var(--ink)', lineHeight: 1.2,
          minHeight: '1.3em',
        }}>
          {displayText}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            style={{ color: 'var(--amber)', marginLeft: 1 }}
          >|</motion.span>
        </h1>
      </motion.div>

      {/* Stats — fades in on scroll */}
      {stats.length > 0 && (
        <motion.div
          style={{
            opacity: statsOpacity, y: statsY,
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 48,
          }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 38, color: 'var(--amber)', lineHeight: 1,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: 11, color: 'var(--muted)',
                marginTop: 5, letterSpacing: '0.5px',
              }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}