// backend/src/controllers/meeting.controllers.js

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Meeting } from "../models/meeting.models.js";
import { User } from "../models/user.models.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import logger from "../config/logger.js";

// Helper: Secure 8-char alphanumeric code
const generateMeetingCode = () => {
  return crypto
    .randomBytes(6)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 8);
};

// Get roomId from a meeting code
const getRoomIdFromMeetingCode = asyncHandler(async (req, res) => {
  logger.info("getRoomIdFromMeetingCode invoked", {
    correlationId: req.correlationId,
    meetingCode: req.params.meetingCode,
  });

  const { meetingCode } = req.params;
  const meeting = await Meeting.findOne({ meetingCode });

  if (!meeting) {
    logger.error("Meeting not found", { meetingCode });
    throw new ApiError(404, "Meeting not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { roomId: meeting.roomId }, "RoomId fetched successfully"));
});

// Create Meeting
const createMeeting = asyncHandler(async (req, res) => {
  logger.info("createMeeting request", { correlationId: req.correlationId, userId: req.user._id });
  
  const { startTime, endTime } = req.body;
  if (!startTime) {
    logger.error("Start time is required");
    throw new ApiError(400, "Start time is required");
  }
  if (endTime && new Date(endTime) <= new Date(startTime)) {
    logger.error("End time must be after start time");
    throw new ApiError(400, "End time must be after start time");
  }

  const roomId = uuidv4();
  const meetingCode = generateMeetingCode();

  const meeting = await Meeting.create({
    roomId,
    meetingCode,
    host: req.user._id,
    participants: [{ user: req.user._id, joinTime: new Date(startTime) }],
    startTime: new Date(startTime),
    endTime: endTime ? new Date(endTime) : undefined,
  });

  // Record in user's meeting history
  await User.findByIdAndUpdate(
    req.user._id,
    { $push: { meetingHistory: { meetingId: meeting._id } } },
    { new: true }
  );

  logger.info("Meeting created successfully", { meetingId: meeting._id, roomId: meeting.roomId });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        roomId: meeting.roomId,
        meetingCode: meeting.meetingCode,
        meetingURL: `${process.env.FRONTEND_BASE_URL}/meet/${meeting.meetingCode}`,
      },
      "Meeting created successfully"
    )
  );
});

// Join Meeting
const joinMeeting = asyncHandler(async (req, res) => {
  logger.info("joinMeeting request", { correlationId: req.correlationId, userId: req.user._id });
  
  const { meetingCode } = req.body;
  const userId = req.user._id; // Relying on authenticated user

  const meeting = await Meeting.findOne({ meetingCode });
  if (!meeting) {
    logger.error("Meeting not found", { meetingCode });
    throw new ApiError(404, "Meeting not found");
  }

  // Check if the user is already a participant
  const alreadyParticipant = meeting.participants.some(
    (p) => p.user.toString() === userId.toString()
  );
  if (!alreadyParticipant) {
    meeting.participants.push({ user: userId, joinTime: new Date() });
    await meeting.save();

    await User.findByIdAndUpdate(userId, {
      $push: { meetingHistory: { meetingId: meeting._id } },
    });
    logger.info("User added to meeting", { meetingId: meeting._id, userId });
  } else {
    logger.info("User already a participant", { meetingId: meeting._id, userId });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        roomId: meeting.roomId,
        meetingCode: meeting.meetingCode,
        meetingURL: `${process.env.FRONTEND_BASE_URL}/meet/${meeting.meetingCode}`,
        participants: meeting.participants,
      },
      "Joined meeting successfully"
    )
  );
});

// Leave Meeting
const leaveMeeting = asyncHandler(async (req, res) => {
  logger.info("leaveMeeting request", {
    correlationId: req.correlationId,
    userId: req.user._id,
    roomId: req.params.roomId,
  });

  const { roomId } = req.params;
  
  // Update meeting by removing this user from the participants array atomically.
  const meeting = await Meeting.findOneAndUpdate(
    { roomId },
    { $pull: { participants: { user: req.user._id } } },
    { new: true }
  );

  if (!meeting) {
    logger.error("Meeting not found", { roomId });
    throw new ApiError(404, "Meeting not found");
  }

  logger.info("User left meeting", {
    roomId,
    userId: req.user._id,
    remainingParticipants: meeting.participants,
  });
  return res.status(200).json(new ApiResponse(200, { roomId }, "Left meeting successfully"));
});

// Get Meeting History
const getMeetingHistory = asyncHandler(async (req, res) => {
  logger.info("getMeetingHistory request", { correlationId: req.correlationId, userId: req.user._id });
  
  const user = await User.findById(req.user._id)
    .populate({
      path: "meetingHistory.meetingId",
      select: "roomId meetingCode startTime endTime createdAt",
    })
    .select("meetingHistory");

  if (!user) {
    logger.error("User not found", { userId: req.user._id });
    throw new ApiError(404, "User not found");
  }

  logger.info("Meeting history fetched", { userId: req.user._id });
  return res.status(200).json(new ApiResponse(200, user.meetingHistory, "Fetched meeting history"));
});

// Post Message
const postMessage = asyncHandler(async (req, res) => {
  logger.info("postMessage request", {
    correlationId: req.correlationId,
    userId: req.user._id,
    roomId: req.params.roomId,
  });

  const { roomId } = req.params;
  const { text } = req.body;
  if (!text?.trim()) {
    logger.error("Message text is required");
    throw new ApiError(400, "Message text is required");
  }

  // Verify that the meeting exists
  const meeting = await Meeting.findOne({ roomId });
  if (!meeting) {
    logger.error("Meeting not found", { roomId });
    throw new ApiError(404, "Meeting not found");
  }

  // Ensure the user is a participant in the meeting
  const isParticipant = meeting.participants.some(
    (p) => p.user.toString() === req.user._id.toString()
  );
  // Uncomment the following line for extra debugging:
  // logger.info("Current participants", { participants: meeting.participants.map(p => p.user.toString()) });
  if (!isParticipant) {
    logger.error("User not a participant in the meeting", { roomId, userId: req.user._id });
    throw new ApiError(403, "User is not a participant of the meeting");
  }

  const message = {
    sender: req.user._id,
    text,
    timestamp: new Date(),
  };
  meeting.messages.push(message);
  await meeting.save();

  logger.info("Message posted", { roomId, userId: req.user._id });
  return res.status(201).json(new ApiResponse(201, message, "Message posted"));
});

// Get Messages
const getMessages = asyncHandler(async (req, res) => {
  logger.info("getMessages request", {
    correlationId: req.correlationId,
    roomId: req.params.roomId,
  });

  const { roomId } = req.params;
  const meeting = await Meeting.findOne({ roomId }).populate("messages.sender", "username");
  if (!meeting) {
    logger.error("Meeting not found", { roomId });
    throw new ApiError(404, "Meeting not found");
  }

  logger.info("Messages fetched", { roomId });
  return res.json(new ApiResponse(200, meeting.messages, "Messages fetched"));
});

export {
  createMeeting,
  joinMeeting,
  leaveMeeting,
  getMeetingHistory,
  postMessage,
  getMessages,
  getRoomIdFromMeetingCode,
};
