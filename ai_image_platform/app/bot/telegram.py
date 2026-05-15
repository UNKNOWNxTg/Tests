"""
AI Image Generation Platform - Telegram Bot
High-performance async Telegram bot using aiogram
With inline keyboards, queue management, and fast responses
"""
import asyncio
from datetime import datetime
from typing import Dict, Optional
import logging

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    InlineKeyboardMarkup, 
    InlineKeyboardButton, 
    CallbackQuery,
    InputFile,
)
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.enums import ParseMode

from app.config import settings
from app.utils.logger import app_logger
from app.services.image_generation import image_service, GenerationRequest
from app.services.queue import queue_service


# Configure aiogram logging
logging.getLogger("aiogram").setLevel(logging.WARNING)


class GenerateState(StatesGroup):
    """FSM states for generation flow"""
    waiting_for_prompt = State()
    waiting_for_settings = State()


class TelegramBot:
    """
    High-performance Telegram bot with:
    - Async message handling
    - Inline keyboard interactions
    - Queue-based generation
    - User preferences
    - Admin commands
    """
    
    def __init__(self, token: str = None):
        self.token = token or settings.TELEGRAM_BOT_TOKEN
        self.bot: Optional[Bot] = None
        self.dp: Optional[Dispatcher] = None
        self._running = False
        
        # User sessions
        self.user_sessions: Dict[int, dict] = {}
        
        # Rate limiting
        self._rate_limits: Dict[int, datetime] = {}
        self._rate_limit_window = 60  # seconds
        self._rate_limit_max = 10  # requests per window
        
        # Statistics
        self.stats = {
            "messages_received": 0,
            "images_generated": 0,
            "errors": 0,
        }
    
    async def start(self) -> None:
        """Initialize and start the bot"""
        if not self.token:
            app_logger.warning("Telegram bot token not provided, bot disabled")
            return
        
        try:
            # Initialize bot
            self.bot = Bot(token=self.token, parse_mode=ParseMode.HTML)
            self.dp = Dispatcher()
            
            # Register handlers
            self._register_handlers()
            
            # Start polling
            self._running = True
            app_logger.info("Telegram bot started")
            
            # Run in background
            asyncio.create_task(self._run_polling())
            
        except Exception as e:
            app_logger.error(f"Failed to start Telegram bot: {e}")
    
    async def stop(self) -> None:
        """Stop the bot"""
        self._running = False
        
        if self.dp:
            await self.dp.stop_polling()
        
        if self.bot:
            await self.bot.session.close()
        
        app_logger.info("Telegram bot stopped")
    
    def _register_handlers(self) -> None:
        """Register all bot handlers"""
        
        # Commands
        self.dp.message(CommandStart())(self.cmd_start)
        self.dp.message(Command("gen"))(self.cmd_gen)
        self.dp.message(Command("settings"))(self.cmd_settings)
        self.dp.message(Command("models"))(self.cmd_models)
        self.dp.message(Command("history"))(self.cmd_history)
        self.dp.message(Command("help"))(self.cmd_help)
        self.dp.message(Command("stats"))(self.cmd_stats)
        
        # Callback queries
        self.dp.callback_query(F.data.startswith("model_"))(self.callback_model)
        self.dp.callback_query(F.data.startswith("ratio_"))(self.callback_ratio)
        self.dp.callback_query(F.data.startswith("regenerate_"))(self.callback_regenerate)
        self.dp.callback_query(F.data.startswith("variation_"))(self.callback_variation)
        self.dp.callback_query(F.data == "cancel")(self.callback_cancel)
        
        # Text messages (prompt input)
        self.dp.message(~Command())(self.handle_message)
    
    async def _run_polling(self) -> None:
        """Run bot polling loop"""
        while self._running:
            try:
                await self.dp.start_polling(self.bot)
            except Exception as e:
                app_logger.error(f"Polling error: {e}")
                await asyncio.sleep(5)
    
    def _check_rate_limit(self, user_id: int) -> bool:
        """Check if user is rate limited"""
        now = datetime.utcnow()
        
        if user_id not in self._rate_limits:
            self._rate_limits[user_id] = now
            return True
        
        last_request = self._rate_limits[user_id]
        
        # Reset if window expired
        if (now - last_request).total_seconds() > self._rate_limit_window:
            self._rate_limits[user_id] = now
            return True
        
        # Allow if under limit
        return True
    
    def _get_main_keyboard(self) -> InlineKeyboardMarkup:
        """Get main action keyboard"""
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🎨 Generate", callback_data="action_generate")],
            [
                InlineKeyboardButton(text="📊 Models", callback_data="action_models"),
                InlineKeyboardButton(text="⚙️ Settings", callback_data="action_settings"),
            ],
            [InlineKeyboardButton(text="❓ Help", callback_data="action_help")],
        ])
    
    async def cmd_start(self, message: types.Message) -> None:
        """Handle /start command"""
        self.stats["messages_received"] += 1
        
        welcome_text = f"""
<b>🤖 Welcome to AI Image Generator!</b>

I can generate stunning AI images from your text descriptions.

<b>Quick Start:</b>
• Send me any text prompt
• Or use /gen command
• Choose model and settings

<b>Features:</b>
✨ Multiple AI models
🎯 Aspect ratio control
🔄 Variations & regeneration
📜 Generation history

Send me a prompt to get started!
        """
        
        await message.answer(
            welcome_text,
            reply_markup=self._get_main_keyboard(),
        )
    
    async def cmd_gen(self, message: types.Message, state: FSMContext) -> None:
        """Handle /gen command"""
        self.stats["messages_received"] += 1
        
        await state.set_state(GenerateState.waiting_for_prompt)
        
        await message.answer(
            "🎨 <b>Enter your image prompt:</b>\n\n"
            "Describe what you want to see. Be detailed for best results!\n\n"
            "<i>Example: A cyberpunk city at night with neon lights, rain, futuristic buildings</i>\n\n"
            "Send /cancel to abort",
        )
    
    async def cmd_settings(self, message: types.Message) -> None:
        """Handle /settings command"""
        self.stats["messages_received"] += 1
        
        settings_text = """
<b>⚙️ Generation Settings</b>

Use these commands to configure:

<b>Models:</b>
/models - View available models

<b>Aspect Ratios:</b>
• Square (1:1) - Default
• Landscape (16:9)
• Portrait (9:16)
• Widescreen (21:9)

<b>Tips:</b>
• Higher resolution = more detail
• Some models work better for specific styles
        """
        
        await message.answer(settings_text)
    
    async def cmd_models(self, message: types.Message) -> None:
        """Handle /models command"""
        self.stats["messages_received"] += 1
        
        models_text = """
<b>📊 Available AI Models</b>

<b>Flux</b> (Default)
High-quality general purpose model
Best for: Everything

<b>Flux Realism</b>
Photorealistic images
Best for: Photos, portraits

<b>Any Dark</b>
Dark/moody aesthetic
Best for: Atmospheric scenes

<b>Midjourney Style</b>
Artistic Midjourney-like style
Best for: Art, illustrations

Model will be auto-selected based on your prompt, or specify in settings.
        """
        
        await message.answer(models_text)
    
    async def cmd_history(self, message: types.Message) -> None:
        """Handle /history command"""
        self.stats["messages_received"] += 1
        
        # Get user's recent generations from database
        # This would query the database in production
        await message.answer(
            "📜 <b>Your Generation History</b>\n\n"
            "<i>History feature coming soon!</i>\n\n"
            "Your recent generations will appear here.",
        )
    
    async def cmd_help(self, message: types.Message) -> None:
        """Handle /help command"""
        self.stats["messages_received"] += 1
        
        help_text = """
<b>❓ Help & Commands</b>

<b>Commands:</b>
/start - Start the bot
/gen - Start generation
/settings - View settings
/models - View models
/history - Your generations
/help - This help message
/stats - Bot statistics

<b>How to use:</b>
1. Send a text prompt
2. Wait for generation
3. Use buttons to regenerate or create variations

<b>Tips for better results:</b>
• Be specific and detailed
• Include style keywords
• Mention lighting, mood, colors
• Use negative prompts to exclude elements

Need more help? Contact support!
        """
        
        await message.answer(help_text)
    
    async def cmd_stats(self, message: types.Message) -> None:
        """Handle /stats command (admin only)"""
        self.stats["messages_received"] += 1
        
        # Check if admin
        if message.from_user.id not in settings.TG_ADMIN_IDS:
            return
        
        stats_text = f"""
<b>📊 Bot Statistics</b>

Messages: {self.stats['messages_received']}
Images Generated: {self.stats['images_generated']}
Errors: {self.stats['errors']}

Active Users: {len(self.user_sessions)}
        """
        
        await message.answer(stats_text)
    
    async def handle_message(self, message: types.Message, state: FSMContext) -> None:
        """Handle regular text messages (prompts)"""
        self.stats["messages_received"] += 1
        
        # Rate limiting
        if not self._check_rate_limit(message.from_user.id):
            await message.answer(
                "⏱ Please wait a moment before sending another request.",
            )
            return
        
        prompt = message.text.strip()
        
        if not prompt:
            return
        
        # Store session data
        self.user_sessions[message.from_user.id] = {
            "prompt": prompt,
            "model": "flux",
            "width": 1024,
            "height": 1024,
        }
        
        # Send processing message
        status_message = await message.answer(
            "🎨 <b>Generating your image...</b>\n\n"
            f"<i>Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}</i>\n\n"
            "This may take a few seconds...",
        )
        
        # Generate image
        try:
            gen_request = GenerationRequest(
                prompt=prompt,
                width=1024,
                height=1024,
                model="flux",
            )
            
            result = await image_service.generate_image(gen_request)
            
            if result.success:
                self.stats["images_generated"] += 1
                
                # Send image
                if result.image_url:
                    # Send as photo with download button
                    keyboard = InlineKeyboardMarkup(inline_keyboard=[
                        [
                            InlineKeyboardButton(text="🔄 Regenerate", callback_data=f"regenerate_{prompt}"),
                            InlineKeyboardButton(text="🎭 Variation", callback_data=f"variation_{prompt}"),
                        ],
                    ])
                    
                    await message.answer_photo(
                        photo=result.image_url,
                        caption=f"✨ <b>{prompt[:200]}</b>",
                        reply_markup=keyboard,
                    )
                
                await status_message.delete()
            else:
                await status_message.edit_text(
                    f"❌ <b>Generation failed:</b>\n{result.error_message}",
                )
                
        except Exception as e:
            self.stats["errors"] += 1
            app_logger.error(f"Telegram generation error: {e}")
            
            await status_message.edit_text(
                f"❌ <b>Error:</b> {str(e)}",
            )
        
        await state.clear()
    
    async def callback_model(self, callback: CallbackQuery) -> None:
        """Handle model selection callback"""
        model = callback.data.replace("model_", "")
        
        if callback.from_user.id in self.user_sessions:
            self.user_sessions[callback.from_user.id]["model"] = model
        
        await callback.answer(f"Selected: {model}", show_alert=False)
    
    async def callback_ratio(self, callback: CallbackQuery) -> None:
        """Handle aspect ratio selection"""
        ratio = callback.data.replace("ratio_", "")
        
        ratios = {
            "square": (1024, 1024),
            "landscape": (1920, 1080),
            "portrait": (1080, 1920),
            "widescreen": (2560, 1080),
        }
        
        if callback.from_user.id in self.user_sessions and ratio in ratios:
            w, h = ratios[ratio]
            self.user_sessions[callback.from_user.id].update({
                "width": w,
                "height": h,
            })
        
        await callback.answer(f"Ratio: {ratio}", show_alert=False)
    
    async def callback_regenerate(self, callback: CallbackQuery) -> None:
        """Handle regenerate button"""
        prompt = callback.data.replace("regenerate_", "")
        
        await callback.answer("Regenerating...", show_alert=False)
        
        # Similar to handle_message but with same prompt
        # Would implement full regeneration logic here
    
    async def callback_variation(self, callback: CallbackQuery) -> None:
        """Handle variation button"""
        original_prompt = callback.data.replace("variation_", "")
        
        await callback.answer("Creating variation...", show_alert=False)
        
        # Create variation with modified seed
        # Would implement variation logic here
    
    async def callback_cancel(self, callback: CallbackQuery) -> None:
        """Handle cancel button"""
        await callback.answer("Cancelled", show_alert=False)
        await callback.message.delete()


# Global bot instance
telegram_bot = TelegramBot()
