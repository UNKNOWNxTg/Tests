'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Settings2, Maximize2, Shuffle, Wand2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, ASPECT_RATIOS } from '@store/useAppStore';
import { apiClient } from '@lib/api';

const MODELS = [
  { id: 'flux-realism', name: 'Flux Realism' },
  { id: 'any-dark', name: 'Any Dark' },
  { id: 'flux-anime', name: 'Flux Anime' },
  { id: 'flux-3d', name: 'Flux 3D' },
  { id: 'turbo', name: 'Turbo' },
  { id: 'any-light', name: 'Any Light' },
  { id: 'deliberate', name: 'Deliberate' },
  { id: 'midjourney', name: 'Midjourney Style' },
  { id: 'anime-pastel-dream', name: 'Anime Pastel Dream' },
  { id: 'stable-diffusion-xl', name: 'SDXL' },
];

const PROMPT_TEMPLATES = [
  'A breathtaking {subject} in {style}, {lighting}, {details}',
  '{subject}, {style} art style, {color_palette}, {mood}',
  'Epic {subject}, {environment}, {time_of_day}, {atmosphere}',
];

const RANDOM_PROMPTS = [
  'A cyberpunk city at night with neon lights and flying cars',
  'A serene mountain landscape at sunrise with misty valleys',
  'An underwater kingdom with bioluminescent creatures',
  'A magical forest with glowing mushrooms and fairies',
  'A futuristic space station orbiting a distant planet',
  'A medieval castle on a cliff overlooking the ocean',
  'A steampunk airship sailing through cloudy skies',
  'An ancient temple hidden in a dense jungle',
];

