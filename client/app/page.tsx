"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { Video, Plus, Link as LinkIcon, Shield, ArrowRight, Loader2, Users, LogOut } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", {});
    } catch {
      // Even if the API fails, clear local state
    }
    router.push("/auth/login");
  };

  const handleCreateMeeting = async () => {
    setLoading(true);
    try {
      // Create a 1:1 room using the backend API
      const room = await apiRequest("/rooms", {
        name: "Quick Session",
        type: "ONE_TO_ONE",
      });

      // Redirect to the newly created room
      router.push(`/call/${room.id}`);
    } catch (err) {
      console.error("Failed to create room:", err);
      // If not logged in, redirect to login
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroupCall = async () => {
    setGroupLoading(true);
    try {
      const room = await apiRequest("/rooms", {
        name: "Group Session",
        type: "GROUP",
        maxParticipants: 10,
      });
      router.push(`/group/${room.id}`);
    } catch (err) {
      console.error("Failed to create group room:", err);
      router.push("/auth/login");
    } finally {
      setGroupLoading(false);
    }
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    // UUID format → direct room link; short code → invite code flow
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
    router.push(isUUID ? `/call/${code}` : `/join/${code}`);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* ── Logout Button ── */}
      <button
        onClick={handleLogout}
        className="absolute top-6 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:border-red-300 hover:bg-red-50 transition-all text-sm font-medium group"
      >
        <LogOut size={16} className="group-hover:text-red-500 transition-colors" />
        <span className="group-hover:text-red-500 transition-colors">Logout</span>
      </button>

      {/* ── Background Decorative Elements ── */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 animate-fade-in">
            <Shield size={16} />
            <span>Secure Enterprise Meetings</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
            Connect with <span className="text-primary">OneStudios</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Experience the next generation of meetings with HD video, spatial audio, and AI-powered tools.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={handleCreateMeeting}
            disabled={loading}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg hover:shadow-lg hover:opacity-90 transition-all active:scale-95 group disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <Video size={24} />
                <span>New Meeting</span>
                <Plus size={18} className="text-primary-foreground/70" />
              </>
            )}
          </button>

          <button
            onClick={handleCreateGroupCall}
            disabled={groupLoading}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-foreground text-background rounded-2xl font-semibold text-lg hover:shadow-lg hover:opacity-90 transition-all active:scale-95 group disabled:opacity-70"
          >
            {groupLoading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <Users size={24} />
                <span>Group Call</span>
                <Plus size={18} className="opacity-70" />
              </>
            )}
          </button>

          <form onSubmit={handleJoinMeeting} className="w-full md:w-auto flex items-center gap-2 p-1 pl-4 bg-muted/50 border border-border rounded-2xl focus-within:border-primary/50 transition-all">
            <LinkIcon size={20} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Enter Room ID"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="bg-transparent border-none outline-none py-3 text-lg w-full md:w-48 placeholder:text-muted-foreground/60"
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="p-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-all disabled:opacity-30"
            >
              <ArrowRight size={20} />
            </button>
          </form>
        </div>

        <div className="pt-8 border-t border-border/50 max-w-md mx-auto">
          <p className="text-sm text-muted-foreground">
            No account required for participants. Secure, encrypted, and built for speed.
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="absolute bottom-8 text-center w-full text-muted-foreground/50 text-xs font-medium uppercase tracking-widest">
        Powered by OneStudios Engineering
      </footer>
    </main>
  );
}
