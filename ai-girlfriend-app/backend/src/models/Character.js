import mongoose from 'mongoose'

const characterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  personality: {
    type: String,
    required: true,
  },
  greetingMessage: {
    type: String,
    required: true,
  },
  backgroundWallpaper: {
    type: String,
    default: null,
  },
  tags: [{
    type: String,
    enum: ['romance', 'caring', 'jealous', 'dominant', 'slice-of-life', 'playful', 'anime', 'realistic'],
  }],
  relationshipType: {
    type: String,
    enum: ['girlfriend', 'wife', 'crush', 'friend', 'other'],
    default: 'girlfriend',
  },
  mood: {
    type: String,
    enum: ['happy', 'sad', 'excited', 'angry', 'neutral', 'flirty', 'caring'],
    default: 'neutral',
  },
  isOnline: {
    type: Boolean,
    default: true,
  },
  chatsCount: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 4.8,
    min: 0,
    max: 5,
  },
  aiPrompt: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
})

// Index for search optimization
characterSchema.index({ name: 'text', description: 'text', tags: 'text' })

export default mongoose.model('Character', characterSchema)
