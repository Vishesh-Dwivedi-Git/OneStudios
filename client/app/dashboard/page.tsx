"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Clock, Users, Phone, TrendingUp, Video, ArrowLeft, Crown, Calendar, Timer } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface MeetingRecord {
    id: string;
    name: string;
    type: string;
    createdAt: string;
    endedAt: string | null;
    isActive: boolean;
    durationMs: number;
    participantCount: number;
    hostName: string;
    isHost: boolean;
}

interface Stats {
    totalMeetings: number;
    totalDurationMs: number;
    avgDurationMs: number;
    meetingsByType: Record<string, number>;
    recentMeetings: MeetingRecord[];
    dailyActivity: { date: string; count: number }[];
}

function formatDuration(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await apiRequest("/rooms/stats", undefined, "GET");
                setStats(data);
            } catch (e: any) {
                // If unauthorized, redirect to login
                if (e.message?.includes("Unauthorized") || e.message?.includes("No token")) {
                    router.replace("/auth/login");
                    return;
                }
                console.error("Failed to fetch stats:", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [router]);

    const maxActivity = stats ? Math.max(Math.max(...stats.dailyActivity.map(d => d.count)), 4) : 4; // Use at least 4 as denominator so 1-meeting days don't look like 100% height but still visible

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-muted-foreground text-sm">Loading analytics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push("/")} className="p-2 rounded-xl hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <BarChart3 className="text-primary" size={24} />
                                Meeting Analytics
                            </h1>
                            <p className="text-sm text-muted-foreground">Your personalized meeting insights</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            label: "Total Meetings",
                            value: stats?.totalMeetings ?? 0,
                            icon: Video,
                            color: "text-blue-500",
                            bgColor: "bg-blue-500/10",
                            borderColor: "border-blue-500/20",
                        },
                        {
                            label: "Total Time",
                            value: formatDuration(stats?.totalDurationMs ?? 0),
                            icon: Clock,
                            color: "text-violet-500",
                            bgColor: "bg-violet-500/10",
                            borderColor: "border-violet-500/20",
                        },
                        {
                            label: "Avg Duration",
                            value: formatDuration(stats?.avgDurationMs ?? 0),
                            icon: Timer,
                            color: "text-amber-500",
                            bgColor: "bg-amber-500/10",
                            borderColor: "border-amber-500/20",
                        },
                        {
                            label: "Meetings Hosted",
                            value: stats?.recentMeetings.filter(m => m.isHost).length ?? 0,
                            icon: Crown,
                            color: "text-emerald-500",
                            bgColor: "bg-emerald-500/10",
                            borderColor: "border-emerald-500/20",
                        },
                    ].map((card) => (
                        <div key={card.label} className={`relative overflow-hidden rounded-2xl border ${card.borderColor} bg-card p-5 hover:shadow-sm transition-all group`}>
                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                                    <p className={`text-3xl font-bold mt-1 ${card.color}`}>
                                        {card.value}
                                    </p>
                                </div>
                                <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                                    <card.icon size={20} className={card.color} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Activity Chart + Meeting Types ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity Chart */}
                    <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-bold text-foreground flex items-center gap-2">
                                <TrendingUp size={18} className="text-primary" />
                                Meeting Activity
                            </h2>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Last 30 days</span>
                        </div>
                        {stats && stats.totalMeetings > 0 ? (
                            <>
                                <div className="flex items-end gap-[3px] h-44">
                                    {stats.dailyActivity.map((day) => {
                                        const barH = Math.max((day.count / maxActivity) * 100, day.count > 0 ? 12 : 3);
                                        return (
                                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-md">
                                                    {day.date.slice(5)} — <strong>{day.count}</strong> {day.count === 1 ? "meeting" : "meetings"}
                                                </div>
                                                <div
                                                    className={`w-full rounded-md transition-all duration-300 ${day.count > 0 ? "bg-primary hover:bg-primary/80" : "bg-muted/40"}`}
                                                    style={{ height: `${barH}%`, minHeight: day.count > 0 ? "8px" : "3px" }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-3 px-1">
                                    <span className="text-[10px] text-muted-foreground font-mono">{stats.dailyActivity[0]?.date.slice(5)}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{stats.dailyActivity[stats.dailyActivity.length - 1]?.date.slice(5)}</span>
                                </div>
                            </>
                        ) : (
                            <div className="h-44 flex flex-col items-center justify-center text-muted-foreground">
                                <BarChart3 size={36} className="mb-3 opacity-20" />
                                <p className="text-sm">No meeting activity in the last 30 days</p>
                                <p className="text-xs mt-1 opacity-60">Start a call to see your activity chart!</p>
                            </div>
                        )}
                    </div>

                    {/* Meeting Types */}
                    <div className="rounded-2xl border border-border bg-card p-6">
                        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <Users size={18} className="text-primary" />
                            By Type
                        </h2>
                        <div className="space-y-4">
                            {Object.entries(stats?.meetingsByType ?? {}).map(([type, count]) => {
                                const total = stats?.totalMeetings ?? 1;
                                const pct = Math.round((count / total) * 100);
                                const colors: Record<string, string> = {
                                    ONE_TO_ONE: "bg-blue-500",
                                    GROUP: "bg-violet-500",
                                    VIRTUAL_ROOM: "bg-amber-500",
                                };
                                const labels: Record<string, string> = {
                                    ONE_TO_ONE: "1:1 Calls",
                                    GROUP: "Group Calls",
                                    VIRTUAL_ROOM: "Virtual Rooms",
                                };
                                return (
                                    <div key={type}>
                                        <div className="flex items-center justify-between text-sm mb-1.5">
                                            <span className="text-foreground font-medium">{labels[type] || type}</span>
                                            <span className="text-muted-foreground">{count} ({pct}%)</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${colors[type] || "bg-primary"} transition-all`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.keys(stats?.meetingsByType ?? {}).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">No meetings yet</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Recent Meetings ── */}
                <div className="rounded-2xl border border-border bg-card">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="font-bold text-foreground flex items-center gap-2">
                            <Calendar size={18} className="text-primary" />
                            Recent Meetings
                        </h2>
                    </div>
                    <div className="divide-y divide-border">
                        {stats?.recentMeetings.map((meeting) => (
                            <div key={meeting.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meeting.type === "ONE_TO_ONE" ? "bg-blue-500/10 text-blue-500" : meeting.type === "GROUP" ? "bg-violet-500/10 text-violet-500" : "bg-amber-500/10 text-amber-500"}`}>
                                        {meeting.type === "ONE_TO_ONE" ? <Phone size={18} /> : <Users size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{meeting.name || "Meeting"}</p>
                                        <p className="text-xs text-muted-foreground">{formatDate(meeting.createdAt)} · {meeting.participantCount} participants</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {meeting.isHost && (
                                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">HOST</span>
                                    )}
                                    {meeting.isActive ? (
                                        <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">{formatDuration(meeting.durationMs)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(!stats?.recentMeetings || stats.recentMeetings.length === 0) && (
                            <div className="px-6 py-12 text-center text-muted-foreground">
                                <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No meetings yet. Start a call to see your analytics!</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
