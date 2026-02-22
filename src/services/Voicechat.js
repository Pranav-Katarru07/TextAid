// ─── voiceChat.js ─────────────────────────────────────────────────────────────
// Handles the full voice conversation pipeline:
//   1. Record user's voice via Web Speech API (browser built-in, free)
//   2. Send transcript to /api/chat → get text reply from Gemini
//   3. Send reply text to /api/audio → get ElevenLabs audio back
//   4. Play the audio response automatically
//
// Usage in your React Reader component:
//   import { createVoiceChat } from './services/voiceChat';
//   const voiceChat = createVoiceChat({ baseUrl, voice, onStateChange, onTranscript, onReply, onError });
//   voiceChat.start();   // user clicks mic
//   voiceChat.stop();    // user clicks again
//   voiceChat.destroy(); // cleanup on unmount
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


// ─── Check browser support ────────────────────────────────────────────────────
export function isSpeechRecognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}


// ─── States the voice chat can be in ─────────────────────────────────────────
// Your UI listens to these via the onStateChange callback
// and updates the mic button appearance accordingly
export const VOICE_STATES = {
  IDLE:         'idle',         // mic button — ready to start
  LISTENING:    'listening',    // mic button pulsing — recording user's voice
  PROCESSING:   'processing',   // spinner — sending to Gemini
  SPEAKING:     'speaking',     // audio wave — AI is talking
  ERROR:        'error'         // something went wrong
};


// ─── Main factory function ────────────────────────────────────────────────────
export function createVoiceChat({
  voice = 'rachel',             // ElevenLabs voice — should match the reader voice
  onStateChange = () => {},     // (state: VOICE_STATES) => void
  onTranscript  = () => {},     // (text: string) => void  — show what user said
  onReply       = () => {},     // ({ reply, history }) => void  — show AI text reply
  onError       = () => {},     // (message: string) => void
} = {}) {

  // Internal state
  let recognition   = null;    // Web Speech API instance
  let currentAudio  = null;    // currently playing Audio element
  let isListening   = false;
  let chatHistory   = [];      // full conversation history (sent to /api/chat each time)
  let readingContext = null;   // set via voiceChat.setContext(context)


  // ── Speech Recognition Setup ────────────────────────────────────────────────
  function createRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error('Speech recognition is not supported in this browser. Try Chrome or Edge.');
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;        // stop automatically after user pauses
    rec.interimResults = false;    // only return final results, not partials
    rec.lang = 'en-US';

    rec.onstart = () => {
      isListening = true;
      onStateChange(VOICE_STATES.LISTENING);
    };

    rec.onend = () => {
      isListening = false;
      // Note: onend fires even with no result — onresult handles the transcript
    };

    rec.onerror = (event) => {
      isListening = false;
      const messages = {
        'no-speech':          'No speech detected — try speaking closer to your mic',
        'audio-capture':      'Microphone not found — check your device settings',
        'not-allowed':        'Microphone permission denied — please allow access in your browser',
        'network':            'Network error during speech recognition',
        'aborted':            null,   // user cancelled — not an error worth showing
      };

      const message = messages[event.error];
      if (message) {
        onStateChange(VOICE_STATES.ERROR);
        onError(message);
      } else {
        onStateChange(VOICE_STATES.IDLE);
      }
    };

    rec.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.trim();

      if (!transcript) {
        onStateChange(VOICE_STATES.IDLE);
        return;
      }

      // Show the user what was heard in the chat UI
      onTranscript(transcript);

      // Hand off to the chat + audio pipeline
      await handleTranscript(transcript);
    };

    return rec;
  }


  // ── Step 1: Send transcript to /api/chat ────────────────────────────────────
  async function handleTranscript(transcript) {
    try {
      onStateChange(VOICE_STATES.PROCESSING);

      if (!readingContext) {
        throw new Error('Reading context not set — call voiceChat.setContext() first');
      }

      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcript,
          context: readingContext,
          history: chatHistory
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Chat API error: ${response.status}`);
      }

      const data = await response.json();

      // Update history so next message has full context
      chatHistory = data.history;

      // Show the text reply in the chat UI
      onReply({ reply: data.reply, history: data.history });

      // Hand off to audio playback
      await speakReply(data.reply);

    } catch (error) {
      console.error('Voice chat error:', error.message);
      onStateChange(VOICE_STATES.ERROR);
      onError(error.message || 'Something went wrong — please try again');
    }
  }


  // ── Step 2: Send reply text to /api/audio and play it ──────────────────────
  async function speakReply(text) {
    try {
      onStateChange(VOICE_STATES.SPEAKING);

      // Stop any audio that's already playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }

      const response = await fetch(`${BASE_URL}/api/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Audio API error: ${response.status}`);
      }

      // Convert the streamed audio into a playable blob URL
      const audioBlob = await response.blob();
      const audioUrl  = URL.createObjectURL(audioBlob);

      currentAudio = new Audio(audioUrl);

      currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);    // free memory when done
        currentAudio = null;
        onStateChange(VOICE_STATES.IDLE); // ready for next message
      };

      currentAudio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        onStateChange(VOICE_STATES.ERROR);
        onError('Failed to play audio response');
      };

      await currentAudio.play();

    } catch (error) {
      console.error('Audio playback error:', error.message);
      onStateChange(VOICE_STATES.ERROR);
      onError(error.message || 'Failed to play the AI response');
    }
  }


  // ─── Public API ─────────────────────────────────────────────────────────────

  return {

    // Call this before starting — pass the current reading context
    // so the AI knows what book and chapter the user is in
    setContext(context) {
      readingContext = context;
    },

    // Sync chat history from React state if text chat is also open
    // so voice and text share the same conversation thread
    setHistory(history) {
      chatHistory = history;
    },

    // Get the current history — useful for syncing back to text chat
    getHistory() {
      return chatHistory;
    },

    // User clicks the mic button to start listening
    start() {
      if (isListening) return;

      // Stop any playing audio first — rude to talk over yourself
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }

      try {
        recognition = createRecognition();
        recognition.start();
      } catch (error) {
        onStateChange(VOICE_STATES.ERROR);
        onError(error.message);
      }
    },

    // User clicks the mic button again to stop listening early
    stop() {
      if (recognition && isListening) {
        recognition.stop();   // triggers onresult if there's any audio, then onend
      }
    },

    // Stop everything — call this in React's useEffect cleanup
    destroy() {
      if (recognition) {
        recognition.abort();
        recognition = null;
      }
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      isListening = false;
      chatHistory = [];
    }
  };
}