# AI Image Generation Platform

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Ultra-High Performance AI Image Generation Platform

A production-grade, lightning-fast AI image generation platform powered by Pollinations API with:

- ⚡ **Maximum Async Performance** - uvloop, connection pooling, parallel processing
- 🔄 **Smart Proxy Rotation** - Auto-fetching, health checking, failover
- 🤖 **Telegram Bot** - Full-featured bot with inline keyboards
- 🎨 **Modern Web UI** - Cyberpunk glassmorphism design with Alpine.js
- 📊 **Queue System** - Priority-based task queue with progress tracking
- 🛡️ **Production Ready** - Docker, monitoring, rate limiting

---

## 📁 Project Structure

```
ai_image_platform/
├── app/
│   ├── api/
│   │   └── routes.py          # FastAPI REST endpoints
│   ├── bot/
│   │   └── telegram.py        # Telegram bot implementation
│   ├── database/
│   │   ├── connection.py      # Async DB connection
│   │   └── models.py          # SQLAlchemy models
│   ├── proxy/
│   │   └── manager.py         # Async proxy rotation
│   ├── services/
│   │   ├── image_generation.py # Pollinations API service
│   │   └── queue.py           # Task queue service
│   ├── utils/
│   │   └── logger.py          # Logging setup
│   ├── config.py              # Configuration management
│   └── main.py                # Application entry point
├── static/                    # Static assets
├── templates/
│   └── index.html             # Modern web UI
├── deployments/               # Deployment configs
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Docker Compose
└── README.md                  # This file
```

---

## ✨ Features

### Core Features
- **AI Image Generation** via Pollinations API
- **Multiple Models**: Flux, Flux Realism, Any Dark, Midjourney Style
- **Batch Generation** - Generate multiple images in parallel
- **Queue System** - Priority-based async task processing
- **Progress Tracking** - Real-time generation status
- **Seed Support** - Reproducible generations
- **Negative Prompts** - Exclude unwanted elements
- **Aspect Ratio Control** - Multiple presets

### Proxy System
- **Auto-Fetch** from multiple public sources
- **Parallel Health Checking** (50+ concurrent checks)
- **Smart Rotation** based on health scores
- **Auto-Refresh** every 5 minutes
- **Failover** - Automatic retry with different proxies
- **Health Scoring** - Dynamic reputation system

### Telegram Bot
- `/start` - Welcome message
- `/gen` - Start generation
- `/settings` - View settings
- `/models` - Available models
- `/history` - Generation history
- `/help` - Help information
- Inline keyboards for actions
- Regenerate & Variation buttons
- Rate limiting per user

### Web UI
- **Cyberpunk Design** - Glassmorphism aesthetics
- **Fully Responsive** - Mobile to desktop
- **Real-time Updates** - WebSocket support
- **Masonry Gallery** - Community showcase
- **Dark Mode** - Easy on the eyes
- **Keyboard Shortcuts** - Ctrl+Enter to generate
- **Toast Notifications** - User feedback
- **History Modal** - Quick access to past generations

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- pip or poetry
- (Optional) Docker & Docker Compose

### Installation

#### Option 1: Direct Installation

```bash
# Clone repository
cd ai_image_platform

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Create data directory
mkdir -p data

# Set environment variables (optional)
export TELEGRAM_BOT_TOKEN="your_bot_token"
export PROXY_ENABLED=true

# Run the application
python -m app.main
```

#### Option 2: Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or just Docker
docker build -t ai-image-platform .
docker run -p 8000:8000 -e TELEGRAM_BOT_TOKEN=your_token ai-image-platform
```

### Access Points
- **Web UI**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Redoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

---

## 🔧 Configuration

Create a `.env` file in the project root:

```env
# Application
APP_NAME=AI Image Generator
DEBUG=false
ENVIRONMENT=production

# Server
HOST=0.0.0.0
PORT=8000
WORKERS=4

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TG_ADMIN_IDS=123456789,987654321

# Proxy Settings
PROXY_ENABLED=true
PROXY_REFRESH_INTERVAL=300
PROXY_TIMEOUT=10

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/app.db

