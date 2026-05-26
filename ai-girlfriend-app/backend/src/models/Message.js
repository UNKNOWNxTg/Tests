import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  isUser: {
    type: Boolean,
    default: true,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  regeneratedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
}, {
  timestamps: true,
})

// Index for faster queries
messageSchema.index({ chat: 1, createdAt: 1 })

export default mongoose.model('Message', messageSchema)
