import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';


const registerUser = asyncHandler(async (req, res) => {

    const {fullname, username, email, password} = req.body;
    console.log("email", email);

    // write a function to check for strict valid for all fields especially  password and email, username
    // check if all fields are present and not empty
    
    if([fullname, username, email, password].some(field => field?.trim()=== "")) {
        throw new ApiError('All fields are required', 400);
    } 

    const existedUser = await User.findOne({
        $or: [
            { email: email.toLowerCase() }, // check if email already exists
            { username: username.toLowerCase() } // check if username already exists
        ]
    })
    if (existedUser) {
        throw new ApiError('Email or username already exists', 409);
    }

   const user= await User.create({
        fullName,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken ")
      
    if (!createdUser) {
        throw new ApiError('something went wrong while creating the user', 500);
    }

   return res.status(201).json(new ApiResponse(200,createdUser, "User created successfully"));




})

export { registerUser }
