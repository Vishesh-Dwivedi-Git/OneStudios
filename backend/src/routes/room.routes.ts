import { Router } from "express";
import { createRoom, getRoom ,joinRoom} from "../controllers/room.controller.js";
import {  protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/createRoom", protect, createRoom);
router.get("/getRoom/:id", protect, getRoom);
router.post("/:id/joinRoom", protect, joinRoom);

export default router;
