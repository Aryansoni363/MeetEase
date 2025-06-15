// WebRTC utilities
export class WebRTCManager {
  constructor() {
    this.peerConnections = new Map()
    this.localStream = null
    this.onRemoteStream = null
    this.onConnectionStateChange = null

    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  }

  async initializeLocalMedia(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      return this.localStream
    } catch (error) {
      console.error('Failed to access media devices:', error)
      throw error
    }
  }

  async initializeScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })
      return screenStream
    } catch (error) {
      console.error('Failed to start screen share:', error)
      throw error
    }
  }

  createPeerConnection(userId) {
    const peerConnection = new RTCPeerConnection(this.rtcConfig)

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream)
      })
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      if (this.onRemoteStream) {
        this.onRemoteStream(userId, event.streams[0])
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, peerConnection.connectionState)
      }
    }

    this.peerConnections.set(userId, peerConnection)
    return peerConnection
  }

  async createOffer(userId) {
    const peerConnection = this.peerConnections.get(userId)
    if (!peerConnection) return null

    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      return offer
    } catch (error) {
      console.error('Failed to create offer:', error)
      throw error
    }
  }

  async createAnswer(userId, offer) {
    const peerConnection = this.peerConnections.get(userId)
    if (!peerConnection) return null

    try {
      await peerConnection.setRemoteDescription(offer)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      return answer
    } catch (error) {
      console.error('Failed to create answer:', error)
      throw error
    }
  }

  async handleAnswer(userId, answer) {
    const peerConnection = this.peerConnections.get(userId)
    if (!peerConnection) return

    try {
      await peerConnection.setRemoteDescription(answer)
    } catch (error) {
      console.error('Failed to handle answer:', error)
      throw error
    }
  }

  async addIceCandidate(userId, candidate) {
    const peerConnection = this.peerConnections.get(userId)
    if (!peerConnection) return

    try {
      await peerConnection.addIceCandidate(candidate)
    } catch (error) {
      console.error('Failed to add ICE candidate:', error)
    }
  }

  async replaceVideoTrack(userId, newTrack) {
    const peerConnection = this.peerConnections.get(userId)
    if (!peerConnection) return

    const sender = peerConnection.getSenders().find(s =>
      s.track && s.track.kind === 'video'
    )

    if (sender) {
      try {
        await sender.replaceTrack(newTrack)
      } catch (error) {
        console.error('Failed to replace video track:', error)
        throw error
      }
    }
  }

  closePeerConnection(userId) {
    const peerConnection = this.peerConnections.get(userId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(userId)
    }
  }

  closeAllConnections() {
    this.peerConnections.forEach((peerConnection, userId) => {
      peerConnection.close()
    })
    this.peerConnections.clear()

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
  }

  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = enabled
      }
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = enabled
      }
    }
  }
}

// Media utilities
export const getMediaConstraints = (video = true, audio = true) => ({
  video: video ? {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  } : false,
  audio: audio ? {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  } : false
})

export const getScreenShareConstraints = () => ({
  video: {
    mediaSource: 'screen',
    width: { max: 1920 },
    height: { max: 1080 },
    frameRate: { max: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true
  }
})

// Check browser support
export const checkWebRTCSupport = () => {
  const isSupported = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.RTCPeerConnection
  )

  return {
    isSupported,
    getUserMedia: !!navigator.mediaDevices?.getUserMedia,
    getDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
    rtcPeerConnection: !!window.RTCPeerConnection
  }
}
