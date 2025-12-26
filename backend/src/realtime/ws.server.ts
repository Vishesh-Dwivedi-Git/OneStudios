import { WebSocketServer } from "ws";

/**
 * This file's responsibility is only to create/attach and export the WSS instance.
 * WebRTC or application-specific message handling should be implemented in
 * separate handler modules and imported/wired where appropriate (for example
 * in `backend/src/index.ts`).
 */

export function setupWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });

  // Keep this file focused: no protocol-specific handlers here.
  wss.on("listening", () => {
    console.log("WebSocket server attached to HTTP server");
  });

  return wss;
}
