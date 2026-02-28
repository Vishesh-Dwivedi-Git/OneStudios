"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import * as mediasoupClient from "mediasoup-client";
import { useVirtualBackground, BackgroundMode } from "./use-virtual-background";

// ─── Constants ──────────────────────────────────────────
const WS_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/^http/, "ws");

// ─── Types ──────────────────────────────────────────────
export type GroupCallState = "idle" | "joining" | "connected" | "disconnected" | "error";

export interface RemotePeer {
    peerId: string;
    userId: string;
    stream: MediaStream;
    isScreen?: boolean;
    isAudioMuted?: boolean;
    isVideoOff?: boolean;
}

// ─── Hook ───────────────────────────────────────────────
export function useGroupWebRTC(roomId: string) {
    const [callState, setCallState] = useState<GroupCallState>("idle");
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [rawVideoTrack, setRawVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string; timestamp: number; isLocal?: boolean }[]>([]);
    const [remoteRecording, setRemoteRecording] = useState<{ isRecording: boolean; recorder: string } | null>(null);
    const [participantCount, setParticipantCount] = useState(1);
    const [localUsername, setLocalUsername] = useState<string>("You");
    const [incomingReaction, setIncomingReaction] = useState<{ emoji: string; sender: string } | null>(null);
    const [incomingDrawPoint, setIncomingDrawPoint] = useState<any>(null);
    const [incomingClear, setIncomingClear] = useState(false);
    const [incomingE2EKey, setIncomingE2EKey] = useState<JsonWebKey | null>(null);

    const {
        processedTrack,
        backgroundMode,
        setBackgroundMode,
        backgroundImageUrl,
        setBackgroundImageUrl,
    } = useVirtualBackground(rawVideoTrack);

    const setVirtualBackground = useCallback((mode: BackgroundMode, url?: string) => {
        setBackgroundMode(mode);
        if (url) setBackgroundImageUrl(url);
    }, [setBackgroundMode, setBackgroundImageUrl]);

    const socketRef = useRef<WebSocket | null>(null);
    const deviceRef = useRef<mediasoupClient.Device | null>(null);
    const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
    const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
    const cleanedUpRef = useRef(false);
    const localPeerIdRef = useRef<string | null>(null);
    const effectIdRef = useRef(0);

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
    // Peer mapping: peerId → { userId, username }
    const peerMapRef = useRef<Map<string, { userId: string; username: string }>>(new Map());
    // Store RTP capabilities after device load
    const rtpCapsRef = useRef<mediasoupClient.types.RtpCapabilities | null>(null);
    // Pending producers to consume (queued before device is ready)
    const pendingProducersRef = useRef<{ producerId: string; peerId: string; userId: string }[]>([]);
    // Remote peer mute states
    const remoteMuteStatesRef = useRef<Map<string, { isAudioMuted: boolean; isVideoOff: boolean }>>(new Map());

    // ── Rebuild remotePeers state from consumers ──
    const rebuildRemotePeers = useCallback(() => {
        if (cleanedUpRef.current) return;

        const cameraStreams = new Map<string, { userId: string; stream: MediaStream }>();
        const screenStreams = new Map<string, { userId: string; stream: MediaStream }>();

        for (const { peerId, userId, consumer, isScreen } of consumersRef.current.values()) {
            if (isScreen) {
                const key = `${peerId}:screen`;
                if (!screenStreams.has(key)) {
                    screenStreams.set(key, { userId, stream: new MediaStream() });
                }
                screenStreams.get(key)!.stream.addTrack(consumer.track);
            } else {
                if (!cameraStreams.has(peerId)) {
                    cameraStreams.set(peerId, { userId, stream: new MediaStream() });
                }
                cameraStreams.get(peerId)!.stream.addTrack(consumer.track);
            }
        }

        const peers: RemotePeer[] = [];
        for (const [peerId, { userId, stream }] of cameraStreams.entries()) {
            const muteState = remoteMuteStatesRef.current.get(peerId);
            peers.push({
                peerId, userId, stream, isScreen: false,
                isAudioMuted: muteState?.isAudioMuted ?? false,
                isVideoOff: muteState?.isVideoOff ?? false,
            });
        }
        for (const [key, { userId, stream }] of screenStreams.entries()) {
            peers.push({ peerId: key, userId, stream, isScreen: true });
        }

        setRemotePeers(peers);
        setParticipantCount(cameraStreams.size + 1);
    }, []);

    // ── Consume mutex: serialize consume requests to avoid response mismatch ──
    const consumeQueueRef = useRef<Promise<void>>(Promise.resolve());

    // ── Consume a remote producer ──
    const consumeProducer = useCallback(async (producerId: string, peerId: string, displayName: string) => {
        if (!rtpCapsRef.current || !recvTransportRef.current) {
            console.log(`[GROUP] consumeProducer QUEUED (device not ready): ${producerId.slice(0, 8)} for ${displayName}`);
            pendingProducersRef.current.push({ producerId, peerId, userId: displayName });
            return;
        }

        // Serialize: chain onto the queue so only one consume request is in-flight at a time
        consumeQueueRef.current = consumeQueueRef.current.then(async () => {
            try {
                console.log(`[GROUP] consumeProducer START: ${producerId.slice(0, 8)} for ${displayName}`);
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
                    console.warn("[GROUP] consume FAILED:", producerId.slice(0, 8), res.message);
                    return;
                }

                console.log(`[GROUP] consume OK: kind=${res.kind} producerId=${res.producerId?.slice(0, 8)}`);

                const consumer = await recvTransportRef.current!.consume({
                    id: res.id,
                    producerId: res.producerId,
                    kind: res.kind,
                    rtpParameters: res.rtpParameters,
                    appData: res.appData,
                });

                console.log(`[GROUP] consumer created: id=${consumer.id.slice(0, 8)} kind=${consumer.kind} track=${consumer.track?.readyState}`);

                consumersRef.current.set(consumer.id, {
                    peerId,
                    userId: displayName,
                    consumer,
                    isScreen: res.appData?.screen
                });
                peerMapRef.current.set(peerId, { userId: displayName, username: displayName });

                // Resume consumer (synchronous in mediasoup-client)
                try { consumer.resume(); } catch { /* ignore */ }

                rebuildRemotePeers();
            } catch (err) {
                console.warn("[GROUP] consumeProducer error for", producerId.slice(0, 8), err);
            }
        });
    }, [rebuildRemotePeers, send]);

    useEffect(() => {
        if (!roomId) return;

        // Each effect invocation gets a unique ID.
        // Old handlers check their ID vs current — stale ones bail out.
        const myEffectId = ++effectIdRef.current;
        const isStale = () => myEffectId !== effectIdRef.current;

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

            sendTransport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
                send({ type: "produce", transportId: sendTransport.id, kind, rtpParameters, appData });
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
            if (isStale()) return;
            setCallState("joining");

            try {
                // 1. Register in DB
                try {
                    await apiRequest(`/rooms/${roomId}/join`, {});
                } catch (e: any) {
                    if (!e.message?.includes("Already")) throw e;
                }

                if (isStale()) return;

                // 2. Get camera/mic with optimized quality
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 },
                        frameRate: { ideal: 30, max: 30 },
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 48000,
                        channelCount: 1,
                    },
                });

                if (isStale()) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                localStreamRef.current = stream;
                const vidTrack = stream.getVideoTracks()[0] || null;
                setRawVideoTrack(vidTrack);
                setLocalStream(stream);

                // 3. Get WebSocket auth token
                const { token } = await apiRequest("/auth/ws-token", undefined, "GET");

                if (isStale()) return;

                // 4. Connect WebSocket with token in URL
                const wsUrl = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
                socket = new WebSocket(wsUrl);
                socketRef.current = socket;

                socket.addEventListener("open", () => {
                    if (isStale()) { socket?.close(); return; }
                    send({ type: "join", roomId });
                });

                // Main message handler for signaling events
                socket.addEventListener("message", (event) => {
                    if (isStale()) return;
                    const msg = JSON.parse(event.data);

                    switch (msg.type) {
                        case "role":
                            setCallState("connected");
                            if (msg.username) setLocalUsername(msg.username);
                            if (msg.peerId) localPeerIdRef.current = msg.peerId;
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
                            peerMapRef.current.set(msg.peerId, { userId: msg.userId, username: msg.username || msg.userId.slice(0, 8) });
                            break;

                        case "existingProducers":
                            console.log(`[GROUP] existingProducers: ${msg.producers?.length} producers, localPeerId=${localPeerIdRef.current?.slice(0, 8)}`);
                            for (const prod of msg.producers) {
                                // Skip own producers (safety guard against race conditions)
                                if (prod.peerId === localPeerIdRef.current) {
                                    console.log(`[GROUP] SKIPPING own producer: ${prod.producerId?.slice(0, 8)}`);
                                    continue;
                                }
                                console.log(`[GROUP] consuming existing: ${prod.producerId?.slice(0, 8)} kind=${prod.kind} from ${prod.username}`);
                                void consumeProducer(prod.producerId, prod.peerId, prod.username || prod.userId.slice(0, 8));
                            }
                            break;

                        case "newProducer":
                            // Skip own producers (safety guard)
                            if (msg.peerId === localPeerIdRef.current) {
                                console.log(`[GROUP] SKIPPING own newProducer: ${msg.producerId?.slice(0, 8)}`);
                                break;
                            }
                            console.log(`[GROUP] newProducer: ${msg.producerId?.slice(0, 8)} kind=${msg.kind} from ${msg.username}`);
                            void consumeProducer(msg.producerId, msg.peerId, msg.username || msg.userId.slice(0, 8));
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
                            remoteMuteStatesRef.current.delete(msg.peerId);
                            rebuildRemotePeers();
                            break;

                        case "mute-state":
                            remoteMuteStatesRef.current.set(msg.peerId, {
                                isAudioMuted: msg.isAudioMuted ?? false,
                                isVideoOff: msg.isVideoOff ?? false,
                            });
                            rebuildRemotePeers();
                            break;

                        case "chat-message":
                            setChatMessages(prev => [...prev, {
                                id: `${Date.now()}-${Math.random()}`,
                                sender: msg.sender,
                                text: msg.text,
                                timestamp: msg.timestamp,
                                isLocal: false,
                                messageType: msg.messageType || "text",
                                imageData: msg.imageData,
                            }]);
                            break;

                        case "recording-status":
                            setRemoteRecording(msg.isRecording ? { isRecording: true, recorder: msg.recorder } : null);
                            break;

                        case "emoji-reaction":
                            setIncomingReaction({ emoji: msg.emoji, sender: msg.sender });
                            break;

                        case "whiteboard-draw":
                            setIncomingDrawPoint(msg.point);
                            break;

                        case "whiteboard-clear":
                            setIncomingClear(true);
                            setTimeout(() => setIncomingClear(false), 100);
                            break;

                        case "e2e-public-key":
                            setIncomingE2EKey(msg.publicKeyJwk);
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
                    if (isStale()) return;
                    console.log(`[WS] close: code=${event.code} reason=${event.reason} clean=${event.wasClean}`);
                    if (!cleanedUpRef.current && event.code !== 1000) setCallState("disconnected");
                });

                socket.addEventListener("error", (e) => {
                    if (isStale()) return;
                    console.error("[WS] error:", e);
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
    // Refs to avoid stale closures in toggle functions
    const isAudioMutedRef = useRef(false);
    const isVideoOffRef = useRef(false);

    const toggleAudio = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            const muted = !track.enabled;
            isAudioMutedRef.current = muted;
            setIsAudioMuted(muted);
            send({ type: "mute-state", isAudioMuted: muted, isVideoOff: isVideoOffRef.current });
        }
    }, [send]);

    const toggleVideo = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            const off = !track.enabled;
            isVideoOffRef.current = off;
            setIsVideoOff(off);
            send({ type: "mute-state", isAudioMuted: isAudioMutedRef.current, isVideoOff: off });
        }
    }, [send]);

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
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }
                });
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

    const sendChatMessage = useCallback((text: string, messageType?: "text" | "image", imageData?: string) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
        send({ type: "chat-message", text, messageType: messageType || "text", imageData });
        setChatMessages(prev => [...prev, {
            id: `${Date.now()}-${Math.random()}`,
            sender: localUsername || "You",
            text,
            timestamp: Date.now(),
            isLocal: true,
            messageType: messageType || "text",
            imageData,
        }]);
    }, [send, localUsername]);

    const sendSignal = useCallback((data: any) => {
        send(data);
    }, [send]);

    const sendReaction = useCallback((emoji: string) => {
        send({ type: "emoji-reaction", emoji });
    }, [send]);

    const sendWhiteboardDraw = useCallback((point: any) => {
        send({ type: "whiteboard-draw", point });
    }, [send]);

    const sendWhiteboardClear = useCallback(() => {
        send({ type: "whiteboard-clear" });
    }, [send]);

    const sendE2EPublicKey = useCallback((publicKeyJwk: JsonWebKey) => {
        send({ type: "e2e-public-key", publicKeyJwk });
    }, [send]);

    return {
        callState,
        localStream,
        remotePeers,
        participantCount,
        localUsername,
        isAudioMuted,
        isVideoOff,
        isScreenSharing,
        errorMessage,
        chatMessages,
        remoteRecording,
        incomingReaction,
        incomingDrawPoint,
        incomingClear,
        incomingE2EKey,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        sendChatMessage,
        sendReaction,
        sendWhiteboardDraw,
        sendWhiteboardClear,
        sendE2EPublicKey,
        sendSignal,
        endCall,
        bgMode: backgroundMode,
        bgUrl: backgroundImageUrl,
        setVirtualBackground,
    };
}
