// backend/src/routes/meeting.routes.js

import express from "express";
import {
  createMeeting,
  joinMeeting,
  leaveMeeting,
  getMeetingHistory,
  postMessage,
  getMessages
} from "../controllers/meeting.controllers.js";
import { getRoomIdFromMeetingCode } from '../controllers/meeting.controllers.js';
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(verifyJWT);   // protects all routes

router.post("/create", createMeeting);
router.post("/join", joinMeeting);  // <== fixed here (was GET with param earlier)
router.post("/leave/:roomId", leaveMeeting);
router.get("/history", getMeetingHistory);
router.post('/:roomId/message', postMessage);
router.get('/:roomId/messages', getMessages);
router.get('/code/:meetingCode', getRoomIdFromMeetingCode);

export default router;
