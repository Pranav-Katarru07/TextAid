// src/components/BookCard.jsx
import { motion } from 'framer-motion';

// Distinct spine colors for each book — cycles through these
const SPINE_PALETTES = [
  { from: '#2c3e50', to: '#3498db' },
  { from: '#6b2737', to: '#c0392b' },
  { from: '#1a6b4a', to: '#27ae60' },
  { from: '#4a2c6b', to: '#8e44ad' },
  { from: '#6b4a1a', to: '#d4822a' },
  { from: '#1a4a6b', to: '#2980b9' },
  { from: '#2d4a1a', to: '#5d8a2a' },
  { from: '#6b1a3a', to: '#c0395a' },
];

export default function BookCard({ book, index = 0, onClick }) {
  const palette = SPINE_PALETTES[index % SPINE_PALETTES.length];
  const progress = book.progress || 0;
  const score    = book.score    || null;

  return (
    <motion.div
      onClick={() => onClick?.(book)}
      whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(0,0,0,0.14)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Book spine / cover */}
      <div style={{
        height: 160,
        background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle texture lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 20px)',
        }} />

        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 14, color: 'rgba(255,255,255,0.9)',
          textAlign: 'center', lineHeight: 1.4,
          position: 'relative', zIndex: 1,
        }}>
          {book.title}
        </span>

        {/* Reading badge */}
        {progress > 0 && progress < 100 && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(4px)',
            color: 'white', fontSize: 10, fontWeight: 600,
            padding: '3px 8px', borderRadius: 20,
          }}>
            📖 Reading
          </div>
        )}

        {progress === 100 && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(39,174,96,0.8)',
            color: 'white', fontSize: 10, fontWeight: 600,
            padding: '3px 8px', borderRadius: 20,
          }}>
            ✓ Done
          </div>
        )}
      </div>

      {/* Book info */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{
          fontWeight: 500, fontSize: 14,
          color: 'var(--ink)', marginBottom: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {book.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          {book.author || 'Unknown author'}
        </div>

        {/* Progress bar */}
        <div style={{
          height: 3, background: 'var(--border)',
          borderRadius: 3, overflow: 'hidden', marginBottom: 6,
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            style={{ height: '100%', background: 'var(--amber)', borderRadius: 3 }}
          />
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {progress}% complete
          </span>
          {score !== null && (
            <span style={{
              fontSize: 11, color: 'var(--sage)', fontWeight: 600,
            }}>
              {score}% score
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// The "Add new book" card
export function AddBookCard({ onClick }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ borderColor: 'var(--amber)', background: 'var(--amber-pale)', y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{
        border: '2px dashed var(--border)',
        background: 'transparent',
        borderRadius: 16,
        minHeight: 240,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 10, cursor: 'pointer',
        color: 'var(--muted)',
      }}
    >
      <motion.span
        whileHover={{ rotate: 90 }}
        transition={{ type: 'spring', stiffness: 300 }}
        style={{ fontSize: 32, lineHeight: 1, display: 'block' }}
      >
        +
      </motion.span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Add new reading</span>
    </motion.div>
  );
}