# Redis (optional for distributed deployment)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Performance
UVLOOP_ENABLED=true
CONNECTION_POOL_SIZE=100
```

---

## 📡 API Endpoints

### Image Generation

```bash
# Async generation (returns task_id)
POST /api/v1/generate
{
    "prompt": "cyberpunk city at night",
    "negative_prompt": "blurry, low quality",
    "width": 1024,
    "height": 1024,
    "model": "flux",
    "seed": 42
}

# Sync generation (waits for result)
POST /api/v1/generate/sync

# Batch generation
POST /api/v1/generate/batch
{
    "prompts": ["prompt 1", "prompt 2"],
    "model": "flux"
}

# Get task status
GET /api/v1/task/{task_id}

# Cancel task
POST /api/v1/task/{task_id}/cancel
```

### Proxy Management

```bash
# Get proxy stats
GET /api/v1/proxy/stats

# Refresh proxies
POST /api/v1/proxy/refresh
```

### Other

```bash
# Platform statistics
GET /api/v1/stats

# Available models
GET /api/v1/models

# Health check
GET /health
```

---

## 🏗️ Architecture

### Performance Optimizations

1. **uvloop** - Drop-in replacement for asyncio event loop (2-4x faster)
2. **Connection Pooling** - Reuse HTTP connections
3. **Async Everything** - Non-blocking I/O throughout
4. **Parallel Processing** - Concurrent proxy checks, batch generations
5. **Memory Efficient** - Lazy loading, streaming responses
6. **orjson** - Fast JSON serialization (3-4x faster than json)

### Queue System

```
User Request → API → Queue → Worker → Image Service → Pollinations API
                     ↓
              Progress Updates
                     ↓
              WebSocket → Client
```

### Proxy Rotation Flow

```
Start → Fetch Proxies (parallel) → Validate (concurrent) → 
Health Score → Store → Rotate on Request → Report Success/Failure → 
Auto-Refresh
```

---

## 🐳 Deployment

### Docker Production

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - WORKERS=4
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./deployments/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app
    restart: unless-stopped
```

### Railway Deployment

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Render Deployment

```yaml
# render.yaml
services:
  - type: web
    name: ai-image-generator
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python -m app.main
    envVars:
      - key: ENVIRONMENT
        value: production
```

### VPS Deployment (systemd)

```ini
# /etc/systemd/system/ai-image.service
[Unit]
Description=AI Image Generation Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ai-image-platform
Environment="PATH=/opt/ai-image-platform/venv/bin"
ExecStart=/opt/ai-image-platform/venv/bin/python -m app.main
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ai-image
sudo systemctl start ai-image
```

---

## 🧪 Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Load testing
locust -f tests/load_test.py
```

---

## 📊 Monitoring

### Health Check Response

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "queue": "running",
    "proxy": "active"
  }
}
```

### Statistics Endpoint

```json
{
  "image_generation": {
    "total_requests": 1000,
    "successful_requests": 985,
    "success_rate": 98.5,
    "avg_generation_time": 3.2
  },
  "queue": {
    "pending": 5,
    "processing": 3,
    "completed": 992
  },
  "proxies": {
    "healthy_count": 150,
    "total_count": 500,
    "health_percentage": 30.0
  }
}
```

---

## 🔒 Security

- Input validation on all endpoints
- Rate limiting (configurable)
- CORS configuration
- Secure headers
- Error sanitization in production
- Proxy abuse prevention

---

## 🛠️ Development

```bash
# Install dev dependencies
pip install -r requirements-dev.txt

# Run in development mode
python -m app.main --reload

# Format code
black app/
isort app/

# Type checking
mypy app/

# Linting
flake8 app/
```

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 Support

- Documentation: `/docs` endpoint
- Issues: GitHub Issues
- Telegram: @YourBot

---

## 🙏 Acknowledgments

- [Pollinations AI](https://pollinations.ai/) - Image generation API
- [FastAPI](https://fastapi.tiangolo.com/) - Web framework
- [aiogram](https://docs.aiogram.dev/) - Telegram bot framework
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Alpine.js](https://alpinejs.dev/) - Frontend reactivity

---

Built with ❤️ for maximum performance and reliability.
