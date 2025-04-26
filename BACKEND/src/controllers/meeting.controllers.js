import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Meeting } from "../models/meeting.models.js";
import { User } from "../models/user.models.js";
import { v4 as uuidv4 } from "uuid";

// Create a new meeting
const createMeeting = asyncHandler(async (req, res) => {
  const { startTime } = req.body;
  if (!startTime) {
    throw new ApiError(400, "Start time is required");
  }

  // Generate internal roomId
  const roomId = uuidv4();

  const meeting = await Meeting.create({
    roomId,
    host: req.user._id,
    participants: [{
      user: req.user._id,
      joinTime: new Date(startTime)
    }],
    startTime: new Date(startTime)
  });

  // Add to user's meetingHistory
  await User.findByIdAndUpdate(
    req.user._id,
    { $push: { meetingHistory: { meetingId: meeting._id } } },
    { new: true }
  );

  // Return both IDs and the public URL
  return res.status(201).json(
    new ApiResponse(201, {
      roomId: meeting.roomId,
      meetingCode: meeting.meetingCode,
      meetingURL: `${process.env.FRONTEND_BASE_URL}/meet/${meeting.meetingCode}`
    }, "Meeting created successfully")
  );
});

// Join an existing meeting
const joinMeeting = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const meeting = await Meeting.findOne({ roomId });
  if (!meeting) {
    throw new ApiError(404, "Meeting not found");
  }

  const alreadyJoined = meeting.participants.some(p =>
    p.user.toString() === req.user._id.toString()
  );

  if (!alreadyJoined) {
    meeting.participants.push({ user: req.user._id, joinTime: new Date() });
    await meeting.save();
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { meetingHistory: { meetingId: meeting._id } } },
      { new: true }
    );
  }

  return res.status(200).json(
    new ApiResponse(200, {
      roomId: meeting.roomId,
      meetingCode: meeting.meetingCode,
      participants: meeting.participants
    }, "Joined meeting successfully")
  );
});

// Get all meetings a user has hosted or joined
const getMeetingHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: "meetingHistory.meetingId",
      select: "roomId meetingCode startTime endTime createdAt"
    })
    .select("meetingHistory");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, user.meetingHistory, "Fetched meeting history")
  );
});

export { createMeeting, joinMeeting, getMeetingHistory };
