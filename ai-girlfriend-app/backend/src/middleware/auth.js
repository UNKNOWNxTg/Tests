import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d'

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  })
}

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify token
    const decoded = verifyToken(token)
    
    // Add user info to request
    req.userId = decoded.id
    
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export default {
  generateToken,
  verifyToken,
  authMiddleware,
  JWT_SECRET,
}
