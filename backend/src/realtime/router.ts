import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import type { IncomingMessage } from "http";
import jwt from "jsonwebtoken";

export type ConnContext = {
	ws: WebSocket;
	peerId: string;
	userId: string;
	roomId: string | null;
	role: "HOST" | "PARTICIPANT" | null;
};

export type MessageHandler = (ctx: ConnContext, message: any) => void | Promise<void>;

export function createRouter(wss: WebSocketServer) {
	const handlers = new Map<string, MessageHandler>();

	wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
		const peerId = randomUUID();
		const userId = authenticateConnection(req);
		if (!userId) {
			ws.close(1008, "Not authenticated");
			return;
		}

		const ctx: ConnContext = { ws, peerId, userId, roomId: null, role: null };

		ws.on("message", async (data: Buffer) => {
			try {
				const msg = JSON.parse(data.toString());

				const handler = handlers.get(msg.type);
				if (!handler) {
					ws.send(JSON.stringify({ type: "error", message: "unknown message type" }));
					return;
				}

				// handlers may update ctx (roomId/role)
				await handler(ctx, msg);
			} catch (err) {
				console.error("router: failed to handle message", err);
				ws.send(JSON.stringify({ type: "error", message: "invalid message" }));
			}
		});

		ws.on("close", () => {
			// allow handlers to decide how to react on close (they can listen to ws 'close')
			// emit a generic event to any registered 'disconnect' handler
			const handler = handlers.get("disconnect");
			if (handler) {
				const result = handler(ctx, { type: "disconnect" });
				if (result instanceof Promise) {
					result.catch((e) => console.error(e));
				}
			}
		});
	});

	return {
		register(type: string, handler: MessageHandler) {
			handlers.set(type, handler);
		},
	};
}

function authenticateConnection(req: IncomingMessage): string | null {
	const token =
		extractAccessTokenFromCookies(req.headers.cookie) ??
		extractTokenFromQuery(req.url);
	if (!token) return null;

	try {
		const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as any;
		return typeof decoded?.userId === "string" ? decoded.userId : null;
	} catch {
		return null;
	}
}

function extractTokenFromQuery(url?: string): string | null {
	if (!url) return null;
	try {
		const u = new URL(url, "http://localhost");
		const token = u.searchParams.get("token");
		return token && token.length > 0 ? token : null;
	} catch {
		return null;
	}
}

function extractAccessTokenFromCookies(cookieHeader?: string): string | null {
	if (!cookieHeader) return null;
	// minimal cookie parsing: "a=b; accessToken=...; c=d"
	const parts = cookieHeader.split(";");
	for (const part of parts) {
		const [rawKey, ...rest] = part.trim().split("=");
		if (!rawKey) continue;
		if (rawKey === "accessToken") {
			const value = rest.join("=");
			return value ? decodeURIComponent(value) : null;
		}
	}
	return null;
}
