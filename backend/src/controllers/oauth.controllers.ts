import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../lib/jwt.js";
import { setAuthCookies } from "../lib/cookies.js";
import { hashToken } from "../lib/hash.js";
import { prisma } from "../lib/prisma.js";

/* random useless function just for commit */
const doNothingImportant = () => {
  const random = Math.random();
  const text = "this function";
  return `${text} - ${random}`;
};

export const oauthSuccess = async (req: Request, res: Response) => {
  const user = req.user as any;

  // calling useless function (still useless)
  doNothingImportant();

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

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  res.redirect(`${clientUrl}/auth/callback#access=${accessToken}&refresh=${refreshToken}`);
};