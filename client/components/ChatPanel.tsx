"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Smile, Paperclip, ChevronDown, Image as ImageIcon } from "lucide-react";

// ── Types ──
export interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    isLocal?: boolean;
    messageType?: "text" | "image";
    imageData?: string; // base64 data URL for images
}

interface ChatPanelProps {
    messages: ChatMessage[];
    onSend: (text: string, messageType?: "text" | "image", imageData?: string) => void;
    onClose: () => void;
    localUsername: string;
}

// ── Emoji Data ──
const emojiCategories = [
    {
        name: "Smileys",
        emojis: ["😀", "😁", "😂", "🤣", "😊", "😇", "😍", "🤩", "😘", "😋", "😜", "🤔", "🤫", "😏", "😢", "😭", "😤", "😱", "🤯", "😴", "🥳", "😎", "🤓", "🥺", "😈", "💀", "🤡", "👻", "😺", "🙈"],
    },
    {
        name: "Gestures",
        emojis: ["👋", "🤚", "✋", "🖐️", "👌", "🤌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "👍", "👎", "✊", "👊", "🤛", "🙌", "👏", "🤝", "🙏", "💪", "🦾", "🖕", "✍️", "🤳", "💅"],
    },
    {
        name: "Hearts",
        emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "❣️", "💌", "🫶", "🥰", "😍", "😘", "😻", "💑", "💏", "🌹"],
    },
    {
        name: "Objects",
        emojis: ["🔥", "⭐", "✨", "💫", "🌟", "⚡", "💥", "🎉", "🎊", "🏆", "🎯", "🎮", "🎧", "🎤", "🎬", "📱", "💻", "⌨️", "🖥️", "📷", "🔔", "📌", "📎", "✏️", "📝", "💡", "🔑", "🚀", "💎", "🍕"],
    },
];

// ── Component ──
export function ChatPanel({ messages, onSend, onClose, localUsername }: ChatPanelProps) {
    const [input, setInput] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [emojiCat, setEmojiCat] = useState(0);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (!showScrollBtn) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, showScrollBtn]);

    // Track scroll position
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const handleScroll = () => {
            const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            setShowScrollBtn(distFromBottom > 100);
        };
        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, []);

    // Close emoji picker on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
                setShowEmoji(false);
            }
        };
        if (showEmoji) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showEmoji]);

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = () => {
        if (imagePreview) {
            onSend("📷 Image", "image", imagePreview);
            setImagePreview(null);
            return;
        }
        const trimmed = input.trim();
        if (!trimmed) return;
        onSend(trimmed, "text");
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleEmojiClick = (emoji: string) => {
        setInput(prev => prev + emoji);
        setShowEmoji(false);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be under 5MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        // Reset so same file can be re-selected
        e.target.value = "";
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    // Check if two messages should be grouped (same sender, <2 min apart)
    const shouldGroup = (curr: ChatMessage, prev?: ChatMessage) => {
        if (!prev) return false;
        if (curr.sender !== prev.sender) return false;
        if (curr.isLocal !== prev.isLocal) return false;
        if (curr.timestamp - prev.timestamp > 120000) return false;
        return true;
    };

    const [lightboxImg, setLightboxImg] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-full bg-background/95 backdrop-blur-xl border-l border-border relative">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">💬 Chat</h3>
                    <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">
                        {messages.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <X size={16} />
                </button>
            </div>

            {/* ── Messages ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                        <span className="text-3xl">💬</span>
                        <p className="text-xs font-medium">No messages yet</p>
                        <p className="text-[10px]">Say hi to your teammates! 👋</p>
                    </div>
                )}
                {messages.map((msg, i) => {
                    const grouped = shouldGroup(msg, messages[i - 1]);

                    return (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${msg.isLocal ? "items-end" : "items-start"} ${grouped ? "" : "mt-3"}`}
                        >
                            {/* Sender + time (only for ungrouped) */}
                            {!grouped && (
                                <div className="flex items-center gap-1.5 mb-1 px-1">
                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                        {msg.isLocal ? "You" : msg.sender}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/50">
                                        {formatTime(msg.timestamp)}
                                    </span>
                                </div>
                            )}

                            {/* Image message */}
                            {msg.messageType === "image" && msg.imageData ? (
                                <div
                                    className={`max-w-[85%] rounded-2xl overflow-hidden border border-border/50 cursor-pointer hover:opacity-90 transition-opacity ${msg.isLocal ? "rounded-br-md" : "rounded-bl-md"
                                        }`}
                                    onClick={() => setLightboxImg(msg.imageData!)}
                                >
                                    <img
                                        src={msg.imageData}
                                        alt="Shared"
                                        className="max-h-48 object-cover"
                                        loading="lazy"
                                    />
                                </div>
                            ) : (
                                /* Text message */
                                <div
                                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${msg.isLocal
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-muted text-foreground rounded-bl-md"
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollBtn && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold shadow-lg hover:opacity-90 transition-all animate-in fade-in slide-in-from-bottom-2"
                >
                    <ChevronDown size={14} /> New messages
                </button>
            )}

            {/* ── Image Preview ── */}
            {imagePreview && (
                <div className="px-3 py-2 border-t border-border bg-muted/30 shrink-0">
                    <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview" className="max-h-24 rounded-lg border border-border" />
                        <button
                            onClick={() => setImagePreview(null)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] font-bold hover:opacity-80"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* ── Input Area ── */}
            <div className="shrink-0 px-3 py-3 border-t border-border">
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-xl px-2 py-1.5 border border-border focus-within:ring-2 ring-primary/30 transition-all">
                    {/* Emoji button */}
                    <div className="relative" ref={emojiRef}>
                        <button
                            onClick={() => setShowEmoji(!showEmoji)}
                            className={`p-1.5 rounded-lg transition-colors ${showEmoji ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                            title="Emoji"
                        >
                            <Smile size={18} />
                        </button>

                        {/* Emoji Picker */}
                        {showEmoji && (
                            <div className="absolute bottom-full left-0 mb-2 w-72 bg-background border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                                {/* Category tabs */}
                                <div className="flex border-b border-border">
                                    {emojiCategories.map((cat, i) => (
                                        <button
                                            key={cat.name}
                                            onClick={() => setEmojiCat(i)}
                                            className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${i === emojiCat
                                                ? "text-primary border-b-2 border-primary bg-primary/5"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                                {/* Emoji grid */}
                                <div className="grid grid-cols-8 gap-0.5 p-2 max-h-44 overflow-y-auto">
                                    {emojiCategories[emojiCat].emojis.map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => handleEmojiClick(emoji)}
                                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-lg leading-none"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Attachment button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Send image"
                    >
                        <Paperclip size={18} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                    />

                    {/* Text input */}
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={imagePreview ? "Send image..." : "Type a message..."}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 min-w-0"
                        maxLength={500}
                    />

                    {/* Send button */}
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() && !imagePreview}
                        className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-all"
                    >
                        <Send size={15} />
                    </button>
                </div>
            </div>

            {/* ── Lightbox ── */}
            {lightboxImg && (
                <div
                    className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-150"
                    onClick={() => setLightboxImg(null)}
                >
                    <img
                        src={lightboxImg}
                        alt="Full view"
                        className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                    />
                    <button
                        className="absolute top-6 right-6 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
                        onClick={() => setLightboxImg(null)}
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
