#!/usr/bin/env bash
set -e

# ==============================================================================
# KisanSahay macOS / Apple Silicon Unified Launcher (start.sh)
# Launches both the Python FastAPI/Flask backend and the Node Express proxy.
# ==============================================================================

# Text Color Formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${GREEN}${BOLD}🌾 Starting KisanSahay Agricultural Assistant on macOS...${NC}"

# Navigate to project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Check & Load .env
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo -e "${YELLOW}⚠️  .env not found. Copying from .env.example template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env. Please update with your GEMINI_API_KEY if needed.${NC}"
  fi
fi

# 2. Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed. Please install Node.js via 'brew install node'${NC}"
  exit 1
fi

# 3. Check & Install node_modules
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 node_modules missing. Running npm install...${NC}"
  npm install
fi

# 4. Check & Activate Python Virtual Environment
VENV_PATH=""
if [ -d ".venv" ]; then
  VENV_PATH=".venv"
elif [ -d "venv" ]; then
  VENV_PATH="venv"
fi

if [ -z "$VENV_PATH" ]; then
  echo -e "${YELLOW}🐍 Python virtual environment not found. Creating .venv...${NC}"
  python3 -m venv .venv
  VENV_PATH=".venv"
  source "$VENV_PATH/bin/activate"
  echo -e "${GREEN}📦 Installing Python dependencies from requirements.txt...${NC}"
  pip install --upgrade pip
  pip install -r requirements.txt
else
  source "$VENV_PATH/bin/activate"
fi

PYTHON_EXEC="$(which python || which python3)"
echo -e "${BLUE}Using Python:${NC} $PYTHON_EXEC ($($PYTHON_EXEC --version 2>&1))"
echo -e "${BLUE}Using Node.js:${NC} $(node -v)"

# Ports
PORT="${PORT:-3000}"
FASTAPI_PORT="${FASTAPI_PORT:-8000}"

# Clean process termination handler
PY_PID=""
cleanup() {
  echo -e "\n${YELLOW}🛑 Shutting down KisanSahay services...${NC}"
  if [ -n "$PY_PID" ] && kill -0 "$PY_PID" 2>/dev/null; then
    kill "$PY_PID" 2>/dev/null || true
    wait "$PY_PID" 2>/dev/null || true
  fi
  echo -e "${GREEN}✅ All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 5. Start Python Backend (app.py) in background
echo -e "${BLUE}🚀 Starting Python AI Backend on port ${FASTAPI_PORT}...${NC}"
"$PYTHON_EXEC" app.py &
PY_PID=$!

# Wait for backend health check
echo -n "Waiting for Python backend to initialize..."
for i in {1..35}; do
  if curl -s "http://127.0.0.1:${FASTAPI_PORT}/health" >/dev/null 2>&1; then
    echo -e " ${GREEN}Ready!${NC}"
    break
  fi
  sleep 1
  echo -n "."
done

# 6. Start Node.js Express Proxy in foreground
echo -e "${BLUE}🚀 Starting Express Web Proxy on port ${PORT}...${NC}"
echo -e ""
echo -e "=================================================================="
echo -e "${GREEN}${BOLD}🎉 KisanSahay is running! Open the app in your browser:${NC}"
echo -e "👉 ${GREEN}${BOLD}http://localhost:${PORT}${NC}"
echo -e ""
echo -e "📚 Swagger API Documentation:  ${BLUE}http://localhost:${PORT}/api/docs${NC}"
echo -e "⚙️  Direct AI Backend API:      ${BLUE}http://127.0.0.1:${FASTAPI_PORT}${NC}"
echo -e "=================================================================="
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop both servers."
echo -e ""

node server.js
