import app from "./app.js";
import { createServer } from "http";
import { setupWebSocketServer } from "./realtime/ws.server.js";
import { createRouter } from "./realtime/router.js";
import { registerWebRtcHandlers } from "./realtime/webrtc.handler.js";
import { sfuService } from "./realtime/services/sfu.service.js";
import { WebSocket } from "ws";

const PORT = 5000;

const server = createServer(app);

const wss = setupWebSocketServer(server);
const router = createRouter(wss);
registerWebRtcHandlers(router);

// ─── WebSocket Heartbeat ─────────────────────────────────
// Detect and close dead connections every 30 seconds.
// Without this, disconnected clients stay in memory forever.
const HEARTBEAT_INTERVAL = 30_000;
const aliveMap = new WeakMap<WebSocket, boolean>();

wss.on("connection", (ws: WebSocket) => {
  aliveMap.set(ws, true);
  ws.on("pong", () => aliveMap.set(ws, true));
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws: WebSocket) => {
    if (!aliveMap.get(ws)) {
      console.log("[WS] Terminating dead connection");
      ws.terminate();
      return;
    }
    aliveMap.set(ws, false);
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on("close", () => clearInterval(heartbeat));

// ─── Start Server ────────────────────────────────────────
sfuService.init().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket heartbeat: every ${HEARTBEAT_INTERVAL / 1000}s`);
  });
}).catch((err) => {
  console.error("Failed to start mediasoup worker:", err);
  process.exit(1);
});

// ─── Graceful Shutdown ───────────────────────────────────
// Clean up all resources before exiting
function gracefulShutdown(signal: string) {
  console.log(`\n[${signal}] Shutting down gracefully...`);

  // Stop accepting new connections
  clearInterval(heartbeat);

  // Close all WebSocket connections
  wss.clients.forEach((ws: WebSocket) => {
    ws.close(1001, "Server shutting down");
  });

  // Close HTTP server
  server.close(() => {
    console.log("[Shutdown] HTTP server closed");
    process.exit(0);
  });

  // Force exit after 5 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error("[Shutdown] Forced exit after timeout");
    process.exit(1);
  }, 5000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
