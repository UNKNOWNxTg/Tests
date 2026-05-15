"""
AI Image Generation Platform - Configuration Manager
High-performance configuration system with environment variable support
"""
import os
from functools import lru_cache
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application
    APP_NAME: str = "AI Image Generator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # API Keys
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    POLLINATIONS_API_KEY: Optional[str] = None
    
    # Pollinations API
    POLLINATIONS_BASE_URL: str = "https://image.pollinations.ai"
    POLLINATIONS_TIMEOUT: int = 30
    POLLINATIONS_MAX_RETRIES: int = 3
    
    # Proxy Settings
    PROXY_ENABLED: bool = True
    PROXY_REFRESH_INTERVAL: int = 300  # seconds
    PROXY_TIMEOUT: int = 10
    PROXY_MAX_CONCURRENT_CHECKS: int = 50
    PROXY_MIN_HEALTHY: int = 5
    PROXY_SOURCES: List[str] = [
        "https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all",
        "https://www.proxy-list.download/api/v1/get?type=http",
        "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
        "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
    ]
    
    # Redis (optional)
    REDIS_URL: Optional[str] = None
    REDIS_ENABLED: bool = False
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/app.db"
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # Queue Settings
    QUEUE_MAX_SIZE: int = 1000
    QUEUE_TIMEOUT: int = 120
    
    # Image Generation
    MAX_IMAGE_SIZE: int = 2048
    DEFAULT_IMAGE_SIZE: int = 1024
    SUPPORTED_FORMATS: List[str] = ["jpg", "png", "webp"]
    
    # Telegram Bot
    TG_ADMIN_IDS: List[int] = []
    TG_MAX_CONCURRENT: int = 10
    
    # Security
    SECRET_KEY: str = Field(default_factory=lambda: os.urandom(32).hex())
    CORS_ORIGINS: List[str] = ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Performance
    UVLOOP_ENABLED: bool = True
    CONNECTION_POOL_SIZE: int = 100
    MAX_CONNECTION_RETRIES: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
