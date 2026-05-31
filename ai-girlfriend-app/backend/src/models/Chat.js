import mongoose from 'mongoose'

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  character: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character',
    required: true,
  },
  title: {
    type: String,
    default: 'New Chat',
  },
  lastMessage: {
    type: String,
    default: '',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  messageCount: {
    type: Number,
    default: 0,
  },
  relationshipProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  emotionalState: {
    type: String,
    enum: ['neutral', 'happy', 'excited', 'caring', 'jealous', 'angry', 'sad'],
    default: 'neutral',
  },
  summary: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
})

// Index for faster queries
chatSchema.index({ user: 1, lastMessageAt: -1 })
chatSchema.index({ user: 1, character: 1 })

export default mongoose.model('Chat', chatSchema)
