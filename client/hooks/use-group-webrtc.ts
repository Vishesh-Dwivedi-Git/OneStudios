"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import * as mediasoupClient from "mediasoup-client";

// ─── Constants ──────────────────────────────────────────
const WS_URL = "ws://localhost:5000";

// ─── Types ──────────────────────────────────────────────
export type GroupCallState = "idle" | "joining" | "connected" | "disconnected" | "error";

export interface RemotePeer {
    peerId: string;
    userId: string;
    stream: MediaStream;
    isScreen?: boolean;
}

// ─── Hook ───────────────────────────────────────────────
export function useGroupWebRTC(roomId: string) {
    const [callState, setCallState] = useState<GroupCallState>("idle");
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [participantCount, setParticipantCount] = useState(1);

    const socketRef = useRef<WebSocket | null>(null);
    const deviceRef = useRef<mediasoupClient.Device | null>(null);
    const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
    const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
    const cleanedUpRef = useRef(false);

    // ── Helper: send JSON ──
    const send = useCallback((data: any) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(data));
        }
    }, []);

    // Consumer tracking: consumerId → { peerId, userId, consumer, isScreen }
    const consumersRef = useRef<
        Map<string, { peerId: string; userId: string; consumer: mediasoupClient.types.Consumer; isScreen?: boolean }>
    >(new Map());
    const toggleScreenShareRef = useRef<() => Promise<void>>(null as any);
    // Peer mapping: peerId → userId
    const peerMapRef = useRef<Map<string, string>>(new Map());
    // Store RTP capabilities after device load
    const rtpCapsRef = useRef<mediasoupClient.types.RtpCapabilities | null>(null);
    // Pending producers to consume (queued before device is ready)
    const pendingProducersRef = useRef<{ producerId: string; peerId: string; userId: string }[]>([]);

    // ── Rebuild remotePeers state from consumers ──
    const rebuildRemotePeers = useCallback(() => {
        if (cleanedUpRef.current) return;
        const peerStreams = new Map<string, { userId: string; stream: MediaStream; isScreen: boolean }>();

        for (const { peerId, userId, consumer, isScreen } of consumersRef.current.values()) {
            if (!peerStreams.has(peerId)) {
                peerStreams.set(peerId, { userId, stream: new MediaStream(), isScreen: false });
            }
            const entry = peerStreams.get(peerId)!;
            entry.stream.addTrack(consumer.track);
            if (isScreen) entry.isScreen = true;
        }

        const peers: RemotePeer[] = [];
        for (const [peerId, { userId, stream, isScreen }] of peerStreams.entries()) {
            peers.push({ peerId, userId, stream, isScreen });
        }
        setRemotePeers(peers);
        setParticipantCount(peers.length + 1);
    }, []);

    // ── Consume a remote producer ──
    const consumeProducer = useCallback(async (producerId: string, peerId: string, userId: string) => {
        if (!rtpCapsRef.current || !recvTransportRef.current) {
            // Device not ready yet, queue it
            pendingProducersRef.current.push({ producerId, peerId, userId });
            return;
        }

        try {
            send({ type: "consume", producerId, rtpCapabilities: rtpCapsRef.current });

            // Wait for EITHER "consumed" or "error" — prevents hanging promise
            const res = await new Promise<any>((resolve) => {
                const onMsg = (event: MessageEvent) => {
                    const msg = JSON.parse(event.data);
                    if (msg.type === "consumed" || msg.type === "error") {
                        socketRef.current?.removeEventListener("message", onMsg);
                        resolve(msg);
                    }
                };
                socketRef.current?.addEventListener("message", onMsg);
            });

            if (res.type === "error") {
                console.warn("Failed to consume producer:", producerId, res.message);
                return;
            }

            const consumer = await recvTransportRef.current!.consume({
                id: res.id,
                producerId: res.producerId,
                kind: res.kind,
                rtpParameters: res.rtpParameters,
                appData: res.appData,
            });

            consumersRef.current.set(consumer.id, {
                peerId,
                userId,
                consumer,
                isScreen: res.appData?.screen
            });
            peerMapRef.current.set(peerId, userId);
            rebuildRemotePeers();
        } catch (err) {
            console.warn("consumeProducer error for", producerId, err);
        }
    }, [rebuildRemotePeers, send]);

    useEffect(() => {
        if (!roomId) return;
        cleanedUpRef.current = false;

        let socket: WebSocket | null = null;

        // ── Helper: wait for specific message type (one-shot) ──
        function waitFor(type: string, match?: (msg: any) => boolean): Promise<any> {
            return new Promise((resolve) => {
                function onMsg(event: MessageEvent) {
                    const msg = JSON.parse(event.data);
                    if (msg.type === type && (!match || match(msg))) {
                        socket?.removeEventListener("message", onMsg);
                        resolve(msg);
                    }
                }
                socket?.addEventListener("message", onMsg);
            });
        }

        // ── Setup mediasoup Device + Transports ──
        async function setupDevice(rtpCapabilities: mediasoupClient.types.RtpCapabilities) {
            const device = new mediasoupClient.Device();
            await device.load({ routerRtpCapabilities: rtpCapabilities });
            deviceRef.current = device;
            rtpCapsRef.current = device.rtpCapabilities;

            // --- Send Transport ---
            send({ type: "createTransport", direction: "send" });
            const sendRes = await waitFor("transportCreated", (m) => m.direction === "send");

            const sendTransport = device.createSendTransport({
                id: sendRes.params.id,
                iceParameters: sendRes.params.iceParameters,
                iceCandidates: sendRes.params.iceCandidates,
                dtlsParameters: sendRes.params.dtlsParameters,
            });

            sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                send({ type: "connectTransport", transportId: sendTransport.id, dtlsParameters });
                waitFor("transportConnected", (m) => m.transportId === sendTransport.id)
                    .then(() => callback())
                    .catch(errback);
            });

            sendTransport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
                send({ type: "produce", transportId: sendTransport.id, kind, rtpParameters });
                waitFor("produced")
                    .then((msg) => callback({ id: msg.producerId }))
                    .catch(errback);
            });

            sendTransportRef.current = sendTransport;

            // --- Recv Transport ---
            send({ type: "createTransport", direction: "recv" });
            const recvRes = await waitFor("transportCreated", (m) => m.direction === "recv");

            const recvTransport = device.createRecvTransport({
                id: recvRes.params.id,
                iceParameters: recvRes.params.iceParameters,
                iceCandidates: recvRes.params.iceCandidates,
                dtlsParameters: recvRes.params.dtlsParameters,
            });

            recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                send({ type: "connectTransport", transportId: recvTransport.id, dtlsParameters });
                waitFor("transportConnected", (m) => m.transportId === recvTransport.id)
                    .then(() => callback())
                    .catch(errback);
            });

            recvTransportRef.current = recvTransport;

            // --- Produce local tracks ---
            if (localStreamRef.current) {
                const audio = localStreamRef.current.getAudioTracks()[0];
                const video = localStreamRef.current.getVideoTracks()[0];
                if (audio) await sendTransport.produce({ track: audio });
                if (video) await sendTransport.produce({ track: video });
            }

            // --- Consume any queued producers ---
            const pending = [...pendingProducersRef.current];
            pendingProducersRef.current = [];
            for (const p of pending) {
                await consumeProducer(p.producerId, p.peerId, p.userId);
            }
        }

        // ── Main Init ──
        async function init() {
            setCallState("joining");

            try {
                // 1. Register in DB
                try {
                    await apiRequest(`/rooms/${roomId}/join`, {});
                } catch (e: any) {
                    if (!e.message?.includes("Already")) throw e;
                }

                // 2. Get camera/mic
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
                if (!cleanedUpRef.current) setLocalStream(stream);

                // 3. Connect WebSocket — use ONLY addEventListener for message handling
                socket = new WebSocket(WS_URL);
                socketRef.current = socket;

                socket.addEventListener("open", () => {
                    if (!cleanedUpRef.current) send({ type: "join", roomId });
                });

                // Main message handler for signaling events
                socket.addEventListener("message", (event) => {
                    if (cleanedUpRef.current) return;
                    const msg = JSON.parse(event.data);

                    switch (msg.type) {
                        case "role":
                            setCallState("connected");
                            send({ type: "getRouterCapabilities" });
                            break;

                        case "routerCapabilities":
                            void setupDevice(msg.rtpCapabilities).catch((err) => {
                                console.error("setupDevice failed:", err);
                                if (!cleanedUpRef.current) {
                                    setCallState("error");
                                    setErrorMessage("Failed to initialize media device");
                                }
                            });
                            break;

                        case "peer-joined":
                            peerMapRef.current.set(msg.peerId, msg.userId);
                            break;

                        case "existingProducers":
                            for (const prod of msg.producers) {
                                void consumeProducer(prod.producerId, prod.peerId, prod.userId);
                            }
                            break;

                        case "newProducer":
                            void consumeProducer(msg.producerId, msg.peerId, msg.userId);
                            break;

                        case "producerClosed":
                            // Clean up local consumer for this producer
                            for (const [id, data] of consumersRef.current.entries()) {
                                if (data.consumer.producerId === msg.producerId) {
                                    data.consumer.close();
                                    consumersRef.current.delete(id);
                                }
                            }
                            rebuildRemotePeers();
                            break;

                        case "peer-left":
                            for (const [id, data] of consumersRef.current.entries()) {
                                if (data.peerId === msg.peerId) {
                                    data.consumer.close();
                                    consumersRef.current.delete(id);
                                }
                            }
                            peerMapRef.current.delete(msg.peerId);
                            rebuildRemotePeers();
                            break;

                        case "error":
                            // Only log — don't kill callState for non-fatal errors
                            // (consume failures, transport issues are handled individually)
                            console.warn("Signaling warning:", msg.message);
                            break;

                        // transportCreated, transportConnected, produced, consumed
                        // are handled by the waitFor() promises — no action needed here
                    }
                });

                socket.addEventListener("close", (event) => {
                    if (!cleanedUpRef.current && event.code !== 1000) setCallState("disconnected");
                });

                socket.addEventListener("error", () => {
                    if (!cleanedUpRef.current) {
                        setCallState("error");
                        setErrorMessage("WebSocket connection failed");
                    }
                });

            } catch (err: any) {
                if (!cleanedUpRef.current) {
                    setCallState("error");
                    setErrorMessage(
                        err.name === "NotAllowedError"
                            ? "Camera/Mic access denied"
                            : (err.message || "Failed to join")
                    );
                }
            }
        }

        init();

        return () => {
            cleanedUpRef.current = true;
            for (const { consumer } of consumersRef.current.values()) consumer.close();
            consumersRef.current.clear();
            sendTransportRef.current?.close();
            recvTransportRef.current?.close();
            if (socket && socket.readyState <= WebSocket.OPEN) socket.close(1000, "cleanup");
            socketRef.current = null;
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, send]);

    // ── Controls ──
    const toggleAudio = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) { track.enabled = !track.enabled; setIsAudioMuted(!track.enabled); }
    }, []);

    const toggleVideo = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled); }
    }, []);

    const endCall = useCallback(() => {
        screenProducerRef.current?.close();
        sendTransportRef.current?.close();
        recvTransportRef.current?.close();
        socketRef.current?.close();
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        window.location.href = "/";
    }, []);

    const toggleScreenShare = useCallback(async () => {
        const sendTransport = sendTransportRef.current;
        if (!sendTransport) return;

        if (isScreenSharing) {
            // Stop screen share
            if (screenProducerRef.current) {
                const producerId = screenProducerRef.current.id;
                screenProducerRef.current.close();
                screenProducerRef.current = null;
                send({ type: "closeProducer", producerId });
            }
            setIsScreenSharing(false);
        } else {
            // Start screen share
            if (!navigator.mediaDevices?.getDisplayMedia) {
                setErrorMessage("Screen sharing is not supported in this browser or requires a secure (HTTPS/localhost) connection.");
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const track = stream.getVideoTracks()[0];

                const producer = await sendTransport.produce({ track, appData: { screen: true } });
                screenProducerRef.current = producer;
                setIsScreenSharing(true);

                track.onended = () => {
                    void toggleScreenShareRef.current();
                };
            } catch (err: any) {
                console.error("Screen share failed:", err);
                if (err.name === "NotAllowedError") {
                    setErrorMessage("Screen share permission denied. Please allow screen access in your browser.");
                } else {
                    setErrorMessage("Failed to start screen share: " + (err.message || "Unknown error"));
                }
            }
        }
    }, [isScreenSharing, send]);

    useEffect(() => {
        toggleScreenShareRef.current = toggleScreenShare;
    }, [toggleScreenShare]);

    return {
        callState,
        localStream,
        remotePeers,
        participantCount,
        isAudioMuted,
        isVideoOff,
        isScreenSharing,
        errorMessage,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        endCall,
    };
}
