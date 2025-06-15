import { createContext, useContext, useReducer, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext()

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  accessToken: null // Store JWT for socket auth
}

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user || action.payload, // support both formats
        isAuthenticated: true,
        isLoading: false,
        error: null,
        accessToken: action.payload.accessToken || null
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        accessToken: null
      }
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      // Only get new tokens
      const refreshRes = await api.post('/users/refresh-token')
      const newAccessToken = refreshRes.data?.data?.accessToken
      // Now get user profile
      const meResponse = await api.get('/users/me')
      if (meResponse.data?.data && newAccessToken) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: meResponse.data.data, accessToken: newAccessToken } })
      } else {
        dispatch({ type: 'LOGOUT' })
      }
    } catch (error) {
      dispatch({ type: 'LOGOUT' })
    }
  }

  const login = async (credentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await api.post('/users/login', credentials)

      if (response.data?.success && response.data?.data?.user && response.data?.data?.accessToken) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: response.data.data.user, accessToken: response.data.data.accessToken } })
        toast.success('Login successful!')
        return { success: true }
      }

      throw new Error('Invalid response format')
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await api.post('/users/register', userData)

      if (response.data?.success && response.data?.data?.user && response.data?.data?.accessToken) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: response.data.data.user, accessToken: response.data.data.accessToken } })
        toast.success('Registration successful!')
        return { success: true }
      }

      throw new Error('Invalid response format')
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    try {
      await api.post('/users/logout')
      dispatch({ type: 'LOGOUT' })
      toast.success('Logged out successfully')
    } catch (error) {
      // Even if API call fails, still log out locally
      dispatch({ type: 'LOGOUT' })
      toast.success('Logged out')
    }
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await api.patch('/users/profile', profileData)
      if (response.data?.success && response.data?.data?.user) {
        dispatch({ type: 'UPDATE_USER', payload: response.data.data.user })
        toast.success('Profile updated successfully!')
        return { success: true }
      }
      throw new Error('Invalid response format')
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    checkAuth,
    accessToken: state.accessToken // Expose accessToken for socket
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
