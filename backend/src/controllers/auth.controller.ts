import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { hashToken } from "../lib/hash.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../lib/jwt.js";
import { setAuthCookies } from "../lib/cookies.js";

/* REGISTER */
export const register = async (req: Request, res: Response) => {
  const { email, username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, username, password: hashedPassword },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });

  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ success: true });
};

/* LOGIN */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });

  setAuthCookies(res, accessToken, refreshToken);
  res.json({ success: true });
};

/* REFRESH */
export const refresh = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  const tokenHash = hashToken(token);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!stored)
    return res.status(403).json({ message: "Token revoked" });

  try {
    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!);
  } catch {
    return res.status(403).json({ message: "Invalid refresh token" });
  }

  // rotate
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newAccessToken = generateAccessToken(stored.userId);
  const newRefreshToken = generateRefreshToken(stored.userId);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(newRefreshToken),
      userId: stored.userId,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });

  setAuthCookies(res, newAccessToken, newRefreshToken);
  res.json({ success: true });
};

/* LOGOUT */
export const logout = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;

  if (token) {
    await prisma.refreshToken.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  const IS_PROD = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" as const : "lax" as const,
  };
  res.clearCookie("accessToken", cookieOpts);
  res.clearCookie("refreshToken", cookieOpts);
  res.json({ success: true });
};
