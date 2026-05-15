import TelegramBot from 'node-telegram-bot-api';
import envConfig from '../../config/env';
import generationQueue, { GenerationTask } from '../services/queueService';
import pollinationsService from '../services/pollinationsService';
import rateLimitManager from '../services/rateLimitService';

// User sessions storage
interface UserSession {
  userId: string;
  currentPrompt?: string;
  settings: {
    model: string;
    width: number;
    height: number;
    nsfw: boolean;
  };
  history: string[];
}

const userSessions = new Map<string, UserSession>();

// Initialize bot
const bot = new TelegramBot(envConfig.TELEGRAM_BOT_TOKEN, { polling: true });

console.log('🤖 Telegram bot starting...');

// Helper to get or create user session
const getSession = (userId: string): UserSession => {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      userId,
      settings: {
        model: 'flux-realism',
        width: 1024,
        height: 1024,
        nsfw: false,
      },
      history: [],
    });
  }
  return userSessions.get(userId)!;
};

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id || chatId);

  const welcomeMessage = `
🎨 *Welcome to AI Image Generator!*

I can generate amazing images from your text prompts using advanced AI.

*Commands:*
/generate - Create an image
/settings - Change generation settings
/models - View available models
/history - Your generation history
/help - Get help

*Quick Start:*
Just send me a prompt like:
"a cyberpunk city at night, neon lights, futuristic"

Let's create something amazing! ✨
  `.trim();

  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎨 Generate Image', callback_data: 'generate' }],
        [{ text: '⚙️ Settings', callback_data: 'settings' }],
        [{ text: '📚 Models', callback_data: 'models' }],
      ],
    },
  });
});

// Help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📖 *Help & Guide*

*How to use:*
1. Send /generate or just type your prompt
2. Wait for the image to be generated
3. Use buttons to regenerate or create variations

*Tips:*
• Be descriptive in your prompts
• Include style keywords (cyberpunk, realistic, anime)
• Use negative prompts to exclude elements
• Try different models for different styles

*Keyboard Shortcuts:*
• Just type your prompt directly
• Use inline buttons for quick actions

*Support:*
Contact @admin for issues
  `.trim();

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Models command
bot.onText(/\/models/, async (msg) => {
  const chatId = msg.chat.id;
  const models = pollinationsService.getAvailableModels();

  let modelsList = '📚 *Available Models:*\n\n';
  Object.entries(models).forEach(([id, name]) => {
    modelsList += `• ${name} (\`${id}\`)\n`;
  });

  await bot.sendMessage(chatId, modelsList, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Back', callback_data: 'back_menu' }],
      ],
    },
  });
});

// Settings command
bot.onText(/\/settings/, async (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(String(msg.from?.id || chatId));

  const settingsMessage = `
⚙️ *Your Settings*

Model: ${session.settings.model}
Size: ${session.settings.width}x${session.settings.height}
NSFW Filter: ${session.settings.nsfw ? 'Off' : 'On'}

Use /setmodel <model_id> to change model
Use /setsize <width>x<height> to change size
  `.trim();

  await bot.sendMessage(chatId, settingsMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔄 Change Model', callback_data: 'change_model' },
          { text: '📐 Change Size', callback_data: 'change_size' },
        ],
        [{ text: '⬅️ Back', callback_data: 'back_menu' }],
      ],
    },
  });
});

// History command
bot.onText(/\/history/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id || chatId);

  const tasks = generationQueue.getUserTasks(userId, 10);

  if (tasks.length === 0) {
    await bot.sendMessage(chatId, '📭 No generation history yet.\nStart with /generate!');
    return;
  }

  await bot.sendMessage(chatId, `📜 *Your History* (${tasks.length} items)\n\nMost recent generations shown.`);

  // Send thumbnails of recent images
  for (const task of tasks.slice(0, 5)) {
    if (task.imageUrl && task.status === 'completed') {
      try {
        await bot.sendPhoto(chatId, task.imageUrl, {
          caption: `🎨 ${task.prompt.substring(0, 100)}${task.prompt.length > 100 ? '...' : ''}`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔄 Regenerate', callback_data: `regen_${task.id}` },
                { text: '🎲 Variation', callback_data: `var_${task.id}` },
              ],
            ],
          },
        });
      } catch (error) {
        console.error('Failed to send history image:', error);
      }
    }
  }
});

