"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { Loader2, AlertCircle } from "lucide-react";

export default function JoinByInvitePage({ params }: { params: Promise<{ inviteCode: string }> }) {
    const { inviteCode } = use(params);
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function join() {
            try {
                const res = await apiRequest(`/rooms/join/${inviteCode}`, {});
                const roomId = res.roomId || res.id;
                const roomType = res.type;
                if (roomType === "GROUP") {
                    window.location.href = `/group/${roomId}`;
                } else {
                    window.location.href = `/call/${roomId}`;
                }
            } catch (err: any) {
                setError(err.message || "Failed to join meeting");
            }
        }
        join();
    }, [inviteCode]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-4 p-6 text-center">
                <div className="bg-destructive/10 p-6 rounded-full text-destructive mb-4">
                    <AlertCircle size={64} />
                </div>
                <h1 className="text-2xl font-bold">Unable to Join</h1>
                <p className="text-muted-foreground max-w-sm">{error}</p>
                <button
                    onClick={() => (window.location.href = "/")}
                    className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium shadow-soft hover:opacity-90 transition-all"
                >
                    Return to Home
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
            <Loader2 className="animate-spin text-primary" size={48} />
            <p className="text-xl font-medium animate-pulse">Joining meeting...</p>
            <p className="text-sm text-muted-foreground">
                Invite code: <span className="font-mono font-bold">{inviteCode}</span>
            </p>
        </div>
    );
}
