"use client";

import { useState, useCallback, useEffect } from "react";
import { Palette, Check, X } from "lucide-react";

// ─── Theme Definitions ──────────────────────────────────
export interface CallTheme {
    id: string;
    name: string;
    /** CSS applied to the call page background */
    bgClass: string;
    /** text color class (e.g., text-foreground or text-white) */
    textClass: string;
    /** glass utility to use in header/controls */
    glassClass: string;
    /** Extra styles for the overlay layer */
    overlayStyle?: React.CSSProperties;
    /** Preview gradient for the theme picker */
    preview: string;
}

export const CALL_THEMES: CallTheme[] = [
    {
        id: "default",
        name: "System / Default",
        bgClass: "bg-background",
        textClass: "text-foreground",
        glassClass: "glass-light",
        preview: "linear-gradient(135deg, #ffffff, #f4f4f5)",
    },
    {
        id: "midnight",
        name: "Midnight Blue",
        bgClass: "call-theme-midnight",
        textClass: "text-white",
        glassClass: "glass-dark",
        preview: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    },
    {
        id: "aurora",
        name: "Aurora Borealis",
        bgClass: "call-theme-aurora",
        textClass: "text-white",
        glassClass: "glass-dark",
        preview: "linear-gradient(135deg, #0a0e27, #1a3a4a, #0d4a3a, #1a0e27)",
    },
    {
        id: "sunset",
        name: "Sunset Ember",
        bgClass: "call-theme-sunset",
        textClass: "text-white",
        glassClass: "glass-dark",
        preview: "linear-gradient(135deg, #1a0000, #2d1b0e, #1a0f2e)",
    },
    {
        id: "ocean",
        name: "Deep Ocean",
        bgClass: "call-theme-ocean",
        textClass: "text-white",
        glassClass: "glass-dark",
        preview: "linear-gradient(135deg, #000428, #004e92, #000428)",
    },
    {
        id: "forest",
        name: "Forest Night",
        bgClass: "call-theme-forest",
        textClass: "text-white",
        glassClass: "glass-dark",
        preview: "linear-gradient(135deg, #0a1f0a, #1a3a1a, #0a2f0a)",
    },
    {
        id: "neon",
        name: "Neon Pulse",
        bgClass: "call-theme-neon",
        textClass: "text-white",
        glassClass: "glass-dark",
        preview: "linear-gradient(135deg, #0a0015, #1a0030, #000a20)",
    },
    {
        id: "minimal",
        name: "Clean Slate",
        bgClass: "call-theme-minimal",
        textClass: "text-white",
        glassClass: "glass-dark",
        preview: "linear-gradient(135deg, #1e1e2e, #2a2a3a)",
    },
    {
        id: "concrete",
        name: "Concrete Wall",
        bgClass: "call-theme-concrete",
        textClass: "text-foreground",
        glassClass: "glass-light",
        preview: "url('/backgrounds/concrete-wall.png')",
    },
    {
        id: "cozy",
        name: "Cozy Room",
        bgClass: "call-theme-cozy",
        textClass: "text-foreground",
        glassClass: "glass-light",
        preview: "url('/backgrounds/cozy-room.png')",
    },
    {
        id: "white",
        name: "White Wall",
        bgClass: "call-theme-white",
        textClass: "text-foreground",
        glassClass: "glass-light",
        preview: "url('/backgrounds/white-wall.png')",
    },
];

// ─── Hook ───────────────────────────────────────────────
export function useCallTheme() {
    const [themeId, setThemeId] = useState("default");

    useEffect(() => {
        const saved = localStorage.getItem("call-theme");
        if (saved) setThemeId(saved);
    }, []);

    const setTheme = useCallback((id: string) => {
        setThemeId(id);
        localStorage.setItem("call-theme", id);
    }, []);

    const theme = CALL_THEMES.find((t) => t.id === themeId) || CALL_THEMES[0];
    return { theme, setTheme };
}

// ─── Theme Switcher Component ───────────────────────────
interface CallThemeSwitcherProps {
    currentThemeId: string;
    onSelect: (id: string) => void;
}

export function CallThemeSwitcher({ currentThemeId, onSelect }: CallThemeSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isOpen ? "bg-primary/20 text-primary border border-primary/30" : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent"
                    }`}
                title="Change Background Theme"
            >
                <Palette size={16} />
                <span className="hidden sm:inline">Theme</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-12 z-[70] w-64 bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between p-3 border-b border-border/40">
                            <span className="text-sm font-semibold">Background Theme</span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-2 grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                            {CALL_THEMES.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => {
                                        onSelect(theme.id);
                                        setIsOpen(false);
                                    }}
                                    className={`relative rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95 ${currentThemeId === theme.id
                                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                        : "ring-1 ring-white/10 hover:ring-white/30"
                                        }`}
                                >
                                    <div
                                        className="h-16 w-full bg-cover bg-center"
                                        style={{ background: theme.preview.includes('url') ? `${theme.preview} center/cover` : theme.preview }}
                                    />
                                    <div className="px-2 py-1.5 text-xs font-medium text-left truncate flex items-center gap-1">
                                        {currentThemeId === theme.id && (
                                            <Check size={12} className="text-primary shrink-0" />
                                        )}
                                        <span className="truncate">{theme.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
