# Setup Instructions

## Quick Start Guide

### 1. Prerequisites

Make sure you have the following installed:
- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Git** for version control

### 2. Clone and Install

```bash
# Navigate to workspace
cd /workspace/ai-image-platform

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install
cd ..
```

### 3. Environment Configuration

```bash
# Copy environment example
cp .env.example .env

# Edit .env with your values
# IMPORTANT: Get Telegram bot token from @BotFather
```

**Required Environment Variables:**
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token (required for bot)
- `TELEGRAM_ADMIN_IDS` - Your Telegram user ID for admin commands
- `API_SECRET` - Change to a random secure string

### 4. Get Telegram Bot Token

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Choose a name for your bot (e.g., "AI Image Generator")
4. Choose a username (must end with 'bot', e.g., "ai_image_gen_bot")
5. Copy the token provided
6. Paste it in your `.env` file as `TELEGRAM_BOT_TOKEN`

To get your Telegram user ID:
1. Search for **@userinfobot** on Telegram
2. Start the bot and it will show your user ID
3. Add this to `TELEGRAM_ADMIN_IDS` in `.env`

### 5. Start Development

```bash
# From the root directory, start all services
npm run dev

# This will start:
# - Backend API on http://localhost:3001
# - Frontend on http://localhost:3000
# - Telegram bot (if token is configured)
```

Or start services individually:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Bot (optional)
cd backend
# The bot runs with the backend automatically
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health
- **Telegram Bot**: Search for your bot on Telegram

### 7. Test the System

**Via Web Interface:**
1. Open http://localhost:3000
2. Enter a prompt like "a cyberpunk city at night"
3. Click Generate or press Enter
4. Wait for the image to be generated
5. Download, regenerate, or create variations

**Via Telegram Bot:**
1. Find your bot on Telegram
2. Send `/start` to see the welcome message
3. Send a prompt directly or use `/generate <prompt>`
4. Receive the generated image
5. Use inline buttons for actions

### 8. Production Deployment

#### Using Docker (Recommended)

```bash
# Build and run all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Setup PM2 to start on reboot
pm2 startup
```

#### Deploy to Railway

1. Push code to GitHub
2. Go to [Railway](https://railway.app/)
3. Create new project from GitHub
4. Add environment variables
5. Deploy automatically

#### Deploy to Render

1. Push code to GitHub
2. Go to [Render](https://render.com/)
3. Create new Web Service
4. Set build command: `npm install && npm run build`
5. Set start command: `npm start`
6. Add environment variables

#### Deploy Frontend to Vercel

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com/)
3. Import your repository
4. Set root directory to `frontend`
5. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = Your production backend URL
   - `NEXT_PUBLIC_WS_URL` = Your production WebSocket URL
6. Deploy

### 9. Troubleshooting

**Backend won't start:**
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill the process if needed
kill -9 <PID>
```

**Frontend build fails:**
```bash
# Clear cache
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

**Telegram bot not responding:**
- Verify bot token is correct
- Check if bot is running (check logs)
- Make sure bot privacy mode is disabled in @BotFather

**Proxy errors:**
- Proxy system is optional and has fallbacks
- Errors are logged but won't crash the server
- Proxies refresh automatically every 5 minutes

### 10. Customization

**Change available models:**
Edit `backend/src/services/pollinationsService.ts` - MODELS object

**Modify rate limits:**
Edit `.env` file:
- `RATE_LIMIT_WINDOW_MS` - Time window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

**Customize UI theme:**
Edit `frontend/src/app/globals.css` - CSS variables for colors

**Add custom prompts:**
Edit `frontend/src/components/GenerationForm.tsx` - RANDOM_PROMPTS array

### 11. Monitoring

**Check system health:**
```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/proxy/stats
```

**Telegram admin command:**
Send `/stats` to your bot (admin only)

**View logs:**
```bash
# Docker
docker-compose logs -f

# PM2
pm2 logs

# Direct
tail -f logs/*.log
```

### 12. Security Best Practices

1. **Change default secrets** - Update `API_SECRET` in production
2. **Use HTTPS** - Configure SSL for production deployments
3. **Set strong rate limits** - Adjust based on your needs
4. **Monitor usage** - Check `/stats` regularly
5. **Keep dependencies updated** - Run `npm update` regularly
6. **Use environment variables** - Never commit `.env` files

---

## Need Help?

- Check the [README.md](./README.md) for detailed documentation
- Review API documentation in README
- Open an issue for bugs
- Contact support via Telegram

Enjoy creating amazing AI images! 🎨✨
