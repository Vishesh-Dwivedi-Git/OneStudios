"use client";

import { useState } from "react";
import { Copy, Check, Share2, X } from "lucide-react";

interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
    inviteCode?: string;
}

export function ShareDialog({ isOpen, onClose, roomId, inviteCode }: ShareDialogProps) {
    const [copied, setCopied] = useState<"link" | "code" | null>(null);

    if (!isOpen) return null;

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareLink = inviteCode
        ? `${baseUrl}/join/${inviteCode}`
        : `${baseUrl}/call/${roomId}`;

    const handleCopy = async (text: string, type: "link" | "code") => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement("input");
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            document.body.removeChild(input);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[90vw]">
                <div className="bg-background border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/15 p-2 rounded-xl text-primary">
                                <Share2 size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Share Meeting</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-muted transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        {/* Invite Link */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Invite Link</label>
                            <div className="flex items-center gap-2 p-1 bg-muted/50 border border-border/50 rounded-xl">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareLink}
                                    className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm font-mono truncate"
                                />
                                <button
                                    onClick={() => handleCopy(shareLink, "link")}
                                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${copied === "link"
                                            ? "bg-green-500/15 text-green-600"
                                            : "bg-primary text-primary-foreground hover:opacity-90"
                                        }`}
                                >
                                    {copied === "link" ? <Check size={16} /> : <Copy size={16} />}
                                    {copied === "link" ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        {/* Invite Code */}
                        {inviteCode && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Invite Code</label>
                                <div className="flex items-center gap-2 p-1 bg-muted/50 border border-border/50 rounded-xl">
                                    <span className="flex-1 px-3 py-2 text-2xl font-bold tracking-[0.25em] text-center font-mono">
                                        {inviteCode}
                                    </span>
                                    <button
                                        onClick={() => handleCopy(inviteCode, "code")}
                                        className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${copied === "code"
                                                ? "bg-green-500/15 text-green-600"
                                                : "bg-foreground text-background hover:opacity-90"
                                            }`}
                                    >
                                        {copied === "code" ? <Check size={16} /> : <Copy size={16} />}
                                        {copied === "code" ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground text-center pt-2">
                            Anyone with this link can join the meeting
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
