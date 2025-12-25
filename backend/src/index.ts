import app from "./app.js";
import { createServer } from "http";
import { setupWebSocketServer } from "./realtime/ws.server.js";

const PORT = 5000;

const server = createServer(app);

setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
