import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { randomUUID } from "crypto";

interface Client {
  id: string;
  socket: WebSocket;
}

const rooms = new Map<string, Client[]>();

function broadcastToRoomExcept(
  room: Client[],
  senderId: string,
  message: unknown
) {
  const payload = JSON.stringify(message);
  for (const client of room) {
    if (client.id !== senderId) {
      client.socket.send(payload);
    }
  }
}

export function setupWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
    const clientId = randomUUID();
    let currentRoomId: string | null = null;
    let currentRole: "guest" | "host" | null = null;

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "join" && message.roomId) {
          const roomId: string = message.roomId;
          currentRoomId = roomId;

          if (!rooms.has(roomId)) {
            rooms.set(roomId, []);
          }

          const room = rooms.get(roomId)!;
          room.push({ id: clientId, socket: ws });

          currentRole = room.length === 1 ? "host" : "guest";
          ws.send(JSON.stringify({ type: "role", role: currentRole, peerId: clientId }));

          if (room.length === 2) {
            broadcastToRoomExcept(room, clientId, { type: "peer-joined" });
          }
        }

        if (message.type === "offer" && currentRoomId) {
          const room = rooms.get(currentRoomId);
          if (room) {
            broadcastToRoomExcept(room, clientId, {
              type: "offer",
              payload: message.payload,
            });
          }
        }

        if (message.type === "answer" && currentRoomId) {
          const room = rooms.get(currentRoomId);
          if (room) {
            broadcastToRoomExcept(room, clientId, {
              type: "answer",
              payload: message.payload,
            });
          }
        }

        if (message.type === "ice-candidate" && currentRoomId) {
          const room = rooms.get(currentRoomId);
          if (room) {
            broadcastToRoomExcept(room, clientId, {
              type: "ice-candidate",
              payload: message.payload,
            });
          }
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    ws.on("close", () => {
      if (currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          const updatedRoom = room.filter((client) => client.id !== clientId);
          rooms.set(currentRoomId, updatedRoom);

          // Notify remaining peer
          for (const client of updatedRoom) {
            client.socket.send(JSON.stringify({ type: "peer-left" }));
          }
        }
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  console.log("WebSocket server attached to HTTP server");
}
