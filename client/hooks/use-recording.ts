"use client";

import { useRef, useState, useCallback } from "react";

/**
 * Canvas-composite recording hook.
 *
 * Draws ALL participant video streams onto a single canvas in a grid layout,
 * captures that canvas + mixed audio, and records the composite at high quality.
 *
 * The result is a single video file showing all participants arranged like
 * a meeting layout — just like a screen recording of the call.
 */

type StreamEntry = { stream: MediaStream; label: string };

export function useRecording(roomId: string, username: string = "user") {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animFrameRef = useRef<number>(0);
    const videoElemsRef = useRef<HTMLVideoElement[]>([]);

    /**
     * Start recording all streams composited on a canvas.
     * @param streams — array of { stream, label } for each participant
     */
    const startRecording = useCallback((streams: StreamEntry[]) => {
        if (isRecording || streams.length === 0) return;

        // ── Canvas setup ──
        const WIDTH = 1920;
        const HEIGHT = 1080;
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext("2d")!;
        canvasRef.current = canvas;

        // Create hidden <video> elements to draw from
        const videoElems: HTMLVideoElement[] = streams.map(({ stream }) => {
            const vid = document.createElement("video");
            vid.srcObject = stream;
            vid.muted = true; // avoid echo
            vid.playsInline = true;
            vid.play().catch(() => { });
            return vid;
        });
        videoElemsRef.current = videoElems;

        // ── Grid layout calculator ──
        function getGrid(count: number) {
            if (count <= 1) return { cols: 1, rows: 1 };
            if (count === 2) return { cols: 2, rows: 1 };
            if (count <= 4) return { cols: 2, rows: 2 };
            if (count <= 6) return { cols: 3, rows: 2 };
            if (count <= 9) return { cols: 3, rows: 3 };
            return { cols: 4, rows: Math.ceil(count / 4) };
        }

        // ── Draw loop ──
        function drawFrame() {
            // Dark background
            ctx.fillStyle = "#0a0a0a";
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            const count = videoElems.length;
            const { cols, rows } = getGrid(count);
            const gap = 8;
            const cellW = (WIDTH - gap * (cols + 1)) / cols;
            const cellH = (HEIGHT - gap * (rows + 1)) / rows;

            videoElems.forEach((vid, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = gap + col * (cellW + gap);
                const y = gap + row * (cellH + gap);

                // Rounded rectangle background
                ctx.fillStyle = "#1a1a2e";
                ctx.beginPath();
                ctx.roundRect(x, y, cellW, cellH, 12);
                ctx.fill();

                // Draw video if it has frames
                if (vid.readyState >= 2 && vid.videoWidth > 0) {
                    // Cover-fit: fill the cell while maintaining aspect ratio
                    const vidAspect = vid.videoWidth / vid.videoHeight;
                    const cellAspect = cellW / cellH;
                    let sx = 0, sy = 0, sw = vid.videoWidth, sh = vid.videoHeight;

                    if (vidAspect > cellAspect) {
                        // Video is wider → crop sides
                        sw = vid.videoHeight * cellAspect;
                        sx = (vid.videoWidth - sw) / 2;
                    } else {
                        // Video is taller → crop top/bottom
                        sh = vid.videoWidth / cellAspect;
                        sy = (vid.videoHeight - sh) / 2;
                    }

                    // Clip to rounded rect
                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(x, y, cellW, cellH, 12);
                    ctx.clip();
                    ctx.drawImage(vid, sx, sy, sw, sh, x, y, cellW, cellH);
                    ctx.restore();
                } else {
                    // No video — show placeholder with initials
                    ctx.fillStyle = "#2a2a4e";
                    ctx.beginPath();
                    ctx.roundRect(x, y, cellW, cellH, 12);
                    ctx.fill();

                    const initial = (streams[i]?.label || "?")[0].toUpperCase();
                    ctx.fillStyle = "#888";
                    ctx.font = `bold ${Math.min(cellW, cellH) * 0.3}px sans-serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(initial, x + cellW / 2, y + cellH / 2);
                }

                // Name label
                const label = streams[i]?.label || "Unknown";
                const labelH = 28;
                ctx.fillStyle = "rgba(0,0,0,0.6)";
                ctx.beginPath();
                ctx.roundRect(x + 8, y + cellH - labelH - 8, Math.min(label.length * 10 + 20, cellW - 16), labelH, 6);
                ctx.fill();
                ctx.fillStyle = "#fff";
                ctx.font = "bold 13px sans-serif";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(label, x + 16, y + cellH - labelH / 2 - 8);
            });

            // Recording indicator
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(WIDTH - 30, 30, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText("REC", WIDTH - 46, 30);

            // Timestamp
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(new Date().toLocaleTimeString(), WIDTH - 20, HEIGHT - 16);

            animFrameRef.current = requestAnimationFrame(drawFrame);
        }

        drawFrame();

        // ── Mix audio from all streams ──
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        streams.forEach(({ stream }) => {
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                const src = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
                src.connect(dest);
            }
        });

        // ── Combine canvas video + mixed audio ──
        const canvasStream = canvas.captureStream(30); // 30 FPS
        const audioTracks = dest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
            canvasStream.addTrack(audioTracks[0]);
        }

        // ── MediaRecorder ──
        let mimeType = "video/webm";
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
            mimeType = "video/webm;codecs=vp9,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
            mimeType = "video/webm;codecs=vp8,opus";
        }

        const recorder = new MediaRecorder(canvasStream, {
            mimeType,
            videoBitsPerSecond: 5_000_000,
        });

        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            // Cleanup
            cancelAnimationFrame(animFrameRef.current);
            videoElems.forEach(v => { v.srcObject = null; });
            audioCtx.close().catch(() => { });

            if (chunksRef.current.length === 0) return;
            const blob = new Blob(chunksRef.current, { type: mimeType });

            // Auto-download the recording
            downloadBlob(blob, `OneStudios-${roomId.slice(0, 8)}-${Date.now()}.webm`);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
    }, [isRecording, roomId]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
        setIsRecording(false);
    }, []);

    return { isRecording, startRecording, stopRecording };
}

/**
 * Download a recording blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
