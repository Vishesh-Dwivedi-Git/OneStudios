import type { WebSocket } from "ws";

export type PeerRole = "HOST" | "PARTICIPANT";
export type Peer = { peerId: string; userId: string; role: PeerRole; socket: WebSocket };

export class RoomService {
  private rooms = new Map<string, Peer[]>();

  addPeer(roomId: string, peer: Peer) {
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, []);
    const room = this.rooms.get(roomId)!;

    // If same peerId reconnects, replace socket instead of duplicating.
    const existing = room.find((p) => p.peerId === peer.peerId);
    if (existing) {
      existing.socket = peer.socket;
      existing.userId = peer.userId;
      existing.role = peer.role;
      return;
    }

    room.push(peer);
  }

  removePeer(roomId: string, peerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return [] as Peer[];
    const updated = room.filter((p) => p.peerId !== peerId);
    this.rooms.set(roomId, updated);
    return updated;
  }

  getPeers(roomId: string) {
    return this.rooms.get(roomId) ?? [];
  }

  isFull(roomId: string, maxPeers = 2) {
    return this.getPeers(roomId).length >= maxPeers;
  }

  broadcastToRoomExcept(roomId: string, senderId: string, message: unknown) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const payload = JSON.stringify(message);
    for (const peer of room) {
      if (peer.peerId !== senderId) {
        try {
          peer.socket.send(payload);
        } catch (e) {
          // ignore send errors; cleanup happens on close
        }
      }
    }
  }
}

export default RoomService;
