import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { WebSocketServer } from 'ws';
import http from 'http';
import envConfig from '../config/env';
import apiRoutes from './routes/api';
import { proxyManager } from './services/proxyManager';
import generationQueue from './services/queueService';

// Import Telegram bot lazily to avoid circular dependencies
let telegramBot: any = null;

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });

// Track connected clients
const clients = new Set<any>();

wss.on('connection', (ws) => {
  console.log('🔌 Client connected to WebSocket');
  clients.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'subscribe') {
        // Subscribe to task updates
        const unsubscribe = generationQueue.subscribe(data.taskId, (task) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: 'task-update',
              task,
            }));
          }
        });

        ws.on('close', unsubscribe);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
    clients.delete(ws);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    timestamp: Date.now(),
  }));
});

// Broadcast task updates to all connected clients
function broadcastTaskUpdate(task: any) {
  const message = JSON.stringify({
    type: 'task-update',
    task,
  });

  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  }
}

// Subscribe to queue updates
generationQueue['notifyListeners'] = function(task: any) {
  // Call original notifyListeners
  const originalNotify = this['listeners'].get(task.id);
  if (originalNotify) {
    originalNotify(task);
  }
  
  // Broadcast to WebSocket clients
  broadcastTaskUpdate(task);
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));
app.use(cors({
  origin: [envConfig.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', apiRoutes);

// Serve static files in production
if (envConfig.NODE_ENV === 'production') {
  app.use(express.static('../../frontend/out'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    proxyStats: proxyManager.getStats(),
    queueStats: generationQueue.getStats(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: envConfig.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize Telegram bot
    if (envConfig.TELEGRAM_BOT_TOKEN) {
      try {
        const { telegramBot: bot } = await import('./telegram-bot');
        telegramBot = bot;
        console.log('✅ Telegram bot initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Telegram bot:', error);
      }
    }

    server.listen(envConfig.PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🎨 AI Image Generation Platform                 ║
║                                                   ║
║   Server running on port ${envConfig.PORT}                  ║
║   Environment: ${envConfig.NODE_ENV}                            ║
║   Frontend URL: ${envConfig.FRONTEND_URL}                  ║
║                                                   ║
║   Proxy Stats: ${JSON.stringify(proxyManager.getStats())}           ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received. Shutting down gracefully...');
      proxyManager.stopAutoRefresh();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('👋 SIGINT received. Shutting down gracefully...');
      proxyManager.stopAutoRefresh();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
