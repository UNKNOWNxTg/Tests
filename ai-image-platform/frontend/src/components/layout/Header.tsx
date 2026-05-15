'use client';

import { motion } from 'framer-motion';
import { Sparkles, Github, Send, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.a
            href="/"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 group"
          >
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold gradient-text">AI Image Gen</h1>
              <p className="text-xs text-white/40">Powered by Pollinations</p>
            </div>
          </motion.a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#gallery"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Gallery
            </a>
            <a
              href="https://t.me/your_bot_name"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              Bot
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:block">
            <motion.a
              href="https://t.me/your_bot_name"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary text-sm"
            >
              Try Telegram Bot
            </motion.a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-white/60" />
            ) : (
              <Menu className="w-6 h-6 text-white/60" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-4 pb-4 space-y-4"
          >
            <a
              href="#features"
              className="block text-sm text-white/60 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#gallery"
              className="block text-sm text-white/60 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Gallery
            </a>
            <a
              href="https://t.me/your_bot_name"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-white/60 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Telegram Bot
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-white/60 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              GitHub
            </a>
            <a
              href="https://t.me/your_bot_name"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm block text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              Try Telegram Bot
            </a>
          </motion.nav>
        )}
      </div>
    </header>
  );
}
