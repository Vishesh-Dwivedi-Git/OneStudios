import type { ConnContext, MessageHandler } from "./router.js";
import type { WebSocket } from "ws";
import RoomService, { type PeerRole } from "./services/room.service.js";
import { sfuService } from "./services/sfu.service.js";
import { prisma } from "../lib/prisma.js";

// ─── WebRTC Signaling Handlers ──────────────────────────
//
// This file handles TWO signaling flows:
//
// 1. PEER-TO-PEER (1:1 calls) — offer/answer/ice-candidate
// 2. SFU (group calls via mediasoup) —
//    getRouterCapabilities, createTransport, connectTransport,
//    produce, consume

export function registerWebRtcHandlers(router: {
  register(type: string, handler: MessageHandler): void;
}) {
  const roomService = new RoomService();

  // ── JOIN (shared: both 1:1 and group) ────────────
  router.register("join", (ctx: ConnContext, message: any) => {
    const { roomId } = message;
    if (!roomId) return ctx.ws.send(JSON.stringify({ type: "error", message: "missing roomId" }));

    if (!ctx.userId) {
      ctx.ws.close(1008, "Not authenticated");
      return;
    }

    void (async () => {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, hostId: true, isActive: true, maxParticipants: true, type: true },
      });

      if (!room) {
        ctx.ws.send(JSON.stringify({ type: "error", message: "room not found" }));
        return;
      }
      if (!room.isActive) {
        ctx.ws.send(JSON.stringify({ type: "error", message: "meeting has ended" }));
        return;
      }
      if (roomService.isFull(roomId, room.maxParticipants)) {
        return ctx.ws.send(JSON.stringify({ type: "error", message: "room full" }));
      }

      // Handle re-connections
      if (roomService.isUserInRoom(roomId, ctx.userId)) {
        roomService.removeUserFromRoom(roomId, ctx.userId);
        roomService.broadcastToRoomExcept(roomId, ctx.peerId, {
          type: "peer-left", userId: ctx.userId, message: "connection replaced",
        });
      }

      // Determine role
      let role: PeerRole;
      if (room.hostId === ctx.userId) {
        role = "HOST";
      } else {
        const participant = await prisma.roomParticipant.findFirst({
          where: { roomId, userId: ctx.userId, leftAt: null },
          select: { role: true },
        });
        if (!participant) {
          ctx.ws.send(JSON.stringify({ type: "error", message: "not a participant — join via API first" }));
          return;
        }
        role = participant.role as PeerRole;
      }

      // Register peer in-memory
      roomService.addPeer(roomId, {
        peerId: ctx.peerId, userId: ctx.userId!, role,
        socket: ctx.ws as WebSocket,
      });
      ctx.roomId = roomId;
      ctx.role = role;

      // For GROUP rooms, initialize the SFU router
      if (room.type === "GROUP") {
        await sfuService.getOrCreateRouter(roomId);
      }

      // Tell joining peer their role + room type
      ctx.ws.send(JSON.stringify({
        type: "role", role, peerId: ctx.peerId, roomType: room.type,
      }));

      // Tell existing peers about new peer, and vice versa
      const allPeers = roomService.getPeers(roomId);
      if (allPeers.length > 1) {
        roomService.broadcastToRoomExcept(roomId, ctx.peerId, {
          type: "peer-joined", peerId: ctx.peerId, userId: ctx.userId, role,
        });

        ctx.ws.send(JSON.stringify({
          type: "existing-peers",
          peers: allPeers
            .filter((p) => p.peerId !== ctx.peerId)
            .map((p) => ({ peerId: p.peerId, userId: p.userId, role: p.role })),
        }));

        // For GROUP rooms, notify of existing producers
        if (room.type === "GROUP") {
          const existingProducers: any[] = [];
          for (const peer of allPeers) {
            if (peer.peerId === ctx.peerId) continue;
            for (const prod of sfuService.getAllProducersForPeer(peer.peerId)) {
              existingProducers.push({
                producerId: prod.producerId, peerId: peer.peerId,
                userId: peer.userId, kind: prod.kind,
              });
            }
          }
          if (existingProducers.length > 0) {
            ctx.ws.send(JSON.stringify({ type: "existingProducers", producers: existingProducers }));
          }
        }
      }
    })().catch((e) => {
      console.error("webrtc: join failed", e);
      ctx.ws.send(JSON.stringify({ type: "error", message: "join failed" }));
    });
  });

  // ══════════════════════════════════════════════════
  // 1:1 SIGNALING (peer-to-peer RTCPeerConnection)
  // ══════════════════════════════════════════════════

  router.register("offer", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return;
    if (message.targetPeerId) {
      roomService.sendToPeer(ctx.roomId, message.targetPeerId, {
        type: "offer", payload: message.payload, fromPeerId: ctx.peerId,
      });
    } else {
      roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, {
        type: "offer", payload: message.payload, fromPeerId: ctx.peerId,
      });
    }
  });

  router.register("answer", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return;
    if (message.targetPeerId) {
      roomService.sendToPeer(ctx.roomId, message.targetPeerId, {
        type: "answer", payload: message.payload, fromPeerId: ctx.peerId,
      });
    } else {
      roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, {
        type: "answer", payload: message.payload, fromPeerId: ctx.peerId,
      });
    }
  });

  router.register("ice-candidate", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return;
    if (message.targetPeerId) {
      roomService.sendToPeer(ctx.roomId, message.targetPeerId, {
        type: "ice-candidate", payload: message.payload, fromPeerId: ctx.peerId,
      });
    } else {
      roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, {
        type: "ice-candidate", payload: message.payload, fromPeerId: ctx.peerId,
      });
    }
  });

  // ══════════════════════════════════════════════════
  // SFU SIGNALING (mediasoup group calls)
  // ══════════════════════════════════════════════════

  router.register("getRouterCapabilities", (ctx: ConnContext) => {
    if (!ctx.roomId) return;
    const caps = sfuService.getRouterCapabilities(ctx.roomId);
    ctx.ws.send(JSON.stringify({ type: "routerCapabilities", rtpCapabilities: caps }));
  });

  router.register("createTransport", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return;
    void (async () => {
      const params = await sfuService.createTransport(ctx.roomId!, ctx.peerId, message.direction);
      ctx.ws.send(JSON.stringify({ type: "transportCreated", direction: message.direction, params }));
    })().catch((e) => {
      console.error("createTransport failed:", e);
      ctx.ws.send(JSON.stringify({ type: "error", message: "createTransport failed" }));
    });
  });

  router.register("connectTransport", (ctx: ConnContext, message: any) => {
    void (async () => {
      await sfuService.connectTransport(ctx.peerId, message.transportId, message.dtlsParameters);
      ctx.ws.send(JSON.stringify({ type: "transportConnected", transportId: message.transportId }));
    })().catch((e) => {
      console.error("connectTransport failed:", e);
      ctx.ws.send(JSON.stringify({ type: "error", message: "connectTransport failed" }));
    });
  });

  router.register("produce", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return;
    void (async () => {
      const producerId = await sfuService.produce(ctx.peerId, message.transportId, message.kind, message.rtpParameters);
      ctx.ws.send(JSON.stringify({ type: "produced", producerId }));

      // Notify all other peers that a new producer is available
      roomService.broadcastToRoomExcept(ctx.roomId!, ctx.peerId, {
        type: "newProducer",
        producerId,
        peerId: ctx.peerId,
        userId: ctx.userId,
        kind: message.kind,
        appData: message.appData,
      });
    })().catch((e) => {
      console.error("produce failed:", e);
      ctx.ws.send(JSON.stringify({ type: "error", message: "produce failed" }));
    });
  });

  router.register("closeProducer", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return;
    void (async () => {
      await sfuService.closeProducer(ctx.peerId, message.producerId);

      // Notify others
      roomService.broadcastToRoomExcept(ctx.roomId!, ctx.peerId, {
        type: "producerClosed",
        peerId: ctx.peerId,
        producerId: message.producerId,
      });
    })().catch((e) => {
      console.error("closeProducer failed:", e);
    });
  });

  router.register("consume", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return;
    void (async () => {
      const data = await sfuService.consume(ctx.roomId!, ctx.peerId, message.producerId, message.rtpCapabilities);
      if (!data) {
        ctx.ws.send(JSON.stringify({ type: "error", message: "cannot consume" }));
        return;
      }
      ctx.ws.send(JSON.stringify({ type: "consumed", ...data }));
    })().catch((e) => {
      console.error("consume failed:", e);
      ctx.ws.send(JSON.stringify({ type: "error", message: "consume failed" }));
    });
  });

  // ── DISCONNECT (shared: both 1:1 and group) ──────
  router.register("disconnect", (ctx: ConnContext) => {
    if (!ctx.roomId) return;

    // Clean up SFU resources
    const closedProducerIds = sfuService.closePeer(ctx.peerId);

    // Remove from in-memory room
    const remaining = roomService.removePeer(ctx.roomId, ctx.peerId);

    // Notify remaining peers
    for (const p of remaining) {
      try {
        p.socket.send(JSON.stringify({
          type: "peer-left", peerId: ctx.peerId, userId: ctx.userId, closedProducerIds,
        }));
      } catch (e) { /* ignore */ }
    }

    // If room is empty, clean up SFU router
    if (remaining.length === 0) {
      sfuService.closeRoom(ctx.roomId);
    }

    // Update DB
    void prisma.roomParticipant.updateMany({
      where: { roomId: ctx.roomId, userId: ctx.userId, leftAt: null },
      data: { leftAt: new Date() },
    }).catch((e) => console.error("Failed to update participant leftAt:", e));
  });
}

export default registerWebRtcHandlers;
