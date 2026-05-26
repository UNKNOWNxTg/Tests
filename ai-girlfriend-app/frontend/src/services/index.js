import api from './api.js'

export const authService = {
  register: async (email, password, name) => {
    const response = await api.post('/auth/register', { email, password, name })
    return response.data
  },

  login: async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { email, password, rememberMe })
    return response.data
  },

  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile')
    return response.data
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data)
    return response.data
  },
}

export const characterService = {
  getAll: async (params = {}) => {
    const response = await api.get('/characters', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/characters/${id}`)
    return response.data
  },

  search: async (query, category) => {
    const response = await api.get('/characters/search', { params: { query, category } })
    return response.data
  },

  getTrending: async () => {
    const response = await api.get('/characters/trending')
    return response.data
  },

  toggleFavorite: async (characterId) => {
    const response = await api.post(`/characters/${characterId}/favorite`)
    return response.data
  },

  getFavorites: async () => {
    const response = await api.get('/characters/favorites')
    return response.data
  },
}

export const chatService = {
  getChats: async () => {
    const response = await api.get('/chats')
    return response.data
  },

  createChat: async (characterId) => {
    const response = await api.post('/chats', { characterId })
    return response.data
  },

  getChat: async (chatId) => {
    const response = await api.get(`/chats/${chatId}`)
    return response.data
  },

  sendMessage: async (chatId, content) => {
    const response = await api.post(`/chats/${chatId}/messages`, { content })
    return response.data
  },

  streamMessage: async (chatId, content, onChunk, onComplete) => {
    const token = localStorage.getItem('auth-storage')
    let jwtToken = ''
    if (token) {
      try {
        const parsed = JSON.parse(token)
        jwtToken = parsed.state?.token || ''
      } catch (e) {}
    }

    const response = await fetch(`${api.defaults.baseURL}/chats/${chatId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      throw new Error('Failed to send message')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullMessage = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      fullMessage += chunk
      onChunk(chunk)
    }

    onComplete(fullMessage)
    return { content: fullMessage }
  },

  regenerateMessage: async (chatId, messageId) => {
    const response = await api.post(`/chats/${chatId}/messages/${messageId}/regenerate`)
    return response.data
  },

  editMessage: async (chatId, messageId, content) => {
    const response = await api.put(`/chats/${chatId}/messages/${messageId}`, { content })
    return response.data
  },

  deleteMessage: async (chatId, messageId) => {
    const response = await api.delete(`/chats/${chatId}/messages/${messageId}`)
    return response.data
  },

  deleteChat: async (chatId) => {
    const response = await api.delete(`/chats/${chatId}`)
    return response.data
  },
}
