# Quick Start Guide

## TL;DR

```bash
# 1. Setup (one time)
./setup.sh

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Start backend (Terminal 1)
./run_backend.sh

# 4. Start frontend (Terminal 2)
./run_frontend.sh

# 5. Open http://localhost:5173
```

## What Each Script Does

### `./setup.sh`
- Installs uv if needed
- Installs Python 3.10+ if needed
- Removes old virtual environments
- Installs all Python dependencies (with workarounds for withings-sync)
- Creates `.env` configuration file

### `./run_backend.sh`
- Starts the FastAPI backend server on port 8000
- Uses the existing `.venv` (no reinstallation)
- Enables auto-reload for development

### `./run_frontend.sh`
- Starts the React development server on port 5173
- Enables hot module replacement

### `./check_system.sh`
- Verifies system requirements
- Checks Python version, uv, Node.js, npm
- Shows installation status

## Important Notes

❗ **Do NOT use `uv run`** - It will try to reinstall dependencies and fail on withings-sync build issues.

✅ **Do use** `./run_backend.sh` or `.venv/bin/python` directly

## First Time Setup

1. **Run setup script:**
   ```bash
   ./setup.sh
   ```

2. **Install frontend:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Start the application:**
   ```bash
   # Terminal 1
   ./run_backend.sh

   # Terminal 2
   ./run_frontend.sh
   ```

4. **Configure Garmin (in browser at http://localhost:5173):**
   - Go to Settings
   - Enter Garmin Connect username and password
   - Click Save
   - Return to Dashboard and click "Sync Garmin"

## URLs

- **Frontend UI**: http://localhost:5173
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Troubleshooting

### "withings-sync build error"
You tried to use `uv run`. Use `./run_backend.sh` instead.

### "Module not found" errors
Your dependencies may be incomplete. Run:
```bash
rm -rf .venv
./setup.sh
```

### Python version errors
You need Python 3.10+. Run:
```bash
uv python install 3.10
./setup.sh
```

### Frontend not connecting to backend
Check that:
1. Backend is running on port 8000
2. CORS origins are configured in backend/.env
3. No firewall blocking localhost connections

## Development Workflow

### Adding new Python dependencies
```bash
# Add to backend/requirements.txt
echo "new-package==1.0.0" >> backend/requirements.txt

# Install with uv
uv pip install new-package==1.0.0
```

### Adding new npm packages
```bash
cd frontend
npm install new-package
```

### Database migrations
```bash
cd backend
../.venv/bin/alembic revision --autogenerate -m "description"
../.venv/bin/alembic upgrade head
```

## Daily Use

1. Start backend: `./run_backend.sh`
2. Start frontend: `./run_frontend.sh`
3. Open http://localhost:5173
4. Log your health data
5. Garmin syncs automatically at 12:30 AM

## Stopping the Application

Press `Ctrl+C` in each terminal window to stop the servers.

## Getting Help

- Check `README.md` for full documentation
- Check `INSTALLATION.md` for detailed setup info
- Check `backend/app/main.py` for API structure
- Check API docs at http://localhost:8000/docs
