import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Video,
  Users,
  Shield,
  Zap,
  MessageCircle,
  Monitor,
  ArrowRight,
  PlayCircle,
  Globe
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { meetingService } from '../services/meetingService'
import toast from 'react-hot-toast'

function Home() {
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleJoinMeeting = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) {
      toast.error('Please enter a meeting code')
      return
    }

    if (!isAuthenticated) {
      // Store the meeting code and redirect to login
      sessionStorage.setItem('pendingMeetingCode', joinCode.trim().toUpperCase())
      navigate('/login')
      return
    }

    setIsJoining(true)
    try {
      const response = await meetingService.joinMeeting(joinCode.trim().toUpperCase())
      if (response.success && response.data?.roomId) {
        navigate(`/meeting/${response.data.roomId}`)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join meeting')
    } finally {
      setIsJoining(false)
    }
  }

  const features = [
    {
      icon: Video,
      title: 'HD Video Calls',
      description: 'Crystal clear video quality with adaptive streaming technology'
    },
    {
      icon: MessageCircle,
      title: 'Real-time Chat',
      description: 'Stay connected with instant messaging during meetings'
    },
    {
      icon: Monitor,
      title: 'Screen Sharing',
      description: 'Share your screen, presentations, and applications seamlessly'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'End-to-end encryption keeps your conversations secure'
    },
    {
      icon: Users,
      title: 'Multi-participant',
      description: 'Connect with multiple participants in a single meeting'
    },
    {
      icon: Zap,
      title: 'Instant Access',
      description: 'No downloads required. Join meetings directly from your browser'
    }
  ]

  const stats = [
    { number: '10K+', label: 'Active Users' },
    { number: '50K+', label: 'Meetings Hosted' },
    { number: '99.9%', label: 'Uptime' },
    { number: '4.9★', label: 'User Rating' }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
                Video Meetings
                <span className="block bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Connect, collaborate, and communicate with crystal-clear video calls,
                real-time chat, and seamless screen sharing. Perfect for students and educators.
              </p>
            </motion.div>

            {/* Join Meeting Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-12 max-w-md mx-auto"
            >
              <form onSubmit={handleJoinMeeting} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter meeting code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="input flex-1 text-center text-lg font-mono tracking-wider"
                  maxLength={8}
                />
                <button
                  type="submit"
                  disabled={isJoining}
                  className="btn-primary px-6 py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Joining...
                    </div>
                  ) : (
                    'Join'
                  )}
                </button>
              </form>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {!isAuthenticated && 'You\'ll be asked to sign in first'}
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
            >
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn-primary px-8 py-4 text-lg font-semibold inline-flex items-center gap-2 group"
                >
                  <Video className="w-5 h-5" />
                  Start Meeting
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn-primary px-8 py-4 text-lg font-semibold inline-flex items-center gap-2 group"
                  >
                    <Video className="w-5 h-5" />
                    Get Started Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/login"
                    className="btn-outline px-8 py-4 text-lg font-semibold inline-flex items-center gap-2"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Sign In
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl lg:text-4xl font-bold text-primary-600 dark:text-primary-400">
                  {stat.number}
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Everything you need for seamless meetings
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              Powerful features designed for modern collaboration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="card hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to transform your meetings?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of students and educators who trust MeetEase for their video conferencing needs.
            </p>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors duration-200 group"
              >
                <Globe className="w-5 h-5" />
                Start Your Journey
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default Home
