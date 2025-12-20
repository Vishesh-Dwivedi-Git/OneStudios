import "dotenv/config";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET!;

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = payload.userId;
    console.log("Authenticated user:", payload.userId);
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
