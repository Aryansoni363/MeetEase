import http from 'http';
import connectDB from './db/index.js';
import initializeSocket from './socket/index.js';
import app from './app.js';
import { PORT, MONGODB_URI } from './config/index.js';

(async () => {
  try {
    await connectDB(MONGODB_URI);
    const server = http.createServer(app);
    initializeSocket(server);
    server.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
})();
