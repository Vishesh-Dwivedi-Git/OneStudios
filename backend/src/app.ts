import express from "express";
import authRoutes from "./routes/auth.routes.js"
import roomRoutes from "./routes/room.routes.js"

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/rooms", roomRoutes);
app.use("/", (req, res) => {
  res.send("Welcome to the API!");
});

export default app;
