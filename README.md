# 🌾 KisanSahay — Accessible Agricultural Finance & Loan Recommendation Engine

> **Smart Agricultural Loan Recommendation, Location Intelligence, Hybrid RAG Assistant, and Debt Trap Prevention Platform for Indian Farmers**

---

## 🍎 macOS & Apple Silicon Quick Start Guide

This guide provides exact, step-by-step terminal commands tailored for macOS running on Apple Silicon (M1/M2/M3/M4) or Intel Mac.

### Step 1: Install Command Line Tools & Homebrew (If Missing)

Open **Terminal** (`Applications > Utilities > Terminal` or press `Cmd + Space` and type `Terminal`):

```bash
# 1. Install Xcode Command Line Tools (compilers and build tools)
xcode-select --install

# 2. Install Homebrew (macOS Package Manager) if you do not have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 3. Add Homebrew to your shell environment (for Apple Silicon Macs):
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### Step 2: Install Node.js and Python 3

```bash
# Install Node.js (v20+ recommended) and Python 3 (3.10 or 3.11)
brew install node python@3.11
```

Verify your installations:
```bash
node -v      # Should display v20.x or higher
npm -v       # Should display 10.x or higher
python3 -v   # Should display Python 3.11.x
```

### Step 3: Clone or Navigate to the Project

```bash
cd "/path/to/KisanSahay"
```

### Step 4: Setup Python Virtual Environment

```bash
# 1. Create a clean virtual environment
python3 -m venv .venv

# 2. Activate the virtual environment
source .venv/bin/activate

# 3. Upgrade pip and install pinned Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 5: Install Node.js Dependencies

```bash
npm install
```

### Step 6: Configure Environment Variables

```bash
# Copy the provided template to .env
cp .env.example .env
```

Open `.env` in any text editor and optionally add your `GEMINI_API_KEY`:
```ini
GEMINI_API_KEY=your_actual_gemini_key_here
```
*(The app works out of the box with built-in curated FAQs, scheme databases, and exact lookups even without external API keys).*

---

## 🚀 Running KisanSahay on macOS

### Option 1: Unified Start Script (Recommended)

Run the included macOS launcher that boots both the Python AI backend and the Node.js Express proxy together:

```bash
chmod +x start.sh
./start.sh
```

### Option 2: Running in Separate Terminal Tabs

**Terminal Tab 1 — Python AI Backend (FastAPI / RAG):**
```bash
source .venv/bin/activate
python app.py
```
*Listens on `http://127.0.0.1:8000`*

**Terminal Tab 2 — Node.js Express Web Proxy:**
```bash
npm start
```
*Listens on `http://localhost:3000`*

---

## 🌐 URLs to Open in Your Browser

| Service | URL | Description |
|---|---|---|
| **🌾 KisanSahay Web App** | **[http://localhost:3000](http://localhost:3000)** | Main farmer portal & Sahay AI chatbox |
| **📚 Swagger API Docs** | **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)** | Interactive REST API testing UI |
| **⚙️ Backend Health API** | **[http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)** | AI & ChromaDB diagnostic status |

---

## 🛠️ Apple Silicon & macOS Specific Adjustments Made

1. **Port 5000 AirPlay Conflict Avoidance**:
   - On macOS Monterey, Ventura, Sonoma, and Sequoia, **macOS AirPlay Receiver occupies port 5000**.
   - KisanSahay explicitly uses **Port 3000** for the Express web server and **Port 8000** for the Python backend. Both ports are fully configurable via `PORT` and `FASTAPI_PORT` in `.env`.
2. **ChromaDB & SQLite Compatibility Shim**:
   - macOS default system Python often links against an older SQLite build (`< 3.35.0`), which causes ChromaDB to throw `RuntimeError: Your system has an unsupported version of sqlite3`.
   - Added a built-in `pysqlite3` compatibility shim at the top of `app.py` and `scripts/retrieve_context.py` that transparently ensures modern SQLite compatibility on ARM64 Apple Silicon.
3. **Cross-Platform Path Handling**:
   - All server and script paths utilize standard POSIX / `pathlib.Path` and `path.join()`, preventing file separator errors.
4. **ARM64 Native Wheels**:
   - Pinned packages in `requirements.txt` are verified compatible with `darwin-arm64` wheels (fastapi, chromadb, pydantic, numpy, uvicorn).

---

## ⚠️ Common macOS Errors & Exact Solutions

| # | Error Symptom | Cause on macOS | Exact One-Line Solution |
|---|---|---|---|
| **1** | `zsh: command not found: brew` | Homebrew is installed but not added to your shell path on Apple Silicon. | Run: `echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile && eval "$(/opt/homebrew/bin/brew shellenv)"` |
| **2** | `Error: listen EADDRINUSE: address already in use :::3000` | Another process is already running on port 3000. | Kill the existing process: `lsof -ti :3000 \| xargs kill -9` |
| **3** | `Error: Port 8000 is already in use` | A previous instance of `app.py` or uvicorn is still running. | Kill the background process: `lsof -ti :8000 \| xargs kill -9` |
| **4** | `RuntimeError: Your system has an unsupported version of sqlite3` | Running on an older macOS python build with obsolete SQLite. | Run: `pip install pysqlite3-binary` or install modern python via `brew install python@3.11`. |
| **5** | `NotOpenSSLWarning: urllib3 v2 only supports OpenSSL 1.1.1+` | macOS default Python was compiled against Apple's LibreSSL 2.8.3. | This warning is harmless and ignored automatically. To eliminate it, use Homebrew Python: `brew install python@3.11`. |
| **6** | `zsh: permission denied: ./start.sh` | File execution permissions missing. | Run: `chmod +x start.sh` |
| **7** | `xcode-select: error: tool 'xcodebuild' requires Xcode` | macOS C/C++ compiler tools missing for binary wheel building. | Run: `xcode-select --install` and click Install. |
| **8** | `ECONNREFUSED 127.0.0.1:11434` (Ollama offline) | Local Ollama daemon is not running. | The backend automatically falls back to Gemini AI / curated FAQs. If you want local Ollama: `brew install ollama && ollama serve && ollama pull nomic-embed-text`. |

---

## 🧪 Running Automated Tests

KisanSahay includes comprehensive unit and integration tests using Node.js's native test runner (`node:test`):

```bash
npm test
```
*Expected: 98 passing test suites, 0 failures.*

---

## 📡 REST API Reference

### `POST /api/recommend`
Generates ranked loan scheme recommendations and responsible lending assessments.
- **Request Body**:
```json
{
  "state": "Punjab",
  "district": "Ludhiana",
  "landSizeAcres": 3.5,
  "cropType": "Wheat, Paddy",
  "landOwnership": "owner",
  "annualIncome": 280000,
  "category": "general",
  "existingLoans": 40000,
  "hasKcc": true,
  "hasAadhaar": true
}
```

### `POST /chat`
Hybrid RAG query endpoint for Sahay AI assistant:
```json
{
  "user_query": "What is the interest rate on a KCC loan?",
  "language": "en"
}
```

---

## 📄 License
ISC License © 2026 KisanSahay Team.
