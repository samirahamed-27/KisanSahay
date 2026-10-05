#!/usr/bin/env python3
"""
KisanSahay Master Unified Entrypoint (main.py)
==============================================
Central entrypoint for running the entire KisanSahay agricultural platform:
  - Frontend: Web application & farmer portal served at http://localhost:3000
  - Backend:  FastAPI Hybrid RAG AI Assistant at http://127.0.0.1:8000

Usage:
  python main.py              # Starts full stack (Frontend + Backend)
  python main.py --backend    # Starts Python AI Backend only
  uvicorn main:app --reload   # Standard ASGI runner
"""

import os
import sys
import time
import signal
import shutil
import argparse
import subprocess
from pathlib import Path

# Expose ASGI app for uvicorn / ASGI servers
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
backend_path = ROOT_DIR / "backend"
if backend_path.exists() and str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

try:
    from app import app
except ImportError:
    # If app.py is in backend/
    sys.path.insert(0, str(backend_path))
    from app import app  # type: ignore

PYTHON_EXEC = sys.executable

def check_env():
    """Ensure .env exists by copying from .env.example if missing."""
    env_file = ROOT_DIR / ".env"
    env_example = ROOT_DIR / ".env.example"
    if not env_file.exists() and env_example.exists():
        shutil.copy(env_example, env_file)
        print("ℹ️  Created .env from .env.example template.")

def run_stack(port_web: int = 3000, port_api: int = 8000):
    check_env()
    processes = []

    def signal_handler(sig, frame):
        print("\n🛑 Shutting down KisanSahay services...")
        for p in processes:
            try:
                p.terminate()
                p.wait(timeout=3)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        print("✅ All services stopped.")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print("🌾 Starting KisanSahay Agricultural Assistant...")

    # 1. Start Python Backend (FastAPI / Uvicorn)
    app_script = ROOT_DIR / "app.py"
    if not app_script.exists():
        app_script = backend_path / "app.py"

    api_env = os.environ.copy()
    api_env["FASTAPI_PORT"] = str(port_api)

    api_proc = subprocess.Popen(
        [PYTHON_EXEC, str(app_script)],
        cwd=str(ROOT_DIR),
        env=api_env
    )
    processes.append(api_proc)

    # 2. Check and start Node.js Web Gateway / Frontend proxy if node is installed
    node_exec = shutil.which("node")
    server_script = ROOT_DIR / "server.js"
    if not server_script.exists():
        server_script = backend_path / "server.js"

    if node_exec and server_script.exists():
        web_env = os.environ.copy()
        web_env["PORT"] = str(port_web)
        web_env["PYTHON_BACKEND_URL"] = f"http://127.0.0.1:{port_api}"

        web_proc = subprocess.Popen(
            [node_exec, str(server_script)],
            cwd=str(ROOT_DIR),
            env=web_env
        )
        processes.append(web_proc)
    else:
        print(f"⚠️  Node.js not detected. Serving direct AI Backend at http://127.0.0.1:{port_api}")

    print("\n" + "=" * 62)
    print("🎉 KisanSahay is running!")
    if node_exec and server_script.exists():
        print(f"👉 Web Application (Frontend):  http://localhost:{port_web}")
        print(f"📚 Swagger API Documentation:   http://localhost:{port_web}/api/docs")
    print(f"⚙️  AI Backend Direct API:       http://127.0.0.1:{port_api}")
    print("=" * 62)
    print("Press Ctrl+C to stop all services.\n")

    try:
        while True:
            for p in processes:
                exit_code = p.poll()
                if exit_code is not None:
                    print(f"\n⚠️ Process {p.pid} exited with code {exit_code}")
                    signal_handler(None, None)
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="KisanSahay Unified Runner")
    parser.add_argument("--backend-only", "--api-only", action="store_true", help="Run only the Python FastAPI backend")
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "3000")), help="Frontend / Web proxy port (default: 3000)")
    parser.add_argument("--api-port", type=int, default=int(os.getenv("FASTAPI_PORT", "8000")), help="FastAPI backend port (default: 8000)")
    args = parser.parse_args()

    if args.backend_only:
        import uvicorn
        port = args.api_port
        uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
    else:
        run_stack(port_web=args.port, port_api=args.api_port)
