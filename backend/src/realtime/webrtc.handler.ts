import type { ConnContext, MessageHandler } from "./router.js";
import type { WebSocket } from "ws";
import RoomService, { type PeerRole } from "./services/room.service.js";
import { prisma } from "../lib/prisma.js";

/**
 * Register WebRTC signaling handlers on the provided router.
 * The router handles parsing and per-connection lifecycle; handlers should
 * be pure-ish and use services for mutable state.
 */

export function registerWebRtcHandlers(router: {
  register(type: string, handler: MessageHandler): void;
}) {
  const roomService = new RoomService();

  router.register("join", (ctx: ConnContext, message: any) => {
    const { roomId } = message;
    if (!roomId) return ctx.ws.send(JSON.stringify({ type: "error", message: "missing roomId" }));

    if (!ctx.userId) {
      ctx.ws.close(1008, "Not authenticated");
      return;
    }

    // Enforce 1:1 rooms for WebRTC demo/signaling (adjust later for group calls)
    if (roomService.isFull(roomId, 2)) {
      return ctx.ws.send(JSON.stringify({ type: "error", message: "room full" }));
    }

    // Validate in DB: room exists + user is allowed
    void (async () => {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, hostId: true },
      });

      if (!room) {
        ctx.ws.send(JSON.stringify({ type: "error", message: "room not found" }));
        return;
      }

      // Host is always allowed. Non-host must have a participant record.
      let role: PeerRole;
      if (room.hostId === ctx.userId) {
        role = "HOST";
      } else {
        const participant = await prisma.roomParticipant.findFirst({
          where: { roomId, userId: ctx.userId },
          select: { role: true },
        });

        if (!participant) {
          ctx.ws.send(JSON.stringify({ type: "error", message: "not a participant" }));
          return;
        }
        role = (participant.role as PeerRole) ?? "PARTICIPANT";
      }

      // register peer in in-memory room
      roomService.addPeer(roomId, {
        peerId: ctx.peerId,
        userId: ctx.userId!,
        role,
        socket: ctx.ws as WebSocket,
      });

      ctx.roomId = roomId;
      ctx.role = role;

      ctx.ws.send(JSON.stringify({ type: "role", role, peerId: ctx.peerId }));

      const peers = roomService.getPeers(roomId);
      if (peers.length === 2) {
        roomService.broadcastToRoomExcept(roomId, ctx.peerId, { type: "peer-joined" });
      }
    })().catch((e) => {
      console.error("webrtc: join failed", e);
      ctx.ws.send(JSON.stringify({ type: "error", message: "join failed" }));
    });
  });

  router.register("offer", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return ctx.ws.send(JSON.stringify({ type: "error", message: "not in room" }));
    roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, { type: "offer", payload: message.payload });
  });

  router.register("answer", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return ctx.ws.send(JSON.stringify({ type: "error", message: "not in room" }));
    roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, { type: "answer", payload: message.payload });
  });

  router.register("ice-candidate", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return ctx.ws.send(JSON.stringify({ type: "error", message: "not in room" }));
    roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, { type: "ice-candidate", payload: message.payload });
  });

  // When connection closes, remove peer and notify remaining peers
  router.register("disconnect", (ctx: ConnContext) => {
    if (!ctx.roomId) return;
    const updated = roomService.removePeer(ctx.roomId, ctx.peerId);
    for (const p of updated) {
      try {
        p.socket.send(JSON.stringify({ type: "peer-left" }));
      } catch (e) {
        // ignore
      }
    }
  });
}

export default registerWebRtcHandlers;
