import { motion } from 'framer-motion'

const MessageBubble = ({ message, isUser, characterName, timestamp }) => {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[85%] md:max-w-[70%] ${
          isUser ? 'order-1' : 'order-2'
        }`}
      >
        {/* Message Bubble */}
        <div
          className={`relative px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-neon-yellow text-dark-900 rounded-br-md'
              : 'glass border border-white/10 rounded-bl-md'
          }`}
        >
          {/* Character Name (only for AI) */}
          {!isUser && characterName && (
            <p className="text-xs font-medium text-neon-yellow mb-1">
              {characterName}
            </p>
          )}

          {/* Message Content */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message}
          </div>

          {/* Timestamp */}
          <div
            className={`flex items-center gap-1 mt-2 text-xs ${
              isUser ? 'text-dark-900/60' : 'text-gray-500'
            }`}
          >
            <span>{formatTime(timestamp)}</span>
            {isUser && (
              <span className="text-xs">✓✓</span>
            )}
          </div>
        </div>

        {/* Action Buttons (AI messages only) */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
              <span className="text-xs">🔄</span>
            </button>
            <button className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
              <span className="text-xs">✏️</span>
            </button>
            <button className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
              <span className="text-xs">🔊</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default MessageBubble
