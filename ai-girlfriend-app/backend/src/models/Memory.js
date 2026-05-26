import mongoose from 'mongoose'

const memorySchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['fact', 'preference', 'event', 'emotion', 'relationship'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  importance: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
})

// Index for faster queries
memorySchema.index({ user: 1, character: 1, type: 1 })

export default mongoose.model('Memory', memorySchema)
