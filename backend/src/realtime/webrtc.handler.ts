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
      console.log(`[JOIN] peerId=${ctx.peerId} userId=${ctx.userId} roomId=${roomId}`);

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, hostId: true, isActive: true, maxParticipants: true, type: true },
      });

      // Look up username
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { username: true },
      });
      ctx.username = user?.username || ctx.userId.slice(0, 8);
      console.log(`[JOIN] username=${ctx.username}`);

      if (!room) {
        console.log(`[JOIN] ERROR: room not found`);
        ctx.ws.send(JSON.stringify({ type: "error", message: "room not found" }));
        return;
      }
      if (!room.isActive) {
        console.log(`[JOIN] ERROR: meeting has ended`);
        ctx.ws.send(JSON.stringify({ type: "error", message: "meeting has ended" }));
        return;
      }
      if (roomService.isFull(roomId, room.maxParticipants)) {
        console.log(`[JOIN] ERROR: room full`);
        return ctx.ws.send(JSON.stringify({ type: "error", message: "room full" }));
      }

      // Handle re-connections
      if (roomService.isUserInRoom(roomId, ctx.userId)) {
        console.log(`[JOIN] User already in room, removing old connection`);

        // Get old peer IDs before removing
        const oldPeers = roomService.getPeers(roomId).filter(p => p.userId === ctx.userId);

        // Close SFU resources for old peer(s)
        const closedProducerIds: string[] = [];
        for (const oldPeer of oldPeers) {
          const producerIds = sfuService.closePeer(oldPeer.peerId);
          closedProducerIds.push(...producerIds);
        }

        roomService.removeUserFromRoom(roomId, ctx.userId);

        // Notify others with the closed producer IDs so they can clean up consumers
        roomService.broadcastToRoomExcept(roomId, ctx.peerId, {
          type: "peer-left", userId: ctx.userId,
          peerId: oldPeers[0]?.peerId, closedProducerIds,
          message: "connection replaced",
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
          console.log(`[JOIN] ERROR: not a participant — join via API first`);
          ctx.ws.send(JSON.stringify({ type: "error", message: "not a participant — join via API first" }));
          return;
        }
        role = participant.role as PeerRole;
      }

      // Register peer in-memory
      roomService.addPeer(roomId, {
        peerId: ctx.peerId, userId: ctx.userId!, username: ctx.username || ctx.userId.slice(0, 8), role,
        socket: ctx.ws as WebSocket,
      });
      ctx.roomId = roomId;
      ctx.role = role;

      // For GROUP rooms, initialize the SFU router
      if (room.type === "GROUP") {
        await sfuService.getOrCreateRouter(roomId);
      }

      console.log(`[JOIN] SUCCESS: role=${role} roomType=${room.type}`);

      // Tell joining peer their role + room type
      ctx.ws.send(JSON.stringify({
        type: "role", role, peerId: ctx.peerId, roomType: room.type, username: ctx.username,
      }));

      // Tell existing peers about new peer, and vice versa
      const allPeers = roomService.getPeers(roomId);
      console.log(`[JOIN] Total peers in room: ${allPeers.length}`);
      if (allPeers.length > 1) {
        roomService.broadcastToRoomExcept(roomId, ctx.peerId, {
          type: "peer-joined", peerId: ctx.peerId, userId: ctx.userId, username: ctx.username, role,
        });

        ctx.ws.send(JSON.stringify({
          type: "existing-peers",
          peers: allPeers
            .filter((p) => p.peerId !== ctx.peerId)
            .map((p) => ({ peerId: p.peerId, userId: p.userId, username: p.username, role: p.role })),
        }));

        // For GROUP rooms, notify of existing producers
        if (room.type === "GROUP") {
          const existingProducers: any[] = [];
          for (const peer of allPeers) {
            if (peer.peerId === ctx.peerId) continue;
            for (const prod of sfuService.getAllProducersForPeer(peer.peerId)) {
              existingProducers.push({
                producerId: prod.producerId, peerId: peer.peerId,
                userId: peer.userId, username: peer.username, kind: prod.kind,
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

  // Forward mute/camera state changes to other peers
  router.register("mute-state", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return;
    roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, {
      type: "mute-state",
      peerId: ctx.peerId,
      isAudioMuted: message.isAudioMuted,
      isVideoOff: message.isVideoOff,
    });
  });

  // Forward chat messages to all other peers
  router.register("chat-message", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return;
    roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, {
      type: "chat-message",
      sender: ctx.username || ctx.userId.slice(0, 8),
      text: message.text,
      timestamp: Date.now(),
    });
  });

  // Broadcast recording status to all peers
  router.register("recording-status", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId) return;
    roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, {
      type: "recording-status",
      isRecording: message.isRecording,
      recorder: ctx.username || ctx.userId.slice(0, 8),
    });
  });

  // Relay recording chunks P2P (group calls — pass-through, never stored)
  router.register("recording-chunk", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId || !message.targetPeerId) return;
    roomService.sendToPeer(ctx.roomId, message.targetPeerId, {
      type: "recording-chunk",
      fromPeerId: ctx.peerId,
      fromUsername: ctx.username || ctx.userId.slice(0, 8),
      chunkIndex: message.chunkIndex,
      totalChunks: message.totalChunks,
      data: message.data, // base64 encoded chunk
    });
  });

  // Notify initiator that a peer finished sending all recording chunks
  router.register("recording-complete", (ctx: ConnContext, message: any) => {
    if (!ctx.roomId || !message.targetPeerId) return;
    roomService.sendToPeer(ctx.roomId, message.targetPeerId, {
      type: "recording-complete",
      fromPeerId: ctx.peerId,
      fromUsername: ctx.username || ctx.userId.slice(0, 8),
      totalSize: message.totalSize,
    });
  });

  // Forward screen share status to remote peer (1:1)
  router.register("screen-share-started", (ctx: ConnContext) => {
    if (!ctx.roomId) return;
    roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, {
      type: "screen-share-started", fromPeerId: ctx.peerId,
    });
  });

  router.register("screen-share-stopped", (ctx: ConnContext) => {
    if (!ctx.roomId) return;
    roomService.broadcastToRoomExcept(ctx.roomId, ctx.peerId, {
      type: "screen-share-stopped", fromPeerId: ctx.peerId,
    });
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
      const producerId = await sfuService.produce(ctx.peerId, message.transportId, message.kind, message.rtpParameters, message.appData || {});
      ctx.ws.send(JSON.stringify({ type: "produced", producerId }));

      // Notify all other peers that a new producer is available
      roomService.broadcastToRoomExcept(ctx.roomId!, ctx.peerId, {
        type: "newProducer",
        producerId,
        peerId: ctx.peerId,
        userId: ctx.userId,
        username: ctx.username,
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
    console.log(`[DISCONNECT] peerId=${ctx.peerId} userId=${ctx.userId} roomId=${ctx.roomId}`);
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
