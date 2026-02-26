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
export function useWebRTC(roomId: string) {
    const [callState, setCallState] = useState<CallState>("idle");
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // All mutable state lives in refs to avoid dependency cycles
    const socketRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenTrackRef = useRef<MediaStreamTrack | null>(null);
    const cleanedUpRef = useRef(false);

    useEffect(() => {
        if (!roomId) return;
        cleanedUpRef.current = false;

        let socket: WebSocket | null = null;
        let pc: RTCPeerConnection | null = null;
        let stream: MediaStream | null = null;

        // ── Helpers (defined inside effect to avoid dependency issues) ──

        function createPC(targetPeerId?: string): RTCPeerConnection {
            const newPc = new RTCPeerConnection(ICE_SERVERS);

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
                if (s === "connected") setCallState("connected");
                if (s === "failed") setCallState("disconnected");
                // Note: "disconnected" can be transient, don't immediately set error
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
                        // Successfully joined the signaling room
                        setCallState("connected");
                        break;

                    case "existing-peers": {
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
                        // A new peer joined — they will send us an offer
                        break;

                    case "offer": {
                        if (!pc) createPC(msg.fromPeerId);
                        await pc!.setRemoteDescription(new RTCSessionDescription(msg.payload));
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
                        await pc?.setRemoteDescription(new RTCSessionDescription(msg.payload));
                        break;

                    case "ice-candidate":
                        if (pc && pc.remoteDescription) {
                            await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
                        }
                        break;

                    case "peer-left":
                        setRemoteStream(null);
                        if (pc) {
                            pc.close();
                            pc = null;
                            pcRef.current = null;
                        }
                        break;

                    case "error":
                        console.error("Signaling error:", msg.message);
                        setCallState("error");
                        setErrorMessage(msg.message);
                        break;
                }
            } catch (err) {
                console.error("handleMessage error:", err);
            }
        }

        // ── Main initialization ──

        async function init() {
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

                // 2. Get camera/mic
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                localStreamRef.current = stream;
                if (!cleanedUpRef.current) {
                    setLocalStream(stream);
                }

                // 3. Connect WebSocket
                socket = new WebSocket(WS_URL);
                socketRef.current = socket;

                socket.onopen = () => {
                    if (!cleanedUpRef.current) {
                        socket!.send(JSON.stringify({ type: "join", roomId }));
                    }
                };

                socket.onmessage = (event) => {
                    const msg = JSON.parse(event.data);
                    handleMessage(msg);
                };

                socket.onclose = (event) => {
                    if (!cleanedUpRef.current && event.code !== 1000) {
                        setCallState("disconnected");
                    }
                };

                socket.onerror = () => {
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

    const toggleAudio = () => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsAudioMuted(!track.enabled);
        }
    };

    const toggleVideo = () => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsVideoOff(!track.enabled);
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
            const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
            if (cameraTrack) {
                const videoSender = pc.getSenders().find((s) => s.track?.kind === "video" || s.track === null);
                if (videoSender) await videoSender.replaceTrack(cameraTrack);
            }
            setIsScreenSharing(false);
        } else {
            // Start screen share — replace camera track
            if (!navigator.mediaDevices?.getDisplayMedia) {
                setErrorMessage("Screen sharing is not supported in this browser or requires a secure (HTTPS/localhost) connection.");
                return;
            }

            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrackRef.current = screenTrack;

                const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
                if (videoSender) await videoSender.replaceTrack(screenTrack);

                setIsScreenSharing(true);

                // When user stops share via browser UI
                screenTrack.onended = () => {
                    screenTrackRef.current = null;
                    const camTrack = localStreamRef.current?.getVideoTracks()[0];
                    if (camTrack && videoSender) {
                        videoSender.replaceTrack(camTrack);
                    }
                    setIsScreenSharing(false);
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

    return {
        callState,
        localStream,
        remoteStream,
        role: null,
        participants: [],
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
