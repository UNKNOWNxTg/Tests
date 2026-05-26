import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import CharacterCard from '../components/CharacterCard'
import { useCharacterStore } from '../store/characterStore'

const HomePage = () => {
  const { characters, getFilteredCharacters } = useCharacterStore()

  // Mock data for demo
  const mockCharacters = [
    {
      _id: '1',
      name: 'Sakura',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sakura&backgroundColor=ffdfbf',
      description: 'A sweet and caring anime girl who loves spending time with you.',
      tags: ['romance', 'caring', 'anime'],
      isOnline: true,
      isFavorite: false,
      chats: 1234,
      rating: 4.9,
    },
    {
      _id: '2',
      name: 'Emma',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=c0aede',
      description: 'A playful and energetic companion ready for adventures.',
      tags: ['playful', 'slice-of-life'],
      isOnline: true,
      isFavorite: true,
      chats: 856,
      rating: 4.8,
    },
    {
      _id: '3',
      name: 'Luna',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=d1d4f9',
      description: 'A mysterious and dominant personality with a soft side.',
      tags: ['dominant', 'mysterious'],
      isOnline: false,
      isFavorite: false,
      chats: 2341,
      rating: 4.9,
    },
    {
      _id: '4',
      name: 'Yuki',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yuki&backgroundColor=b6e3f4',
      description: 'A jealous but loving girlfriend who cares deeply about you.',
      tags: ['jealous', 'romance'],
      isOnline: true,
      isFavorite: false,
      chats: 567,
      rating: 4.7,
    },
  ]

  return (
    <div className="min-h-screen bg-dark-900 pb-24 safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-20 glass-dark border-b border-white/10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">
                AI Girlfriend
              </h1>
              <p className="text-sm text-gray-400">Your perfect companion</p>
            </div>
            <Link to="/profile" className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-yellow to-neon-green flex items-center justify-center">
              <span className="text-xl">👤</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search characters..."
              className="w-full px-4 py-3 pl-12 bg-dark-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neon-yellow/50 transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
        </div>
      </header>

      {/* Featured Section */}
      <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Featured Characters</h2>
          <Link to="/explore" className="text-sm text-neon-yellow hover:underline">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mockCharacters.map((character) => (
            <Link key={character._id} to={`/chat/${character._id}`}>
              <CharacterCard character={character} />
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Categories */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-semibold text-white mb-4">Categories</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'romance', name: 'Romance', icon: '💕', color: 'from-pink-500 to-rose-500' },
            { id: 'caring', name: 'Caring', icon: '🤗', color: 'from-green-500 to-emerald-500' },
            { id: 'playful', name: 'Playful', icon: '✨', color: 'from-yellow-500 to-amber-500' },
            { id: 'dominant', name: 'Dominant', icon: '👑', color: 'from-purple-500 to-violet-500' },
            { id: 'jealous', name: 'Jealous', icon: '😤', color: 'from-red-500 to-orange-500' },
          ].map((category) => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 px-4 py-3 bg-gradient-to-r ${category.color} rounded-xl text-white font-medium`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomePage
