// src/components/EyesLoader.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGES = [
  'Reading your document...',
  'Cleaning up the text...',
  'Detecting chapters...',
  'Generating titles...',
  'Building your library...',
  'Almost there...',
];

export default function EyesLoader({ isVisible, progress = 0, message = null }) {
  const [mousePos, setMousePos]     = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [msgIndex, setMsgIndex]     = useState(0);
  const blinkRef = useRef(null);
  const msgRef   = useRef(null);

  useEffect(() => {
    const onMove = e => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    function scheduleBlink() {
      blinkRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => { setIsBlinking(false); scheduleBlink(); }, 130);
      }, 2000 + Math.random() * 3000);
    }
    scheduleBlink();

    msgRef.current = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 2400);

    return () => { clearTimeout(blinkRef.current); clearInterval(msgRef.current); };
  }, [isVisible]);

  // Pupil offset based on mouse relative to screen center
  const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
  const dx = mousePos.x - cx;
  const dy = mousePos.y - cy;
  const dist  = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const max   = 10;
  const clamp = Math.min(dist / 120, 1) * max;
  const pupilOffset = { x: Math.cos(angle) * clamp, y: Math.sin(angle) * clamp };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 48, background: 'var(--bg)',
          }}
        >
          {/* Eyes */}
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {[0, 1].map(i => (
              <Eye key={i} isBlinking={isBlinking} pupilOffset={pupilOffset} />
            ))}
          </div>

          {/* Status */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={message || msgIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 20, color: 'var(--ink)',
                }}
              >
                {message || MESSAGES[msgIndex]}
              </motion.p>
            </AnimatePresence>

            {/* Progress bar */}
            <div style={{
              width: 220, height: 2,
              background: 'var(--border)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <motion.div
                animate={{ width: `${Math.max(progress, 5)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ height: '100%', background: 'var(--amber)', borderRadius: 2 }}
              />
            </div>

            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              {progress > 0 ? `${Math.round(progress)}%` : 'Processing...'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Eye({ isBlinking, pupilOffset }) {
  return (
    <div style={{
      width: 76, height: 76,
      borderRadius: '50%',
      background: 'var(--cream)',
      border: '2px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      transform: isBlinking ? 'scaleY(0.04)' : 'scaleY(1)',
      transition: 'transform 0.07s ease',
    }}>
      <motion.div
        animate={{ x: pupilOffset.x, y: pupilOffset.y }}
        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
        style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--ink)', position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 7, height: 7, borderRadius: '50%',
          background: 'white', opacity: 0.85,
        }} />
      </motion.div>
    </div>
  );
}