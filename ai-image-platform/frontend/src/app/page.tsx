'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Image, Download, RefreshCw, Shuffle, Settings, History, HelpCircle, Moon, Sun, Github, Send } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import GenerationForm from '@components/GenerationForm';
import ImageGallery from '@components/ImageGallery';
import Header from '@components/layout/Header';
import { useAppStore } from '@store/useAppStore';

export default function Home() {
  const { generations, isLoading, settings } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-16 h-16 text-cyan-400" />
          </motion.div>
          <p className="mt-4 text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(20, 20, 30, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#00f3ff',
              secondary: '#000',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff0066',
              secondary: '#fff',
            },
          },
        }}
      />

      <div className="min-h-screen relative overflow-hidden">
        {/* Animated background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        </div>

        {/* Grid pattern overlay */}
        <div 
          className="fixed inset-0 z-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <Header />

          <main className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Hero section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 mb-4 px-4 py-2 glass rounded-full"
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-white/80">Powered by Pollinations AI</span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="gradient-text">Create Amazing Art</span>
                <br />
                <span className="text-white">with AI</span>
              </h1>

              <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
                Transform your ideas into stunning visuals using advanced AI technology.
                Free, fast, and unlimited image generation.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary inline-flex items-center gap-2"
                  onClick={() => document.getElementById('prompt-input')?.focus()}
                >
                  <Sparkles className="w-5 h-5" />
                  Start Creating
                </motion.button>
                <motion.a
                  href="https://t.me/your_bot_name"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Telegram Bot
                </motion.a>
              </div>
            </motion.section>

            {/* Generation form */}
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-16"
            >
              <GenerationForm />
            </motion.section>

            {/* Gallery section */}
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <ImageGallery />
            </motion.section>
          </main>

          {/* Footer */}
          <footer className="border-t border-white/10 mt-20">
            <div className="container mx-auto px-4 py-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-white/40 text-sm">
                  © 2024 AI Image Generator. All rights reserved.
                </div>
                <div className="flex items-center gap-6">
                  <a href="#" className="text-white/40 hover:text-white transition-colors text-sm">
                    Terms
                  </a>
                  <a href="#" className="text-white/40 hover:text-white transition-colors text-sm">
                    Privacy
                  </a>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
