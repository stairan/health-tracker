# Docker Deployment Guide

This guide explains how to run the Health Tracker application using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose 2.0 or later

## Quick Start

1. **Copy the environment file**
   ```bash
   cp .env.docker backend/.env
   ```

2. **Edit the environment file**
   ```bash
   nano backend/.env
   ```

   **Important:** Change the `SECRET_KEY` to a random string before deploying to production!

   You can generate a secure secret key with:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Managing the Application

### View logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Stop the application
```bash
docker-compose down
```

### Restart the application
```bash
docker-compose restart
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

### Stop and remove all containers, networks, and volumes
```bash
docker-compose down -v
```

## Data Persistence

The application data is stored in the `./data` directory on your host machine, which is mounted into the backend container. This ensures your data persists even if containers are recreated.

- Database: `./data/health_tracker.db`
- Exports: `./data/exports/`

## Port Configuration

By default, the application uses:
- Port 80 for the frontend
- Port 8000 for the backend API

To change these ports, edit the `docker-compose.yml` file:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Change 8080 to your desired port

  backend:
    ports:
      - "8001:8000"  # Change 8001 to your desired port
```

## Environment Variables

All configuration is done through the `backend/.env` file. Key variables:

- `SECRET_KEY`: Secret key for encryption (change in production!)
- `DATABASE_DIR`: Database directory (default: `/data`)
- `GARMIN_SYNC_ENABLED`: Enable/disable Garmin sync
- `GARMIN_SYNC_TIME`: Daily sync time in HH:MM format
- `CORS_ORIGINS`: Allowed CORS origins

## Troubleshooting

### Check container status
```bash
docker-compose ps
```

### Check container health
```bash
docker inspect health-tracker-backend --format='{{.State.Health.Status}}'
docker inspect health-tracker-frontend --format='{{.State.Health.Status}}'
```

### Enter container shell
```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh
```

### Reset everything
```bash
docker-compose down -v
rm -rf data/
docker-compose up -d
```

## Production Recommendations

1. **Security**
   - Change `SECRET_KEY` to a random value
   - Use a reverse proxy (nginx/traefik) with SSL/TLS
   - Enable firewall rules to restrict access
   - Regularly update Docker images

2. **Backups**
   - Regularly backup the `./data` directory
   - Consider using Docker volumes instead of bind mounts
   - Implement automated backup scripts

3. **Monitoring**
   - Use `docker-compose logs` to monitor application logs
   - Set up health check monitoring
   - Configure alerts for container failures

4. **Updates**
   ```bash
   git pull
   docker-compose down
   docker-compose up -d --build
   ```
