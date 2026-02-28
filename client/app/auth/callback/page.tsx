"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

/**
 * OAuth callback page — receives tokens from the URL fragment
 * and stores them by calling the backend to set cookies.
 * 
 * URL format: /auth/callback#access=xxx&refresh=yyy
 */
export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const hash = window.location.hash.substring(1); // remove #
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access");
        const refreshToken = params.get("refresh");

        if (!accessToken || !refreshToken) {
            router.replace("/auth/login");
            return;
        }

        // Store tokens by calling a dedicated endpoint that sets cookies
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        fetch(`${API_BASE}/auth/set-tokens`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accessToken, refreshToken }),
        })
            .then((res) => {
                if (res.ok) {
                    // Clear tokens from URL for security
                    window.history.replaceState(null, "", "/auth/callback");
                    router.replace("/");
                } else {
                    router.replace("/auth/login");
                }
            })
            .catch(() => {
                router.replace("/auth/login");
            });
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm">Signing you in...</p>
            </div>
        </div>
    );
}
