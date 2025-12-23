import express from "express";
import authRoutes from "./routes/auth.routes.js"
import roomRoutes from "./routes/room.routes.js"
import cookieParser from "cookie-parser"
import cors from "cors";
import passport from "./lib/passport.js";



const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.use(passport.initialize());

app.use("/auth", authRoutes);
app.use("/rooms", roomRoutes);
app.use("/", (req, res) => {
  res.send("Welcome to the API!");
});

export default app;
