# Health Tracker

A comprehensive health tracking application with Garmin Connect integration for daily health monitoring and AI-powered analysis.

## Features

### Core Features
- **Garmin Connect Integration**: Automatically sync daily health metrics
  - Steps, heart rate, calories, floors climbed
  - Sleep data (duration, stages, quality score)
  - Stress levels and body battery
  - Activities/workouts
  - Weight and body composition

- **Manual Health Logging**:
  - Food and drink tracking with nutritional info
  - Medication schedules and adherence
  - Illness/sickness tracking with fever logs
  - Epileptic seizure tracking (severity, triggers, context)
  - Daily notes with mood and energy levels
  - Water intake tracking

- **Data Analysis & Export**:
  - Export data in JSON, CSV, or Parquet formats
  - AI-ready data export with pre-formatted analysis prompts
  - Statistical summaries and trend analysis
  - Dashboard with daily and historical views

### Technical Stack

**Backend**:
- FastAPI (Python)
- SQLAlchemy with SQLite
- python-garminconnect for Garmin integration
- APScheduler for automated daily sync
- Encrypted credential storage

**Frontend**:
- React 18 with Vite
- Tailwind CSS for styling
- React Query for state management
- Recharts for data visualization
- Axios for API calls

## Prerequisites

- Python 3.10 or higher (required by garminconnect library)
- [uv](https://github.com/astral-sh/uv) - Fast Python package installer (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Node.js 18 or higher
- Garmin Connect account (for fitness data sync)

## Installation

### System Check (Optional but Recommended)

Before installing, you can check if your system meets all requirements:

```bash
cd /Users/stairan/Development/Python/health-tracker
./check_system.sh
```

This will verify:
- uv installation
- Python version (3.10+ required)
- Node.js and npm installation
- Configuration files

### Quick Start (Recommended)

```bash
cd /Users/stairan/Development/Python/health-tracker
./setup.sh
```

The setup script will:
- Check and install `uv` if needed
- Check Python version and install Python 3.10+ if needed
- Install all Python dependencies
- Install all Node.js dependencies
- Create `.env` file from example

**Note**: The project includes a `.python-version` file, so `uv` will automatically use Python 3.10+ when running commands.

### Manual Installation

#### 1. Install uv (if not already installed)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### 2. Install Python 3.10+ (if needed)

```bash
# Check your Python version
python3 --version

# If you have Python 3.9 or older, install Python 3.10+ with uv
uv python install 3.10

# Or install the latest Python 3.12
uv python install 3.12

# List available Python versions
uv python list
```

The `.python-version` file in the project root tells `uv` to use Python 3.10+ automatically.

#### 3. Backend Setup

```bash
cd backend

# Install dependencies with uv
# Note: We install garminconnect separately to avoid withings-sync 4.2.6 build issues
uv pip install --no-deps garminconnect==0.2.19
uv pip install requests cloudscraper garth "withings-sync<4.2.6"
uv pip install fastapi "uvicorn[standard]" python-multipart sqlalchemy alembic apscheduler pandas pyarrow python-dotenv pydantic pydantic-settings python-dateutil cryptography

# Create .env file from example
cp .env.example .env

# Edit .env with your settings (optional, defaults work fine)
nano .env
```

#### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file (optional)
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env
```

## Running the Application

### Option 1: Use the Run Scripts (Easiest)

```bash
# Terminal 1 - Start Backend
./run_backend.sh

# Terminal 2 - Start Frontend
./run_frontend.sh
```

### Option 2: Manual Commands

**Start the Backend:**
```bash
.venv/bin/python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# Or from backend directory:
cd backend
../.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Start the Frontend:**
```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

**Note**: Do not use `uv run` - it tries to reinstall dependencies from `pyproject.toml` which causes build issues with `withings-sync`. Use the existing `.venv` directly as shown above.

## Configuration

### Garmin Connect Setup

1. Navigate to Settings in the web interface
2. Enter your Garmin Connect username/email and password
3. Click "Save Settings"
4. Your credentials are encrypted before storage
5. Return to Dashboard and click "Sync Garmin" to test

### Automatic Sync Schedule

By default, Garmin data is automatically synced daily at 12:30 AM. You can change this in the `.env` file:

```env
GARMIN_SYNC_TIME=00:30  # Format: HH:MM (24-hour)
```

To disable automatic sync:
```env
GARMIN_SYNC_ENABLED=False
```

## Usage

### Daily Workflow

1. **Morning**: Check the Dashboard for yesterday's Garmin sync
2. **Throughout the day**: Log meals, medications, water intake
3. **As needed**: Log any seizures, sickness, or health events
4. **Evening**: Add daily notes with mood and energy levels
5. **Automatic**: Garmin data syncs overnight

### Data Export for AI Analysis

1. Navigate to the Export page
2. Select your date range
3. Click "Generate AI Prompt" to get a pre-formatted analysis prompt
4. Click "Export Data" to download your health data
5. Provide both to an AI assistant (Claude, ChatGPT, etc.) for analysis

The AI can help identify:
- Patterns and correlations (e.g., sleep quality vs. seizure frequency)
- Health trends over time
- Potential triggers for health events
- Recommendations for improvement

## API Endpoints

The API provides comprehensive endpoints for all functionality:

### User & Settings
- `GET /api/v1/user/me` - Get user info
- `PUT /api/v1/user/me` - Update user settings
- `GET /api/v1/user/garmin-configured` - Check Garmin status

### Garmin Data
- `POST /api/v1/garmin/sync` - Manually trigger sync
- `GET /api/v1/garmin/data` - Get Garmin metrics
- `GET /api/v1/garmin/activities` - Get workouts

### Health Logging
- `/api/v1/food/` - Food and drink entries
- `/api/v1/medications/` - Medication tracking
- `/api/v1/sickness/` - Illness tracking
- `/api/v1/seizures/` - Seizure logging
- `/api/v1/notes/` - Daily notes
- `/api/v1/water/` - Water intake

### Dashboard & Analytics
- `GET /api/v1/dashboard/today` - Today's summary
- `GET /api/v1/dashboard/daily/{date}` - Specific date summary
- `GET /api/v1/dashboard/range` - Date range aggregates

### Export
- `POST /api/v1/export/` - Export data
- `GET /api/v1/export/ai-prompt` - Get AI analysis prompt
- `GET /api/v1/export/summary` - Get statistical summary

Full API documentation available at http://localhost:8000/docs

## Database

The application uses SQLite with the following structure:

- **users** - User accounts and settings
- **garmin_data** - Daily Garmin metrics
- **activities** - Workout/activity sessions
- **food_entries** - Food and drink logs
- **medications** - Medication tracking
- **sickness_entries** - Illness records
- **seizures** - Seizure events
- **daily_notes** - Journal entries
- **water_intake** - Hydration tracking
- **garmin_sync_log** - Sync history

Database location: `/Users/stairan/Development/Python/health-tracker/data/health_tracker.db`

### Backup

To backup your data, simply copy the SQLite database file:

```bash
cp data/health_tracker.db data/health_tracker_backup_$(date +%Y%m%d).db
```

## Deployment on Home Server/NAS

### Using Docker (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_DIR=/app/data
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

Run: `docker-compose up -d`

### Using systemd (Linux)

Create service files for backend and frontend in `/etc/systemd/system/`:

```ini
[Unit]
Description=Health Tracker Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/health-tracker/backend
ExecStart=/home/your-user/.cargo/bin/uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start: `sudo systemctl enable --now health-tracker-backend`

## Development

### Backend Development

```bash
cd backend

# Run with auto-reload (use existing venv)
../.venv/bin/python -m uvicorn app.main:app --reload

# Or use the run script
cd ..
./run_backend.sh

# Run tests (if implemented)
../.venv/bin/pytest

# Format code
../.venv/bin/black app/

# Install dev dependencies
cd ..
uv pip install pytest black ruff
```

### Frontend Development

```bash
cd frontend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Extending the Application

The application is designed to be easily extended:

1. **Add new data models**: Create in `backend/app/models.py`
2. **Add new schemas**: Create in `backend/app/schemas.py`
3. **Add new API endpoints**: Create router in `backend/app/routers/`
4. **Add new frontend pages**: Create in `frontend/src/pages/`
5. **Add new components**: Create in `frontend/src/components/`

## Troubleshooting

### Python Version Issues

If you're getting Python version errors:

```bash
# Check current Python version
python3 --version

# Install Python 3.10+ with uv
uv python install 3.10

# Or install a specific version
uv python install 3.12

# Verify uv is using the correct version
uv run python --version

# Pin a specific Python version (creates/updates .python-version)
uv python pin 3.10
```

The `.python-version` file in the project root should contain `3.10` or higher. If you're still having issues, delete any cached environments:

```bash
rm -rf .venv .uv
cd backend
uv pip install -r requirements.txt
```

### Garmin Sync Fails

- Verify your Garmin credentials in Settings
- Check if you can log in to Garmin Connect website
- Garmin may require MFA - try logging in via browser first
- Check backend logs for detailed error messages

### Database Issues

- Ensure the `data` directory exists and is writable
- Check database file permissions
- Try deleting the database file to start fresh (warning: loses all data)

### Frontend Not Loading

- Ensure backend is running on port 8000
- Check browser console for errors
- Verify CORS settings in backend `.env`
- Clear browser cache

## Security Notes

- Garmin passwords are encrypted using Fernet symmetric encryption
- The encryption key is derived from your SECRET_KEY
- For production, use a strong, random SECRET_KEY
- Consider running behind a reverse proxy (nginx) with HTTPS
- Database contains sensitive health information - secure accordingly

## License

This project is for personal use. Modify and extend as needed for your requirements.

## Acknowledgments

- Uses [python-garminconnect](https://github.com/cyberjunky/python-garminconnect) for Garmin integration
- Built with FastAPI, React, and other amazing open-source tools
