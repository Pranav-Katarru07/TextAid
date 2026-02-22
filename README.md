# TextAID 📖

> **Don't just read to finish. Read to understand.**

TextAID is an AI-powered learning companion that transforms any PDF — textbook, research paper, or story — into a fully interactive study experience. Listen to your content with lifelike ElevenLabs voices, reinforce retention through active recall quizzes, get instant summaries, and chat with an AI tutor that knows your material inside and out.

---

## ✨ Features

- **🔊 Text-to-Speech** — Powered by ElevenLabs, TextAID reads your PDF aloud with natural, expressive voices so you can learn on the go.
- **🧠 Active Recall Quizzes** — In-reading quizzes test your comprehension as you go, reinforcing memory through the proven science of active recall.
- **📝 Smart Summaries** — Get concise, AI-generated summaries of chapters or sections so the key ideas always stick.
- **🤖 Interactive AI Tutor** — Ask questions, dig deeper, or clear up confusion with an AI agent that's fully grounded in your document's content.

---

## 🛠️ Tech Stack

- **Frontend** — React (Create React App), HTML, CSS
- **Backend** — Node.js / Express (`/server`)
- **AI & Voice** — ElevenLabs (TTS), AI language model for chat and quiz generation

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm
- An [ElevenLabs API key](https://elevenlabs.io)
- A [Gemini API key](https://ai.google.dev/gemini-api/docs)

### Installation

```bash
# Clone the repository
git clone https://github.com/Pranav-Katarru07/TextAid.git
cd TextAid

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
AI_API_KEY=your_ai_api_key
```

### Running the App

```bash
# Start the backend server
cd server
node index.js

# In a separate terminal, start the frontend
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
```

---

## 📂 Project Structure

```
TextAid/
├── public/          # Static assets
├── src/             # React frontend source
├── server/          # Express backend (API routes, TTS, AI)
├── package.json
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source. See the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ to make learning more accessible, engaging, and effective.*