export default function GenerationForm() {
  const { settings, setSettings, addGeneration, updateGeneration, setCurrentTaskId, setIsLoading } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleSubmit = useCallback(async (e?: React.FormEvent, isBatch = false) => {
    e?.preventDefault();
    
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsLoading(true);

    try {
      const batchSize = isBatch ? 4 : settings.batchSize;
      const tasks = [];

      for (let i = 0; i < batchSize; i++) {
        const generation: any = {
          id: `gen-${Date.now()}-${i}`,
          prompt: prompt.trim(),
          negativePrompt: settings.negativePrompt,
          status: 'pending' as const,
          model: settings.model,
          width: settings.width,
          height: settings.height,
          seed: Math.floor(Math.random() * 1000000),
          createdAt: Date.now(),
        };

        addGeneration(generation);
        tasks.push(generation.id);

        // Submit to API
        const response = await apiClient.generate({
          prompt: generation.prompt,
          negativePrompt: generation.negativePrompt,
          width: generation.width,
          height: generation.height,
          seed: generation.seed,
          model: generation.model,
        });

        if (response.success) {
          setCurrentTaskId(response.task.id);
          updateGeneration(generation.id, { id: response.task.id });
          
          // Poll for completion
          pollForCompletion(response.task.id, generation.id);
        } else {
          throw new Error(response.error || 'Generation failed');
        }

        // Small delay between batch requests
        if (i < batchSize - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast.success(`Started generating ${batchSize} image${batchSize > 1 ? 's' : ''}`);
      setPrompt('');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate image');
      setIsLoading(false);
    }
  }, [prompt, settings, addGeneration, updateGeneration, setCurrentTaskId, setIsLoading]);

  const pollForCompletion = async (taskId: string, localId: string) => {
    const maxAttempts = 60; // 2 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await apiClient.getTaskStatus(taskId);
        
        if (response.success) {
          const task = response.task;
          
          updateGeneration(localId, {
            id: task.id,
            status: task.status,
            imageUrl: task.imageUrl,
            error: task.error,
            seed: task.metadata?.seed,
          });

          if (task.status === 'completed') {
            setIsLoading(false);
            toast.success('Image generated successfully!');
          } else if (task.status === 'failed') {
            setIsLoading(false);
            toast.error(`Generation failed: ${task.error}`);
          } else {
            // Continue polling
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(poll, 2000);
            } else {
              setIsLoading(false);
              toast.error('Generation timed out');
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setIsLoading(false);
        }
      }
    };

    setTimeout(poll, 2000);
  };

  const handleRandomPrompt = () => {
    const randomPrompt = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setPrompt(randomPrompt);
    toast.success('Random prompt loaded!');
  };

  const handleApplyTemplate = (template: string) => {
    const filled = template
      .replace('{subject}', 'dragon')
      .replace('{style}', 'fantasy')
      .replace('{lighting}', 'dramatic lighting')
      .replace('{details}', 'highly detailed')
      .replace('{color_palette}', 'vibrant colors')
      .replace('{mood}', 'mysterious atmosphere')
      .replace('{environment}', 'in mountains')
      .replace('{time_of_day}', 'at sunset')
      .replace('{atmosphere}', 'magical aura');
    
    setPrompt(filled);
    setShowTemplates(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        handleSubmit(undefined, true); // Batch generate
      } else {
        handleSubmit(); // Single generate
      }
    }
  };

  return (
    <div className="card-glass max-w-4xl mx-auto">
      <form onSubmit={handleSubmit}>
        {/* Main prompt input */}
        <div className="relative mb-4">
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the image you want to create... (Press Enter to generate, Ctrl+Enter for batch)"
            className="input-glass min-h-[120px] resize-none text-lg"
            rows={3}
          />
          
          <div className="absolute bottom-3 right-3 flex gap-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRandomPrompt}
              className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
              title="Random prompt"
            >
              <Shuffle className="w-4 h-4 text-white/60" />
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
              title="Templates"
            >
              <Wand2 className="w-4 h-4 text-white/60" />
            </motion.button>
          </div>
        </div>

        {/* Templates dropdown */}
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 glass rounded-lg"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-white/80">Prompt Templates</h3>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {PROMPT_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleApplyTemplate(template)}
                  className="w-full text-left p-2 rounded glass hover:bg-white/10 text-sm text-white/70 transition-colors"
                >
                  {template}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick settings */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Model selector */}
          <select
            value={settings.model}
            onChange={(e) => setSettings({ model: e.target.value })}
            className="px-4 py-2 rounded-lg glass border border-white/10 focus:border-cyan-500/50 focus:outline-none bg-transparent text-white text-sm"
          >
            {MODELS.map((model) => (
              <option key={model.id} value={model.id} className="bg-gray-900">
                {model.name}
              </option>
            ))}
          </select>

          {/* Aspect ratio selector */}
          <select
            onChange={(e) => {
              const [width, height] = ASPECT_RATIOS[e.target.value as keyof typeof ASPECT_RATIOS];
              setSettings({ width, height });
            }}
            className="px-4 py-2 rounded-lg glass border border-white/10 focus:border-cyan-500/50 focus:outline-none bg-transparent text-white text-sm"
          >
            {Object.entries(ASPECT_RATIOS).map(([ratio, [w, h]]) => (
              <option key={ratio} value={ratio} className="bg-gray-900">
                {ratio} ({w}x{h})
              </option>
            ))}
          </select>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 py-2 rounded-lg glass border transition-colors text-sm flex items-center gap-2 ${
              showAdvanced ? 'border-cyan-500/50 text-cyan-400' : 'border-white/10 text-white/70'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Advanced
          </button>
        </div>

        {/* Advanced settings */}
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 glass rounded-lg space-y-4"
          >
            <div>
              <label className="block text-sm text-white/60 mb-2">Negative Prompt</label>
              <input
                type="text"
                value={settings.negativePrompt}
                onChange={(e) => setSettings({ negativePrompt: e.target.value })}
                placeholder="What to exclude from the image..."
                className="input-glass text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Width</label>
                <input
                  type="number"
                  value={settings.width}
                  onChange={(e) => setSettings({ width: parseInt(e.target.value) || 1024 })}
                  className="input-glass text-sm"
                  min="256"
                  max="2048"
                  step="64"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Height</label>
                <input
                  type="number"
                  value={settings.height}
                  onChange={(e) => setSettings({ height: parseInt(e.target.value) || 1024 })}
                  className="input-glass text-sm"
                  min="256"
                  max="2048"
                  step="64"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Batch Size</label>
                <input
                  type="number"
                  value={settings.batchSize}
                  onChange={(e) => setSettings({ batchSize: Math.min(4, Math.max(1, parseInt(e.target.value) || 1)) })}
                  className="input-glass text-sm"
                  min="1"
                  max="4"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Seed</label>
                <input
                  type="number"
                  placeholder="Random"
                  className="input-glass text-sm"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Generate button */}
        <div className="flex gap-3">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!prompt.trim()}
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            Generate
          </motion.button>
          
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSubmit(undefined, true)}
            disabled={!prompt.trim()}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Maximize2 className="w-5 h-5" />
            Batch (4)
          </motion.button>
        </div>

        {/* Keyboard shortcuts hint */}
        <p className="mt-3 text-xs text-white/40 text-center">
          Press <kbd className="px-2 py-1 rounded glass text-white/60">Enter</kbd> to generate,{' '}
          <kbd className="px-2 py-1 rounded glass text-white/60">Ctrl+Enter</kbd> for batch generation
        </p>
      </form>
    </div>
  );
}
