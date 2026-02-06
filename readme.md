# AI Code Debugger

A desktop application that helps developers **run, debug, explain, and improve code** using AI-powered analysis. Designed for beginners, students, and developers learning Python and C++.

---

## ✨ Features

- **AI-Powered Code Explanation** - Get step-by-step breakdowns with dry runs
- **Intelligent Debugging** - Detect errors and receive suggested fixes
- **Multi-Language Support** - Run Python and C++ code seamlessly
- **Real-Time Execution** - Capture stdout/stderr with input handling
- **Clean Interface** - Distraction-free editor with syntax highlighting

---

## 🧠 AI Capabilities

- Step-by-step code explanation with dry run
- Variable state tracking during execution
- Intelligent error detection and diagnosis
- Suggested fixes with before/after comparison
- Best-practice recommendations and optimizations

---

## 🧪 Language Support

- **Python** - Execute scripts with input handling
- **C++** - Compile and run using `g++`
- Real-time stdout/stderr capture
- Graceful handling of runtime and compilation errors

---

## 🎨 UI/UX

- Clean, distraction-free editor interface
- CodeMirror-based syntax highlighting
- Separate input and output panels
- Loading states during AI processing
- Beginner-friendly readable explanations

---

## 🧩 Architecture

- Modular Electron architecture (Main/Preload/Renderer)
- Secure IPC communication between UI and backend
- AI logic isolated from UI layer
- Clear separation of execution, analysis, and explanation flows

---

## ⚡ Performance & Reliability

- Local code execution (no sandbox delay)
- Debounced AI calls to avoid rate overuse
- Error boundaries for safe execution
- Responsive UI even during long AI requests

---

## 🔐 Security

- Gemini API key handled only in backend
- No API key exposure to renderer
- IPC-based request validation
- Safe execution boundaries for user code

---

## 🛠 Tech Stack

- **Electron** - Desktop framework
- **Node.js** - Backend runtime
- **Gemini API** - AI-powered analysis
- **CodeMirror** - Code editor
- **Python/g++** - Code execution engines

---

## 📁 Project Structure
```
ai-code-debugger/
├── main.js         # Electron main process + AI logic
├── preload.js      # Secure IPC bridge
├── index.html      # Renderer UI
├── package.json    # Dependencies & scripts
└── README.md       # Documentation
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Python 3.x
- g++ compiler (for C++ support)
- Gemini API key

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/ai-code-debugger.git
cd ai-code-debugger

# Install dependencies
npm install
```

### Configuration

1. Create a `.env` file in the root directory
2. Add your Gemini API key:
```
   GEMINI_API_KEY=your_api_key_here
```

### Run the App
```bash
npm start
```

---

## 🧭 Future Improvements

- [ ] Multi-file project support
- [ ] Code autocomplete
- [ ] Save/load files
- [ ] Explanation export (PDF/Markdown)
- [ ] Custom editor themes
- [ ] Additional language support (JavaScript, Java)
- [ ] Debugging breakpoints
- [ ] Code formatting tools

---

## 📄 License

MIT License

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📧 Support

For issues and questions, please open an issue on GitHub.