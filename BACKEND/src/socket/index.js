import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

export default function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS.split(','),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    try {
      const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    socket.on('join-room', ({ meetingCode }) => {
      socket.join(meetingCode);
      socket.to(meetingCode).emit('user-joined', { userId: socket.user._id });
    });

    socket.on('leave-room', ({ meetingCode }) => {
      socket.leave(meetingCode);
      socket.to(meetingCode).emit('user-left', { userId: socket.user._id });
    });

    socket.on('send-message', ({ meetingCode, message }) => {
      const payload = {
        userId: socket.user._id,
        text: message,
        timestamp: new Date(),
      };
      socket.to(meetingCode).emit('receive-message', payload);
    });

    socket.on('disconnecting', () => {
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.to(room).emit('user-left', { userId: socket.user._id });
        }
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user._id}`);
    });
  });

  return io;
}
