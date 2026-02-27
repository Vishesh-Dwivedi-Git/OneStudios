import { Router } from "express";
import {
    createRoom,
    getRoom,
    joinRoom,
    joinByInviteCode,
    leaveRoom,
    endRoom,
    getUserRooms,
    getUserStats,
} from "../controllers/room.controller.js";
import { protect } from "../middleware/auth.middleware.js";

// ─── Room Routes ────────────────────────────────────────
//
// All routes are protected (require JWT auth).
//
// Route design follows REST conventions:
//   POST   /rooms              → create a new room
//   GET    /rooms              → list user's rooms (active + history)
//   GET    /rooms/:id          → get a specific room
//   POST   /rooms/:id/join     → join a room by ID
//   POST   /rooms/:id/leave    → leave a room
//   POST   /rooms/:id/end      → end a meeting (host only)
//   POST   /rooms/join/:inviteCode → join via shareable invite code

const router = Router();

router.post("/", protect, createRoom);
router.get("/", protect, getUserRooms);
router.get("/stats", protect, getUserStats);
router.get("/:id", protect, getRoom);
router.post("/:id/join", protect, joinRoom);
router.post("/:id/leave", protect, leaveRoom);
router.post("/:id/end", protect, endRoom);
router.post("/join/:inviteCode", protect, joinByInviteCode);

export default router;
