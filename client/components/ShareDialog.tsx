"use client";

import { useState } from "react";
import { Copy, Check, Share2, X, ExternalLink } from "lucide-react";

interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
    inviteCode?: string;
}

// ── Social share platforms ──
const socialPlatforms = [
    {
        name: "WhatsApp",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
        ),
        color: "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border-[#25D366]/20",
        getUrl: (link: string) => `https://wa.me/?text=${encodeURIComponent(`Join my OneStudios meeting: ${link}`)}`,
    },
    {
        name: "Telegram",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
        ),
        color: "bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 border-[#0088cc]/20",
        getUrl: (link: string) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join my OneStudios meeting!")}`,
    },
    {
        name: "Twitter",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
        color: "bg-foreground/10 text-foreground hover:bg-foreground/20 border-foreground/20",
        getUrl: (link: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent("Join my OneStudios meeting!")}&url=${encodeURIComponent(link)}`,
    },
    {
        name: "LinkedIn",
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
        ),
        color: "bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 border-[#0A66C2]/20",
        getUrl: (link: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
    },
    {
        name: "Email",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
        ),
        color: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20",
        getUrl: (link: string) => `mailto:?subject=${encodeURIComponent("Join my OneStudios Meeting")}&body=${encodeURIComponent(`Hey! Join my meeting on OneStudios:\n\n${link}`)}`,
    },
    {
        name: "SMS",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                <path d="M8 12h.01" /><path d="M12 12h.01" /><path d="M16 12h.01" />
            </svg>
        ),
        color: "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border-violet-500/20",
        getUrl: (link: string) => `sms:?body=${encodeURIComponent(`Join my OneStudios meeting: ${link}`)}`,
    },
];

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

    const handleShare = (getUrl: (link: string) => string) => {
        const url = getUrl(shareLink);
        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[460px] max-w-[92vw]">
                <div className="bg-background border border-border/60 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-border/40">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/15 p-2.5 rounded-xl text-primary">
                                <Share2 size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Share Meeting</h2>
                                <p className="text-xs text-muted-foreground">Invite others to join</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-muted transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-5">
                        {/* Invite Link */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invite Link</label>
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
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invite Code</label>
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

                        {/* Social Share Section */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Share via</label>
                            <div className="grid grid-cols-3 gap-2">
                                {socialPlatforms.map((platform) => (
                                    <button
                                        key={platform.name}
                                        onClick={() => handleShare(platform.getUrl)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${platform.color}`}
                                    >
                                        {platform.icon}
                                        <span className="truncate">{platform.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground text-center pt-1">
                            Anyone with this link can join the meeting
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
