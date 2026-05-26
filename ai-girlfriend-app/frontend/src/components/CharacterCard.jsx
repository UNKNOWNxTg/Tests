import { motion } from 'framer-motion'

const CharacterCard = ({ character, onClick }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative group cursor-pointer"
    >
      {/* Card Container */}
      <div className="glass rounded-2xl overflow-hidden border border-white/10 transition-all duration-300 group-hover:border-neon-yellow/30 group-hover:shadow-lg group-hover:shadow-neon-yellow/10">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={character.avatar}
            alt={character.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/50 to-transparent" />
          
          {/* Status Indicator */}
          {character.isOnline && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-dark-900/80 backdrop-blur-sm rounded-full">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
              <span className="text-xs text-gray-300">Online</span>
            </div>
          )}
          
          {/* Favorite Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center bg-dark-900/80 backdrop-blur-sm rounded-full"
          >
            <span className="text-lg">{character.isFavorite ? '❤️' : '🤍'}</span>
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Name and Tags */}
          <div className="mb-2">
            <h3 className="text-lg font-display font-semibold text-white mb-1 line-clamp-1">
              {character.name}
            </h3>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {character.tags?.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs bg-neon-yellow/10 text-neon-yellow rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Description Preview */}
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {character.description}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{character.chats || 0} chats</span>
            <span className="flex items-center gap-1">
              <span>⭐</span>
              {character.rating || '4.8'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default CharacterCard
