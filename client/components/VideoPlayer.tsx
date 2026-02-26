"use client";

import { useEffect, useRef } from "react";

interface VideoPlayerProps {
    stream: MediaStream | null;
    label: string;
    isLocal?: boolean;
    isMuted?: boolean;
    isVideoOff?: boolean;
    isScreenShare?: boolean;
    backgroundClass?: string;
}

export function VideoPlayer({ stream, label, isLocal = false, isMuted = false, isVideoOff = false, isScreenShare = false, backgroundClass }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={`video-container w-full h-full relative group shadow-sm rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-300 hover:ring-2 ring-ring ${backgroundClass || 'bg-muted/30 border border-border'}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal || isMuted}
                className={`w-full h-full ${isScreenShare ? 'object-contain bg-black' : 'object-cover'} transition-transform duration-700 ${isScreenShare ? '' : 'group-hover:scale-[1.02]'} ${isVideoOff ? 'hidden' : ''}`}
            />

            {/* Camera off overlay */}
            {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted border border-border flex items-center justify-center">
                        <span className="text-xl md:text-2xl font-bold text-muted-foreground uppercase">
                            {label.charAt(0)}
                        </span>
                    </div>
                </div>
            )}

            {/* Glass Overlay for depth */}
            {!isVideoOff && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-60 pointer-events-none" />
            )}

            {/* Label Overlay — compact */}
            <div className="video-label absolute bottom-2 left-2 z-10">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMuted ? 'bg-red-400' : isLocal ? 'bg-primary' : 'bg-emerald-400'}`} />
                    <span className="text-[10px] sm:text-xs font-medium text-white truncate max-w-[80px] sm:max-w-[140px]">
                        {label}{isLocal && " (You)"}
                    </span>
                </div>
            </div>

            {/* Mute Indicator — compact top-right badges */}
            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                {isMuted && (
                    <div className="bg-red-500/80 backdrop-blur-sm p-1 sm:p-1.5 rounded-lg text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18" />
                            <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    </div>
                )}
                {isVideoOff && (
                    <div className="bg-red-500/80 backdrop-blur-sm p-1 sm:p-1.5 rounded-lg text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Subtle highlight edge */}
            <div className="absolute inset-0 border border-border/50 pointer-events-none rounded-2xl md:rounded-3xl" />
        </div>
    );
}
