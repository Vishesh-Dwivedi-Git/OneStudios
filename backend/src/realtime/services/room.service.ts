import type { WebSocket } from "ws";

// ─── Types ──────────────────────────────────────────────
// These mirror the Prisma RoomRole enum but exist here so the
// in-memory layer doesn't import Prisma at runtime.
// HOST       → room creator, can mute/kick/end meeting
// CO_HOST    → delegated moderator powers
// PARTICIPANT → full voice/video, no admin powers
// VIEWER     → watch-only, can request to speak
export type PeerRole = "HOST" | "CO_HOST" | "PARTICIPANT" | "VIEWER";

// A single connected peer in a room.
// This is EPHEMERAL (in-memory only) — it tracks live WebSocket
// connections, not persistent data. When the server restarts,
// this Map is empty. Persistent room data lives in PostgreSQL.
export type Peer = {
  peerId: string;     // Random UUID assigned on WebSocket connect
  userId: string;     // From JWT — maps to User.id in Prisma
  role: PeerRole;     // Permission level in this room
  socket: WebSocket;  // Live WebSocket connection reference
};

// ─── Service ────────────────────────────────────────────
// RoomService manages the in-memory Map of active rooms.
//
// WHY IN-MEMORY AND NOT THE DATABASE?
// WebSocket connections (the `socket` field) can't be serialized
// to a database. We need instant access to send messages to
// specific peers. The DB stores *who was in the room* (history);
// this Map stores *who is connected right now* (live state).
//
// Data flow:
//   1. User joins → webrtc.handler validates via DB (room exists, user allowed)
//   2. If valid → addPeer() stores the live connection here
//   3. Messages are broadcast via this Map (offer/answer/ice/chat)
//   4. User disconnects → removePeer() cleans up
//   5. DB is updated separately (RoomParticipant.leftAt, etc.)

export class RoomService {
  private rooms = new Map<string, Peer[]>();

  // ── Add a peer to a room ──
  // If the same peerId reconnects (e.g. browser refresh),
  // we replace the socket instead of creating a duplicate.
  // This prevents ghost connections.
  addPeer(roomId: string, peer: Peer) {
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, []);
    const room = this.rooms.get(roomId)!;

    const existing = room.find((p) => p.peerId === peer.peerId);
    if (existing) {
      existing.socket = peer.socket;
      existing.userId = peer.userId;
      existing.role = peer.role;
      return;
    }

    room.push(peer);
  }

  // ── Remove a peer from a room ──
  // Returns the remaining peers so the caller can notify them.
  removePeer(roomId: string, peerId: string): Peer[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const updated = room.filter((p) => p.peerId !== peerId);
    if (updated.length === 0) {
      // Last person left → clean up the room from memory
      this.rooms.delete(roomId);
    } else {
      this.rooms.set(roomId, updated);
    }
    return updated;
  }

  // ── Remove a user from a room (all their connections) ──
  // Useful for kicking zombie connections for the same user.
  removeUserFromRoom(roomId: string, userId: string): Peer[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    // Find all peers for this user
    const userPeers = room.filter(p => p.userId === userId);

    // Close their sockets
    for (const peer of userPeers) {
      try { peer.socket.close(1000, "replaced by new connection"); } catch { }
    }

    // Update the room list
    const updated = room.filter(p => p.userId !== userId);
    if (updated.length === 0) {
      this.rooms.delete(roomId);
    } else {
      this.rooms.set(roomId, updated);
    }
    return updated;
  }

  // ── Get all connected peers in a room ──
  getPeers(roomId: string): Peer[] {
    return this.rooms.get(roomId) ?? [];
  }

  // ── Check if a room has reached its capacity ──
  // maxPeers comes from Room.maxParticipants in the DB.
  // The caller (webrtc.handler) fetches this from Prisma
  // and passes it here.
  isFull(roomId: string, maxPeers: number): boolean {
    return this.getPeers(roomId).length >= maxPeers;
  }

  // ── Send a message to ALL peers in a room except the sender ──
  // Used for: offer, answer, ice-candidate, peer-joined, peer-left,
  //           chat messages, presentation events, etc.
  broadcastToRoomExcept(roomId: string, senderId: string, message: unknown) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const payload = JSON.stringify(message);
    for (const peer of room) {
      if (peer.peerId !== senderId) {
        try {
          peer.socket.send(payload);
        } catch (e) {
          // Ignore send errors — cleanup happens on WebSocket 'close' event
        }
      }
    }
  }

  // ── Send a message to a SPECIFIC peer ──
  // Used for: targeted signaling in group calls (each peer needs
  // a separate offer/answer exchange with every other peer).
  // In mesh topology, when peer C joins a room with peers A and B:
  //   - C sends an offer to A (targeted)
  //   - C sends an offer to B (targeted)
  //   - A sends answer back to C (targeted)
  //   - B sends answer back to C (targeted)
  sendToPeer(roomId: string, targetPeerId: string, message: unknown): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const peer = room.find((p) => p.peerId === targetPeerId);
    if (!peer) return false;
    try {
      peer.socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  // ── Broadcast to ALL peers (including sender) ──
  // Used for: system messages ("Recording started", etc.) where
  // even the sender needs to see the message.
  broadcastToRoom(roomId: string, message: unknown) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const payload = JSON.stringify(message);
    for (const peer of room) {
      try {
        peer.socket.send(payload);
      } catch (e) {
        // Ignore — will be cleaned up on close
      }
    }
  }

  // ── Get count of connected peers ──
  getPeerCount(roomId: string): number {
    return this.getPeers(roomId).length;
  }

  // ── Check if a specific user is already in a room ──
  // Prevents the same user from joining twice from different tabs
  // (they'd get duplicate video streams otherwise).
  isUserInRoom(roomId: string, userId: string): boolean {
    return this.getPeers(roomId).some((p) => p.userId === userId);
  }
}

export default RoomService;
