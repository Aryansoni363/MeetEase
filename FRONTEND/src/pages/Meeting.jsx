import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageCircle,
  Phone,
  Users,
  Settings,
  Copy,
  Send,
  Smile,
  MoreVertical
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { meetingService } from '../services/meetingService'
import { formatTime, copyToClipboard } from '../utils'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

function Meeting() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()

  // Video/Audio refs
  const localVideoRef = useRef()
  const localStreamRef = useRef()
  const screenStreamRef = useRef()
  const peerConnectionsRef = useRef({})
  const remoteVideosRef = useRef({})

  // State
  const [meetingInfo, setMeetingInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Media controls
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenSharingUser, setScreenSharingUser] = useState(null)

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  // Initialize meeting
  useEffect(() => {
    if (roomId) {
      initializeMeeting()
    }

    return () => {
      cleanup()
    }
  }, [roomId])

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return

    // Join the meeting room
    socket.emit('join-room', { roomId, user: { id: user._id, name: user.fullName || user.username } })

    // WebRTC signaling
    socket.on('user-joined-webrtc', handleUserJoined)
    socket.on('webrtc-offer', handleOffer)
    socket.on('webrtc-answer', handleAnswer)
    socket.on('ice-candidate', handleIceCandidate)
    socket.on('user-left-webrtc', handleUserLeft)

    // Chat events
    socket.on('receive-message', handleReceiveMessage)

    // Screen sharing events
    socket.on('screen-share-started', handleScreenShareStarted)
    socket.on('screen-share-stopped', handleScreenShareStopped)

    return () => {
      socket.off('user-joined-webrtc')
      socket.off('webrtc-offer')
      socket.off('webrtc-answer')
      socket.off('ice-candidate')
      socket.off('user-left-webrtc')
      socket.off('receive-message')
      socket.off('screen-share-started')
      socket.off('screen-share-stopped')
    }
  }, [socket, isConnected, roomId, user])

  const initializeMeeting = async () => {
    try {
      // Get meeting info (you might need to implement this endpoint)
      setMeetingInfo({ roomId, meetingCode: 'LOADING...' })

      // Load existing messages
      const messagesResponse = await meetingService.getMessages(roomId)
      if (messagesResponse.success) {
        setMessages(messagesResponse.data || [])
      }

      // Initialize local media
      await initializeLocalMedia()

      setIsLoading(false)
    } catch (error) {
      toast.error('Failed to join meeting')
      navigate('/dashboard')
    }
  }

  const initializeLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Join WebRTC room
      if (socket) {
        socket.emit('join-webrtc-room', { roomId })
      }
    } catch (error) {
      toast.error('Failed to access camera and microphone')
      console.error('Media access error:', error)
    }
  }

  const createPeerConnection = (userId) => {
    const peerConnection = new RTCPeerConnection(rtcConfig)

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current)
      })
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0]
      if (remoteVideosRef.current[userId]) {
        remoteVideosRef.current[userId].srcObject = remoteStream
      }
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          roomId,
          candidate: event.candidate,
          targetUserId: userId
        })
      }
    }

    peerConnectionsRef.current[userId] = peerConnection
    return peerConnection
  }

  // WebRTC event handlers
  const handleUserJoined = async ({ userId, userName }) => {
    setParticipants(prev => {
      if (!prev.find(p => p.id === userId)) {
        return [...prev, { id: userId, name: userName }]
      }
      return prev
    })

    // Create offer for new user
    const peerConnection = createPeerConnection(userId)
    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      if (socket) {
        socket.emit('webrtc-offer', {
          roomId,
          offer,
          targetUserId: userId
        })
      }
    } catch (error) {
      console.error('Error creating offer:', error)
    }
  }

  const handleOffer = async ({ offer, fromUserId, fromUserName }) => {
    const peerConnection = createPeerConnection(fromUserId)

    try {
      await peerConnection.setRemoteDescription(offer)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      if (socket) {
        socket.emit('webrtc-answer', {
          roomId,
          answer,
          targetUserId: fromUserId
        })
      }

      setParticipants(prev => {
        if (!prev.find(p => p.id === fromUserId)) {
          return [...prev, { id: fromUserId, name: fromUserName }]
        }
        return prev
      })
    } catch (error) {
      console.error('Error handling offer:', error)
    }
  }

  const handleAnswer = async ({ answer, fromUserId }) => {
    const peerConnection = peerConnectionsRef.current[fromUserId]
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(answer)
      } catch (error) {
        console.error('Error handling answer:', error)
      }
    }
  }

  const handleIceCandidate = async ({ candidate, fromUserId }) => {
    const peerConnection = peerConnectionsRef.current[fromUserId]
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(candidate)
      } catch (error) {
        console.error('Error handling ICE candidate:', error)
      }
    }
  }

  const handleUserLeft = ({ userId }) => {
    setParticipants(prev => prev.filter(p => p.id !== userId))

    // Clean up peer connection
    if (peerConnectionsRef.current[userId]) {
      peerConnectionsRef.current[userId].close()
      delete peerConnectionsRef.current[userId]
    }

    // Clean up remote video
    if (remoteVideosRef.current[userId]) {
      delete remoteVideosRef.current[userId]
    }
  }

  // Chat handlers
  const handleReceiveMessage = (messageData) => {
    setMessages(prev => [...prev, messageData])
    if (!isChatOpen) {
      setUnreadCount(prev => prev + 1)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket) return

    const messageData = {
      roomId,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    }

    try {
      await meetingService.postMessage(roomId, newMessage.trim())
      socket.emit('send-message', messageData)
      setNewMessage('')
    } catch (error) {
      toast.error('Failed to send message')
    }
  }

  // Media control handlers
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMuted
        setIsMuted(!isMuted)
      }
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn
        setIsVideoOn(!isVideoOn)
      }
    }
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop())
        screenStreamRef.current = null
      }

      // Replace with camera stream
      await initializeLocalMedia()
      setIsScreenSharing(false)
      setScreenSharingUser(null)

      if (socket) {
        socket.emit('screen-share-stop', { roomId })
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })

        screenStreamRef.current = screenStream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }

        // Replace tracks in all peer connections
        Object.values(peerConnectionsRef.current).forEach(peerConnection => {
          const sender = peerConnection.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          )
          if (sender) {
            sender.replaceTrack(screenStream.getVideoTracks()[0])
          }
        })

        setIsScreenSharing(true)
        setScreenSharingUser(user.fullName || user.username)

        if (socket) {
          socket.emit('screen-share-start', {
            roomId,
            userName: user.fullName || user.username
          })
        }

        // Handle screen share end
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          toggleScreenShare()
        })
      } catch (error) {
        toast.error('Failed to start screen sharing')
      }
    }
  }

  const handleScreenShareStarted = ({ userName }) => {
    if (userName !== (user.fullName || user.username)) {
      setScreenSharingUser(userName)
      toast.info(`${userName} started screen sharing`)
    }
  }

  const handleScreenShareStopped = ({ userName }) => {
    if (userName !== (user.fullName || user.username)) {
      setScreenSharingUser(null)
      toast.info(`${userName} stopped screen sharing`)
    }
  }

  const leaveMeeting = async () => {
    try {
      await meetingService.leaveMeeting(roomId)
      navigate('/dashboard')
    } catch (error) {
      navigate('/dashboard')
    }
  }

  const copyMeetingInfo = async () => {
    try {
      const meetingLink = `${window.location.origin}/meeting/${roomId}`
      await copyToClipboard(meetingLink)
      toast.success('Meeting link copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy meeting link')
    }
  }

  const cleanup = () => {
    // Stop local streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
    }

    // Close peer connections
    Object.values(peerConnectionsRef.current).forEach(peerConnection => {
      peerConnection.close()
    })

    // Leave socket room
    if (socket) {
      socket.emit('leave-room', { roomId })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-semibold">
            Meeting Room
          </h1>
          {meetingInfo?.meetingCode && (
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-sm">Code:</span>
              <code className="bg-gray-700 text-green-400 px-2 py-1 rounded text-sm">
                {meetingInfo.meetingCode}
              </code>
              <button
                onClick={copyMeetingInfo}
                className="text-gray-400 hover:text-gray-300 p-1"
                title="Copy meeting link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-gray-300 text-sm">
            <Users className="w-4 h-4" />
            <span>{participants.length + 1}</span>
          </div>
          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen)
              if (!isChatOpen) setUnreadCount(0)
            }}
            className="relative p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                You {isScreenSharing && '(Screen)'}
              </div>
              {!isVideoOn && (
                <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-semibold">
                      {(user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {participants.map((participant) => (
              <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden">
                <video
                  ref={el => remoteVideosRef.current[participant.id] = el}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {participant.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-800 border-l border-gray-700 flex flex-col"
            >
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Chat</h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message, index) => (
                  <div key={index} className="text-sm">
                    <div className="text-gray-400 text-xs mb-1">
                      {message.userName} • {formatTime(message.timestamp)}
                    </div>
                    <div className="text-gray-200">
                      {message.message}
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                  <button
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition-colors ${
              isMuted
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              !isVideoOn
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>

          <button
            onClick={leaveMeeting}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>

        {screenSharingUser && screenSharingUser !== (user.fullName || user.username) && (
          <div className="mt-2 text-center text-sm text-gray-400">
            {screenSharingUser} is sharing their screen
          </div>
        )}
      </div>
    </div>
  )
}

export default Meeting
