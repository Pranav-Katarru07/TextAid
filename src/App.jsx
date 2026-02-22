// src/App.jsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LogoPreloader from './components/LogoPreloader';
import Home from './pages/Home';
import Reader from './pages/Reader';

export default function App() {
  const [preloadDone, setPreloadDone]   = useState(false);
  const [currentPage, setCurrentPage]   = useState('home');
  const [selectedBook, setSelectedBook] = useState(null);

  function openBook(book) {
    setSelectedBook(book);
    setCurrentPage('reader');
  }

  function goHome() {
    setCurrentPage('home');
    setSelectedBook(null);
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
            <Home onOpenBook={openBook} />
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