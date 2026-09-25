#!/usr/bin/env python3
"""
Entrypoint alias for KisanSahay Hybrid RAG Backend API
======================================================
Imports and exposes the FastAPI app from app.py.
Allows running with either:
    python main.py
    # or
    uvicorn main:app --reload
"""

import os
import uvicorn
from app import app

if __name__ == "__main__":
    port = int(os.getenv("FASTAPI_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
