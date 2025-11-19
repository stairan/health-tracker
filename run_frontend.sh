#!/bin/bash

# Health Tracker - Run Frontend Script

cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Node modules not found!"
    echo "Run 'cd frontend && npm install' first."
    exit 1
fi

# Run vite dev server
echo "🚀 Starting Health Tracker Frontend..."
echo "   URL: http://localhost:5173"
echo ""

npm run dev
