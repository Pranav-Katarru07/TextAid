// src/components/VoiceChatButton.jsx
// Floating mic button in the bottom-right corner of the Reader.
// Integrates with voiceChat.js service for the full voice pipeline:
// mic → speech-to-text → /api/chat → /api/audio → plays response

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createVoiceChat, isSpeechRecognitionSupported, VOICE_STATES } from '../services/voicechat';

export default function VoiceChatButton({
  context,           // reading context passed to /api/chat
  voice,             // ElevenLabs voice — matches the reader voice
  history,           // shared chat history array
  onHistoryUpdate,   // (updatedHistory) => void — syncs with text chat
}) {
  const [state, setState]           = useState(VOICE_STATES.IDLE);
  const [messages, setMessages]     = useState([]);
  const [error, setError]           = useState(null);
  const [supported, setSupported]   = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const voiceChatRef   = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Set up voice chat instance ─────────────────────────────────────────────
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setSupported(false);
      return;
    }

    voiceChatRef.current = createVoiceChat({
      voice,

      onStateChange: (newState) => {
        setState(newState);
        if (newState !== VOICE_STATES.ERROR) setError(null);
        if (newState === VOICE_STATES.LISTENING) setShowTranscript(true);
      },

      onTranscript: (text) => {
        setMessages(prev => [...prev, { role: 'user', content: text }]);
      },

      onReply: ({ reply, history: updatedHistory }) => {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        onHistoryUpdate?.(updatedHistory);
      },

      onError: (message) => {
        setError(message);
      },
    });

    return () => voiceChatRef.current?.destroy();
  }, [voice]);

  // ── Keep context and history fresh ────────────────────────────────────────
  useEffect(() => {
    voiceChatRef.current?.setContext(context);
  }, [context]);

  useEffect(() => {
    voiceChatRef.current?.setHistory(history);
  }, [history]);

  // ── Auto-scroll transcript ─────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Mic click ──────────────────────────────────────────────────────────────
  function handleClick() {
    if (!voiceChatRef.current) return;
    if (state === VOICE_STATES.LISTENING) {
      voiceChatRef.current.stop();
    } else if (state === VOICE_STATES.IDLE || state === VOICE_STATES.ERROR) {
      voiceChatRef.current.start();
    }
  }

  const config = {
    [VOICE_STATES.IDLE]:       { icon: '🎙️', title: 'Voice chat',      clickable: true  },
    [VOICE_STATES.LISTENING]:  { icon: '⏹',  title: 'Stop listening',  clickable: true  },
    [VOICE_STATES.PROCESSING]: { icon: '⏳',  title: 'Thinking...',     clickable: false },
    [VOICE_STATES.SPEAKING]:   { icon: '🔊',  title: 'AI speaking...',  clickable: false },
    [VOICE_STATES.ERROR]:      { icon: '🎙️', title: 'Retry',           clickable: true  },
  }[state] || { icon: '🎙️', title: 'Voice chat', clickable: true };

  if (!supported) return null;

  // Glow config per state
  const glowShadow = {
    [VOICE_STATES.IDLE]:       ['0 4px 18px rgba(0,0,0,0.18), 0 0 14px rgba(212,130,42,0.35)', '0 4px 18px rgba(0,0,0,0.18), 0 0 26px rgba(212,130,42,0.6)', '0 4px 18px rgba(0,0,0,0.18), 0 0 14px rgba(212,130,42,0.35)'],
    [VOICE_STATES.LISTENING]:  ['0 4px 18px rgba(0,0,0,0.18), 0 0 22px rgba(212,130,42,0.7)', '0 4px 18px rgba(0,0,0,0.18), 0 0 40px rgba(212,130,42,1)', '0 4px 18px rgba(0,0,0,0.18), 0 0 22px rgba(212,130,42,0.7)'],
    [VOICE_STATES.PROCESSING]: '0 4px 16px rgba(0,0,0,0.2)',
    [VOICE_STATES.SPEAKING]:   ['0 4px 18px rgba(0,0,0,0.18), 0 0 14px rgba(100,160,120,0.5)', '0 4px 18px rgba(0,0,0,0.18), 0 0 28px rgba(100,160,120,0.8)', '0 4px 18px rgba(0,0,0,0.18), 0 0 14px rgba(100,160,120,0.5)'],
    [VOICE_STATES.ERROR]:      '0 4px 16px rgba(0,0,0,0.2)',
  }[state];

  const glowTransition = (state === VOICE_STATES.IDLE || state === VOICE_STATES.LISTENING || state === VOICE_STATES.SPEAKING)
    ? { duration: state === VOICE_STATES.LISTENING ? 0.8 : 2, repeat: Infinity, ease: 'easeInOut' }
    : {};

  return (
    <div style={{
      position: 'fixed',
      top: 127, right: 24,
      zIndex: 150,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 10,
      pointerEvents: 'none',   // container doesn't block clicks
    }}>

      {/* Mic button */}
      <motion.button
        onClick={handleClick}
        disabled={!config.clickable}
        title={config.title}
        whileHover={config.clickable ? { scale: 1.08 } : {}}
        whileTap={config.clickable ? { scale: 0.92 } : {}}
        animate={{ boxShadow: glowShadow }}
        transition={glowTransition}
        style={{
          width: 48, height: 48, borderRadius: '50%',
          border: 'none',
          background: state === VOICE_STATES.ERROR
            ? 'var(--red)'
            : state === VOICE_STATES.SPEAKING
            ? 'var(--sage)'
            : 'var(--ink)',
          color: 'white', fontSize: 19,
          cursor: config.clickable ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          transition: 'background 0.25s',
          pointerEvents: 'all',
        }}
      >
        {config.icon}

        {/* Double pulse rings when listening */}
        {state === VOICE_STATES.LISTENING && (
          <>
            <motion.span
              animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                border: '2px solid var(--amber)', pointerEvents: 'none',
              }}
            />
            <motion.span
              animate={{ scale: [1, 2.1], opacity: [0.3, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut', delay: 0.35 }}
              style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                border: '2px solid var(--amber)', pointerEvents: 'none',
              }}
            />
          </>
        )}
      </motion.button>

      {/* Status pill */}
      <AnimatePresence>
        {state !== VOICE_STATES.IDLE && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              background: 'var(--ink)', color: 'white',
              fontSize: 11, fontWeight: 500,
              padding: '5px 12px', borderRadius: 20,
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}
          >
            {state === VOICE_STATES.LISTENING  && '● Listening...'}
            {state === VOICE_STATES.PROCESSING && '⏳ Thinking...'}
            {state === VOICE_STATES.SPEAKING   && '🔊 Speaking...'}
            {state === VOICE_STATES.ERROR      && '⚠ Tap to retry'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript popover */}
      <AnimatePresence>
        {showTranscript && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            style={{
              width: 280, maxHeight: 300,
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              pointerEvents: 'all',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexShrink: 0,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '1px',
                color: 'var(--amber)',
              }}>
                Voice Chat
              </span>
              <button
                onClick={() => setShowTranscript(false)}
                style={{
                  background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 13,
                  color: 'var(--muted)', padding: '2px 4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div style={{
              overflowY: 'auto', padding: '10px',
              display: 'flex', flexDirection: 'column', gap: 7, flex: 1,
            }}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <div style={{
                    padding: '7px 11px',
                    borderRadius: msg.role === 'user'
                      ? '11px 11px 3px 11px'
                      : '11px 11px 11px 3px',
                    background: msg.role === 'user' ? 'var(--amber)' : 'var(--cream)',
                    color: msg.role === 'user' ? 'white' : 'var(--ink-soft)',
                    fontSize: 13, lineHeight: 1.5,
                  }}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {/* Thinking / speaking dots */}
              {(state === VOICE_STATES.PROCESSING || state === VOICE_STATES.SPEAKING) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <div style={{
                    padding: '8px 13px',
                    background: 'var(--cream)',
                    borderRadius: '11px 11px 11px 3px',
                    display: 'flex', gap: 4, alignItems: 'center',
                  }}>
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                        style={{
                          display: 'block', width: 5, height: 5,
                          borderRadius: '50%', background: 'var(--muted)',
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error bar */}
            {error && (
              <div style={{
                padding: '7px 14px',
                background: 'var(--red-pale)',
                borderTop: '1px solid var(--red)',
                fontSize: 12, color: 'var(--red)', flexShrink: 0,
              }}>
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
