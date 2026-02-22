// src/components/AudioPlayer.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OriginButton from './OriginButton';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayer({
  chunk,          // current chunk object { id, text, title }
  voice,          // voice name e.g. 'rachel'
  onChunkEnd,     // called when audio finishes playing
  onError,        // called with error message string
}) {
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [progress, setProgress]     = useState(0);     // 0–100
  const [duration, setDuration]     = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed]           = useState(1);
  const [audioReady, setAudioReady] = useState(false);

  const audioRef    = useRef(null);
  const audioUrlRef = useRef(null);  // blob URL — we revoke on cleanup
  const chunkIdRef  = useRef(null);  // track which chunk the audio is for

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // ── Fetch audio whenever chunk changes ──────────────────────────────────────
  useEffect(() => {
    if (!chunk?.text) return;

    // Reset state
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setAudioReady(false);
    setIsLoading(true);
    chunkIdRef.current = chunk.id;

    // Cleanup previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    fetchAudio(chunk);
  }, [chunk?.id]);

  async function fetchAudio(chunk) {
    try {
      const res = await fetch(`${BASE_URL}/api/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunk.text, voice }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load audio');
      }

      // Make sure this response is still for the current chunk
      // (user might have navigated away while fetching)
      if (chunkIdRef.current !== chunk.id) return;

      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audio.playbackRate = speed;
      audioRef.current   = audio;

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setAudioReady(true);
        setIsLoading(false);
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100 || 0);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(100);
        onChunkEnd?.();
      });

      audio.addEventListener('error', () => {
        setIsLoading(false);
        onError?.('Audio playback error');
      });

    } catch (err) {
      if (chunkIdRef.current === chunk.id) {
        setIsLoading(false);
        onError?.(err.message);
      }
    }
  }

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // ── Controls ─────────────────────────────────────────────────────────────────
  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !audioReady) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }

  function seek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  }

  function setPlaybackSpeed(s) {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  return (
    <div style={{
      padding: '14px 28px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>

      {/* Play / Pause button */}
      <motion.button
        onClick={togglePlay}
        disabled={!audioReady}
        whileHover={audioReady ? { scale: 1.06 } : {}}
        whileTap={audioReady ? { scale: 0.94 } : {}}
        style={{
          width: 42, height: 42,
          borderRadius: '50%',
          background: audioReady ? 'var(--amber)' : 'var(--border)',
          border: 'none',
          color: 'white',
          fontSize: 15,
          cursor: audioReady ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s',
          boxShadow: audioReady ? '0 3px 12px rgba(212,130,42,0.3)' : 'none',
        }}
      >
        {isLoading
          ? <LoadingDots />
          : isPlaying ? '⏸' : '▶'}
      </motion.button>

      {/* Timeline */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {/* Scrubber bar */}
        <div
          onClick={seek}
          style={{
            height: 4, borderRadius: 4,
            background: 'var(--border)',
            cursor: duration ? 'pointer' : 'default',
            position: 'relative', overflow: 'visible',
          }}
        >
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
            style={{
              height: '100%', borderRadius: 4,
              background: 'var(--amber)',
              position: 'relative',
            }}
          >
            {/* Thumb dot */}
            {audioReady && (
              <div style={{
                position: 'absolute', right: -4, top: '50%',
                transform: 'translateY(-50%)',
                width: 10, height: 10,
                borderRadius: '50%',
                background: 'var(--amber)',
                boxShadow: '0 0 0 2px var(--bg)',
              }} />
            )}
          </motion.div>
        </div>

        {/* Time labels + voice indicator */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--muted)',
        }}>
          <span>{formatTime(currentTime)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Waveform isPlaying={isPlaying} />
            ElevenLabs · {voice}
          </span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Speed controls */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => setPlaybackSpeed(s)}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: speed === s ? 'var(--amber)' : 'var(--border)',
              background: speed === s ? 'var(--amber)' : 'transparent',
              color: speed === s ? 'white' : 'var(--muted)',
              fontSize: 11, fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

// Animated waveform bars
function Waveform({ isPlaying }) {
  return (
    <span style={{ display: 'flex', gap: 2, alignItems: 'center', height: 12 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <motion.span
          key={i}
          animate={isPlaying
            ? { scaleY: [0.4, 1, 0.4], opacity: [0.6, 1, 0.6] }
            : { scaleY: 0.4, opacity: 0.4 }
          }
          transition={isPlaying
            ? { duration: 0.7, repeat: Infinity, delay: i * 0.12 }
            : {}
          }
          style={{
            display: 'block',
            width: 2, height: 10,
            borderRadius: 2,
            background: 'var(--amber)',
            transformOrigin: 'center',
          }}
        />
      ))}
    </span>
  );
}

// Three bouncing dots for loading state
function LoadingDots() {
  return (
    <span style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          style={{
            display: 'block', width: 4, height: 4,
            borderRadius: '50%', background: 'white',
          }}
        />
      ))}
    </span>
  );
}
