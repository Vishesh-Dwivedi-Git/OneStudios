import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

const JWT_SECRET: string = process.env.JWT_SECRET as string; // later move to env

export const register = async (req: Request, res: Response) => {
  const { email, name, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);
  console.log("Registering user:", email);
try {
  const user = await prisma.user.create({
    data: {
      username: name,
      email,
      password: hashed
    }
  });
  console.log("User created with ID:", user.id);
}

catch (err) {
   return res.status(500).json({ error: err});
  } 
  
return res.json({ message: "User created" });
  
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid creds" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid creds" });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET);

  return res.json({ token });
};
