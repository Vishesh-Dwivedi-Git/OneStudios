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
          role: "HOST" as const
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
  const roomId = req.params.id;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    return res.status(404).json({ message: "Room does not exist" });
  }

  await prisma.roomParticipant.create({
    data: {
      roomId,
      userId,
      role: "PARTICIPANT" as const,
      joinedAt: new Date(),
    }
  });

  return res.json({ message: `User ${userId} joined room ${req.params.id}` });
}

export const leaveRoom = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const roomId = req.params.id;

  //check if the user is in the room 
  const participant = await prisma.roomParticipant.findFirst({
    where: {
      roomId,
      userId
    }
  });

  if (!participant) {
    return res.status(400).json({ message: "User is not in the room" });
  }

  await prisma.roomParticipant.delete({
    where: {
      id: participant.id
    }
  });

  return res.json({ message: `User ${userId} left room ${req.params.id}` });
}
