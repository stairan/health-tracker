from pydantic_settings import BaseSettings
from typing import Optional, List
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    app_name: str = "Health Tracker"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_dir: str = "./data"

    # API
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    def get_cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string to list"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(",")]
        return self.cors_origins

    # Security
    secret_key: str = "your-secret-key-change-this-in-production"
    encryption_key: Optional[str] = None  # For encrypting Garmin credentials

    # Garmin Sync
    garmin_sync_enabled: bool = True
    garmin_sync_time: str = "00:30"  # Daily sync at 00:30 (12:30 AM)

    # Export
    export_dir: str = "./data/exports"

    class Config:
        env_file = ".env"
        case_sensitive = False


# Create a global settings instance
settings = Settings()
