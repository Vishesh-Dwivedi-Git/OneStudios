"use client"

import { useState } from "react"
import { StudioTopBar } from "@/components/studio/top-bar"
import { VideoPanel } from "@/components/studio/video-panel"
import { FloatingControls } from "@/components/studio/controls"
import { SidePanel } from "@/components/studio/side-panel"
import { Button } from "@/components/ui/button"
import { StudioModeSwitcher, type StudioMode } from "@/components/studio/mode-switcher"

export default function StudioPage() {
  const [showSide, setShowSide] = useState(true)
  const [mode, setMode] = useState<StudioMode>("p2p")

  return (
    <main className="h-dvh w-full flex flex-col">
      <StudioTopBar />
      <div className="px-4 py-2 flex items-center gap-3">
        <StudioModeSwitcher mode={mode} onChange={setMode} />
        <div className="text-sm text-foreground/70 ml-auto">
          {mode === "p2p" && "Direct WebRTC peer-to-peer for lowest latency."}
          {mode === "sfu" && "Mediasoup SFU for multi-person reliability and scalability."}
          {mode === "broadcast" && "RTMP output to streaming platforms."}
        </div>
      </div>
      <div className="flex flex-1 gap-4 p-4">
        <section className="relative flex-1">
          <VideoPanel />
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center">
            <FloatingControls />
          </div>
        </section>
        <section className="hidden lg:block w-[320px] shrink-0">{showSide ? <SidePanel /> : null}</section>
      </div>
      <div className="border-t border-border px-4 py-2 flex items-center justify-between">
        <div className="text-sm text-foreground/70">Room: ROOM123</div>
        <Button variant="ghost" className="rounded-[var(--radius-lg)]" onClick={() => setShowSide((s) => !s)}>
          {showSide ? "Hide Panel" : "Show Panel"}
        </Button>
      </div>
    </main>
  )
}
