import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  const { meetingCode } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()

  // Video/Audio refs
  const localVideoRef = useRef()
  const localStreamRef = useRef()
  const screenStreamRef = useRef()
  const peerConnectionsRef = useRef({}) // socketId -> RTCPeerConnection
  const remoteVideosRef = useRef({}) // socketId -> video element
  const remoteStreamsRef = useRef({}); // socketId -> MediaStream

  // State
  const [meetingInfo, setMeetingInfo] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  // Use socketId as the unique key for participants and peer connections
  const [participants, setParticipants] = useState([]); // [{ socketId, userId, name }]
  const [socketIdToUser, setSocketIdToUser] = useState({}); // { socketId: { userId, name } }
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showMeetingCode, setShowMeetingCode] = useState(true)
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false)
  const [participantNames, setParticipantNames] = useState({}); // userId -> userName

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
    if (meetingCode) {
      initializeMeeting()
    }

    return () => {
      cleanup()
    }
  }, [meetingCode])

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;
    // Join the meeting room
    console.log('[Socket] Emitting join-room', { userId: user._id, roomId });
    socket.emit('join-room', { room: roomId, user: { id: user._id, name: user.fullName || user.username } })
    // Listen for user-connected event (for legacy, but do not update participants here)
    const handleUserConnected = (data) => {
      console.log('[Socket] Received user-connected', data);
      // Only update socketIdToUser mapping for signaling
      setSocketIdToUser(prev => ({ ...prev, [data.socketId]: { userId: data.userId, name: data.userName } }));
    };
    socket.on('user-connected', handleUserConnected);
    return () => {
      socket.off('user-connected', handleUserConnected);
    };
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

  // Listen for deduplicated participants list from backend
  useEffect(() => {
    if (!socket) return;
    const handleRoomParticipants = ({ participants }) => {
      setParticipants(participants);
      // Also update socketIdToUser mapping
      const mapping = {};
      participants.forEach(p => {
        mapping[p.socketId] = { userId: p.userId, name: p.name };
      });
      setSocketIdToUser(mapping);
    };
    socket.on('room:participants', handleRoomParticipants);
    return () => socket.off('room:participants', handleRoomParticipants);
  }, [socket]);

  // Listen for all-users and create offers for each (socket IDs)
  useEffect(() => {
    if (!socket) return;
    const handleAllUsers = (socketIds) => {
      socketIds.forEach(socketId => {
        if (socketId !== socket.id) {
          // Only create offer if not self
          handleUserJoined({ socketId });
        }
      });
    };
    socket.on('all-users', handleAllUsers);
    return () => socket.off('all-users', handleAllUsers);
  }, [socket, participantNames]);

  const initializeMeeting = async () => {
    try {
      // Join meeting by code, get roomId from backend
      const joinResponse = await meetingService.joinMeeting(meetingCode)
      if (!joinResponse.success || !joinResponse.data?.roomId) {
        throw new Error('Invalid meeting code')
      }
      setRoomId(joinResponse.data.roomId)
      setMeetingInfo({ roomId: joinResponse.data.roomId, meetingCode: joinResponse.data.meetingCode })

      // Load existing messages
      const messagesResponse = await meetingService.getMessages(joinResponse.data.roomId)
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
    } catch (error) {
      toast.error('Failed to access camera and microphone')
      console.error('Media access error:', error)
    }
  }

  // Helper: Ensure only one peer connection per socketId
  const getOrCreatePeerConnection = (socketId) => {
    if (peerConnectionsRef.current[socketId]) {
      console.log(`[WebRTC] Reusing peer connection for socket ${socketId}`);
      return peerConnectionsRef.current[socketId];
    }
    console.log(`[WebRTC] Creating new peer connection for socket ${socketId}`);
    const peerConnection = new RTCPeerConnection(rtcConfig);

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`[WebRTC] Adding local track (${track.kind}) to peer connection for socket ${socketId}`);
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      console.log(`[WebRTC] Received remote stream from socket ${socketId}`, remoteStream);
      remoteStreamsRef.current[socketId] = remoteStream;
      // Try to attach to video element if it exists
      if (remoteVideosRef.current[socketId]) {
        remoteVideosRef.current[socketId].srcObject = remoteStream;
        console.log(`[WebRTC] Attached remote stream to video element for socket ${socketId}`);
      } else {
        console.warn(`[WebRTC] No video element found for socket ${socketId} when attaching remote stream (will attach on render)`);
      }
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log(`[WebRTC] Sending ICE candidate to ${socketId}`, event.candidate);
        socket.emit('webrtc-ice-candidate', {
          to: socketId,
          candidate: event.candidate
        })
      }
    }

    peerConnectionsRef.current[socketId] = peerConnection
    return peerConnection
  }

  // WebRTC event handlers
  const handleUserJoined = async ({ socketId }) => {
    // Add to participants if not present
    setParticipants(prev => {
      if (!prev.find(p => p.socketId === socketId)) {
        return [...prev, { socketId, userId: socketIdToUser[socketId]?.userId, name: socketIdToUser[socketId]?.name || 'Participant' }];
      }
      return prev;
    });
    // Only create offer if this client is not the new user
    if (socketId !== socket.id) {
      const peerConnection = getOrCreatePeerConnection(socketId);
      try {
        console.log(`[WebRTC] Creating offer for socket ${socketId}`);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        if (socket) {
          console.log(`[WebRTC] Emitting webrtc-offer to ${socketId}`);
          socket.emit('webrtc-offer', {
            to: socketId,
            offer
          });
        }
      } catch (error) {
        console.error('[WebRTC] Error creating offer:', error);
      }
    }
  }

  const handleOffer = async ({ offer, from }) => {
    const peerConnection = getOrCreatePeerConnection(from);
    try {
      console.log(`[WebRTC] Received offer from ${from}, setting remote description and creating answer`);
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      if (socket) {
        console.log(`[WebRTC] Emitting webrtc-answer to ${from}`);
        socket.emit('webrtc-answer', {
          to: from,
          answer
        });
      }
      setParticipants(prev => {
        if (!prev.find(p => p.socketId === from)) {
          return [...prev, { socketId: from, userId: socketIdToUser[from]?.userId, name: socketIdToUser[from]?.name || 'Participant' }];
        }
        return prev;
      });
    } catch (error) {
      console.error('[WebRTC] Error handling offer:', error);
    }
  }

  const handleAnswer = async ({ answer, from }) => {
    const peerConnection = peerConnectionsRef.current[from];
    if (peerConnection) {
      try {
        console.log(`[WebRTC] Received answer from ${from}, setting remote description`);
        await peerConnection.setRemoteDescription(answer);
      } catch (error) {
        console.error('[WebRTC] Error handling answer:', error);
      }
    } else {
      console.warn(`[WebRTC] No peer connection found for socket ${from} when handling answer`);
    }
  }

  const handleIceCandidate = async ({ candidate, from }) => {
    const peerConnection = peerConnectionsRef.current[from];
    if (peerConnection) {
      try {
        console.log(`[WebRTC] Adding ICE candidate from ${from}`, candidate);
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error('[WebRTC] Error handling ICE candidate:', error);
      }
    } else {
      console.warn(`[WebRTC] No peer connection found for socket ${from} when handling ICE candidate`);
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
  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = (messageData) => {
      console.log('[Socket] Received receive-message event:', messageData);
      setMessages(prev => [...prev, messageData]);
      if (!isChatOpen) {
        setUnreadCount(prev => prev + 1);
      }
    };
    socket.on('receive-message', handleReceiveMessage);
    return () => socket.off('receive-message', handleReceiveMessage);
  }, [socket, isChatOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    const messageData = {
      room: roomId,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      senderName: user.fullName || user.username
    };
    // Do NOT optimistically add message to UI here; let receive-message handle it
    console.log('[Socket] Emitting send-message', messageData);
    socket.emit('send-message', messageData);
    setNewMessage('');
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

  // Only show the 8-digit meeting code in the UI, never the internal roomId
  const displayMeetingCode = meetingInfo?.meetingCode || '';

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

  // Compute dynamic grid classes for video area
  const videoCount = 1 + participants.length;
  const videoGridClass = useMemo(() => {
    if (videoCount === 1) return 'grid-cols-1';
    if (videoCount === 2) return 'grid-cols-2';
    if (videoCount <= 4) return 'grid-cols-2 grid-rows-2';
    if (videoCount <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4';
  }, [videoCount]);
  const isScrollableGrid = videoCount > 9;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-black h-screen relative">
        {/* Top Bar */}
        <div className="w-full flex items-center justify-between px-6 py-3 bg-gray-900/80 border-b border-gray-800 z-20">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">Meeting Code:</span>
            {showMeetingCode ? (
              <span className="text-primary-400 font-mono text-xs bg-gray-800 px-2 py-1 rounded">{displayMeetingCode}</span>
            ) : (
              <span className="text-gray-500 font-mono text-xs bg-gray-800 px-2 py-1 rounded">••••••••</span>
            )}
            <button onClick={() => setShowMeetingCode(v => !v)} className="ml-1 text-primary-400 hover:text-primary-300" title={showMeetingCode ? 'Hide code' : 'Show code'}>
              <MoreVertical className="w-4 h-4" />
            </button>
            <button onClick={async () => {
              try {
                const meetingLink = `${window.location.origin}/meeting/${displayMeetingCode}`;
                await copyToClipboard(meetingLink);
                toast.success('Meeting link copied to clipboard!');
              } catch (error) {
                toast.error('Failed to copy meeting link');
              }
            }} className="ml-2 text-primary-400 hover:text-primary-300" title="Copy meeting link">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsChatOpen((v) => !v)} className="text-white hover:text-primary-400 px-3 py-1 rounded transition-colors" title="Toggle Chat">
              <MessageCircle className="w-5 h-5" />
              {unreadCount > 0 && <span className="ml-1 text-xs text-primary-400">({unreadCount})</span>}
            </button>
            <button onClick={() => setIsParticipantsOpen(v => !v)} className="text-white hover:text-primary-400 px-3 py-1 rounded transition-colors" title="Show Participants">
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className={`flex-1 p-4 grid gap-4 ${videoGridClass} ${isScrollableGrid ? 'overflow-y-auto' : ''}`} style={{minHeight:0}}>
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
            <div key={participant.socketId} className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={el => {
                  remoteVideosRef.current[participant.socketId] = el;
                  // Attach stream if it exists
                  if (el && remoteStreamsRef.current[participant.socketId]) {
                    el.srcObject = remoteStreamsRef.current[participant.socketId];
                  }
                }}
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

        {/* Bottom Controller Bar */}
        <div className="w-full flex items-center justify-center gap-4 px-6 py-3 bg-gray-900/80 border-t border-gray-800 z-20 absolute left-0 bottom-0">
          <button onClick={toggleMute} className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-600' : 'bg-gray-700'} text-white`} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button onClick={toggleVideo} className={`p-3 rounded-full transition-colors ${!isVideoOn ? 'bg-red-600' : 'bg-gray-700'} text-white`} title={isVideoOn ? 'Turn Off Video' : 'Turn On Video'}>
            {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          <button onClick={toggleScreenShare} className={`p-3 rounded-full transition-colors ${isScreenSharing ? 'bg-primary-600' : 'bg-gray-700'} text-white`} title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}>
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>
          <button onClick={leaveMeeting} className="p-3 rounded-full bg-red-700 text-white hover:bg-red-800 transition-colors" title="Leave Meeting">
            <Phone className="w-5 h-5 rotate-135" />
          </button>
        </div>
      </div>

      {/* Chat Sidebar */}
      {isChatOpen && (
        <motion.div
          className="bg-gray-800 border-l border-gray-700 flex flex-col w-full md:w-96 max-w-full h-[60vh] md:h-full"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">Chat</h3>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((message, index) => {
              // Safely extract sender name
              let displayName = message.senderName || message.userName;
              if (!displayName) {
                if (typeof message.sender === 'string') {
                  displayName = message.sender;
                } else if (typeof message.sender === 'object' && message.sender.username) {
                  displayName = message.sender.username;
                } else {
                  displayName = 'Unknown';
                }
              }
              // Safely extract message body
              let messageBody = message.text || message.message;
              if (typeof messageBody !== 'string') {
                messageBody = JSON.stringify(messageBody);
              }
              return (
                <div key={index} className="text-sm">
                  <div className="text-gray-400 text-xs mb-1">
                    {displayName} • {formatTime(message.timestamp)}
                  </div>
                  <div className="text-gray-200">
                    {messageBody}
                  </div>
                </div>
              );
            })}
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

      {/* Participant Sidebar */}
      <AnimatePresence>
        {isParticipantsOpen && (
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-xs bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h3 className="text-white font-semibold text-lg">Participants</h3>
              <button onClick={() => setIsParticipantsOpen(false)} className="text-gray-400 hover:text-white p-1 rounded" title="Close">
                <span className="text-xl">&times;</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {participants.length === 0 && (
                <div className="text-gray-400 text-center">No other participants yet.</div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-700 text-white font-bold">
                    {(user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U').toUpperCase()}
                  </span>
                  <span className="text-white font-medium">{user?.fullName || user?.username || 'You'}</span>
                  <span className="ml-auto text-xs text-primary-400">(You)</span>
                </div>
                {participants.map((participant) => (
                  <div key={participant.socketId} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 text-white font-bold">
                      {participant.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                    <span className="text-white font-medium">{participant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive adjustments for mobile */}
      <style>{`
        @media (max-width: 768px) {
          .md\\:flex-row { flex-direction: column !important; }
          .md\\:h-full { height: auto !important; }
          .md\\:w-96 { width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

export default Meeting
