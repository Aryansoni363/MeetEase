import express from "express";
import { createMeeting, joinMeeting, getMeetingHistory } from "../controllers/meeting.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(verifyJWT);        // protects all routes below
router.post("/create", createMeeting);
router.get("/join/:roomId", joinMeeting);
router.get("/history", getMeetingHistory);
// ─── Chat REST endpoints ───────────────────────────────────
router.post('/:roomId/message', postMessage);
router.get('/:roomId/messages', getMessages);


export default router;
