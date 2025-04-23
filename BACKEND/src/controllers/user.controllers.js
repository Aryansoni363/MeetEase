import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.models.js';


const generateAccessAndRefreshTokens = async(userId) => {
try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false});

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating tokens");
  }
  
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;
//

  // Full Name validation
  if (!fullName || fullName.trim() === "") {
    throw new ApiError(400, "Full name is required");
  }

  // Username validation: min 3 chars, no spaces
  if (!username || username.trim().length < 3 || /\s/.test(username)) {
    throw new ApiError(400, "Username must be at least 3 characters and contain no spaces");
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new ApiError(400, "A valid email is required");
  }

  // Password validation: min 8 chars, 1 upper, 1 lower, 1 number, 1 special char
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
      { username: username.toLowerCase() }
    ]
  });

  if (existedUser) {
    throw new ApiError(409, "Email or username already exists");
  }

  // Create new user
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating the user");
  }

  return res.status(201).json(
    new ApiResponse(201, "User created successfully", createdUser)
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { username,email, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }
  if (!password) {
    throw new ApiError(400, "Password is required");
  }
  // Check if user exists 
  User.findOne({
    $or: [
      { username: username.toLowerCase() },
      { email: email.toLowerCase() }
    ]
   })
    
      if (!user) {
        throw new ApiError(401, "Invalid username/email or password");
      }

      // Check password
      const isPasswordValid = await user.isValidPassword(password);
      if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
      }

      // Generate tokens and send response
      const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
      const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

      const options={
        httpOnly:true,
        secure:true,
      }

      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken
          }, 
          "User logged in successfully")
      );
   


 }) ;

// Logout user

const logoutUser = asyncHandler(async (req, res) => {

awaitUser.findByIdAndUpdate(
  req.user._id,{
    $set: {
      refreshToken: undefined
    }
  },{
    new:true
  }
)
const options={
  httpOnly:true,
  secure:true,
}
return res.status(200)
.clearCookie("accessToken", options)
.clearCookie("refreshToken", options)
.json(new ApiResponse(200, {}, "User logged out successfully"));



  
})



export { registerUser , loginUser, logoutUser };
