import { useEffect, useState, useRef } from 'react';

export type BackgroundMode = 'none' | 'blur' | 'image';

export function useVirtualBackground(sourceTrack: MediaStreamTrack | null) {
    const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('none');
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>('');
    const [processedTrack, setProcessedTrack] = useState<MediaStreamTrack | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const bgImageRef = useRef<HTMLImageElement | null>(null);
    const segmentationRef = useRef<any>(null);
    const rafIdRef = useRef<number>(0);
    const isActiveRef = useRef<boolean>(false);
    const bgModeRef = useRef<BackgroundMode>('none');

    useEffect(() => {
        isActiveRef.current = backgroundMode !== 'none';
        bgModeRef.current = backgroundMode;
    }, [backgroundMode]);

    // Initialize canvas, video, background image, and MediaPipe model once
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        canvasRef.current = canvas;

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        videoRef.current = video;

        const bgImage = new Image();
        bgImage.crossOrigin = "anonymous";
        bgImageRef.current = bgImage;

        let isComponentMounted = true;

        import('@mediapipe/selfie_segmentation').then(({ SelfieSegmentation }) => {
            if (!isComponentMounted) return;

            const segmentation = new SelfieSegmentation({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
            });

            segmentation.setOptions({
                modelSelection: 1,
                selfieMode: false,
            });

            segmentation.onResults((results: any) => {
                if (!canvasRef.current) return;
                const ctx = canvasRef.current.getContext('2d');
                if (!ctx) return;

                ctx.save();
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                const active = isActiveRef.current;
                const mode = bgModeRef.current;

                if (!active) {
                    ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
                    ctx.restore();
                    return;
                }

                // Draw segmented mask
                ctx.globalCompositeOperation = 'copy';
                ctx.filter = 'blur(4px)';
                ctx.drawImage(results.segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height);

                // Draw original video over foreground mask
                ctx.globalCompositeOperation = 'source-in';
                ctx.filter = 'none';
                ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

                // Draw background behind person
                ctx.globalCompositeOperation = 'destination-over';

                if (mode === 'blur') {
                    ctx.filter = 'blur(12px)';
                    ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
                } else if (mode === 'image' && bgImageRef.current?.complete && bgImageRef.current.naturalWidth > 0) {
                    ctx.filter = 'none';
                    const cw = canvasRef.current.width;
                    const ch = canvasRef.current.height;
                    const iw = bgImageRef.current.width;
                    const ih = bgImageRef.current.height;
                    const aspectCanvas = cw / ch;
                    const aspectImage = iw / ih;

                    let dw = cw, dh = ch, dx = 0, dy = 0;
                    if (aspectImage > aspectCanvas) {
                        dh = ch;
                        dw = dh * aspectImage;
                        dx = (cw - dw) / 2;
                    } else {
                        dw = cw;
                        dh = dw / aspectImage;
                        dy = (ch - dh) / 2;
                    }
                    ctx.drawImage(bgImageRef.current, dx, dy, dw, dh);
                } else {
                    ctx.filter = 'none';
                    ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
                }

                ctx.restore();
            });

            segmentationRef.current = segmentation;
        });

        return () => {
            isComponentMounted = false;
            if (segmentationRef.current) segmentationRef.current.close();
        };
    }, []);

    // Update background image when URL changes
    useEffect(() => {
        if (bgImageRef.current && backgroundImageUrl) {
            bgImageRef.current.src = backgroundImageUrl;
        }
    }, [backgroundImageUrl]);

    // Main effect: attach source track to hidden video and start rAF loop
    useEffect(() => {
        if (!sourceTrack || !videoRef.current) {
            setProcessedTrack(sourceTrack);
            return;
        }

        const video = videoRef.current;
        const stream = new MediaStream([sourceTrack]);
        video.srcObject = stream;
        video.play().catch(() => { });

        let stopped = false;

        const setup = async () => {
            // Wait for MediaPipe model to be ready
            let attempts = 0;
            while (!segmentationRef.current && attempts < 30) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }

            if (!segmentationRef.current || stopped) {
                setProcessedTrack(sourceTrack);
                return;
            }

            // Start the rAF render loop
            const tick = async () => {
                if (stopped) return;
                if (video.readyState >= 2 && segmentationRef.current) {
                    try {
                        await segmentationRef.current.send({ image: video });
                    } catch {
                        // ignore dropped frames
                    }
                }
                rafIdRef.current = requestAnimationFrame(tick);
            };
            rafIdRef.current = requestAnimationFrame(tick);

            // Capture canvas as stream and expose the track
            if (canvasRef.current) {
                const outStream = canvasRef.current.captureStream(30);
                setProcessedTrack(outStream.getVideoTracks()[0]);
            }
        };

        setup();

        return () => {
            stopped = true;
            cancelAnimationFrame(rafIdRef.current);
        };
    }, [sourceTrack]);

    return {
        processedTrack,
        backgroundMode,
        setBackgroundMode,
        backgroundImageUrl,
        setBackgroundImageUrl,
    };
}
