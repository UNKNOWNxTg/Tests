import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'

const BottomNav = () => {
  const location = useLocation()
  
  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/explore', icon: '🔍', label: 'Explore' },
    { path: '/chats', icon: '💬', label: 'Chats' },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ]

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 safe-bottom z-40"
    >
      <div className="flex items-center justify-around py-3 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-1 p-2 min-w-[60px]"
            >
              {isActive && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -top-2 w-10 h-1 bg-neon-yellow rounded-b-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              <motion.span
                animate={{ 
                  scale: isActive ? 1.2 : 1,
                  filter: isActive ? 'drop-shadow(0 0 8px rgba(228, 255, 26, 0.6))' : 'none'
                }}
                className="text-xl"
              >
                {item.icon}
              </motion.span>
              
              <span
                className={`text-xs font-medium transition-colors ${
                  isActive ? 'text-neon-yellow' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </motion.nav>
  )
}

export default BottomNav
