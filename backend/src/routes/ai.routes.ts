import { Router } from "express";
import { getSmartReplies, getMeetingSummary } from "../controllers/ai.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// POST /ai/suggest — get 3 smart reply suggestions from transcript
router.post("/suggest", protect, getSmartReplies);

// POST /ai/summary — get structured meeting summary
router.post("/summary", protect, getMeetingSummary);

export default router;
