"use client";

import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, MessageSquare, Circle, MoreVertical } from "lucide-react";

interface CallControlsProps {
    isAudioMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing?: boolean;
    isRecording?: boolean;
    unreadCount?: number;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare?: () => void;
    onToggleChat?: () => void;
    onToggleRecording?: () => void;
    onEndCall: () => void;
}

export function CallControls({
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    isRecording,
    unreadCount = 0,
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onToggleChat,
    onToggleRecording,
    onEndCall,
}: CallControlsProps) {
    return (
        <div className={`fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl sm:rounded-3xl bg-background/80 backdrop-blur-2xl border border-border shadow-xl z-50 animate-in slide-in-from-bottom-10 duration-500`}>
            <button
                onClick={onToggleAudio}
                className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 ${isAudioMuted ? "bg-destructive text-destructive-foreground hover:opacity-90" : "text-foreground bg-muted/30 hover:bg-muted"
                    }`}
                title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
            >
                {isAudioMuted ? <MicOff size={18} className="sm:w-5 sm:h-5" /> : <Mic size={18} className="sm:w-5 sm:h-5" />}
            </button>

            <button
                onClick={onToggleVideo}
                className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 ${isVideoOff ? "bg-destructive text-destructive-foreground hover:opacity-90" : "text-foreground bg-muted/30 hover:bg-muted"
                    }`}
                title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
            >
                {isVideoOff ? <VideoOff size={18} className="sm:w-5 sm:h-5" /> : <Video size={18} className="sm:w-5 sm:h-5" />}
            </button>

            <button
                onClick={onToggleScreenShare}
                className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 ${isScreenSharing ? "bg-primary text-primary-foreground hover:opacity-90" : "text-foreground bg-muted/30 hover:bg-muted"
                    }`}
                title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
            >
                <ScreenShare size={18} className="sm:w-5 sm:h-5" />
            </button>

            {/* Chat Button */}
            <button
                onClick={onToggleChat}
                className="relative p-3 sm:p-3.5 rounded-xl sm:rounded-2xl text-foreground bg-muted/30 hover:bg-muted transition-all"
                title="Chat"
            >
                <MessageSquare size={18} className="sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center animate-in zoom-in-50">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Record Button */}
            <button
                onClick={onToggleRecording}
                className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 ${isRecording ? "bg-red-500 text-white hover:bg-red-600" : "text-foreground bg-muted/30 hover:bg-muted"
                    }`}
                title={isRecording ? "Stop Recording" : "Start Recording"}
            >
                <Circle size={18} className={`sm:w-5 sm:h-5 ${isRecording ? "fill-current animate-pulse" : ""}`} />
            </button>

            <button
                onClick={onEndCall}
                className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-destructive text-white hover:bg-red-600 transition-all shadow-xl font-bold group"
                title="Leave Meeting"
            >
                <PhoneOff size={18} className="sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" />
                <span className="hidden md:inline text-sm">Leave</span>
            </button>
        </div>
    );
}
