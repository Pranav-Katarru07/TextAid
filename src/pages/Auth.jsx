// src/pages/Auth.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';

export default function Auth({ onAuth }) {
  const [mode, setMode]         = useState('login');   // 'login' | 'signup'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      onAuth({ token: data.token, email: data.email });

    } catch {
      setError('Could not reach the server. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <header style={{
        padding: '20px 36px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26, color: 'var(--ink)',
          letterSpacing: '-0.5px',
        }}>
          Text<span style={{ color: 'var(--amber)' }}>·</span>Aid
        </span>
        <ThemeToggle />
      </header>

      {/* Center card */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width: '100%',
            maxWidth: 400,
          }}
        >
          {/* Brand mark */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52,
              borderRadius: 16,
              background: 'var(--amber)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 24,
              boxShadow: '0 4px 20px rgba(212,130,42,0.35)',
            }}>
              📖
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 28, fontWeight: 400,
              color: 'var(--ink)', marginBottom: 6,
            }}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>
              {mode === 'login'
                ? 'Sign in to access your library'
                : 'Start your reading journey today'}
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: 'var(--cream)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 28,
            boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
          }}>

            {/* Mode toggle tabs */}
            <div style={{
              display: 'flex',
              background: 'var(--bg)',
              borderRadius: 10,
              padding: 4,
              marginBottom: 24,
            }}>
              {['login', 'signup'].map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13, fontWeight: 500,
                    fontFamily: 'var(--font-sans)',
                    background: mode === m ? 'var(--cream)' : 'transparent',
                    color: mode === m ? 'var(--ink)' : 'var(--muted)',
                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.18s',
                  }}
                >
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12, fontWeight: 500,
                  color: 'var(--muted)',
                  marginBottom: 6,
                  letterSpacing: '0.3px',
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    background: 'var(--white)',
                    color: 'var(--ink)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    transition: 'border-color 0.18s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12, fontWeight: 500,
                  color: 'var(--muted)',
                  marginBottom: 6,
                  letterSpacing: '0.3px',
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    background: 'var(--white)',
                    color: 'var(--ink)',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    transition: 'border-color 0.18s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--red-pale)',
                      border: '1px solid var(--red)',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--red)',
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.02, y: -1 } : {}}
                whileTap={!loading ? { scale: 0.97 } : {}}
                style={{
                  marginTop: 4,
                  padding: '13px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: loading ? 'var(--border)' : 'var(--amber)',
                  color: 'white',
                  fontSize: 14, fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(212,130,42,0.35)',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'login' ? 'Log in' : 'Create account'}
              </motion.button>
            </form>
          </div>

          {/* Switch mode hint */}
          <p style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 13,
            color: 'var(--muted)',
          }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={switchMode}
              style={{
                background: 'none', border: 'none',
                color: 'var(--amber)', fontWeight: 500,
                cursor: 'pointer', fontSize: 13,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
