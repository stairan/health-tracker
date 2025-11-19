#!/bin/bash

# Health Tracker System Check Script

echo "🏥 Health Tracker - System Check"
echo "=================================="
echo ""

# Check uv
echo -n "Checking uv... "
if command -v uv &> /dev/null; then
    UV_VERSION=$(uv --version)
    echo "✅ $UV_VERSION"
else
    echo "❌ Not installed"
    echo "   Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
fi

# Check Python
echo -n "Checking Python... "
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

    if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 10 ]; then
        echo "✅ $PYTHON_VERSION (compatible)"
    else
        echo "⚠️  $PYTHON_VERSION (need 3.10+)"
        echo "   Install with: uv python install 3.10"
    fi
else
    echo "❌ Not found"
fi

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ $NODE_VERSION"
else
    echo "❌ Not installed"
    echo "   Install from: https://nodejs.org/"
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ v$NPM_VERSION"
else
    echo "❌ Not installed"
fi

echo ""
echo "Configuration files:"
echo -n "  .python-version... "
if [ -f .python-version ]; then
    PINNED_VERSION=$(cat .python-version)
    echo "✅ Python $PINNED_VERSION"
else
    echo "⚠️  Missing (will create on setup)"
fi

echo -n "  backend/.env... "
if [ -f backend/.env ]; then
    echo "✅ Configured"
else
    echo "⚠️  Not configured (will create on setup)"
fi

echo ""
echo "Directories:"
echo -n "  data/... "
if [ -d data ]; then
    echo "✅ Exists"
else
    echo "⚠️  Will be created on first run"
fi

echo ""

# Check if backend dependencies are installed
echo -n "Backend dependencies... "
if [ -d "backend/.venv" ] || [ -d ".venv" ]; then
    echo "✅ Installed"
else
    echo "⚠️  Not installed (run ./setup.sh)"
fi

# Check if frontend dependencies are installed
echo -n "Frontend dependencies... "
if [ -d "frontend/node_modules" ]; then
    echo "✅ Installed"
else
    echo "⚠️  Not installed (run ./setup.sh)"
fi

echo ""
echo "=================================="
if command -v uv &> /dev/null && [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 10 ] && command -v node &> /dev/null; then
    echo "✅ System ready! Run ./setup.sh to install dependencies."
else
    echo "⚠️  Please install missing requirements above."
fi
