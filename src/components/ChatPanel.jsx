// src/components/ChatPanel.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OriginButton from './OriginButton';

export default function ChatPanel({
  isOpen,
  onClose,
  context,      // { bookTitle, contentType, currentChunkTitle, currentChapterTitle, textReadSoFar }
  history,      // conversation history array
  onHistoryUpdate,  // (updatedHistory) => void
}) {
  const [input, setInput]       = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError]       = useState(null);
  const messagesEndRef          = useRef(null);
  const inputRef                = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isThinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isThinking) return;

    setInput('');
    setError(null);
    setIsThinking(true);

    // Optimistically add user message
    const optimisticHistory = [
      ...(history || []),
      { role: 'user', content: text },
    ];
    onHistoryUpdate?.(optimisticHistory);

    try {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context,
          history: history || [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get response');
      }

      const data = await res.json();
      onHistoryUpdate?.(data.history);

    } catch (err) {
      setError(err.message);
      // Roll back optimistic update on error
      onHistoryUpdate?.(history || []);
    } finally {
      setIsThinking(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Suggested starter questions
  const suggestions = [
    'Explain this section in simple terms',
    'What are the key ideas so far?',
    'How does this connect to what came before?',
    'Test my understanding',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 360, zIndex: 200,
            background: 'var(--white)',
            borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexShrink: 0,
          }}>
            <div>
              <h3 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18, fontWeight: 400, color: 'var(--ink)',
              }}>
                AI Assistant
              </h3>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {context?.currentChapterTitle || 'Reading assistant'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--cream)', border: 'none',
                cursor: 'pointer', fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted)',
                transition: 'background 0.2s',
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '16px',
            display: 'flex', flexDirection: 'column',
            gap: 12,
          }}>

            {/* Welcome message */}
            {(!history || history.length === 0) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--cream)',
                  borderRadius: '14px 14px 14px 4px',
                  fontSize: 14, lineHeight: 1.6,
                  color: 'var(--ink-soft)',
                  marginBottom: 16,
                }}>
                  Hi! I'm your reading assistant for <em>{context?.bookTitle}</em>. Ask me anything about what you've read, or let's discuss the ideas. 📚
                </div>

                {/* Suggestion chips */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 6,
                }}>
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        fontSize: 12, color: 'var(--muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Conversation bubbles */}
            {(history || []).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8, x: msg.role === 'user' ? 8 : -8 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '86%',
                }}
              >
                <div style={{
                  padding: '11px 14px',
                  borderRadius: msg.role === 'user'
                    ? '14px 14px 4px 14px'
                    : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? 'var(--amber)' : 'var(--cream)',
                  color: msg.role === 'user' ? 'white' : 'var(--ink-soft)',
                  fontSize: 14, lineHeight: 1.55,
                }}>
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {/* Thinking indicator */}
            {isThinking && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ alignSelf: 'flex-start' }}
              >
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--cream)',
                  borderRadius: '14px 14px 14px 4px',
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                      style={{
                        display: 'block', width: 6, height: 6,
                        borderRadius: '50%', background: 'var(--muted)',
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--red-pale)',
                borderRadius: 10, fontSize: 13,
                color: 'var(--red)',
              }}>
                {error} — try again
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8, flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the reading..."
              rows={1}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 20,
                border: '1.5px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--ink)',
                fontFamily: 'var(--font-sans)',
                fontSize: 14, resize: 'none',
                outline: 'none',
                transition: 'border-color 0.2s',
                maxHeight: 100, overflowY: 'auto',
                lineHeight: 1.5,
              }}
              onFocus={e => e.target.style.borderColor = 'var(--amber)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <motion.button
              onClick={sendMessage}
              disabled={!input.trim() || isThinking}
              whileHover={input.trim() ? { scale: 1.08 } : {}}
              whileTap={input.trim() ? { scale: 0.92 } : {}}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: input.trim() ? 'var(--amber)' : 'var(--border)',
                border: 'none', color: 'white', fontSize: 16,
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, alignSelf: 'flex-end',
                transition: 'background 0.2s',
                boxShadow: input.trim() ? '0 3px 10px rgba(212,130,42,0.3)' : 'none',
              }}
            >
              ↑
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
