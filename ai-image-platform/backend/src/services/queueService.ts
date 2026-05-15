import { v4 as uuidv4 } from 'uuid';

export interface GenerationTask {
  id: string;
  userId: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  seed: number;
  model: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  imageBuffer?: Buffer;
  error?: string;
  createdAt: number;
  completedAt?: number;
  metadata?: {
    generationTime?: number;
    retries?: number;
  };
}

interface QueueItem {
  task: GenerationTask;
  priority: number;
  addedAt: number;
}

class GenerationQueue {
  private queue: QueueItem[] = [];
  private processing: Map<string, GenerationTask> = new Map();
  private completed: Map<string, GenerationTask> = new Map();
  private maxQueueSize: number = 100;
  private maxConcurrent: number = 5;
  private currentProcessing: number = 0;
  private listeners: Map<string, (task: GenerationTask) => void> = new Map();

  constructor() {
    this.startProcessor();
  }

  addTask(
    userId: string,
    prompt: string,
    options: {
      negativePrompt?: string;
      width?: number;
      height?: number;
      seed?: number;
      model?: string;
      priority?: number;
    } = {}
  ): GenerationTask {
    const task: GenerationTask = {
      id: uuidv4(),
      userId,
      prompt,
      negativePrompt: options.negativePrompt,
      width: options.width || 1024,
      height: options.height || 1024,
      seed: options.seed || Math.floor(Math.random() * 1000000),
      model: options.model || 'flux-realism',
      status: 'pending',
      createdAt: Date.now(),
      metadata: { retries: 0 },
    };

    // Check queue size limit
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Queue is full. Please try again later.');
    }

    const queueItem: QueueItem = {
      task,
      priority: options.priority || 0,
      addedAt: Date.now(),
    };

    // Insert based on priority
    const insertIndex = this.queue.findIndex(item => item.priority < queueItem.priority);
    if (insertIndex === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(insertIndex, 0, queueItem);
    }

    console.log(`📝 Task ${task.id} added to queue (position: ${this.queue.length})`);
    this.notifyListeners(task);

    return task;
  }

  getTask(taskId: string): GenerationTask | undefined {
    // Check in queue
    const queued = this.queue.find(item => item.task.id === taskId);
    if (queued) return queued.task;

    // Check processing
    const processing = this.processing.get(taskId);
    if (processing) return processing;

    // Check completed
    return this.completed.get(taskId);
  }

  getUserTasks(userId: string, limit: number = 20): GenerationTask[] {
    const tasks: GenerationTask[] = [];

    // From queue
    for (const item of this.queue) {
      if (item.task.userId === userId && tasks.length < limit) {
        tasks.push(item.task);
      }
    }

    // From processing
    for (const task of this.processing.values()) {
      if (task.userId === userId && tasks.length < limit) {
        tasks.push(task);
      }
    }

    // From completed
    const completedTasks = Array.from(this.completed.values())
      .filter(task => task.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit - tasks.length);

    return [...tasks, ...completedTasks];
  }

  updateTask(taskId: string, updates: Partial<GenerationTask>): void {
    const task = this.getTask(taskId);
    if (!task) return;

    Object.assign(task, updates);
    this.notifyListeners(task);

    if (updates.status === 'completed' || updates.status === 'failed') {
      this.processing.delete(taskId);
      this.completed.set(taskId, task);
      
      // Keep only last 1000 completed tasks
      if (this.completed.size > 1000) {
        const oldestKey = Array.from(this.completed.keys())[0];
        this.completed.delete(oldestKey);
      }
    }
  }

  private async startProcessor(): Promise<void> {
    console.log('🔄 Queue processor started');

    while (true) {
      try {
        // Process completed tasks
        if (this.queue.length > 0 && this.currentProcessing < this.maxConcurrent) {
          const item = this.queue.shift()!;
          this.processing.set(item.task.id, item.task);
          this.currentProcessing++;

          // Process asynchronously
          this.processTask(item.task).catch(error => {
            console.error(`❌ Task ${item.task.id} failed:`, error.message);
            this.updateTask(item.task.id, {
              status: 'failed',
              error: error.message,
              completedAt: Date.now(),
            });
          });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Queue processor error:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async processTask(task: GenerationTask): Promise<void> {
    console.log(`⚙️ Processing task ${task.id}: ${task.prompt.substring(0, 50)}...`);
    
    this.updateTask(task.id, { status: 'processing' });

    try {
      // Import here to avoid circular dependency
      const { pollinationsService } = await import('./pollinationsService');

      const result = await pollinationsService.generateImage({
        prompt: task.prompt,
        negativePrompt: task.negativePrompt,
        width: task.width,
        height: task.height,
        seed: task.seed,
        model: task.model,
      });

      if (result.success && result.imageBuffer) {
        this.updateTask(task.id, {
          status: 'completed',
          imageUrl: result.imageUrl,
          imageBuffer: result.imageBuffer,
          completedAt: Date.now(),
          metadata: {
            ...task.metadata,
            generationTime: result.metadata?.generationTime,
          },
        });
        console.log(`✅ Task ${task.id} completed successfully`);
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error: any) {
      const retries = (task.metadata?.retries || 0) + 1;
      
      if (retries < 3) {
        console.log(`🔄 Retrying task ${task.id} (attempt ${retries})`);
        this.updateTask(task.id, {
          status: 'pending',
          metadata: { ...task.metadata, retries },
        });
        
        // Re-add to queue with lower priority
        this.addTask(task.userId, task.prompt, {
          negativePrompt: task.negativePrompt,
          width: task.width,
          height: task.height,
          seed: task.seed,
          model: task.model,
          priority: -retries,
        });
      } else {
        this.updateTask(task.id, {
          status: 'failed',
          error: error.message,
          completedAt: Date.now(),
        });
      }
    } finally {
      this.currentProcessing--;
    }
  }

  subscribe(taskId: string, callback: (task: GenerationTask) => void): () => void {
    this.listeners.set(taskId, callback);
    return () => this.listeners.delete(taskId);
  }

  private notifyListeners(task: GenerationTask): void {
    const listener = this.listeners.get(task.id);
    if (listener) {
      listener(task);
    }
  }

  getStats(): {
    queueLength: number;
    processing: number;
    completed: number;
    currentProcessing: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      completed: this.completed.size,
      currentProcessing: this.currentProcessing,
    };
  }

  clearQueue(): void {
    this.queue = [];
    console.log('🧹 Queue cleared');
  }
}

// Singleton instance
export const generationQueue = new GenerationQueue();
export default generationQueue;
