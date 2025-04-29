// src/socket/index.js

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { ApiResponse } = require('../utils/ApiResponse');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // Default to 1 hour

/**
 * Initializes the Socket.IO server.
 * @param {http.Server} server - The HTTP server instance.
 * @returns {Server} - The initialized Socket.IO server.
 */
function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // Adjust as needed for security
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Listen for authentication event
    socket.on('authenticate', (token) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded;
        socket.emit('authenticated', new ApiResponse(true, 'Authentication successful', decoded));
        console.log(`✅ User authenticated: ${decoded.username}`);
      } catch (err) {
        socket.emit('unauthorized', new ApiResponse(false, 'Invalid or expired token'));
        socket.disconnect();
        console.warn(`❌ Authentication failed for socket ${socket.id}`);
      }
    });

    // Example of handling a custom event
    socket.on('joinRoom', (room) => {
      if (socket.user) {
        socket.join(room);
        socket.emit('joinedRoom', new ApiResponse(true, `Joined room: ${room}`));
        console.log(`👤 User ${socket.user.username} joined room: ${room}`);
      } else {
        socket.emit('unauthorized', new ApiResponse(false, 'User not authenticated'));
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { initializeSocket };
