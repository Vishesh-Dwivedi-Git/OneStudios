"use client";

import { useRef, useState, useCallback } from "react";

interface RecordingStream {
    stream: MediaStream | null;
    label: string;
}

/**
 * Hook that records the entire meeting by:
 * 1. Drawing all video feeds onto a canvas (composited grid)
 * 2. Mixing all audio tracks via AudioContext
 * 3. Combining canvas video + mixed audio into one MediaRecorder
 */
export function useRecording(roomId: string) {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animFrameRef = useRef<number>(0);
    const videoElementsRef = useRef<HTMLVideoElement[]>([]);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const startRecording = useCallback((streams: RecordingStream[]) => {
        // Filter out null/empty streams
        const validStreams = streams.filter(s => s.stream && s.stream.getTracks().length > 0);
        if (validStreams.length === 0) return;

        // ── 1. Create off-screen canvas ──
        const canvas = document.createElement("canvas");
        const cols = validStreams.length <= 1 ? 1 : 2;
        const rows = Math.ceil(validStreams.length / cols);
        canvas.width = 1280;
        canvas.height = 720;
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d")!;

        // ── 2. Create hidden video elements for each stream ──
        const videoElements: HTMLVideoElement[] = [];
        for (const s of validStreams) {
            const video = document.createElement("video");
            video.srcObject = s.stream;
            video.muted = true; // mute to avoid echo — audio handled separately
            video.playsInline = true;
            video.play().catch(() => { });
            videoElements.push(video);
        }
        videoElementsRef.current = videoElements;

        // ── 3. Draw loop — composites all video feeds onto canvas ──
        const cellW = canvas.width / cols;
        const cellH = canvas.height / rows;

        function draw() {
            ctx.fillStyle = "#1a1a2e";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            videoElements.forEach((video, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = col * cellW;
                const y = row * cellH;

                // Draw video maintaining aspect ratio
                if (video.videoWidth && video.videoHeight) {
                    const vAspect = video.videoWidth / video.videoHeight;
                    const cAspect = cellW / cellH;
                    let dw = cellW, dh = cellH, dx = x, dy = y;

                    if (vAspect > cAspect) {
                        // Video wider than cell — fit width, center vertically
                        dh = cellW / vAspect;
                        dy = y + (cellH - dh) / 2;
                    } else {
                        // Video taller — fit height, center horizontally
                        dw = cellH * vAspect;
                        dx = x + (cellW - dw) / 2;
                    }

                    ctx.drawImage(video, dx, dy, dw, dh);
                }

                // Draw name label
                const label = validStreams[i]?.label || "";
                if (label) {
                    ctx.fillStyle = "rgba(0,0,0,0.5)";
                    const textW = ctx.measureText(label).width + 16;
                    ctx.fillRect(x + 8, y + cellH - 32, textW, 24);
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 13px Inter, sans-serif";
                    ctx.fillText(label, x + 16, y + cellH - 14);
                }

                // Draw cell border
                ctx.strokeStyle = "rgba(255,255,255,0.1)";
                ctx.strokeRect(x, y, cellW, cellH);
            });

            // Recording indicator
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(canvas.width - 24, 24, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.font = "bold 12px Inter, sans-serif";
            ctx.fillText("REC", canvas.width - 60, 29);

            animFrameRef.current = requestAnimationFrame(draw);
        }
        draw();

        // ── 4. Mix all audio tracks via AudioContext ──
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const dest = audioCtx.createMediaStreamDestination();

        for (const s of validStreams) {
            const audioTracks = s.stream!.getAudioTracks();
            if (audioTracks.length > 0) {
                const source = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
                source.connect(dest);
            }
        }

        // ── 5. Combine canvas video + mixed audio ──
        const canvasStream = canvas.captureStream(30); // 30fps
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
        ]);

        // ── 6. Start MediaRecorder ──
        const recorder = new MediaRecorder(combinedStream, {
            mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
                ? "video/webm;codecs=vp9,opus"
                : "video/webm",
            videoBitsPerSecond: 2500000, // 2.5 Mbps
        });

        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            // Clean up
            cancelAnimationFrame(animFrameRef.current);
            videoElements.forEach(v => { v.pause(); v.srcObject = null; });
            audioCtx.close().catch(() => { });

            // Download
            const blob = new Blob(chunksRef.current, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `meeting-${roomId.slice(0, 8)}-${new Date().toISOString().slice(0, 16).replace("T", "_")}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
    }, [roomId]);

    const stopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    }, []);

    const toggleRecording = useCallback((streams: RecordingStream[]) => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording(streams);
        }
    }, [isRecording, startRecording, stopRecording]);

    return { isRecording, toggleRecording, stopRecording };
}
