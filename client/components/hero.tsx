"use client"

import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiRequest } from "@/lib/api"
import { BrandButton } from "./brand-button"
import { Button } from "@/components/ui/button"
import { Loader2, Video, Users, Link as LinkIcon, ArrowRight } from "lucide-react"

export function Hero() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [groupLoading, setGroupLoading] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState("")

  const handleCreateMeeting = async () => {
    setLoading(true)
    try {
      const room = await apiRequest("/rooms", { name: "Quick Session", type: "ONE_TO_ONE" })
      router.push(`/call/${room.id}`)
    } catch (err) {
      router.push("/auth/login")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroupCall = async () => {
    setGroupLoading(true)
    try {
      const room = await apiRequest("/rooms", { name: "Group Session", type: "GROUP", maxParticipants: 10 })
      router.push(`/group/${room.id}`)
    } catch (err) {
      router.push("/auth/login")
    } finally {
      setGroupLoading(false)
    }
  }

  const handleJoinWithCode = async () => {
    let code = joinCode.trim()
    if (!code) {
      setJoinError("Please enter a room code")
      return
    }
    setJoinError("")

    // Extract room ID from full URL if pasted
    let roomId = code
    try {
      const parsed = new URL(code)
      const segs = parsed.pathname.split("/").filter(Boolean)
      if (segs.length >= 2) {
        roomId = segs[segs.length - 1]
        if (segs.includes("group")) { window.location.href = `/group/${roomId}`; return }
        if (segs.includes("call")) { window.location.href = `/call/${roomId}`; return }
      }
    } catch { roomId = code }

    // Ask backend for room type
    try {
      const room = await apiRequest(`/rooms/${roomId}`, undefined, "GET")
      if (room.type === "GROUP") {
        window.location.href = `/group/${roomId}`
      } else {
        window.location.href = `/call/${roomId}`
      }
    } catch {
      // Maybe it's an invite code instead of a room ID
      try {
        const room = await apiRequest(`/rooms/join/${roomId}`, {})
        if (room.type === "GROUP") {
          window.location.href = `/group/${room.id}`
        } else {
          window.location.href = `/call/${room.id}`
        }
      } catch {
        setJoinError("Invalid room code or link")
      }
    }
  }

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl">
            Empower Your Broadcasts with OneStudio
          </h1>
          <p className="text-pretty text-base md:text-lg text-foreground/80">
            A unified, high‑quality platform to create, stream, and edit professional broadcasts—where all your meeting
            ideas align with zero hassle.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <BrandButton onClick={handleCreateMeeting} disabled={loading} className="w-full sm:w-auto flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Video size={18} />}
              Start 1:1 Meeting
            </BrandButton>
            <Button
              variant="outline"
              onClick={handleCreateGroupCall}
              disabled={groupLoading}
              className="w-full sm:w-auto flex items-center gap-2 rounded-[var(--radius-lg)] border-[color:var(--border)] text-foreground hover:bg-secondary bg-transparent"
            >
              {groupLoading ? <Loader2 className="animate-spin" size={18} /> : <Users size={18} />}
              Start Group Call
            </Button>
          </div>

          {/* Join with Code */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value); setJoinError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinWithCode()}
                  placeholder="Enter room code or link to join"
                  className="w-full h-9 pl-9 pr-3 text-sm rounded-[var(--radius-lg)] border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleJoinWithCode}
                className="h-9 px-4 flex items-center gap-1.5 rounded-[var(--radius-lg)] border-[color:var(--border)] text-foreground hover:bg-primary hover:text-primary-foreground bg-transparent transition-colors"
              >
                Join
                <ArrowRight size={14} />
              </Button>
            </div>
            {joinError && <p className="text-xs text-red-500 pl-1">{joinError}</p>}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[var(--radius-xl)] shadow-soft border border-border bg-card overflow-hidden">
            <Image
              src="/images/hero-dashboard.jpg"
              alt="OneStudio dashboard preview"
              width={800}
              height={520}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
