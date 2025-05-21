// backend /src/routes/user.routes.js

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";
import logger from "../config/logger.js";

// Helper function to generate tokens
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.error("User not found while generating tokens", { userId });
      throw new ApiError(404, "User not found while generating tokens");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error("Token Generation Error", { error: error.message });
    throw new ApiError(500, "Error generating tokens");
  }
};

// Register User
const registerUser = asyncHandler(async (req, res) => {
  logger.info("registerUser request", { correlationId: req.correlationId });
  const { fullName, username, email, password } = req.body;

  if (!fullName || fullName.trim() === "") {
    logger.error("Full name is required");
    throw new ApiError(400, "Full name is required");
  }

  if (!username || username.trim().length < 3 || /\s/.test(username)) {
    logger.error("Invalid username provided");
    throw new ApiError(400, "Username must be at least 3 characters and contain no spaces");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    logger.error("Invalid email provided");
    throw new ApiError(400, "A valid email is required");
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    logger.error("Invalid password provided");
    throw new ApiError(
      400,
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    );
  }

  const existedUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (existedUser) {
    logger.error("User already exists", { email, username });
    throw new ApiError(409, "Email or username already exists");
  }

  const newUser = await User.create({
    fullName,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(newUser._id);
  const createdUser = await User.findById(newUser._id).select("-password -refreshToken");

  if (!createdUser) {
    logger.error("User created but failed to retrieve data", { userId: newUser._id });
    throw new ApiError(500, "User created but failed to retrieve data");
  }

  logger.info("User registered successfully", { userId: createdUser._id });
  return res
    .status(201)
    .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
    .json(new ApiResponse(201, { user: createdUser, accessToken, refreshToken }, "User registered successfully"));
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
  logger.info("loginUser request", { correlationId: req.correlationId });
  const { username, email, password } = req.body;

  if (!username && !email) {
    logger.error("Username or email required");
    throw new ApiError(400, "Username or email is required");
  }
  if (!password) {
    logger.error("Password required");
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [{ username: username?.toLowerCase() }, { email: email?.toLowerCase() }],
  });
  if (!user) {
    logger.error("User not found", { username, email });
    throw new ApiError(401, "Invalid username/email or password");
  }

  const isPasswordValid = await user.isValidPassword(password);
  if (!isPasswordValid) {
    logger.error("Invalid credentials", { username, email });
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  logger.info("User logged in successfully", { userId: user._id });
  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true })
    .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"));
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  logger.info("logoutUser request", { correlationId: req.correlationId, userId: req.user._id });
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    logger.info("User already logged out", { userId: req.user._id });
    return res.status(200).json(new ApiResponse(200, {}, "User already logged out"));
  }

  try {
    const user = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });
    }
  } catch (error) {
    logger.error("Logout cleanup error", { error: error.message });
  }

  logger.info("User logged out successfully", { userId: req.user._id });
  res
    .clearCookie("accessToken", { httpOnly: true, secure: true })
    .clearCookie("refreshToken", { httpOnly: true, secure: true })
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
  logger.info("refreshAccessToken request", { correlationId: req.correlationId });
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken || req.query.refreshToken;

  if (!incomingRefreshToken) {
    logger.error("Refresh token not found");
    throw new ApiError(401, "Refresh token not found, please login again");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      logger.error("Invalid refresh token", { decodedToken });
      throw new ApiError(401, "Invalid refresh token, please login again");
    }
    if (user.refreshToken !== incomingRefreshToken) {
      logger.error("Refresh token mismatch", { userId: user._id });
      throw new ApiError(401, "Invalid refresh token, please login again");
    }
    const options = { httpOnly: true, secure: true };
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    logger.info("Access token refreshed successfully", { userId: user._id });
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed successfully"));
  } catch (error) {
    logger.error("Error refreshing token", { error: error.message });
    throw new ApiError(401, error?.message || "Invalid refresh token, please login again");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
