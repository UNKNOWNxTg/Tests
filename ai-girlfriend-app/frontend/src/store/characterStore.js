import { create } from 'zustand'

export const useCharacterStore = create((set, get) => ({
  characters: [],
  favorites: [],
  categories: [
    { id: 'romance', name: 'Romance', icon: '💕' },
    { id: 'caring', name: 'Caring', icon: '🤗' },
    { id: 'jealous', name: 'Jealous', icon: '😤' },
    { id: 'dominant', name: 'Dominant', icon: '👑' },
    { id: 'slice-of-life', name: 'Slice of Life', icon: '🌸' },
    { id: 'playful', name: 'Playful', icon: '✨' },
  ],
  searchQuery: '',
  selectedCategory: null,
  isLoading: false,
  
  setCharacters: (characters) => set({ characters }),
  
  addCharacter: (character) => set((state) => ({
    characters: [...state.characters, character]
  })),
  
  toggleFavorite: (characterId) => set((state) => ({
    favorites: state.favorites.includes(characterId)
      ? state.favorites.filter(id => id !== characterId)
      : [...state.favorites, characterId]
  })),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  getFilteredCharacters: () => {
    const { characters, searchQuery, selectedCategory } = get()
    
    let filtered = characters
    
    if (selectedCategory) {
      filtered = filtered.filter(char => 
        char.tags?.includes(selectedCategory) || char.personality?.toLowerCase().includes(selectedCategory)
      )
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(char =>
        char.name.toLowerCase().includes(query) ||
        char.description?.toLowerCase().includes(query)
      )
    }
    
    return filtered
  },
}))
