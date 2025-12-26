import app from "./app.js";
import { createServer } from "http";
import { setupWebSocketServer } from "./realtime/ws.server.js";
import { createRouter } from "./realtime/router.js";
import { registerWebRtcHandlers } from "./realtime/webrtc.handler.js";

const PORT = 5000;

const server = createServer(app);

const wss = setupWebSocketServer(server);
const router = createRouter(wss);
// Register WebRTC (signaling) handlers in a separate module so
// `ws.server.ts` remains protocol-agnostic.
registerWebRtcHandlers(router);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
