// src/pages/Home.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TypewriterHero from '../components/TypewriterHero';
import ThemeToggle from '../components/ThemeToggle';
import OriginButton from '../components/OriginButton';
import BookCard, { AddBookCard } from '../components/BookCard';
import EyesLoader from '../components/EyesLoader';

// ── Stagger animation variants ─────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

const STATS = [
  { value: '84%',  label: 'Avg. Score'        },
  { value: '12h',  label: 'Read This Month'   },
  { value: '47',   label: 'Quizzes Completed' },
];

export default function Home({ onOpenBook, user, onLogout }) {
  const [books, setBooks]               = useState([]);
  const [showUpload, setShowUpload]     = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage]   = useState(null);
  const [dragOver, setDragOver]         = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [contentType, setContentType]   = useState('nonfiction');
  const [voice, setVoice]               = useState('rachel');
  const [loadingBookId, setLoadingBookId] = useState(null);
  const fileInputRef                    = useRef(null);

  // ── Load saved books from DB on mount ────────────────────────────────────────
  useEffect(() => {
    if (!user?.token) { console.warn('No token — skipping library fetch'); return; }
    fetch('/api/documents', {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(r => r.json())
      .then(docs => {
        console.log('Library fetch response:', docs);
        if (!Array.isArray(docs)) { console.warn('Expected array, got:', docs); return; }
        setBooks(docs.map(doc => ({
          id:            doc._id,
          dbId:          doc._id,
          title:         doc.title || doc.filename.replace(/\.pdf$/i, ''),
          author:        doc.author || '',
          progress:      0,
          score:         null,
          contentType:   doc.contentType,
          voice:         doc.voice,
          totalChapters: doc.totalChapters,
          totalChunks:   doc.totalChunks,
          // chapters intentionally omitted — loaded on demand when Read is clicked
        })));
      })
      .catch(err => console.error('Failed to load library:', err));
  }, [user?.token]);

  // ── File handling ────────────────────────────────────────────────────────────
  function handleFileSelect(file) {
    if (!file || file.type !== 'application/pdf') return;
    setSelectedFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }

  // ── Upload to backend ────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!selectedFile) return;

    setShowUpload(false);
    setIsProcessing(true);
    setUploadProgress(5);
    setUploadMessage('Reading your document...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('contentType', contentType);
      formData.append('voice', voice);

      // Simulate progress while backend processes
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) { clearInterval(progressInterval); return prev; }
          return prev + Math.random() * 8;
        });
      }, 1800);

      const messages = [
        'Cleaning up the text...',
        'Detecting chapters...',
        'Generating chunk titles...',
        'Building your library...',
      ];
      let mi = 0;
      const msgInterval = setInterval(() => {
        mi++;
        if (mi < messages.length) setUploadMessage(messages[mi]);
      }, 3000);

      const headers = {};
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      clearInterval(progressInterval);
      clearInterval(msgInterval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();

      setUploadProgress(100);
      setUploadMessage('Saved to your library!');

      // Add the processed book to the library (chapters already in memory)
      const newBook = {
        id:            data.savedDocumentId || Date.now(),
        dbId:          data.savedDocumentId || null,
        title:         selectedFile.name.replace(/\.pdf$/i, ''),
        author:        '',
        progress:      0,
        score:         null,
        contentType,
        voice,
        chapters:      data.chapters,
        totalChapters: data.totalChapters,
        totalChunks:   data.totalChunks,
      };

      setBooks(prev => [newBook, ...prev]);

      setTimeout(() => {
        setIsProcessing(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setUploadMessage(null);
        // No auto-open — user clicks Read when they're ready
      }, 800);

    } catch (error) {
      console.error('Upload error:', error);
      setIsProcessing(false);
      setUploadProgress(0);
      setUploadMessage(null);
      alert(`Upload failed: ${error.message}`);
    }
  }

  // ── Open a book — fetch chapters from DB if not already in memory ────────────
  async function handleReadBook(book) {
    if (book.chapters?.length > 0) {
      onOpenBook?.(book);
      return;
    }
    if (!book.dbId) return;
    setLoadingBookId(book.id);
    try {
      const res = await fetch(`/api/documents/${book.dbId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const full = await res.json();
      const hydrated = { ...book, chapters: full.chapters };
      setBooks(prev => prev.map(b => b.id === book.id ? hydrated : b));
      onOpenBook?.(hydrated);
    } catch {
      alert('Failed to load book. Please try again.');
    } finally {
      setLoadingBookId(null);
    }
  }

  // ── Delete a book ─────────────────────────────────────────────────────────────
  async function handleDeleteBook(book) {
    if (!book.dbId) { setBooks(prev => prev.filter(b => b.id !== book.id)); return; }
    try {
      await fetch(`/api/documents/${book.dbId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setBooks(prev => prev.filter(b => b.id !== book.id));
    } catch {
      alert('Failed to delete book.');
    }
  }

  return (
    <>
      {/* Eyes loader while processing */}
      <EyesLoader
        isVisible={isProcessing}
        progress={uploadProgress}
        message={uploadMessage}
      />

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => { setShowUpload(false); setSelectedFile(null); }}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            dragOver={dragOver}
            selectedFile={selectedFile}
            onFileSelect={e => handleFileSelect(e.target.files[0])}
            fileInputRef={fileInputRef}
            contentType={contentType}
            setContentType={setContentType}
            voice={voice}
            setVoice={setVoice}
            onUpload={handleUpload}
          />
        )}
      </AnimatePresence>

      {/* Main page */}
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        overflowX: 'hidden',
      }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            padding: '20px 36px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
            position: 'sticky', top: 0, zIndex: 100,
            backdropFilter: 'blur(12px)',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26, color: 'var(--ink)',
            letterSpacing: '-0.5px',
          }}>
            Text<span style={{ color: 'var(--amber)' }}>·</span>Aid
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThemeToggle />
            {user && (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {user.email}
              </span>
            )}
            <OriginButton
              variant="amber"
              icon="+"
              onClick={() => setShowUpload(true)}
            >
              New Reading
            </OriginButton>
            {onLogout && (
              <OriginButton variant="ghost" size="sm" onClick={onLogout}>
                Log out
              </OriginButton>
            )}
          </div>
        </motion.header>

        {/* ── Hero typewriter ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <TypewriterHero stats={STATS} />
        </motion.div>

        {/* ── Divider ─────────────────────────────────────────────────────────── */}
        <div style={{
          height: 1, background: 'var(--border)',
          margin: '0 36px',
        }} />

        {/* ── Library section ─────────────────────────────────────────────────── */}
        <div style={{ padding: '32px 36px 64px' }}>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 24,
            }}
          >
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22, fontWeight: 400,
              color: 'var(--ink)',
            }}>
              Your Library
            </h2>
            <span style={{ fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
              {books.length} book{books.length !== 1 ? 's' : ''}
            </span>
          </motion.div>

          {/* Books grid */}
          <motion.div
            key={books.length === 0 ? 'empty' : 'loaded'}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            {books.map((book, i) => (
              <motion.div key={book.id} variants={cardVariants}>
                <BookCard
                  book={book}
                  index={i}
                  onRead={handleReadBook}
                  onDelete={handleDeleteBook}
                  loading={loadingBookId === book.id}
                />
              </motion.div>
            ))}

            <motion.div variants={cardVariants}>
              <AddBookCard onClick={() => setShowUpload(true)} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
}


// ── Upload Modal ───────────────────────────────────────────────────────────────
function UploadModal({
  onClose, onDrop, onDragOver, onDragLeave, dragOver,
  selectedFile, onFileSelect, fileInputRef,
  contentType, setContentType, voice, setVoice, onUpload,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(26,22,20,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--white)',
          borderRadius: 24, padding: 36,
          width: '100%', maxWidth: 480,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
      >
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26, fontWeight: 400,
          color: 'var(--ink)', marginBottom: 6,
        }}>
          Start a new reading
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
          Upload your document and we'll prepare it for you.
        </p>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver || selectedFile ? 'var(--amber)' : 'var(--border)'}`,
            borderRadius: 14,
            padding: '36px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver || selectedFile ? 'var(--amber-pale)' : 'transparent',
            transition: 'all 0.2s',
            marginBottom: 20,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={onFileSelect}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: 36, marginBottom: 10 }}>
            {selectedFile ? '✅' : '📄'}
          </div>
          {selectedFile ? (
            <>
              <p style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB · Click to change
              </p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 500, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>
                Drop your PDF here
              </p>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                or click to browse · up to 50MB
              </p>
            </>
          )}
        </div>

        {/* Form fields */}
        <FormField label="Content Type">
          <select
            value={contentType}
            onChange={e => setContentType(e.target.value)}
            style={selectStyle}
          >
            <option value="nonfiction">Non-Fiction / Textbook</option>
            <option value="fiction">Novel / Fiction</option>
          </select>
        </FormField>

        <FormField label="Narrator Voice">
          <select
            value={voice}
            onChange={e => setVoice(e.target.value)}
            style={selectStyle}
          >
            <option value="rachel">Rachel — Warm & Clear</option>
            <option value="callum">Callum — Deep & Measured</option>
            <option value="charlotte">Charlotte — Expressive</option>
            <option value="daniel">Daniel — Authoritative</option>
          </select>
        </FormField>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <OriginButton variant="ghost" onClick={onClose}>Cancel</OriginButton>
          <OriginButton
            variant="amber"
            onClick={onUpload}
            disabled={!selectedFile}
          >
            Save to Library
          </OriginButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 12,
        fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const selectStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  background: 'var(--bg)',
  color: 'var(--ink)',
  outline: 'none',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
};