// Generate command
bot.onText(/\/generate(?:\s+(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id || chatId);
  const prompt = match?.[1]?.trim();

  if (!prompt) {
    await bot.sendMessage(chatId, '🎨 Please provide a prompt!\n\nExample:\n/generate a beautiful sunset over mountains', {
      reply_markup: {
        force_reply: true,
        selective: true,
      },
    });
    return;
  }

  await handleGeneration(chatId, userId, prompt);
});

// Handle any message as potential prompt (if not a command)
bot.on('message', async (msg) => {
  // Ignore commands and non-text messages
  if (msg.text?.startsWith('/') || !msg.text || msg.photo) {
    return;
  }

  const chatId = msg.chat.id;
  const userId = String(msg.from?.id || chatId);
  const prompt = msg.text.trim();

  // Check if it looks like a prompt (not just random characters)
  if (prompt.length < 5) {
    return;
  }

  await handleGeneration(chatId, userId, prompt);
});

async function handleGeneration(chatId: number, userId: string, prompt: string) {
  // Check rate limit
  const rateLimit = await rateLimitManager.checkLimit(userId, 'telegram');
  if (!rateLimit.allowed) {
    await bot.sendMessage(chatId, `⏳ Rate limit exceeded. Please wait ${Math.ceil(rateLimit.msBeforeNext / 1000)} seconds.`);
    return;
  }

  const session = getSession(userId);

  // Send processing message
  const processingMsg = await bot.sendMessage(chatId, '🎨 Generating your image...\n\nThis may take a few seconds.');

  try {
    // Add to queue
    const task = generationQueue.addTask(userId, prompt, {
      width: session.settings.width,
      height: session.settings.height,
      model: session.settings.model,
    });

    // Update status
    await bot.editMessageText(`🎨 Generating...\n\nPrompt: ${prompt.substring(0, 100)}\n\nPosition in queue: ${generationQueue.getStats().queueLength}`, {
      chat_id: chatId,
      message_id: processingMsg.message_id,
    });

    // Poll for completion
    const checkInterval = setInterval(async () => {
      const updatedTask = generationQueue.getTask(task.id);
      
      if (!updatedTask) {
        clearInterval(checkInterval);
        return;
      }

      if (updatedTask.status === 'completed' && updatedTask.imageUrl) {
        clearInterval(checkInterval);

        // Delete processing message
        try {
          await bot.deleteMessage(chatId, processingMsg.message_id);
        } catch {}

        // Send the generated image
        await bot.sendPhoto(chatId, updatedTask.imageUrl, {
          caption: `✨ *Generated!*\n\n📝 Prompt: ${updatedTask.prompt}\n🎯 Model: ${updatedTask.model}\n📐 Size: ${updatedTask.width}x${updatedTask.height}\n🌱 Seed: ${updatedTask.seed}`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔄 Regenerate', callback_data: `regen_${task.id}` },
                { text: '🎲 Variation', callback_data: `var_${task.id}` },
              ],
              [
                { text: '📥 Download', url: updatedTask.imageUrl },
                { text: '➡️ Upscale', callback_data: `upscale_${task.id}` },
              ],
            ],
          },
        });

        // Update session history
        session.history.unshift(prompt);
        if (session.history.length > 20) session.history.pop();
      } else if (updatedTask.status === 'failed') {
        clearInterval(checkInterval);

        await bot.editMessageText(`❌ Generation failed:\n${updatedTask.error}`, {
          chat_id: chatId,
          message_id: processingMsg.message_id,
        });
      }
    }, 2000);

    // Timeout after 2 minutes
    setTimeout(() => clearInterval(checkInterval), 120000);
  } catch (error: any) {
    console.error('Generation error:', error);
    await bot.editMessageText(`❌ Error: ${error.message}`, {
      chat_id: chatId,
      message_id: processingMsg.message_id,
    });
  }
}

