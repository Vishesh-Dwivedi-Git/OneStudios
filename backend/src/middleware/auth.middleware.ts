import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.accessToken;

  if (!token)
    return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as any;

    req.userId = decoded.userId; // 🔥 attached here
    next();
  } catch {
    res.status(401).json({ message: "Token expired" });
  }
};
