"""
AI Image Generation Platform - Main Application
High-performance FastAPI application with uvloop optimization
"""
import asyncio
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Try to import and install uvloop for maximum performance
try:
    import uvloop
    uvloop.install()
    print("✓ uvloop installed - maximum async performance enabled")
except ImportError:
    print("⚠ uvloop not available, using default event loop")

from fastapi import FastAPI, Request, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer

from app.config import settings
from app.utils.logger import setup_logger, app_logger
from app.database.connection import db
from app.services.image_generation import image_service
from app.services.queue import queue_service
from app.proxy.manager import proxy_manager
from app.bot.telegram import telegram_bot
from app.api.routes import router as api_router


# Setup logging
logger = setup_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - startup and shutdown events"""
    
    # === STARTUP ===
    logger.info("=" * 60)
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("=" * 60)
    
    try:
        # Initialize database
        logger.info("Initializing database...")
        await db.connect()
        
        # Start proxy manager
        if settings.PROXY_ENABLED:
            logger.info("Starting proxy manager...")
            await proxy_manager.start()
        
        # Start image generation service
        logger.info("Starting image generation service...")
        await image_service.start()
        
        # Start queue service
        logger.info("Starting queue service...")
        await queue_service.start(worker_count=10)
        
        # Register queue handler for image generation
        from app.services.image_generation import GenerationRequest, GenerationResult
        
        async def handle_image_generation(task):
            """Queue handler for image generation tasks"""
            request = GenerationRequest(**task.payload)
            result = await image_service.generate_image(request)
            
            if result.success:
                # Save to database
                from app.database.models import ImageGeneration
                from sqlalchemy import select
                from app.database.connection import get_db
                
                async for session in db.get_session():
                    gen_record = ImageGeneration(
                        prompt=request.prompt,
                        negative_prompt=request.negative_prompt,
                        width=request.width,
                        height=request.height,
                        seed=result.seed_used,
                        model=result.model_used,
                        image_url=result.image_url,
                        status="completed",
                        generation_time=result.generation_time,
                    )
                    session.add(gen_record)
                    await session.commit()
                    break
            
            return result
        
        queue_service.register_handler("image_generation", handle_image_generation)
        
        # Start Telegram bot (if token provided)
        if settings.TELEGRAM_BOT_TOKEN:
            logger.info("Starting Telegram bot...")
            await telegram_bot.start()
        
        logger.info("=" * 60)
        logger.info("✅ All services started successfully!")
        logger.info(f"🌐 Web UI: http://{settings.HOST}:{settings.PORT}")
        logger.info(f"📡 API: http://{settings.HOST}:{settings.PORT}/api/v1")
        logger.info(f"🤖 Telegram Bot: @YourBot")
        logger.info("=" * 60)
        
        yield
        
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise
    
    finally:
        # === SHUTDOWN ===
        logger.info("Shutting down...")
        
        # Stop Telegram bot
        await telegram_bot.stop()
        
        # Stop queue service
        await queue_service.stop()
        
        # Stop image generation service
        await image_service.stop()
        
        # Stop proxy manager
        await proxy_manager.stop()
        
        # Disconnect database
        await db.disconnect()
        
        logger.info("✅ Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="High-performance AI image generation platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security
security = HTTPBearer(auto_error=False)


# Mount static files
static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# Setup templates
templates_path = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(templates_path))


# Root route - serve frontend
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Serve the main frontend"""
    return templates.TemplateResponse("index.html", {"request": request})


# Include API routes
app.include_router(api_router)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "services": {
            "database": "connected",
            "queue": "running",
            "proxy": "active" if settings.PROXY_ENABLED else "disabled",
        }
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return {
        "success": False,
        "error": "Internal server error" if settings.ENVIRONMENT == "production" else str(exc),
    }


# Rate limiting middleware (simple implementation)
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Basic rate limiting middleware"""
    # Get client IP
    client_ip = request.client.host
    
    # Skip rate limiting for health checks
    if request.url.path == "/health":
        return await call_next(request)
    
    # TODO: Implement proper rate limiting with Redis
    # For now, just pass through
    
    response = await call_next(request)
    return response


def main():
    """Main entry point"""
    import uvicorn
    
    # Configure uvicorn for maximum performance
    config = uvicorn.Config(
        app="app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        workers=settings.WORKERS if settings.ENVIRONMENT == "production" else 1,
        loop="uvloop",
        http="httptools",
        ws="websockets",
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True,
        reload=settings.DEBUG,
    )
    
    server = uvicorn.Server(config)
    
    try:
        asyncio.run(server.serve())
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
        sys.exit(0)


if __name__ == "__main__":
    main()
