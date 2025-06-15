import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Video,
  Plus,
  Users,
  Clock,
  Copy,
  ExternalLink,
  Calendar,
  Trash2,
  Search
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { meetingService } from '../services/meetingService'
import { formatDate, formatTime, copyToClipboard } from '../utils'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

function Dashboard() {
  const [meetings, setMeetings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [scheduledTime, setScheduledTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [meetingType, setMeetingType] = useState("instant"); // 'instant' or 'scheduled'

  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    loadMeetingHistory()

    // Check if user came here to join a specific meeting
    const joinParam = searchParams.get('join')
    if (joinParam) {
      setJoinCode(joinParam)
      handleJoinMeeting(null, joinParam)
    }
  }, [searchParams])

  const loadMeetingHistory = async () => {
    try {
      const response = await meetingService.getMeetingHistory()
      if (response.success) {
        setMeetings(response.data || [])
      }
    } catch (error) {
      toast.error('Failed to load meeting history')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateMeeting = async () => {
    let start = scheduledTime;
    let end = endTime;
    if (meetingType === "instant") {
      start = new Date().toISOString();
      end = "";
    } else {
      if (!scheduledTime) {
        toast.error("Please select a start time for the meeting");
        return;
      }
      if (!endTime) {
        toast.error("Please select an end time for the meeting");
        return;
      }
      if (new Date(endTime) <= new Date(scheduledTime)) {
        toast.error("End time must be after start time");
        return;
      }
    }
    setIsCreating(true);
    try {
      const response = await meetingService.createMeeting(start, end);
      if (response.success && response.data?.roomId) {
        toast.success('Meeting created successfully!')
        navigate(`/prejoin/${response.data.roomId}`)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create meeting')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinMeeting = async (e, code = null) => {
    if (e) e.preventDefault()

    const codeToUse = code || joinCode.trim().toUpperCase()
    if (!codeToUse) {
      toast.error('Please enter a meeting code')
      return
    }

    setIsJoining(true)
    try {
      const response = await meetingService.joinMeeting(codeToUse)
      if (response.success && response.data?.roomId) {
        navigate(`/meeting/${response.data.roomId}`)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join meeting')
    } finally {
      setIsJoining(false)
    }
  }

  const handleCopyMeetingCode = async (meetingCode) => {
    try {
      await copyToClipboard(meetingCode)
      toast.success('Meeting code copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy meeting code')
    }
  }

  const handleCopyMeetingLink = async (roomId, meetingCode) => {
    try {
      const link = `${window.location.origin}/meeting/${roomId}`
      await copyToClipboard(link)
      toast.success('Meeting link copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy meeting link')
    }
  }

  const filteredMeetings = meetings.filter(meeting =>
    meeting.meetingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.roomId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.fullName?.split(' ')[0] || user?.username}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Ready to start or join a meeting?
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          {/* Create Meeting */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Start or Schedule Meeting
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Start instantly or pick a date and time
                </p>
              </div>
            </div>
            <div className="flex gap-4 mb-3">
              <button
                className={`btn ${meetingType === "instant" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setMeetingType("instant")}
                disabled={isCreating}
              >
                Start Now
              </button>
              <button
                className={`btn ${meetingType === "scheduled" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setMeetingType("scheduled")}
                disabled={isCreating}
              >
                Schedule
              </button>
            </div>
            {meetingType === "scheduled" && (
              <>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="input w-full mb-2"
                  placeholder="Start time"
                />
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="input w-full mb-3"
                  placeholder="End time"
                  min={scheduledTime}
                />
              </>
            )}
            <button
              onClick={handleCreateMeeting}
              disabled={isCreating}
              className="w-full btn-primary py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <LoadingSpinner size="sm" />
                  {meetingType === "instant" ? "Starting..." : "Scheduling..."}
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  {meetingType === "instant" ? "Start Meeting" : "Schedule Meeting"}
                </>
              )}
            </button>
          </div>

          {/* Join Meeting */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Join Meeting
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter a meeting code to join
                </p>
              </div>
            </div>
            <form onSubmit={handleJoinMeeting} className="space-y-3">
              <input
                type="text"
                placeholder="Enter meeting code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="input w-full text-center text-lg font-mono tracking-wider"
                maxLength={8}
              />
              <button
                type="submit"
                disabled={isJoining || !joinCode.trim()}
                className="w-full btn-outline py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Joining...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Join Meeting
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Meeting History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Meeting History
              </h2>
            </div>

            {meetings.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search meetings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-64"
                />
              </div>
            )}
          </div>

          {filteredMeetings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {meetings.length === 0 ? 'No meetings yet' : 'No matching meetings'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {meetings.length === 0
                  ? 'Start your first meeting to see it appear here'
                  : 'Try adjusting your search terms'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMeetings.map((meeting, index) => (
                <motion.div
                  key={meeting._id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                        <Video className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            Meeting {meeting.meetingCode}
                          </h3>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                            {meeting.roomId}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <span>{formatDate(meeting.startTime)}</span>
                          <span>{formatTime(meeting.startTime)}</span>
                          {meeting.endTime && (
                            <span>• Duration: {Math.round((new Date(meeting.endTime) - new Date(meeting.startTime)) / (1000 * 60))} min</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyMeetingCode(meeting.meetingCode)}
                        className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        title="Copy meeting code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCopyMeetingLink(meeting.roomId, meeting.meetingCode)}
                        className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        title="Copy meeting link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      {!meeting.endTime && (
                        <button
                          onClick={() => navigate(`/meeting/${meeting.roomId}`)}
                          className="btn-primary px-4 py-2 text-sm"
                        >
                          Rejoin
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard
