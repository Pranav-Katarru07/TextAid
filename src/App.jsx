// src/App.jsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LogoPreloader from './components/LogoPreloader';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Reader from './pages/Reader';

export default function App() {
  const [preloadDone, setPreloadDone]   = useState(false);
  const [currentPage, setCurrentPage]   = useState('home');
  const [selectedBook, setSelectedBook] = useState(null);

  // ── Auth state — persisted in localStorage ────────────────────────────────
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('textaid_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  function handleAuth(userData) {
    setUser(userData);
    localStorage.setItem('textaid_user', JSON.stringify(userData));
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem('textaid_user');
    setCurrentPage('home');
    setSelectedBook(null);
  }

  function openBook(book) {
    setSelectedBook(book);
    setCurrentPage('reader');
  }

  function goHome() {
    setCurrentPage('home');
    setSelectedBook(null);
  }

  // Show auth page when not logged in (after preloader finishes)
  if (preloadDone && !user) {
    return (
      <motion.div
        key="auth"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Auth onAuth={handleAuth} />
      </motion.div>
    );
  }

  return (
    <>
      {/* Logo preloader — shown once on first load */}
      {!preloadDone && (
        <LogoPreloader duration={2} onComplete={() => setPreloadDone(true)} />
      )}

      {/* Pages with animated transitions */}
      <AnimatePresence mode="wait">
        {currentPage === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            <Home onOpenBook={openBook} user={user} onLogout={handleLogout} />
          </motion.div>
        ) : (
          <motion.div
            key="reader"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            <Reader book={selectedBook} onGoHome={goHome} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
