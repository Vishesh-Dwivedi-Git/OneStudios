import { prisma } from "../lib/prisma.js"
import type { Request, Response } from "express";

export const createRoom = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { type } = req.body;
  console.log("Creating room for user:", userId);

  try{
     const room = await prisma.room.create({
    data: {
      type,
      hostId: userId,
      participants: {
        create: {
          userId,
          role: "HOST"
        }
      }
    }
  })
  console.log("Room created with ID:", room.id);
  return res.json(room);
  }
  catch(err){
    return res.status(500).json({ error: err});
  }
};

export const getRoom = async (req: Request, res: Response) => {
  console.log("Fetching room with ID:", req.params.id);
  const room = await prisma.room.findUnique({
    where: { id: req.params.id },
    include: {
      participants: {
        include: { user: true }
      }
    }
  });
};

export const joinRoom = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  return res.json({ message: `User ${userId} joined room ${req.params.id}` });
}
