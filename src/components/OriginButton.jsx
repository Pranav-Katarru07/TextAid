// src/components/OriginButton.jsx
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OriginButton({
  children, onClick, variant = 'primary',
  disabled = false, type = 'button',
  style = {}, className = '', icon = null, size = 'md',
}) {
  const [ripples, setRipples] = useState([]);
  const buttonRef = useRef(null);

  function handleClick(e) {
    if (disabled) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const id = Date.now();
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    onClick?.(e);
  }

  const variants = {
    primary: { bg: 'var(--ink)',   color: 'var(--bg)',    border: 'transparent',   ripple: 'rgba(255,255,255,0.2)' },
    amber:   { bg: 'var(--amber)', color: '#fff',         border: 'transparent',   ripple: 'rgba(255,255,255,0.25)' },
    ghost:   { bg: 'transparent',  color: 'var(--ink)',   border: 'var(--border)', ripple: 'rgba(0,0,0,0.05)' },
    danger:  { bg: 'transparent',  color: 'var(--red)',   border: 'var(--red)',    ripple: 'rgba(192,57,43,0.1)' },
    sage:    { bg: 'var(--sage)',   color: '#fff',         border: 'transparent',   ripple: 'rgba(255,255,255,0.2)' },
  };

  const sizes = {
    sm: { padding: '7px 14px', fontSize: '13px', borderRadius: '8px' },
    md: { padding: '10px 20px', fontSize: '14px', borderRadius: '10px' },
    lg: { padding: '14px 28px', fontSize: '15px', borderRadius: '12px' },
  };

  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      onClick={handleClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02, y: -1, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', gap: '8px',
        padding: s.padding,
        borderRadius: s.borderRadius,
        border: `1.5px solid ${v.border}`,
        background: v.bg, color: v.color,
        fontFamily: 'var(--font-sans)',
        fontSize: s.fontSize, fontWeight: '500',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap', userSelect: 'none',
        transition: 'background 0.2s, color 0.2s, border-color 0.2s',
        ...style,
      }}
    >
      {icon && <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>}
      {children}

      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: r.x, top: r.y,
              width: 40, height: 40,
              borderRadius: '50%',
              background: v.ripple,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
}