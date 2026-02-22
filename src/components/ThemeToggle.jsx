// src/components/ThemeToggle.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('textaid-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('textaid-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <motion.button
      onClick={() => setIsDark(p => !p)}
      whileTap={{ scale: 0.9 }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 50, height: 26,
        borderRadius: 13,
        border: '1.5px solid var(--border)',
        background: isDark ? 'var(--ink)' : 'var(--cream-deep)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '3px',
        transition: 'background 0.3s, border-color 0.3s',
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: isDark ? 22 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          width: 18, height: 18,
          borderRadius: '50%',
          background: isDark ? 'var(--amber)' : 'var(--white)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          flexShrink: 0,
        }}
      >
        {isDark ? '🌙' : '☀️'}
      </motion.div>
    </motion.button>
  );
}