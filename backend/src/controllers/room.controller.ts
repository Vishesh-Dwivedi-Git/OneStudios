import { prisma } from "../lib/prisma.js";
import type { Request, Response } from "express";
import { randomBytes } from "crypto";

// ─── Helper ─────────────────────────────────────────────
// Generates a short, human-friendly invite code.
// Uses base36 (0-9 + a-z) for readability. 6 chars = 2.1 billion combos.
// Example output: "a7k3m2"
function generateInviteCode(): string {
  return randomBytes(4).toString("hex").slice(0, 6);
}

// Default max participants per room type.
// These are sensible defaults; the host can override on creation.
const DEFAULT_MAX_PARTICIPANTS: Record<string, number> = {
  ONE_TO_ONE: 2,
  GROUP: 10,
  VIRTUAL_ROOM: 20,
};

// ─── CREATE ROOM ────────────────────────────────────────
// POST /rooms
// Body: { name?, type?, maxParticipants?, scheduledAt? }
//
// LOGIC:
// 1. Extract the authenticated user's ID (set by auth middleware)
// 2. Determine maxParticipants based on room type (or use provided value)
// 3. Generate a unique invite code for shareable links
// 4. Create the room in DB with the host as the first participant
// 5. Return the room object including the invite code
export const createRoom = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const {
    name,
    type = "ONE_TO_ONE",
    maxParticipants,
    scheduledAt,
  } = req.body;

  // Use provided max or fall back to the default for this room type
  const effectiveMax = maxParticipants ?? DEFAULT_MAX_PARTICIPANTS[type] ?? 2;

  try {
    const room = await prisma.room.create({
      data: {
        name: name || null,
        type,
        maxParticipants: effectiveMax,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        inviteCode: generateInviteCode(),
        hostId: userId,
        // Automatically add the creator as a HOST participant
        participants: {
          create: {
            userId,
            role: "HOST",
          },
        },
      },
      // Return the full room with participant details
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    console.log(`Room created: ${room.id} (type: ${room.type}, invite: ${room.inviteCode})`);
    return res.status(201).json(room);
  } catch (err) {
    console.error("Failed to create room:", err);
    return res.status(500).json({ error: "Failed to create room" });
  }
};

// ─── GET ROOM ───────────────────────────────────────────
// GET /rooms/:id
//
// Returns full room details including all participants.
// Used when the frontend loads the call page.
export const getRoom = async (req: Request, res: Response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        host: {
          select: { id: true, username: true, avatar: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    return res.json(room);
  } catch (err) {
    console.error("Failed to get room:", err);
    return res.status(500).json({ error: "Failed to get room" });
  }
};

// ─── JOIN ROOM (by ID) ──────────────────────────────────
// POST /rooms/:id/join
//
// LOGIC:
// 1. Check if room exists and is still active
// 2. Check if room is full (compare participant count vs maxParticipants)
// 3. Check if user is already in the room (prevent duplicates)
// 4. If all good → create a RoomParticipant record with PARTICIPANT role
//
// WHY PARTICIPANT role by default?
// When someone joins via link/invite, they get PARTICIPANT (full voice/video).
// The host can later downgrade them to VIEWER or promote to CO_HOST.
// For VIRTUAL_ROOM type, we might default to VIEWER in the future
// (attendees watch until host enables them).
export const joinRoom = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const roomId = req.params.id;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        _count: {
          select: {
            // Only count ACTIVE participants (not ones who already left)
            participants: { where: { leftAt: null } },
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!room.isActive) {
      return res.status(400).json({ message: "This meeting has ended" });
    }

    // Check if user is already a participant FIRST —
    // they should always be allowed to re-join regardless of room capacity
    const existingParticipant = await prisma.roomParticipant.findFirst({
      where: { roomId, userId, leftAt: null },
    });

    if (existingParticipant) {
      return res.json({ message: "Already in this room", participant: existingParticipant });
    }

    // Only check capacity for genuinely NEW participants
    if (room._count.participants >= room.maxParticipants) {
      return res.status(400).json({ message: "Room is full" });
    }

    const participant = await prisma.roomParticipant.create({
      data: {
        roomId,
        userId,
        role: "PARTICIPANT",
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    return res.status(201).json(participant);
  } catch (err) {
    console.error("Failed to join room:", err);
    return res.status(500).json({ error: "Failed to join room" });
  }
};

// ─── JOIN ROOM (by Invite Code) ─────────────────────────
// POST /rooms/join/:inviteCode
//
// This is the shareable link flow:
// User receives a link like `onestudio.app/join/a7k3m2`
// Frontend calls this endpoint to join using the invite code
// Same validation as joinRoom, but lookup is by inviteCode instead of ID.
export const joinByInviteCode = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { inviteCode } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { inviteCode },
      include: {
        _count: {
          select: {
            participants: { where: { leftAt: null } },
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    if (!room.isActive) {
      return res.status(400).json({ message: "This meeting has ended" });
    }

    // Check if user is already a participant FIRST
    const existingParticipant = await prisma.roomParticipant.findFirst({
      where: { roomId: room.id, userId, leftAt: null },
    });

    if (existingParticipant) {
      return res.json({ message: "Already in this room", roomId: room.id, participant: existingParticipant });
    }

    // Only check capacity for genuinely NEW participants
    if (room._count.participants >= room.maxParticipants) {
      return res.status(400).json({ message: "Room is full" });
    }

    const participant = await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId,
        role: "PARTICIPANT",
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    return res.status(201).json({ roomId: room.id, participant });
  } catch (err) {
    console.error("Failed to join by invite:", err);
    return res.status(500).json({ error: "Failed to join room" });
  }
};

// ─── LEAVE ROOM ─────────────────────────────────────────
// POST /rooms/:id/leave
//
// LOGIC:
// 1. Find the user's active participation (where leftAt is null)
// 2. Set leftAt to now — we don't DELETE the record because we
//    want to keep the history (who was in the meeting, when they left)
// 3. If the host leaves, we could either:
//    a) End the meeting (current approach)
//    b) Transfer host to a co-host or next participant (future)
export const leaveRoom = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const roomId = req.params.id;

  try {
    // Find the user's active participation
    const participant = await prisma.roomParticipant.findFirst({
      where: { roomId, userId, leftAt: null },
    });

    if (!participant) {
      return res.status(400).json({ message: "Not in this room" });
    }

    // Mark as left (don't delete — preserve history)
    await prisma.roomParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
    });

    return res.json({ message: "Left the room" });
  } catch (err) {
    console.error("Failed to leave room:", err);
    return res.status(500).json({ error: "Failed to leave room" });
  }
};

// ─── END ROOM ───────────────────────────────────────────
// POST /rooms/:id/end
//
// Only the HOST can end a meeting. This:
// 1. Sets isActive=false and endedAt=now on the Room
// 2. Sets leftAt=now on ALL remaining participants
// The WebSocket handler will separately notify all connected
// peers to disconnect.
export const endRoom = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const roomId = req.params.id;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Only the host can end the meeting
    if (room.hostId !== userId) {
      return res.status(403).json({ message: "Only the host can end the meeting" });
    }

    const now = new Date();

    // Use a transaction to ensure both updates happen atomically
    await prisma.$transaction([
      // Mark the room as ended
      prisma.room.update({
        where: { id: roomId },
        data: { isActive: false, endedAt: now },
      }),
      // Mark all remaining participants as left
      prisma.roomParticipant.updateMany({
        where: { roomId, leftAt: null },
        data: { leftAt: now },
      }),
    ]);

    return res.json({ message: "Meeting ended" });
  } catch (err) {
    console.error("Failed to end room:", err);
    return res.status(500).json({ error: "Failed to end meeting" });
  }
};

// ─── LIST USER'S ROOMS ──────────────────────────────────
// GET /rooms
// Query: ?active=true  → only active rooms
//        ?active=false → only ended rooms (history)
//        (no param)    → all rooms
//
// Returns rooms where the user is either host or participant.
// Sorted by most recent first.
export const getUserRooms = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const activeFilter = req.query.active;

  try {
    // Build the where clause dynamically
    const where: any = {
      OR: [
        { hostId: userId },
        { participants: { some: { userId } } },
      ],
    };

    if (activeFilter === "true") where.isActive = true;
    if (activeFilter === "false") where.isActive = false;

    const rooms = await prisma.room.findMany({
      where,
      include: {
        host: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json(rooms);
  } catch (err) {
    console.error("Failed to list rooms:", err);
    return res.status(500).json({ error: "Failed to list rooms" });
  }
};
