// src/config/index.js
import dotenv from 'dotenv';
dotenv.config();
export const {
  PORT = 8000,
  MONGODB_URI,
  CORS_ORIGIN,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
} = process.env;
