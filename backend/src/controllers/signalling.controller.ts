import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";

const wss = new WebSocketServer({ port: 8080 });

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

wss.on("connection", (ws: WebSocket) => {
    const clientId = randomUUID();

    let currentRoomId: string | null = null;

    let currentRole: "guest" | "host" | null = null;

    // a message will arrive on the socket with this format in json
    // {
    //     type: "join" | "offer" | "answer" | "ice-candidate";
    //     roomId?: string;
    //     payload?: any;
    // }

    ws.on("message", (data: any) => {
        const message = JSON.parse(data.toString());

        //parse that msg to know what kind of msg is it
        if (message.type === "join" && message.roomId) {
            const roomId: string = message.roomId;
            currentRoomId = roomId;

            if (!rooms.has(roomId)) {
                rooms.set(roomId, []);
            }

            const room = rooms.get(roomId)!;
            room.push({ id: clientId, socket: ws });

            currentRole = room.length === 1 ? "host" : "guest";
            ws.send(
                JSON.stringify({ type: "role", role: currentRole, peerId: clientId })
            );

            // Important: only start negotiation once a second peer exists.
            if (room.length === 2) {
                broadcastToRoomExcept(room, clientId, { type: "peer-joined" });
            }
            
        }

        // Forward offer to other peer
        if (message.type === "offer" && currentRoomId) {
            const room = rooms.get(currentRoomId);
            if (room) {
                broadcastToRoomExcept(room, clientId, {
                    type: "offer",
                    payload: message.payload,
                });
            }
        }

        // Forward answer to other peer
        if (message.type === "answer" && currentRoomId) {
            const room = rooms.get(currentRoomId);
            if (room) {
                broadcastToRoomExcept(room, clientId, {
                    type: "answer",
                    payload: message.payload,
                });
            }
        }

        // Forward ICE candidate to other peer
        if (message.type === "ice-candidate" && currentRoomId) {
            const room = rooms.get(currentRoomId);
            if (room) {
                broadcastToRoomExcept(room, clientId, {
                    type: "ice-candidate",
                    payload: message.payload,
                });
            }
        }

    });

    ws.on("close", () => {
        if (currentRoomId) {
            const room = rooms.get(currentRoomId);
            if (room) {
                rooms.set(
                    currentRoomId,
                    room.filter((client) => client.id !== clientId)
                );
                //what does the block above do?
                // It removes the disconnected client from the room
                if (rooms.get(currentRoomId)!.length === 0) {
                    rooms.delete(currentRoomId);
                }
            }
        }
});
});
