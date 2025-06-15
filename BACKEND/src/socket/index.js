import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Meeting } from "../models/meeting.models.js";
import logger from "../config/logger.js"; // Import the Winston logger

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET;

export default function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"],
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error(err.name === "TokenExpiredError" ? "TokenExpired" : "Authentication error"));
      }
      socket.user = decoded; // { _id, username, etc. }
      next();
    });
  });

  // Utility function to list chat participants in a room
  const getChatParticipants = (room) => {
    const clients = io.sockets.adapter.rooms.get(room) || new Set();
    return Array.from(clients)
      .map((socketId) => {
        const s = io.sockets.sockets.get(socketId);
        return s && s.user ? { userId: s.user._id } : null;
      })
      .filter(Boolean);
  };

  // WebRTC room tracker: roomId → Set of socket ids
  const webrtcRooms = {};

  io.on("connection", (socket) => {
    logger.info(`WS connected: ${socket.id} (user ${socket.user._id})`);

    // ── CHAT EVENTS ─────────────────────────────────────────────
    socket.on("join-room", ({ room }) => {
      socket.join(room);
      const participants = getChatParticipants(room);
      logger.info(`User ${socket.user._id} joined chat room ${room}`, { participants });
      io.in(room).emit("room:participants", { participants });
    });

    // Updated to send the sender's name
    socket.on("send-message", async ({ room, text }) => {
      const msg = {
        senderId: socket.user._id,
        senderName: socket.user.username, // New field for sender's name.
        text,
        timestamp: new Date(),
      };
      io.in(room).emit("receive-message", msg);
      try {
        const meeting = await Meeting.findOne({ roomId: room });
        if (meeting) {
          meeting.messages.push(msg);
          await meeting.save();
          logger.info(`Chat message saved to meeting ${room}`);
        }
      } catch (err) {
        logger.error("Failed to save chat message", { error: err });
      }
    });

    // ── WEBRTC EVENTS ────────────────────────────────────────────
    socket.on("join-webrtc-room", ({ room }) => {
      socket.join(room);
      webrtcRooms[room] = webrtcRooms[room] || new Set();
      webrtcRooms[room].add(socket.id);
      const others = Array.from(webrtcRooms[room]).filter((id) => id !== socket.id);
      logger.info(`User ${socket.user._id} joined WebRTC room ${room}. Other users: ${others}`);
      socket.emit("all-users", others);
    });

    socket.on("webrtc-offer", ({ to, offer }) => {
      logger.info(`WebRTC offer from ${socket.id} to ${to}`);
      io.to(to).emit("webrtc-offer", { from: socket.id, offer });
    });

    socket.on("webrtc-answer", ({ to, answer }) => {
      logger.info(`WebRTC answer from ${socket.id} to ${to}`);
      io.to(to).emit("webrtc-answer", { from: socket.id, answer });
    });

    socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
      logger.info(`WebRTC ICE candidate from ${socket.id} to ${to}`);
      io.to(to).emit("webrtc-ice-candidate", { from: socket.id, candidate });
    });

    // ── DISCONNECT CLEANUP ───────────────────────────────────────
    socket.on("disconnect", () => {
      logger.info(`WS disconnected: ${socket.id}`);
      Object.keys(webrtcRooms).forEach((roomId) => {
        if (webrtcRooms[roomId].has(socket.id)) {
          webrtcRooms[roomId].delete(socket.id);
          if (webrtcRooms[roomId].size === 0) {
            delete webrtcRooms[roomId];
          } else {
            socket.to(roomId).emit("user:left-webrtc", { userId: socket.user._id });
          }
        }
      });
    });
  });

  io.on("connect_error", (err) => {
    logger.error("Socket.IO connection error", { error: err.message });
  });

  return io;
}
