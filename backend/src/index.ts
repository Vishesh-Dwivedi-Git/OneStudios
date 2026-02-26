import app from "./app.js";
import { createServer } from "http";
import { setupWebSocketServer } from "./realtime/ws.server.js";
import { createRouter } from "./realtime/router.js";
import { registerWebRtcHandlers } from "./realtime/webrtc.handler.js";
import { sfuService } from "./realtime/services/sfu.service.js";

const PORT = 5000;

const server = createServer(app);

const wss = setupWebSocketServer(server);
const router = createRouter(wss);
// Register WebRTC (signaling) handlers in a separate module so
// `ws.server.ts` remains protocol-agnostic.
registerWebRtcHandlers(router);

// Initialize mediasoup SFU worker, then start serving
sfuService.init().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start mediasoup worker:", err);
  process.exit(1);
});