// Callback query handler
bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  const userId = String(query.from.id);
  const data = query.data;

  if (!chatId) return;

  try {
    if (data === 'generate') {
      await bot.answerCallbackQuery(query.id, { text: 'Send me a prompt!' });
    } else if (data === 'settings') {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '/settings');
    } else if (data === 'models') {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '/models');
    } else if (data === 'back_menu') {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, '🏠 Back to menu');
    } else if (data.startsWith('regen_')) {
      const taskId = data.replace('regen_', '');
      const task = generationQueue.getTask(taskId);
      
      if (task) {
        await bot.answerCallbackQuery(query.id, { text: '🔄 Regenerating...' });
        await handleGeneration(chatId, userId, task.prompt);
      }
    } else if (data.startsWith('var_')) {
      const taskId = data.replace('var_', '');
      const task = generationQueue.getTask(taskId);
      
      if (task) {
        await bot.answerCallbackQuery(query.id, { text: '🎲 Creating variation...' });
        await handleGeneration(chatId, userId, task.prompt + ', variation, different interpretation');
      }
    } else if (data.startsWith('upscale_')) {
      await bot.answerCallbackQuery(query.id, { text: '🔍 Upscaling not available in demo' });
    } else if (data.startsWith('change_model')) {
      const models = pollinationsService.getAvailableModels();
      const keyboard = Object.entries(models).map(([id, name]) => [
        { text: name, callback_data: `model_${id}` },
      ]);
      
      await bot.editMessageText('Select a model:', {
        chat_id: chatId,
        message_id: query.message?.message_id,
        reply_markup: { inline_keyboard: keyboard },
      });
    } else if (data.startsWith('model_')) {
      const model = data.replace('model_', '');
      const session = getSession(userId);
      session.settings.model = model;
      
      await bot.answerCallbackQuery(query.id, { text: `✅ Model set to ${model}` });
      await bot.sendMessage(chatId, `/settings`);
    }

    await bot.answerCallbackQuery(query.id);
  } catch (error: any) {
    console.error('Callback error:', error);
  }
});

// Set model command
bot.onText(/\/setmodel\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id || chatId);
  const modelId = match?.[1]?.trim();

  const models = pollinationsService.getAvailableModels();
  
  if (!models[modelId as keyof typeof models]) {
    await bot.sendMessage(chatId, `❌ Invalid model. Use /models to see available models.`);
    return;
  }

  const session = getSession(userId);
  session.settings.model = modelId;

  await bot.sendMessage(chatId, `✅ Model set to: ${models[modelId as keyof typeof models]}`);
});

// Set size command
bot.onText(/\/setsize\s+(\d+)x(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id || chatId);
  const width = parseInt(match?.[1] || '1024', 10);
  const height = parseInt(match?.[2] || '1024', 10);

  const session = getSession(userId);
  session.settings.width = width;
  session.settings.height = height;

  await bot.sendMessage(chatId, `✅ Size set to: ${width}x${height}`);
});

// Admin stats command
bot.onText(/\/stats/, async (msg) => {
  const userId = String(msg.from?.id);
  
  if (!envConfig.TELEGRAM_ADMIN_IDS.includes(userId)) {
    return;
  }

  const queueStats = generationQueue.getStats();
  const proxyStats = (await import('../services/proxyManager')).proxyManager.getStats();

  const statsMessage = `
📊 *System Statistics*

*Queue:*
• Pending: ${queueStats.queueLength}
• Processing: ${queueStats.currentProcessing}
• Completed: ${queueStats.completed}

*Proxies:*
• Total: ${proxyStats.total}
• Healthy: ${proxyStats.healthy}
• Unhealthy: ${proxyStats.unhealthy}

*Memory:*
• RSS: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB
• Heap: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
  `.trim();

  await bot.sendMessage(msg.chat.id, statsMessage, { parse_mode: 'Markdown' });
});

console.log('✅ Telegram bot initialized successfully');

export default bot;
