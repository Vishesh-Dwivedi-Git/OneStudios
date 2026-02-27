"use client";

import { useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { BackgroundMode } from "@/hooks/use-virtual-background";

interface VirtualBackgroundSelectorProps {
    currentMode: BackgroundMode;
    currentUrl: string;
    onSelect: (mode: BackgroundMode, url?: string) => void;
}

const BG_OPTIONS = [
    { id: "none", label: "None", mode: "none" as BackgroundMode },
    { id: "blur", label: "Blur", mode: "blur" as BackgroundMode },
    { id: "th1", label: "Office 1", mode: "image" as BackgroundMode, url: "/backgrounds/Th1.jpg" },
    { id: "th2", label: "Office 2", mode: "image" as BackgroundMode, url: "/backgrounds/Th2.jpg" },
    { id: "th3", label: "Living Room", mode: "image" as BackgroundMode, url: "/backgrounds/Th3.jpg" },
];

export function VirtualBackgroundSelector({ currentMode, currentUrl, onSelect }: VirtualBackgroundSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 ${currentMode !== "none" ? "bg-primary text-primary-foreground hover:opacity-90" : "text-foreground bg-muted/30 hover:bg-muted"}`}
                title="Virtual Background"
            >
                <ImageIcon size={18} className="sm:w-5 sm:h-5" />
            </button>

            {isOpen && (
                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50">
                    <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
                        <h3 className="font-semibold text-sm">Virtual Background</h3>
                        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-3 grid grid-cols-3 gap-2">
                        {BG_OPTIONS.map((opt) => {
                            const isActive = currentMode === opt.mode && (opt.mode !== "image" || currentUrl === opt.url);

                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        onSelect(opt.mode, opt.url);
                                        setIsOpen(false);
                                    }}
                                    className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all group ${isActive ? "border-primary" : "border-border hover:border-muted-foreground"}`}
                                >
                                    {opt.mode === "none" && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-muted text-xs font-medium text-muted-foreground">
                                            None
                                        </div>
                                    )}
                                    {opt.mode === "blur" && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-muted text-xs font-medium text-foreground backdrop-blur-md">
                                            Blur
                                        </div>
                                    )}
                                    {opt.mode === "image" && opt.url && (
                                        <img
                                            src={opt.url}
                                            alt={opt.label}
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    )}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none">
                                            <div className="w-2 h-2 rounded-full bg-primary" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
