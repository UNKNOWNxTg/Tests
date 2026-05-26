import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  activeChat: null,
  chats: [],
  messages: {},
  isTyping: false,
  streamingMessage: '',
  
  setActiveChat: (chat) => set({ activeChat: chat }),
  
  addChat: (chat) => set((state) => ({
    chats: [chat, ...state.chats]
  })),
  
  updateChat: (chatId, data) => set((state) => ({
    chats: state.chats.map(chat => 
      chat._id === chatId ? { ...chat, ...data } : chat
    )
  })),
  
  removeChat: (chatId) => set((state) => ({
    chats: state.chats.filter(chat => chat._id !== chatId),
    activeChat: state.activeChat?._id === chatId ? null : state.activeChat
  })),
  
  setMessages: (chatId, messages) => set((state) => ({
    messages: { ...state.messages, [chatId]: messages }
  })),
  
  addMessage: (chatId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [chatId]: [...(state.messages[chatId] || []), message]
    }
  })),
  
  updateMessage: (chatId, messageId, data) => set((state) => ({
    messages: {
      ...state.messages,
      [chatId]: state.messages[chatId].map(msg =>
        msg._id === messageId ? { ...msg, ...data } : msg
      )
    }
  })),
  
  setIsTyping: (isTyping) => set({ isTyping }),
  
  setStreamingMessage: (content) => set({ streamingMessage: content }),
  
  clearStreamingMessage: () => set({ streamingMessage: '' }),
  
  getMessages: (chatId) => get().messages[chatId] || [],
}))
