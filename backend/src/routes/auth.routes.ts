import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import passport from "passport";
import { oauthSuccess } from "../controllers/oauth.controllers.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
// GOOGLE
router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  oauthSuccess
);

// DISCORD
router.get(
  "/discord",
  passport.authenticate("discord")
);

router.get(
  "/discord/callback",
  passport.authenticate("discord", { session: false }),
  oauthSuccess
);


router.get("/me", protect, (req, res) => {
  res.json({ userId: req.userId });
});

// Returns the access token so the client can use it for WebSocket auth
// (cookies are httpOnly and can't be read by JS for cross-origin WS)
router.get("/ws-token", protect, (req, res) => {
  const token = req.cookies.accessToken;
  res.json({ token });
});

export default router;
