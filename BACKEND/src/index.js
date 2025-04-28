// ✅ Load environment variables at the very beginning
import dotenv from 'dotenv';
dotenv.config({
  path: "../.env"
}); // Ensures process.env is populated

// ✅ Import necessary modules
import http from 'http';
import { app } from './app.js'; // Your configured Express app
import connectDB from './db/index.js';
import initializeSocket from './socket/index.js'; // Modular Socket.IO setup

// ✅ Define the server port
const PORT = process.env.PORT || 8000;

// ✅ Connect to the database and start the server
connectDB()
  .then(() => {
    // ✅ Create an HTTP server using the Express app
    const server = http.createServer(app);

    // ✅ Initialize Socket.IO with the HTTP server
    initializeSocket(server);

    // ✅ Start listening on the defined port
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

    // ✅ Handle server-level errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed!', err);
  });
