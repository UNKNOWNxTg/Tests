import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-dark-900 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative"
        >
          <motion.div
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(228, 255, 26, 0.3)",
                "0 0 40px rgba(228, 255, 26, 0.6)",
                "0 0 20px rgba(228, 255, 26, 0.3)",
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-yellow to-neon-green flex items-center justify-center"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="text-4xl"
            >
              💕
            </motion.span>
          </motion.div>
          
          {/* Orbiting particles */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ rotate: 360 }}
              transition={{ 
                duration: 2 + i * 0.5, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute inset-0"
              style={{ transformOrigin: 'center' }}
            >
              <motion.div
                className="absolute w-2 h-2 rounded-full bg-neon-yellow"
                style={{
                  top: `${30 + i * 10}px`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-2xl font-display font-bold text-white mb-1">
            AI Girlfriend
          </h1>
          <p className="text-sm text-gray-400">Premium Roleplay Chat</p>
        </motion.div>

        {/* Loading Bar */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 200, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="h-1 bg-dark-700 rounded-full overflow-hidden"
        >
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full bg-gradient-to-r from-neon-yellow via-neon-green to-neon-yellow"
          />
        </motion.div>

        {/* Loading Text */}
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xs text-gray-500 mt-2"
        >
          Initializing...
        </motion.p>
      </div>
    </div>
  )
}

export default LoadingScreen
