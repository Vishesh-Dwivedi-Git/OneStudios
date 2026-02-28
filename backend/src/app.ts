import express from "express";
import authRoutes from "./routes/auth.routes.js"
import roomRoutes from "./routes/room.routes.js"
import aiRoutes from "./routes/ai.routes.js"
import cookieParser from "cookie-parser"
import cors from "cors";
import passport from "./lib/passport.js";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

const app = express();

// ─── Security Headers ────────────────────────────────────
// Helmet sets various HTTP headers to help protect the app
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // CSP handled by Next.js frontend
}));

// ─── Request Logging ─────────────────────────────────────
// Compact dev-friendly logs: method, url, status, response time
app.use(morgan("dev"));

// ─── Response Compression ────────────────────────────────
// Gzip/Brotli compress all responses > 1KB — reduces bandwidth
app.use(compression());

// ─── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// ─── CORS ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

// ─── Passport ────────────────────────────────────────────
app.use(passport.initialize());

// ─── Rate Limiters ───────────────────────────────────────

// Global limiter: 200 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 200,                   // limit each IP to 200 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

// Auth limiter: strict — 10 attempts per 15 minutes (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again in 15 minutes." },
});

// AI limiter: 20 requests per minute (prevent Gemini API abuse)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI rate limit exceeded, please wait a moment." },
});

// Room creation limiter: 15 rooms per minute (prevent spam)
const roomCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many rooms created. Please wait." },
});

// Apply global limiter to all routes
app.use(globalLimiter);

// ─── Routes ──────────────────────────────────────────────
// Auth routes with strict rate limit on login/register
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);
app.use("/auth", authRoutes);

// Room routes with creation limiter
app.use("/rooms", roomCreateLimiter);
app.use("/rooms", roomRoutes);

// AI routes with AI-specific limiter
app.use("/ai", aiLimiter);
app.use("/ai", aiRoutes);

// ─── Health Check ────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Catch-all ───────────────────────────────────────────
app.use("/", (_req, res) => {
  res.send("OneStudios API v1.0");
});

export default app;
