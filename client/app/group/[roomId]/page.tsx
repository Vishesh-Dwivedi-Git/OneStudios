"use client";

import { useGroupWebRTC } from "@/hooks/use-group-webrtc";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CallControls } from "@/components/CallControls";
import { ParticipantList } from "@/components/ParticipantList";
import { ShareDialog } from "@/components/ShareDialog";
import { CallThemeSwitcher, useCallTheme } from "@/components/CallThemeSwitcher";
import { useState, useEffect, use } from "react";
import { Loader2, Users, Shield, Clock, LayoutGrid, Maximize, UserRound, Share2 } from "lucide-react";
import { apiRequest } from "@/lib/api";

type ViewMode = "gallery" | "speaker";

export default function GroupCallPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const {
        callState,
        localStream,
        remotePeers,
        participantCount,
        isAudioMuted,
        isVideoOff,
        isScreenSharing,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        errorMessage,
        endCall,
    } = useGroupWebRTC(roomId);

    const [time, setTime] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>("gallery");
    const [showParticipants, setShowParticipants] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | undefined>();
    const [showShare, setShowShare] = useState(false);
    const { theme, setTheme } = useCallTheme();

    useEffect(() => {
        const timer = setInterval(() => setTime((p) => p + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        apiRequest(`/rooms/${roomId}`, undefined, "GET")
            .then((room) => setInviteCode(room.inviteCode))
            .catch(() => { });
    }, [roomId]);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // ── Loading State ──
    if (callState === "joining") {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p className="text-xl font-medium animate-pulse">Joining Group Call...</p>
            </div>
        );
    }

    // ── Error State ──
    if (callState === "error") {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-4 p-6 text-center">
                <div className="bg-destructive/10 p-6 rounded-full text-destructive mb-4">
                    <Users size={64} />
                </div>
                <h1 className="text-2xl font-bold">Connection Failed</h1>
                <p className="text-muted-foreground max-w-sm">
                    {errorMessage || "We couldn't establish a connection to the meeting."}
                </p>
                <button
                    onClick={() => (window.location.href = "/")}
                    className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium shadow-soft hover:opacity-90 transition-all"
                >
                    Return to Home
                </button>
            </div>
        );
    }

    // ── Dynamic grid classes based on participant count ──
    const totalParticipants = remotePeers.length + 1;
    const activeSpeaker = remotePeers[0]; // Placeholder for real speaker detection

    const presentationPeer = remotePeers.find((p) => p.isScreen);
    const isPresentationMode = !!presentationPeer;

    const getGridClass = (count: number) => {
        if (count <= 1) return "grid-cols-1";
        if (count === 2) return "grid-cols-1 lg:grid-cols-2";
        if (count <= 4) return "grid-cols-2";
        if (count <= 6) return "grid-cols-2 lg:grid-cols-3";
        if (count <= 9) return "grid-cols-3";
        return "grid-cols-3 lg:grid-cols-4";
    }

    // ── Speaker View: largest tile + thumbnail strip ──
    // TODO: detect actual active speaker via audio levels

    return (
        <div className={`min-h-screen transition-all duration-700 ${theme.bgClass} flex flex-col overflow-hidden ${theme.textClass}`}>
            {/* ── Header ── */}
            <header className={`h-16 shrink-0 flex items-center justify-between px-4 sm:px-8 ${theme.glassClass} border-b border-black/5 dark:border-white/10 z-[60] relative transition-colors duration-500`}>
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-lg">
                        <Users className="text-primary" size={24} />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-base sm:text-lg leading-tight">OneStudios Group</h1>
                        <p className="text-[10px] sm:text-xs opacity-60 font-medium">#{roomId.slice(0, 8)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <div className={`hidden md:flex items-center gap-6 ${theme.glassClass} px-4 py-1.5 rounded-full border border-black/5 dark:border-white/5`}>
                        <div className="flex items-center gap-2 text-xs font-bold opacity-90">
                            <Clock size={14} className="text-primary" />
                            <span>{formatTime(time)}</span>
                        </div>
                        <div className="w-px h-3 bg-current opacity-20" />
                        <div className="flex items-center gap-2 text-xs font-bold opacity-90">
                            <UserRound size={14} className="text-primary" />
                            <span>{participantCount}</span>
                        </div>
                    </div>
                    {remotePeers.length === 0 && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                            <div className={`${theme.glassClass} border border-current/10 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl animate-pulse`}>
                                <Users size={14} className="text-primary" />
                                <span className={`text-[10px] font-bold uppercase tracking-widest leading-none opacity-80`}>Waiting for others to join...</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2 sm:gap-3 bg-current/5 p-1 rounded-xl border border-black/5 dark:border-white/10 shadow-inner">
                        <CallThemeSwitcher currentThemeId={theme.id} onSelect={setTheme} />
                        <div className="w-px h-6 bg-current opacity-10 hidden sm:block" />
                        <button
                            onClick={() => setShowShare(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/20 transition-all border border-transparent hover:border-primary/30"
                            title="Invite Participants"
                        >
                            <Share2 size={16} />
                            <span className="hidden sm:inline">Invite</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col p-3 sm:p-4 md:p-6 overflow-hidden relative">
                {/* Error Monitoring Toast */}
                {errorMessage && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
                        <div className="bg-destructive/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3">
                            <Shield size={20} className="animate-pulse" />
                            <span className="text-sm font-bold">{errorMessage}</span>
                            <button onClick={() => window.location.reload()} className="ml-2 underline text-xs decoration-white/30 hover:decoration-white font-black">Reload</button>
                        </div>
                    </div>
                )}

                {/* ── Video Area ── */}
                <div className="flex-1 min-h-0 relative">
                    {isPresentationMode ? (
                        <div className="h-full flex flex-col gap-3">
                            <div className="flex-1 min-h-0">
                                <VideoPlayer stream={presentationPeer.stream} label={`${presentationPeer.userId.slice(0, 8)}'s Screen`} />
                            </div>
                            <div className="flex gap-3 h-28 md:h-36 shrink-0 overflow-x-auto pb-2">
                                <div className="aspect-video h-full shrink-0">
                                    <VideoPlayer stream={localStream} label="You" isLocal isMuted={isAudioMuted} />
                                </div>
                                {remotePeers
                                    .filter((p) => p.peerId !== presentationPeer.peerId)
                                    .map((peer) => (
                                        <div key={peer.peerId} className="aspect-video h-full shrink-0">
                                            <VideoPlayer stream={peer.stream} label={peer.userId.slice(0, 8)} />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ) : viewMode === "gallery" ? (
                        <div className={`h-full w-full grid gap-3 md:gap-4 ${getGridClass(totalParticipants)} auto-rows-fr`}>
                            <div className="min-h-0">
                                <VideoPlayer stream={localStream} label="You" isLocal isMuted={isAudioMuted} />
                            </div>
                            {remotePeers.map((peer) => (
                                <div key={peer.peerId} className="min-h-0">
                                    <VideoPlayer stream={peer.stream} label={peer.userId.slice(0, 8)} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col gap-3">
                            <div className="flex-1 min-h-0">
                                {activeSpeaker ? (
                                    <VideoPlayer stream={activeSpeaker.stream} label={activeSpeaker.userId.slice(0, 8)} />
                                ) : (
                                    <VideoPlayer stream={localStream} label="You" isLocal isMuted={isAudioMuted} />
                                )}
                            </div>
                            <div className="flex gap-3 h-28 md:h-36 shrink-0 overflow-x-auto">
                                {activeSpeaker && (
                                    <div className="aspect-video h-full shrink-0">
                                        <VideoPlayer stream={localStream} label="You" isLocal isMuted={isAudioMuted} />
                                    </div>
                                )}
                                {remotePeers
                                    .filter((p) => p.peerId !== activeSpeaker?.peerId)
                                    .map((peer) => (
                                        <div key={peer.peerId} className="aspect-video h-full shrink-0">
                                            <VideoPlayer stream={peer.stream} label={peer.userId.slice(0, 8)} />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-24" /> {/* ── Controls ── */}
                <CallControls
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isScreenSharing={isScreenSharing}
                    glassClass={theme.glassClass}
                    onToggleAudio={toggleAudio}
                    onToggleVideo={toggleVideo}
                    onToggleScreenShare={toggleScreenShare}
                    onEndCall={endCall}
                />

                {callState === "disconnected" && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-destructive text-white px-4 py-2 rounded-full shadow-lg z-50 animate-bounce text-sm font-medium">
                        Connection Interrupted
                    </div>
                )}
            </main>

            <ParticipantList
                isOpen={showParticipants}
                onClose={() => setShowParticipants(false)}
                participants={[
                    { peerId: "local", userId: "You", isLocal: true, isMuted: isAudioMuted },
                    ...remotePeers.map((p) => ({ peerId: p.peerId, userId: p.userId })),
                ]}
            />

            {inviteCode && (
                <ShareDialog
                    isOpen={showShare}
                    onClose={() => setShowShare(false)}
                    roomId={roomId}
                    inviteCode={inviteCode}
                />
            )}
        </div>
    );
}
