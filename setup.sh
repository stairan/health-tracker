#!/bin/bash

# Health Tracker Setup Script with uv

set -e

echo "🏥 Health Tracker Setup Script"
echo "================================"
echo ""

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    echo "✅ uv installed successfully!"
    echo "⚠️  Please restart your shell or run: source ~/.bashrc (or ~/.zshrc)"
    exit 0
fi

echo "✅ uv is installed"
echo ""

# Check Python version
echo "🔍 Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
REQUIRED_VERSION="3.10"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "⚠️  Python $PYTHON_VERSION detected, but Python 3.10+ is required"
    echo "Installing Python 3.10+ with uv..."
    uv python install 3.10
    echo "✅ Python 3.10+ installed"
else
    echo "✅ Python $PYTHON_VERSION is compatible"
fi

echo ""

# Backend setup
echo "📦 Setting up backend..."

# Remove old virtual environments if they exist
if [ -d ".venv" ]; then
    echo "Removing old virtual environment..."
    rm -rf .venv
fi

if [ -d "backend/.venv" ]; then
    echo "Removing old backend virtual environment..."
    rm -rf backend/.venv
fi

cd backend

# Install dependencies
echo "Installing Python dependencies with Python 3.10+..."
# Note: Installing garminconnect without deps first, then specific versions to avoid withings-sync 4.2.6 build issues
echo "  - Installing garminconnect..."
uv pip install --no-deps garminconnect==0.2.19
echo "  - Installing garminconnect dependencies..."
uv pip install requests cloudscraper garth "withings-sync<4.2.6"
echo "  - Installing remaining dependencies..."
uv pip install fastapi "uvicorn[standard]" python-multipart sqlalchemy alembic apscheduler pandas pyarrow python-dotenv pydantic pydantic-settings python-dateutil cryptography

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created (edit it to configure your settings)"
else
    echo "✅ .env file already exists"
fi

cd ..

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
cd frontend

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Install dependencies
echo "Installing Node dependencies..."
npm install

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  uv run uvicorn app.main:app --reload"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
