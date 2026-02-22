// src/components/LogoPreloader.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function LogoPreloader({ onComplete, duration = 2 }) {
  const [phase, setPhase] = useState('init');

  useEffect(() => {
    const t0 = setTimeout(() => setPhase('loading'), 50);
    const t1 = setTimeout(() => setPhase('logoOut'), duration * 1000 + 50);
    const t2 = setTimeout(() => { setPhase('done'); onComplete?.(); }, duration * 1000 + 750);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [duration, onComplete]);

  if (phase === 'done') return null;

  const logoY       = phase === 'init' ? 60 : phase === 'logoOut' ? -60 : 0;
  const logoOpacity = phase === 'loading' ? 1 : 0;
  const bgOpacity   = phase === 'logoOut' ? 0 : 1;

  return (
    <motion.div
      animate={{ opacity: bgOpacity }}
      transition={{ duration: 0.65, ease: [0.7, 0.2, 0.2, 1] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', gap: '20px',
      }}
    >
      {/* Logo image — falls back to text if image missing */}
      <motion.div
        animate={{ y: logoY, opacity: logoOpacity }}
        transition={{ duration: 0.65, ease: [0.7, 0.2, 0.2, 1] }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
      >
        <img
          src="/TextAid_Logo.png"
          alt="Text·Aid"
          onError={e => { e.target.style.display = 'none'; }}
          style={{ width: 80, height: 80, objectFit: 'contain', userSelect: 'none' }}
          draggable={false}
        />
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '28px',
          color: 'var(--ink)',
          letterSpacing: '-0.5px',
        }}>
          Text<span style={{ color: 'var(--amber)' }}>·</span>Aid
        </span>
      </motion.div>

      {/* Subtle loading dots */}
      <motion.div
        animate={{ opacity: logoOpacity }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', gap: '6px', marginTop: '8px' }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--amber)',
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}