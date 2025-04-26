import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.models.js';
import jwt from 'jsonwebtoken';

// Helper function to generate tokens
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      console.error("❌ User not found with ID:", userId);
      throw new ApiError(404, "User not found while generating tokens");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("❌ Token Generation Error:", error);
    throw new ApiError(500, "Error generating tokens");
  }
};

// ================== REGISTER ==================
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;

  // Validations
  if (!fullName || fullName.trim() === "") {
    throw new ApiError(400, "Full name is required");
  }

  if (!username || username.trim().length < 3 || /\s/.test(username)) {
    throw new ApiError(400, "Username must be at least 3 characters and contain no spaces");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new ApiError(400, "A valid email is required");
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    );
  }

  // Check if user already exists
  const existedUser = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { username: username.toLowerCase() },
    ],
  });

  if (existedUser) {
    throw new ApiError(409, "Email or username already exists");
  }

  // Create new user
  const newUser = await User.create({
    fullName,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password, // hashed via pre-save hook
  });

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(newUser._id);

  const createdUser = await User.findById(newUser._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "User created but failed to retrieve data");
  }

  // Send response
  return res
    .status(201)
    .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
    .json(
      new ApiResponse(201, {
        user: createdUser,
        accessToken,
        refreshToken,
      }, "User registered successfully")
    );
});


// ================== LOGIN ==================
const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [
      { username: username?.toLowerCase() },
      { email: email?.toLowerCase() },
    ],
  });

  if (!user) {
    throw new ApiError(401, "Invalid username/email or password");
  }

  const isPasswordValid = await user.isValidPassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken,
      }, "User logged in successfully")
    );
});





// ================== LOGOUT ==================
const logoutUser = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User already logged out"));
  }

  // Optional: clear token from DB (for stricter logout)
  try {
    const user = await User.findOne({ refreshToken });

    if (user) {
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });
    }
  } catch (error) {
    console.error("Logout cleanup error:", error);
  }

  // Clear cookies
  res
    .clearCookie("accessToken", { httpOnly: true, secure: true })
    .clearCookie("refreshToken", { httpOnly: true, secure: true })
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ================== REFRESH ACCESS TOKEN ==================

// refresh access token function
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.
  refreshToken || req.body.refreshToken || req.query.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token not found, please login again");
  }

try {
  const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  
    const user = await User.findById( decodedToken?._id );
    if (!user) {
      throw new ApiError(401, "Invalid refresh token, please login again");
    }
    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Invalid refresh token, please login again");
    }
    const options ={
      httpOnly: true,
      secure: true,
    }
  
    // Generate new access and refresh tokens
    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
  
  // Update the refresh token in the database
  return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed successfully"));
  
  
} catch (error) {
  throw new ApiError(401, error?.message || "Invalid refresh token, please login again");
  
}

});





// Exporting the functions
export { registerUser, loginUser, logoutUser, refreshAccessToken };
