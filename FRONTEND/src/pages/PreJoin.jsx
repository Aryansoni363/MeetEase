import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, MicOff, Video as VideoIcon, VideoOff, CheckCircle } from 'lucide-react';

function PreJoin() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const localVideoRef = useRef();
  const localStreamRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        // fallback: no camera/mic
      }
    })();
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  const handleJoin = () => {
    navigate(`/meeting/${roomId}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900">
      <div className="bg-gray-800 rounded-xl p-8 flex flex-col items-center shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-4">Device Check</h2>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-64 h-48 bg-black rounded-lg object-cover mb-4"
        />
        <div className="flex gap-6 mb-6">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full text-2xl transition-colors ${isMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full text-2xl transition-colors ${!isVideoOn ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            {isVideoOn ? <VideoIcon /> : <VideoOff />}
          </button>
        </div>
        <button
          onClick={handleJoin}
          className="w-full btn-primary py-3 text-lg font-semibold flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-6 h-6" />
          Join Meeting
        </button>
      </div>
    </div>
  );
}

export default PreJoin;
