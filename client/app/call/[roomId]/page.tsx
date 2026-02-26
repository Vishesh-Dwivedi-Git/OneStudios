"use client";

import { useWebRTC } from "@/hooks/use-webrtc";
import { useRecording } from "@/hooks/use-recording";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CallControls } from "@/components/CallControls";
import { ShareDialog } from "@/components/ShareDialog";
import { ChatPanel } from "@/components/ChatPanel";
import { useState, useEffect, use } from "react";
import { Video, Clock, Users, Share2, Shield, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function CallPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const {
        callState,
        localStream,
        remoteStream,
        remoteIsScreenSharing,
        remoteIsAudioMuted,
        remoteIsVideoOff,
        isAudioMuted,
        isVideoOff,
        isScreenSharing,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        errorMessage,
        chatMessages,
        remoteRecording,
        sendChatMessage,
        sendSignal,
        endCall,
    } = useWebRTC(roomId);

    const { isRecording, startRecording, stopRecording } = useRecording(roomId, "You");

    const [time, setTime] = useState(0);
    const [inviteCode, setInviteCode] = useState<string | undefined>();
    const [showShare, setShowShare] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setTime(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        apiRequest(`/rooms/${roomId}`, undefined, "GET")
            .then((room) => setInviteCode(room.inviteCode))
            .catch(() => { });
    }, [roomId]);

    // Track unread messages when chat is closed
    useEffect(() => {
        if (!showChat && chatMessages.length > 0) {
            const lastMsg = chatMessages[chatMessages.length - 1];
            if (!lastMsg.isLocal) {
                setUnreadCount(prev => prev + 1);
            }
        }
    }, [chatMessages.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleChat = () => {
        setShowChat(prev => !prev);
        if (!showChat) setUnreadCount(0);
    };

    // ── Canvas Composite Recording ──
    const handleToggleRecording = () => {
        if (isRecording) {
            stopRecording();
            sendSignal({ type: "recording-status", isRecording: false });
        } else {
            // Collect all available streams
            const streams: { stream: MediaStream; label: string }[] = [];
            if (localStream) streams.push({ stream: localStream, label: "You" });
            if (remoteStream) streams.push({ stream: remoteStream, label: "Remote" });
            startRecording(streams);
            sendSignal({ type: "recording-status", isRecording: true });
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (callState === "joining") {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p className="text-xl font-medium text-foreground animate-pulse">Joining Meeting...</p>
            </div>
        );
    }

    if (callState === "error") {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-4 p-6 text-center">
                <div className="bg-destructive/10 p-6 rounded-full text-destructive mb-4">
                    <Users size={64} />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Connection Failed</h1>
                <p className="text-muted-foreground max-w-sm">
                    {errorMessage || "We couldn't establish a connection to the meeting."}
                </p>
                <button
                    onClick={() => window.location.href = "/"}
                    className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all"
                >
                    Return to Home
                </button>
            </div>
        );
    }

    const leaveRoom = () => {
        if (isRecording) stopRecording();
        endCall();
        window.location.href = "/";
    };

    return (
        <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden relative">
            {/* Decorative blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
            </div>

            {/* ── Header ── */}
            <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-8 bg-background/80 backdrop-blur-xl border-b border-border z-50">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                        <Video className="text-primary" size={22} />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-base sm:text-lg leading-tight text-foreground">OneStudios Meeting</h1>
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">#{roomId.slice(0, 8)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isRecording && (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-bold text-red-500">REC</span>
                        </div>
                    )}
                    <div className="hidden md:flex items-center gap-4 bg-muted/50 px-4 py-1.5 rounded-full border border-border">
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                            <Clock size={14} className="text-primary" />
                            <span>{formatTime(time)}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowShare(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border hover:bg-muted transition-all text-foreground"
                        title="Invite Participant"
                    >
                        <Share2 size={16} />
                        <span className="hidden sm:inline">Invite</span>
                    </button>
                </div>
            </header>

            {/* ── Main Content ── */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video area */}
                <main className={`flex-1 flex flex-col p-3 sm:p-4 md:p-6 overflow-hidden relative transition-all duration-300 ${showChat ? 'mr-0' : ''}`}>
                    {/* Error Toast */}
                    {errorMessage && (
                        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100]">
                            <div className="bg-destructive text-destructive-foreground px-6 py-3 rounded-2xl shadow-lg border border-border flex items-center gap-3">
                                <Shield size={20} />
                                <span className="text-sm font-bold">{errorMessage}</span>
                                <button onClick={() => window.location.reload()} className="ml-2 underline text-xs font-black">Reload</button>
                            </div>
                        </div>
                    )}

                    {/* Remote Recording Notification */}
                    {remoteRecording && (
                        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 duration-300">
                            <div className="bg-red-500/10 border border-red-500/30 px-5 py-2.5 rounded-2xl shadow-lg flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-sm font-bold text-red-500">
                                    {remoteRecording.recorder} is recording this meeting
                                </span>
                            </div>
                        </div>
                    )}
                    {/* ── Video Grid ── */}
                    <div className="flex-1 min-h-0 relative">
                        <div className={`h-full w-full grid gap-4 md:gap-6 ${remoteStream ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
                            {remoteStream ? (
                                <div className="h-full min-h-0">
                                    <VideoPlayer stream={remoteStream} label="Remote Participant" isScreenShare={remoteIsScreenSharing} isMuted={remoteIsAudioMuted} isVideoOff={remoteIsVideoOff} />
                                </div>
                            ) : (
                                <div className="h-full relative flex flex-col items-center justify-center bg-muted/30 rounded-2xl border border-border overflow-hidden">
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                        <div className="bg-muted/50 border border-border px-4 py-1.5 rounded-full flex items-center gap-2">
                                            <Users size={14} className="text-primary" />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Waiting for participant...</span>
                                        </div>
                                    </div>
                                    <div className="bg-muted p-8 rounded-full text-muted-foreground border border-border z-10">
                                        <Users size={48} />
                                    </div>
                                </div>
                            )}

                            <div className={remoteStream ? "h-full min-h-0" : "absolute bottom-4 right-4 w-48 sm:w-64 md:w-80 h-auto aspect-video z-20"}>
                                <VideoPlayer
                                    stream={localStream}
                                    label="You"
                                    isLocal
                                    isMuted={isAudioMuted}
                                    isVideoOff={isVideoOff}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-20 shrink-0" />

                    <CallControls
                        isAudioMuted={isAudioMuted}
                        isVideoOff={isVideoOff}
                        isScreenSharing={isScreenSharing}
                        isRecording={isRecording}
                        unreadCount={unreadCount}
                        onToggleAudio={toggleAudio}
                        onToggleVideo={toggleVideo}
                        onToggleScreenShare={toggleScreenShare}
                        onToggleChat={toggleChat}
                        onToggleRecording={handleToggleRecording}
                        onEndCall={leaveRoom}
                    />

                    {callState === "disconnected" && (
                        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-full shadow-lg z-50 animate-bounce text-sm font-medium">
                            Connection Interrupted
                        </div>
                    )}
                </main>

                {/* Chat Panel */}
                {showChat && (
                    <aside className="w-80 shrink-0 h-full border-l border-border animate-in slide-in-from-right-10 duration-300">
                        <ChatPanel
                            messages={chatMessages}
                            onSend={sendChatMessage}
                            onClose={toggleChat}
                            localUsername="You"
                        />
                    </aside>
                )}
            </div>

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
