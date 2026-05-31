import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ChatInput = ({ onSend, isTyping, disabled = false }) => {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !isTyping && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <motion.form
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      onSubmit={handleSubmit}
      className={`fixed bottom-[72px] left-0 right-0 glass-dark border-t border-white/10 safe-bottom z-30 transition-all duration-300 ${
        isFocused ? 'bg-dark-900/95' : ''
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-end gap-3">
          {/* Attachment Button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center glass rounded-full text-gray-400 hover:text-neon-yellow transition-colors"
          >
            <span className="text-xl">➕</span>
          </motion.button>

          {/* Input Container */}
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type a message..."
              rows={1}
              disabled={disabled || isTyping}
              className="w-full px-4 py-3 bg-dark-700/50 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-neon-yellow/50 focus:ring-1 focus:ring-neon-yellow/20 resize-none disabled:opacity-50 transition-all"
              style={{ 
                minHeight: '48px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}
            />
            
            {/* Character Count */}
            <AnimatePresence>
              {message.length > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-5 right-0 text-xs text-gray-500"
                >
                  {message.length}/500
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Send Button */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!message.trim() || isTyping || disabled}
            className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 ${
              message.trim() && !isTyping && !disabled
                ? 'bg-gradient-to-r from-neon-yellow to-neon-green text-dark-900 shadow-lg shadow-neon-yellow/20'
                : 'bg-dark-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <motion.span
              animate={message.trim() && !isTyping && !disabled ? { x: [0, 3, 0] } : {}}
              transition={{ duration: 0.3 }}
              className="text-xl"
            >
              ➤
            </motion.span>
          </motion.button>
        </div>
      </div>
    </motion.form>
  )
}

export default ChatInput
