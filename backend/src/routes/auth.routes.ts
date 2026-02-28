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

// Cross-origin OAuth token bridge: client sends tokens received via URL fragment,
// backend sets them as httpOnly cookies for the client domain
import { setAuthCookies } from "../lib/cookies.js";
router.post("/set-tokens", (req, res) => {
  const { accessToken, refreshToken } = req.body;
  if (!accessToken || !refreshToken) {
    return res.status(400).json({ message: "Missing tokens" });
  }
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ success: true });
});

export default router;
