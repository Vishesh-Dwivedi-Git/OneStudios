"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";

// ─── Constants ──────────────────────────────────────────
const WS_URL = "ws://localhost:5000";

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

// ─── Types ──────────────────────────────────────────────
export type CallState = "idle" | "joining" | "connected" | "disconnected" | "error";

// ─── Hook ───────────────────────────────────────────────
export type ReceivedRecording = { name: string; blob: Blob; size: number; receivedAt: number };

export function useWebRTC(roomId: string) {
    const [callState, setCallState] = useState<CallState>("idle");
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false);
    const [remoteIsAudioMuted, setRemoteIsAudioMuted] = useState(false);
    const [remoteIsVideoOff, setRemoteIsVideoOff] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string; timestamp: number; isLocal?: boolean }[]>([]);
    const [remoteRecording, setRemoteRecording] = useState<{ isRecording: boolean; recorder: string } | null>(null);
    const [receivedRecordings, setReceivedRecordings] = useState<ReceivedRecording[]>([]);

    // All mutable state lives in refs to avoid dependency cycles
    const socketRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenTrackRef = useRef<MediaStreamTrack | null>(null);
    const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
    const cleanedUpRef = useRef(false);
    const effectIdRef = useRef(0);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const incomingChunksRef = useRef<{ [key: string]: ArrayBuffer[] }>({});

    useEffect(() => {
        if (!roomId) return;

        // Each effect invocation gets a unique ID.
        // Old handlers check their ID vs current — stale ones bail out.
        const myEffectId = ++effectIdRef.current;
        const isStale = () => myEffectId !== effectIdRef.current;

        cleanedUpRef.current = false;

        let socket: WebSocket | null = null;
        let pc: RTCPeerConnection | null = null;
        let stream: MediaStream | null = null;

        // Queue for ICE candidates that arrive before remoteDescription is set
        let pendingCandidates: RTCIceCandidate[] = [];

        // ── Helpers (defined inside effect to avoid dependency issues) ──

        // ── DataChannel handler for recording chunks ──
        function setupDataChannelHandlers(dc: RTCDataChannel) {
            dc.binaryType = "arraybuffer";
            let metaInfo: { name: string; totalChunks: number; totalSize: number } | null = null;

            dc.onmessage = (evt) => {
                if (typeof evt.data === "string") {
                    // JSON control messages
                    const msg = JSON.parse(evt.data);
                    if (msg.type === "recording-meta") {
                        metaInfo = { name: msg.name, totalChunks: msg.totalChunks, totalSize: msg.totalSize };
                        incomingChunksRef.current[msg.name] = [];
                    } else if (msg.type === "recording-done") {
                        // All chunks received → assemble blob
                        const chunks = incomingChunksRef.current[msg.name];
                        if (chunks && metaInfo) {
                            const blob = new Blob(chunks, { type: "video/webm" });
                            setReceivedRecordings(prev => [...prev, {
                                name: msg.name,
                                blob,
                                size: blob.size,
                                receivedAt: Date.now(),
                            }]);
                            delete incomingChunksRef.current[msg.name];
                            console.log(`[REC] Received recording from ${msg.name}: ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
                        }
                        metaInfo = null;
                    }
                } else {
                    // Binary chunk
                    if (metaInfo) {
                        incomingChunksRef.current[metaInfo.name]?.push(evt.data as ArrayBuffer);
                    }
                }
            };
        }

        function createPC(targetPeerId?: string): RTCPeerConnection {
            // Always close old PC first
            if (pc) {
                try { pc.close(); } catch { /* ignore */ }
            }

            const newPc = new RTCPeerConnection(ICE_SERVERS);
            pendingCandidates = []; // Reset queue for new connection

            newPc.onicecandidate = (e) => {
                if (e.candidate && socket?.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "ice-candidate",
                        payload: e.candidate,
                        targetPeerId,
                    }));
                }
            };

            newPc.ontrack = (e) => {
                if (!cleanedUpRef.current) {
                    setRemoteStream(e.streams[0]);
                }
            };

            newPc.onconnectionstatechange = () => {
                if (cleanedUpRef.current) return;
                const s = newPc.connectionState;
                console.log("[RTC] connectionState:", s);
                if (s === "connected") setCallState("connected");
                if (s === "failed") setCallState("disconnected");
            };

            // ── DataChannel for P2P recording transfer ──
            // Offerer creates channel, answerer listens for it
            const dc = newPc.createDataChannel("recording", { ordered: true });
            dc.onopen = () => { console.log("[DC] recording channel opened (offerer)"); };
            setupDataChannelHandlers(dc);
            dataChannelRef.current = dc;

            newPc.ondatachannel = (evt) => {
                console.log("[DC] recording channel opened (answerer)");
                const remoteDc = evt.channel;
                setupDataChannelHandlers(remoteDc);
                dataChannelRef.current = remoteDc;
            };

            // Add local tracks
            if (stream) {
                stream.getTracks().forEach((track) => newPc.addTrack(track, stream!));
            }

            pc = newPc;
            pcRef.current = newPc;
            return newPc;
        }

        async function handleMessage(msg: any) {
            if (cleanedUpRef.current) return;

            try {
                switch (msg.type) {
                    case "role":
                        setCallState("connected");
                        break;

                    case "existing-peers": {
                        // We just joined and there's already someone here — WE create the offer
                        const peer = msg.peers?.[0];
                        if (peer) {
                            const newPc = createPC(peer.peerId);
                            const offer = await newPc.createOffer();
                            await newPc.setLocalDescription(offer);
                            socket?.send(JSON.stringify({
                                type: "offer",
                                payload: offer,
                                targetPeerId: peer.peerId,
                            }));
                        }
                        break;
                    }

                    case "peer-joined":
                        // A new peer joined — clean up old PC so we're ready for their offer
                        if (pc) {
                            pc.close();
                            pc = null;
                            pcRef.current = null;
                        }
                        setRemoteStream(null);
                        break;

                    case "offer": {
                        // Always create a FRESH PC for incoming offers
                        // This avoids all signaling state conflicts
                        createPC(msg.fromPeerId);

                        await pc!.setRemoteDescription(new RTCSessionDescription(msg.payload));

                        // Flush any queued ICE candidates
                        for (const c of pendingCandidates) {
                            await pc!.addIceCandidate(c);
                        }
                        pendingCandidates = [];

                        const answer = await pc!.createAnswer();
                        await pc!.setLocalDescription(answer);
                        socket?.send(JSON.stringify({
                            type: "answer",
                            payload: answer,
                            targetPeerId: msg.fromPeerId,
                        }));
                        break;
                    }

                    case "answer":
                        if (pc && pc.signalingState === "have-local-offer") {
                            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
                            // Flush any queued ICE candidates
                            for (const c of pendingCandidates) {
                                await pc.addIceCandidate(c);
                            }
                            pendingCandidates = [];
                        }
                        break;

                    case "ice-candidate":
                        if (pc && pc.remoteDescription) {
                            await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
                        } else {
                            // Queue until remoteDescription is set
                            pendingCandidates.push(new RTCIceCandidate(msg.payload));
                        }
                        break;

                    case "peer-left":
                        setRemoteStream(null);
                        setRemoteIsScreenSharing(false);
                        if (pc) {
                            pc.close();
                            pc = null;
                            pcRef.current = null;
                        }
                        break;

                    case "screen-share-started":
                        setRemoteIsScreenSharing(true);
                        break;

                    case "screen-share-stopped":
                        setRemoteIsScreenSharing(false);
                        break;

                    case "mute-state":
                        setRemoteIsAudioMuted(msg.isAudioMuted ?? false);
                        setRemoteIsVideoOff(msg.isVideoOff ?? false);
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

                    case "error":
                        console.error("Signaling error:", msg.message);
                        if (msg.message?.includes("not a participant") || msg.message?.includes("room not found")) {
                            setCallState("error");
                            setErrorMessage(msg.message);
                        }
                        break;
                }
            } catch (err) {
                console.error("handleMessage error:", err);
            }
        }

        // ── Main initialization ──

        async function init() {
            if (isStale()) return;
            setCallState("joining");

            try {
                // 1. Register in DB (auto-join)
                try {
                    await apiRequest(`/rooms/${roomId}/join`, {});
                } catch (e: any) {
                    // If already in room, that's fine — continue
                    if (!e.message?.includes("Already")) {
                        throw e;
                    }
                }

                if (isStale()) return; // Check after async

                // 2. Get camera/mic
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

                if (isStale()) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                localStreamRef.current = stream;
                cameraTrackRef.current = stream.getVideoTracks()[0] || null;
                setLocalStream(stream);

                // 3. Get WebSocket auth token (cookies may not be sent cross-origin)
                const { token } = await apiRequest("/auth/ws-token", undefined, "GET");

                if (isStale()) return;

                // 4. Connect WebSocket with token in URL
                const wsUrl = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
                socket = new WebSocket(wsUrl);
                socketRef.current = socket;

                socket.onopen = () => {
                    if (isStale()) { socket?.close(); return; }
                    console.log("[WS-1v1] connected");
                    socket!.send(JSON.stringify({ type: "join", roomId }));
                };

                socket.onmessage = (event) => {
                    if (isStale()) return;
                    const msg = JSON.parse(event.data);
                    console.log("[WS-1v1] recv:", msg.type);
                    handleMessage(msg);
                };

                socket.onclose = (event) => {
                    if (isStale()) return;
                    console.log(`[WS-1v1] close: code=${event.code} reason=${event.reason}`);
                    if (!cleanedUpRef.current && event.code !== 1000) {
                        setCallState("disconnected");
                    }
                };

                socket.onerror = () => {
                    if (isStale()) return;
                    console.error("[WS-1v1] error");
                    if (!cleanedUpRef.current) {
                        setCallState("error");
                        setErrorMessage("WebSocket connection failed");
                    }
                };

            } catch (err: any) {
                if (!cleanedUpRef.current) {
                    console.error("Init failed:", err);
                    setCallState("error");
                    setErrorMessage(
                        err.name === "NotAllowedError"
                            ? "Camera/Mic access was denied. Please allow access and try again."
                            : (err.message || "Failed to join the meeting")
                    );
                }
            }
        }

        init();

        // ── Cleanup ──
        return () => {
            cleanedUpRef.current = true;
            if (socket && socket.readyState <= WebSocket.OPEN) {
                socket.close(1000, "cleanup");
            }
            socketRef.current = null;
            if (pc) {
                pc.close();
                pcRef.current = null;
            }
            // Stop media tracks
            if (stream) {
                stream.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]); // ONLY re-run when roomId changes

    // ── Controls ──
    // Use refs to avoid stale closure issues when sending mute-state
    const isAudioMutedRef = useRef(false);
    const isVideoOffRef = useRef(false);

    const toggleAudio = () => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            const muted = !track.enabled;
            isAudioMutedRef.current = muted;
            setIsAudioMuted(muted);
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    type: "mute-state",
                    isAudioMuted: muted,
                    isVideoOff: isVideoOffRef.current,
                }));
            }
        }
    };

    const toggleVideo = () => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            const off = !track.enabled;
            isVideoOffRef.current = off;
            setIsVideoOff(off);
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    type: "mute-state",
                    isAudioMuted: isAudioMutedRef.current,
                    isVideoOff: off,
                }));
            }
        }
    };

    const endCall = () => {
        screenTrackRef.current?.stop();
        socketRef.current?.close();
        pcRef.current?.close();
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        window.location.href = "/";
    };

    const toggleScreenShare = async () => {
        const pc = pcRef.current;
        if (!pc) return;

        if (isScreenSharing) {
            // Stop screen share — restore camera track
            screenTrackRef.current?.stop();
            screenTrackRef.current = null;

            const camTrack = cameraTrackRef.current;
            const videoSender = pc.getSenders().find((s) => s.track?.kind === "video" || s.track === null);

            if (camTrack && camTrack.readyState === "live" && videoSender) {
                await videoSender.replaceTrack(camTrack);
            } else if (videoSender) {
                // Camera track was stopped — get a fresh one
                try {
                    const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    const newCamTrack = newStream.getVideoTracks()[0];
                    cameraTrackRef.current = newCamTrack;
                    // Replace in local stream too
                    const oldTrack = localStreamRef.current?.getVideoTracks()[0];
                    if (oldTrack) localStreamRef.current?.removeTrack(oldTrack);
                    localStreamRef.current?.addTrack(newCamTrack);
                    await videoSender.replaceTrack(newCamTrack);
                } catch {
                    console.warn("Could not restore camera after screen share");
                }
            }
            setIsScreenSharing(false);
            // Notify remote peer
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ type: "screen-share-stopped" }));
            }
        } else {
            // Start screen share — replace camera track
            if (!navigator.mediaDevices?.getDisplayMedia) {
                setErrorMessage("Screen sharing is not supported in this browser or requires a secure (HTTPS/localhost) connection.");
                return;
            }

            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }
                });
                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrackRef.current = screenTrack;

                const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
                if (videoSender) await videoSender.replaceTrack(screenTrack);

                setIsScreenSharing(true);
                // Notify remote peer
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({ type: "screen-share-started" }));
                }

                // When user stops share via browser UI
                screenTrack.onended = async () => {
                    screenTrackRef.current = null;
                    const camTrack = cameraTrackRef.current;
                    if (camTrack && camTrack.readyState === "live" && videoSender) {
                        await videoSender.replaceTrack(camTrack);
                    } else if (videoSender) {
                        try {
                            const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                            const newCamTrack = newStream.getVideoTracks()[0];
                            cameraTrackRef.current = newCamTrack;
                            const oldTrack = localStreamRef.current?.getVideoTracks()[0];
                            if (oldTrack) localStreamRef.current?.removeTrack(oldTrack);
                            localStreamRef.current?.addTrack(newCamTrack);
                            await videoSender.replaceTrack(newCamTrack);
                        } catch {
                            console.warn("Could not restore camera after screen share");
                        }
                    }
                    setIsScreenSharing(false);
                    // Notify remote peer
                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(JSON.stringify({ type: "screen-share-stopped" }));
                    }
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
    };

    const sendChatMessage = (text: string, messageType?: "text" | "image", imageData?: string) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
        socketRef.current.send(JSON.stringify({ type: "chat-message", text, messageType: messageType || "text", imageData }));
        setChatMessages(prev => [...prev, {
            id: `${Date.now()}-${Math.random()}`,
            sender: "You",
            text,
            timestamp: Date.now(),
            isLocal: true,
            messageType: messageType || "text",
            imageData,
        }]);
    };

    const sendSignal = (data: any) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
        socketRef.current.send(JSON.stringify(data));
    };

    /**
     * Send a recording blob to the remote peer via DataChannel.
     * Chunks the blob into 64KB pieces and sends meta → chunks → done.
     */
    const sendRecordingBlob = async (blob: Blob, senderName: string) => {
        const dc = dataChannelRef.current;
        if (!dc || dc.readyState !== "open") {
            console.warn("[DC] DataChannel not open, cannot send recording");
            return false;
        }

        const CHUNK_SIZE = 64 * 1024; // 64KB
        const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);

        // 1. Send metadata
        dc.send(JSON.stringify({
            type: "recording-meta",
            name: senderName,
            totalChunks,
            totalSize: blob.size,
        }));

        // 2. Send binary chunks with flow control
        const arrayBuffer = await blob.arrayBuffer();
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, blob.size);
            const chunk = arrayBuffer.slice(start, end);

            // Wait if buffered amount is too high (back-pressure)
            while (dc.bufferedAmount > 1024 * 1024) {
                await new Promise(r => setTimeout(r, 50));
            }

            dc.send(chunk);
        }

        // 3. Send done signal
        dc.send(JSON.stringify({
            type: "recording-done",
            name: senderName,
        }));

        console.log(`[DC] Sent recording: ${senderName} (${(blob.size / 1024 / 1024).toFixed(1)} MB, ${totalChunks} chunks)`);
        return true;
    };

    return {
        callState,
        localStream,
        remoteStream,
        remoteIsScreenSharing,
        remoteIsAudioMuted,
        remoteIsVideoOff,
        role: null,
        participants: [],
        isAudioMuted,
        isVideoOff,
        isScreenSharing,
        errorMessage,
        chatMessages,
        remoteRecording,
        receivedRecordings,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        sendChatMessage,
        sendSignal,
        sendRecordingBlob,
        endCall,
    };
}
