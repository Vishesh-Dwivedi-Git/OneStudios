"use client";

import { useEffect, useRef } from "react";

interface VideoPlayerProps {
    stream: MediaStream | null;
    label: string;
    isLocal?: boolean;
    isMuted?: boolean;
    backgroundClass?: string;
}

export function VideoPlayer({ stream, label, isLocal = false, isMuted = false, backgroundClass }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={`video-container w-full h-full relative group shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden glass transition-all duration-300 hover:ring-2 ring-primary/40 ${backgroundClass || 'bg-muted/10'}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal || isMuted}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
            />

            {/* Glass Overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-60 pointer-events-none" />

            {/* Label Overlay */}
            <div className="video-label absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isLocal ? 'bg-primary' : 'bg-blue-400'}`} />
                    <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-[100px] sm:max-w-[200px]">
                        {label} {isLocal && "(You)"}
                    </span>
                </div>
            </div>

            {/* Mute Indicator Overlay */}
            {isMuted && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-destructive/90 p-2 sm:p-2.5 rounded-2xl text-white shadow-2xl backdrop-blur-md border border-white/20 animate-in zoom-in-50 duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px]"><path d="m12 19 3-3 3 3" /><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /><path d="m9 9 6 6" /><path d="m15 9-6 6" /></svg>
                </div>
            )}

            {/* Subtle highlight edge */}
            <div className="absolute inset-0 border border-white/10 pointer-events-none rounded-2xl md:rounded-3xl" />
        </div>
    );
}
