// src/socket/index.js

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Meeting } = require('../models/meeting.models.js');
const { ApiResponse } = require('../utils/ApiResponse');

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET;

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket'], // force websocket only
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ WS connected: ${socket.id} (user ${socket.user._id})`);

    socket.on('join-room', ({ room }) => {
      socket.join(room);
      socket.to(room).emit('user:joined', { userId: socket.user._id });
    });

    // ─── Chat handler ─────────────────────────────────────────
    socket.on('send-message', async ({ room, text }) => {
      const payload = {
        sender: socket.user._id,
        text,
        timestamp: new Date(),
      };
      // 1) broadcast to other participants
      socket.to(room).emit('receive-message', payload);

      // 2) persist to MongoDB
      try {
        const meeting = await Meeting.findOne({ roomId: room });
        if (meeting) {
          meeting.messages.push(payload);
          await meeting.save();
        }
      } catch (err) {
        console.error('❌ Failed to save chat message:', err);
      }
    });

    socket.on('leave-room', ({ room }) => {
      socket.leave(room);
      socket.to(room).emit('user:left', { userId: socket.user._id });
    });

    socket.on('disconnect', () => {
      console.log(`❌ WS disconnected: ${socket.id}`);
    });
  });

  io.on('connect_error', (err) => {
    console.error('⚠️ Socket.IO error:', err.message);
  });

  return io;
}

module.exports = { initializeSocket };
