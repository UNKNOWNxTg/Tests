'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Shuffle, ExternalLink, Trash2, Maximize } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, Generation } from '@store/useAppStore';
import { apiClient } from '@lib/api';

export default function ImageGallery() {
  const { generations, updateGeneration, removeGeneration, setSelectedGeneration } = useAppStore();

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-image-${prompt.slice(0, 30).replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const handleRegenerate = async (generation: Generation) => {
    try {
      const response = await apiClient.regenerate(generation.id);
      
      if (response.success) {
        toast.success('Regeneration started!');
        // The new generation will be added via WebSocket/polling
      } else {
        toast.error(response.error || 'Failed to regenerate');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate');
    }
  };

  const handleVariation = async (generation: Generation) => {
    // Create variation with slightly modified prompt
    const variationPrompt = `${generation.prompt}, variation, different interpretation, unique style`;
    
    try {
      const response = await apiClient.generate({
        prompt: variationPrompt,
        negativePrompt: generation.negativePrompt,
        width: generation.width,
        height: generation.height,
        model: generation.model,
      });

      if (response.success) {
        toast.success('Variation started!');
      } else {
        toast.error(response.error || 'Failed to create variation');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create variation');
    }
  };

  const getStatusColor = (status: Generation['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'processing':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-white/60';
    }
  };

  const getStatusText = (status: Generation['status']) => {
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'processing':
        return 'Generating...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  if (generations.length === 0) {
    return (
      <div className="text-center py-20">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-block p-8 glass rounded-2xl"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
            <Shuffle className="w-10 h-10 text-white/40" />
          </div>
          <h3 className="text-xl font-semibold text-white/80 mb-2">No images yet</h3>
          <p className="text-white/40 max-w-md">
            Start creating amazing AI-generated images by entering a prompt above!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Your Creations</h2>
        <span className="text-sm text-white/40">{generations.length} images</span>
      </div>

      <div className="masonry-grid">
        <AnimatePresence mode="popLayout">
          {generations.map((generation, index) => (
            <motion.div
              key={generation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="masonry-item"
            >
              <div className="card-glass group relative overflow-hidden">
                {/* Image */}
                <div className="relative aspect-square overflow-hidden rounded-lg mb-3">
                  {generation.status === 'completed' && generation.imageUrl ? (
                    <>
                      <img
                        src={generation.imageUrl}
                        alt={generation.prompt}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDownload(generation.imageUrl!, generation.prompt)}
                          className="p-3 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 transition-colors"
                          title="Download"
                        >
                          <Download className="w-5 h-5 text-white" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRegenerate(generation)}
                          className="p-3 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 transition-colors"
                          title="Regenerate"
                        >
                          <RefreshCw className="w-5 h-5 text-white" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleVariation(generation)}
                          className="p-3 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 transition-colors"
                          title="Variation"
                        >
                          <Shuffle className="w-5 h-5 text-white" />
                        </motion.button>
                        <motion.a
                          href={generation.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-3 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-5 h-5 text-white" />
                        </motion.a>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeGeneration(generation.id)}
                          className="p-3 rounded-full bg-red-500/20 backdrop-blur hover:bg-red-500/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </motion.button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full skeleton rounded-lg" />
                  )}
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <p className="text-sm text-white/80 line-clamp-2">{generation.prompt}</p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${getStatusColor(generation.status)}`}>
                      {getStatusText(generation.status)}
                    </span>
                    <span className="text-white/40">
                      {generation.model}
                    </span>
                  </div>

                  {generation.metadata?.generationTime && (
                    <p className="text-xs text-white/40">
                      Generated in {(generation.metadata.generationTime / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>

                {/* Processing indicator */}
                {generation.status === 'processing' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2"
                      />
                      <p className="text-sm text-white/60">Generating...</p>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {generation.status === 'failed' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="text-center">
                      <p className="text-red-400 text-sm mb-2">Generation failed</p>
                      <p className="text-white/40 text-xs">{generation.error}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
