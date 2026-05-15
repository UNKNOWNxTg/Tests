# 🎨 AI Image Generation Platform

A premium, futuristic AI image generation platform with Telegram bot integration, powered by Pollinations API.

![AI Image Generator](https://img.shields.io/badge/AI-Image%20Generation-blue)
![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## ✨ Features

### 🖼️ AI Image Generation
- **Multiple Models**: Flux Realism, Anime, 3D, Midjourney Style, SDXL, and more
- **Advanced Settings**: Custom dimensions, negative prompts, seed control
- **Batch Generation**: Generate up to 4 images at once
- **Real-time Progress**: WebSocket-powered live updates
- **History & Gallery**: Masonry layout with infinite scroll
- **Download & Share**: One-click download and sharing options

### 🤖 Telegram Bot
- **Commands**: `/start`, `/generate`, `/settings`, `/models`, `/history`, `/help`
- **Inline Keyboards**: Quick actions for regenerate, variation, upscale
- **User Sessions**: Persistent settings and preferences
- **Admin Panel**: Statistics and monitoring (`/stats`)
- **Rate Limiting**: Fair usage protection

### 🔒 Proxy System
- **Auto-fetch**: Multiple public proxy sources
- **Smart Rotation**: Automatic failover and load balancing
- **Health Monitoring**: Dead proxy detection and blacklisting
- **Retry Logic**: Exponential backoff on failures

### 🎨 UI/UX
- **Glassmorphism Design**: Modern, futuristic aesthetic
- **Neon Cyberpunk Theme**: Vibrant colors and glow effects
- **Smooth Animations**: Framer Motion powered transitions
- **Mobile Responsive**: Perfect on all devices
- **Keyboard Shortcuts**: 
  - `Enter` = Generate
  - `Ctrl+Enter` = Batch generate (4 images)
  - Arrow keys = Navigate gallery

### ⚡ Performance
- **Queue System**: Handle multiple concurrent generations
- **Caching**: Local storage for history and settings
- **Lazy Loading**: Optimized image loading
- **WebSocket**: Real-time status updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Telegram Bot Token (from @BotFather)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-image-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your values
```

4. **Get Telegram Bot Token**
   - Open Telegram and search for @BotFather
   - Send `/newbot` command
   - Follow the instructions
   - Copy the token to `.env`

5. **Start development servers**
```bash
# Start all services (backend + frontend + bot)
npm run dev

# Or start individually:
npm run dev:backend    # Backend API (port 3001)
npm run dev:frontend   # Frontend (port 3000)
npm run dev:bot        # Telegram bot
```

6. **Open in browser**
```
http://localhost:3000
```

## 📁 Project Structure

```
ai-image-platform/
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── index.ts        # Main server file
│   │   ├── telegram-bot.ts # Telegram bot implementation
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   │   ├── proxyManager.ts
│   │   │   ├── pollinationsService.ts
│   │   │   ├── queueService.ts
│   │   │   └── rateLimitService.ts
│   │   └── middleware/     # Express middleware
│   └── config/
│       └── env.ts          # Environment configuration
│
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # React components
│   │   │   ├── GenerationForm.tsx
│   │   │   ├── ImageGallery.tsx
│   │   │   └── layout/
│   │   ├── store/          # Zustand state management
│   │   ├── lib/            # Utilities and API client
│   │   └── hooks/          # Custom React hooks
│   └── public/             # Static assets
│
├── telegram-bot/           # Standalone bot (optional)
├── proxy-scraper/          # Proxy scraping utilities
└── deploy/                 # Deployment configurations
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **Zustand** - State management
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **node-telegram-bot-api** - Telegram integration
- **rate-limiter-flexible** - Rate limiting
- **axios** - HTTP client
- **ws** - WebSocket server

## 📱 API Documentation

### Endpoints

#### POST /api/generate
Generate an image from a prompt.

```json
{
  "prompt": "a cyberpunk city at night",
  "negativePrompt": "blurry, low quality",
  "width": 1024,
  "height": 1024,
  "seed": 12345,
  "model": "flux-realism"
}
```

Response:
```json
{
  "success": true,
  "task": {
    "id": "uuid",
    "status": "pending",
    "position": 1,
    "estimatedWait": 5
  }
}
```

#### GET /api/generate/:taskId
Get task status.

#### GET /api/history
Get user's generation history.

#### GET /api/models
Get available models.

#### GET /api/health
Health check endpoint.

## 🚢 Deployment

### Docker

```bash
# Build and run with Docker
docker-compose up -d
```

### Railway

1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Render

```yaml
services:
  - type: web
    name: ai-image-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
```

### Vercel (Frontend)

1. Import your repository
2. Set environment variables
3. Deploy

### PM2 (Production)

```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

## 🎯 Configuration

### Available Models
- `flux-realism` - Photorealistic images
- `any-dark` - Dark, moody aesthetics
- `flux-anime` - Anime style
- `flux-3d` - 3D rendered look
- `turbo` - Fast generation
- `midjourney` - Midjourney-like style
- `stable-diffusion-xl` - SDXL model

### Aspect Ratios
- 1:1 (1024x1024) - Square
- 16:9 (1024x576) - Landscape
- 9:16 (576x1024) - Portrait
- 4:3, 3:4, 3:2, 2:3

## 🔐 Security

- Rate limiting per IP/user
- CORS protection
- Helmet.js security headers
- Input validation
- Request size limits

## 📊 Monitoring

Check system stats:
```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/proxy/stats
```

Telegram admin command: `/stats`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- [Pollinations AI](https://pollinations.ai/) - Free AI image generation API
- [Telegram](https://telegram.org/) - Bot platform
- [Next.js](https://nextjs.org/) - React framework

## 💬 Support

- Open an issue for bugs
- Join our Telegram channel for updates
- Contact: @your_username on Telegram

---

Made with ❤️ using AI technology
