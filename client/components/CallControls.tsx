"use client";

import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, MoreVertical } from "lucide-react";

interface CallControlsProps {
    isAudioMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing?: boolean;
    glassClass?: string;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare?: () => void;
    onEndCall: () => void;
}

export function CallControls({
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    glassClass = "glass-light",
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onEndCall,
}: CallControlsProps) {
    return (
        <div className={`fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl ${glassClass} border border-black/5 dark:border-white/10 shadow-2xl z-50 animate-in slide-in-from-bottom-10 duration-500`}>
            <button
                onClick={onToggleAudio}
                className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 ${isAudioMuted ? "bg-destructive text-white" : "text-foreground hover:bg-current/10"
                    }`}
                title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
            >
                {isAudioMuted ? <MicOff size={20} className="sm:w-6 sm:h-6" /> : <Mic size={20} className="sm:w-6 sm:h-6" />}
            </button>

            <button
                onClick={onToggleVideo}
                className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 ${isVideoOff ? "bg-destructive text-white" : "text-foreground hover:bg-current/10"
                    }`}
                title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
            >
                {isVideoOff ? <VideoOff size={20} className="sm:w-6 sm:h-6" /> : <Video size={20} className="sm:w-6 sm:h-6" />}
            </button>

            <button
                onClick={onToggleScreenShare}
                className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 ${isScreenSharing ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-current/10"
                    }`}
                title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
            >
                <ScreenShare size={20} className="sm:w-6 sm:h-6" />
            </button>

            <button
                onClick={onEndCall}
                className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-destructive text-white hover:bg-red-600 transition-all shadow-xl font-bold group"
                title="Leave Meeting"
            >
                <PhoneOff size={20} className="sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
                <span className="hidden md:inline">Leave</span>
            </button>

            <div className="w-px h-8 bg-white/10 mx-1 sm:mx-2 hidden sm:block" />

            <button
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl text-foreground hover:bg-current/10 transition-all hidden sm:flex"
                title="More Actions"
            >
                <MoreVertical size={20} className="sm:w-6 sm:h-6" />
            </button>
        </div>
    );
}
