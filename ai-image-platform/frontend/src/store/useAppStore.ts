import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Generation {
  id: string;
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model: string;
  width: number;
  height: number;
  seed: number;
  createdAt: number;
  error?: string;
}

export interface AppSettings {
  model: string;
  width: number;
  height: number;
  negativePrompt: string;
  batchSize: number;
  nsfwFilter: boolean;
  enhancePrompt: boolean;
}

interface AppState {
  // Generations
  generations: Generation[];
  currentTaskId: string | null;
  isLoading: boolean;
  
  // Settings
  settings: AppSettings;
  
  // UI State
  isSidebarOpen: boolean;
  selectedGeneration: Generation | null;
  
  // Actions
  addGeneration: (generation: Generation) => void;
  updateGeneration: (id: string, updates: Partial<Generation>) => void;
  removeGeneration: (id: string) => void;
  setCurrentTaskId: (taskId: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  toggleSidebar: () => void;
  setSelectedGeneration: (generation: Generation | null) => void;
  clearGenerations: () => void;
  loadHistory: () => void;
}

const defaultSettings: AppSettings = {
  model: 'flux-realism',
  width: 1024,
  height: 1024,
  negativePrompt: '',
  batchSize: 1,
  nsfwFilter: false,
  enhancePrompt: true,
};

const ASPECT_RATIOS = {
  '1:1': [1024, 1024],
  '16:9': [1024, 576],
  '9:16': [576, 1024],
  '4:3': [1024, 768],
  '3:4': [768, 1024],
  '3:2': [1024, 683],
  '2:3': [683, 1024],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      generations: [],
      currentTaskId: null,
      isLoading: false,
      settings: defaultSettings,
      isSidebarOpen: false,
      selectedGeneration: null,

      // Actions
      addGeneration: (generation) =>
        set((state) => ({
          generations: [generation, ...state.generations],
        })),

      updateGeneration: (id, updates) =>
        set((state) => ({
          generations: state.generations.map((gen) =>
            gen.id === id ? { ...gen, ...updates } : gen
          ),
        })),

      removeGeneration: (id) =>
        set((state) => ({
          generations: state.generations.filter((gen) => gen.id !== id),
        })),

      setCurrentTaskId: (taskId) => set({ currentTaskId: taskId }),

      setIsLoading: (loading) => set({ isLoading: loading }),

      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setSelectedGeneration: (generation) => set({ selectedGeneration: generation }),

      clearGenerations: () => set({ generations: [] }),

      loadHistory: async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const response = await fetch(`${apiUrl}/api/history`);
          const data = await response.json();
          
          if (data.success) {
            const history: Generation[] = data.tasks.map((task: any) => ({
              id: task.id,
              prompt: task.prompt,
              imageUrl: task.imageUrl,
              status: task.status,
              model: task.model || 'flux-realism',
              width: task.width || 1024,
              height: task.height || 1024,
              seed: task.seed || 0,
              createdAt: task.createdAt,
              error: task.error,
            }));
            
            set({ generations: history });
          }
        } catch (error) {
          console.error('Failed to load history:', error);
        }
      },
    }),
    {
      name: 'ai-image-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        generations: state.generations.slice(0, 50), // Keep last 50
        settings: state.settings,
      }),
    }
  )
);

export { ASPECT_RATIOS };
