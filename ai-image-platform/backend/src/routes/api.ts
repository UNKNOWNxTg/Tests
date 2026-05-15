import { Router, Request, Response } from 'express';
import generationQueue from '../services/queueService';
import pollinationsService from '../services/pollinationsService';
import rateLimitManager from '../services/rateLimitService';
import proxyManager from '../services/proxyManager';

const router = Router();

// Helper function to get user ID from request
const getUserId = (req: Request): string => {
  return req.headers['x-user-id'] as string || req.ip || 'anonymous';
};

/**
 * @route POST /api/generate
 * @desc Generate an image with the given prompt
 */
router.post('/generate', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  
  // Check rate limit
  const rateLimit = await rateLimitManager.checkLimit(userId, 'generation');
  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(rateLimit.msBeforeNext / 1000),
    });
  }

  try {
    const {
      prompt,
      negativePrompt,
      width,
      height,
      seed,
      model,
      priority = 0,
    } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    // Add task to queue
    const task = generationQueue.addTask(userId, prompt, {
      negativePrompt,
      width,
      height,
      seed,
      model,
      priority,
    });

    res.status(202).json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        position: generationQueue.getStats().queueLength,
        estimatedWait: generationQueue.getStats().queueLength * 5, // Rough estimate in seconds
      },
      headers: {
        'X-RateLimit-Remaining': rateLimit.remainingPoints.toString(),
        'X-RateLimit-Reset': Math.ceil(rateLimit.msBeforeNext / 1000).toString(),
      },
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start generation',
    });
  }
});

/**
 * @route GET /api/generate/:taskId
 * @desc Get the status of a generation task
 */
router.get('/generate/:taskId', async (req: Request, res: Response) => {
  const { taskId } = req.params;

  const task = generationQueue.getTask(taskId);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found',
    });
  }

  res.json({
    success: true,
    task: {
      id: task.id,
      status: task.status,
      prompt: task.prompt,
      imageUrl: task.imageUrl,
      error: task.error,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      metadata: task.metadata,
      progress: task.status === 'pending' ? 0 : task.status === 'processing' ? 50 : 100,
    },
  });
});

/**
 * @route GET /api/history
 * @desc Get user's generation history
 */
router.get('/history', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const tasks = generationQueue.getUserTasks(userId, limit + offset);
  const paginatedTasks = tasks.slice(offset, offset + limit);

  res.json({
    success: true,
    tasks: paginatedTasks.map(task => ({
      id: task.id,
      status: task.status,
      prompt: task.prompt,
      imageUrl: task.imageUrl,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      metadata: task.metadata,
    })),
    total: tasks.length,
    hasMore: tasks.length > offset + limit,
  });
});

/**
 * @route POST /api/generate/:taskId/regenerate
 * @desc Regenerate an image with the same parameters
 */
router.post('/generate/:taskId/regenerate', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { taskId } = req.params;

  const task = generationQueue.getTask(taskId);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found',
    });
  }

  if (task.userId !== userId && !req.headers['x-admin-key']) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  try {
    const newTask = generationQueue.addTask(userId, task.prompt, {
      negativePrompt: task.negativePrompt,
      width: task.width,
      height: task.height,
      seed: Math.floor(Math.random() * 1000000), // New seed for variation
      model: task.model,
    });

    res.status(202).json({
      success: true,
      task: {
        id: newTask.id,
        status: newTask.status,
        position: generationQueue.getStats().queueLength,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/models
 * @desc Get available models
 */
router.get('/models', async (req: Request, res: Response) => {
  const models = pollinationsService.getAvailableModels();
  
  res.json({
    success: true,
    models: Object.entries(models).map(([id, name]) => ({
      id,
      name,
    })),
  });
});

/**
 * @route GET /api/proxy/stats
 * @desc Get proxy manager statistics
 */
router.get('/proxy/stats', async (req: Request, res: Response) => {
  const stats = proxyManager.getStats();
  const queueStats = generationQueue.getStats();

  res.json({
    success: true,
    proxy: stats,
    queue: queueStats,
  });
});

/**
 * @route GET /api/health
 * @desc Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

export default router;
