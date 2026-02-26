"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";

export interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    isLocal?: boolean;
}

interface ChatPanelProps {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    onClose: () => void;
    localUsername: string;
}

export function ChatPanel({ messages, onSend, onClose, localUsername }: ChatPanelProps) {
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        onSend(trimmed);
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="flex flex-col h-full bg-background/95 backdrop-blur-xl border-l border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold">In-call Chat</h3>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                        No messages yet. Say hi! 👋
                    </div>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col ${msg.isLocal ? "items-end" : "items-start"}`}
                    >
                        <div className="flex items-center gap-1.5 mb-0.5 px-1">
                            <span className="text-[10px] font-medium text-muted-foreground">
                                {msg.isLocal ? "You" : msg.sender}
                            </span>
                            <span className="text-[9px] text-muted-foreground/60">
                                {formatTime(msg.timestamp)}
                            </span>
                        </div>
                        <div
                            className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${msg.isLocal
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted text-foreground rounded-bl-md"
                                }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 py-3 border-t border-border">
                <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border focus-within:ring-2 ring-primary/30 transition-all">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                        maxLength={500}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-all"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
