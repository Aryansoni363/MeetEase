import api from './api'

export const meetingService = {
  // Create a new meeting
  createMeeting: async () => {
    try {
      const response = await api.post('/meeting/create')
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Join a meeting by code
  joinMeeting: async (meetingCode) => {
    try {
      const response = await api.post('/meeting/join', { meetingCode })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Leave a meeting
  leaveMeeting: async (roomId) => {
    try {
      const response = await api.post(`/meeting/leave/${roomId}`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get meeting history
  getMeetingHistory: async () => {
    try {
      const response = await api.get('/meeting/history')
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get messages for a room
  getMessages: async (roomId) => {
    try {
      const response = await api.get(`/meeting/${roomId}/messages`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Send a message
  postMessage: async (roomId, message) => {
    try {
      const response = await api.post(`/meeting/${roomId}/message`, { message })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get room ID from meeting code
  getRoomIdFromCode: async (meetingCode) => {
    try {
      const response = await api.get(`/meeting/code/${meetingCode}`)
      return response.data
    } catch (error) {
      throw error
    }
  }
}
