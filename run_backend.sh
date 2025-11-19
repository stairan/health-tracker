#!/bin/bash

# Health Tracker - Run Backend Script

cd "$(dirname "$0")/backend"

# Check if venv exists
if [ ! -d "../.venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run ./setup.sh first to install dependencies."
    exit 1
fi

# Run uvicorn using the existing venv
echo "🚀 Starting Health Tracker Backend..."
echo "   API: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo ""

../.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
