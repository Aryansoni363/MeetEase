import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js"; // ✅ import your configured Express app

dotenv.config({
    path: "../.env"
});

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

    // ✅ Optional: catch server-level errors
    server.on("error", (error) => {
      console.log("❌ Server error:", error);
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB connection failed!", err);
  });
