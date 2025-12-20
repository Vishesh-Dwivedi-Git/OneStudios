import { Router } from "express";
import { createRoom, getRoom } from "../controllers/room.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/createRoom", authMiddleware, createRoom);
router.get("/getRoom/:id", authMiddleware, getRoom);

export default router;
