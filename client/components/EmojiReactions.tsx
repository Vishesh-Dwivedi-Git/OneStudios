"use client";

import { useState, useEffect, useCallback } from "react";

const REACTION_EMOJIS = ["👏", "🎉", "❤️", "😂", "🔥", "👍"];

interface FloatingEmoji {
    id: string;
    emoji: string;
    x: number; // random horizontal position (%)
    sender?: string;
}

interface EmojiReactionsProps {
    onSendReaction: (emoji: string) => void;
    incomingReaction?: { emoji: string; sender: string } | null;
}

export function EmojiReactions({ onSendReaction, incomingReaction }: EmojiReactionsProps) {
    const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
    const [showBar, setShowBar] = useState(false);

    const addFloating = useCallback((emoji: string, sender?: string) => {
        const id = `${Date.now()}-${Math.random()}`;
        const x = 10 + Math.random() * 80; // 10-90% horizontal
        setFloatingEmojis(prev => [...prev, { id, emoji, x, sender }]);
        // Remove after animation ends
        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(e => e.id !== id));
        }, 3000);
    }, []);

    // Handle incoming remote reactions
    useEffect(() => {
        if (incomingReaction) {
            addFloating(incomingReaction.emoji, incomingReaction.sender);
        }
    }, [incomingReaction]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleClick = (emoji: string) => {
        addFloating(emoji, "You");
        onSendReaction(emoji);
        setShowBar(false);
    };

    return (
        <>
            {/* Floating emojis */}
            <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
                {floatingEmojis.map((fe) => (
                    <div
                        key={fe.id}
                        className="absolute animate-emoji-float"
                        style={{
                            left: `${fe.x}%`,
                            bottom: "10%",
                        }}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-4xl sm:text-5xl drop-shadow-lg">{fe.emoji}</span>
                            {fe.sender && (
                                <span className="text-[9px] font-bold text-white bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    {fe.sender}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Reaction trigger button */}
            <button
                onClick={() => setShowBar(prev => !prev)}
                className={`fixed bottom-28 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 ${showBar
                        ? "bg-primary text-primary-foreground scale-110"
                        : "bg-background/80 backdrop-blur-xl border border-border text-foreground hover:bg-muted"
                    }`}
                title="React"
            >
                <span className="text-xl">😊</span>
            </button>

            {/* Reaction bar */}
            {showBar && (
                <div className="fixed bottom-44 right-4 z-50 flex flex-col gap-2 bg-background/90 backdrop-blur-xl border border-border rounded-2xl p-2 shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-200">
                    {REACTION_EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => handleClick(emoji)}
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl hover:bg-muted hover:scale-125 transition-all active:scale-90"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* CSS for float animation */}
            <style jsx global>{`
                @keyframes emoji-float {
                    0% {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: translateY(-40vh) scale(1.3);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateY(-80vh) scale(0.8);
                        opacity: 0;
                    }
                }
                .animate-emoji-float {
                    animation: emoji-float 3s ease-out forwards;
                }
            `}</style>
        </>
    );
}
