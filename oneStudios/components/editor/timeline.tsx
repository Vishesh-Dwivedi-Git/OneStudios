"use client"

import type React from "react"

const tracks = [
  { id: "video-1", type: "video", color: "bg-primary/40" },
  { id: "audio-1", type: "audio", color: "bg-primary/30" },
  { id: "audio-2", type: "audio", color: "bg-primary/30" },
]

export function Timeline() {
  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-card p-3 shadow-soft">
      <div className="mb-3 flex items-center justify-between text-sm text-foreground/70">
        <span>00:00</span>
        <span>00:30</span>
        <span>01:00</span>
        <span>01:30</span>
        <span>02:00</span>
      </div>
      <div className="space-y-3">
        {tracks.map((t) => (
          <div
            key={t.id}
            className="h-14 rounded-[12px] border border-border bg-background/60 relative overflow-hidden"
          >
            <div className={`absolute left-2 top-2 h-10 w-1/3 ${t.color} rounded-[8px]`} aria-hidden />
            <div
              className="absolute left-1/2 top-2 h-10 w-1/6 bg-[color:var(--primary-400)] rounded-[8px]"
              aria-hidden
            />
            {/* AI highlights */}
            <div className="absolute -top-2 left-1/3 translate-x-[-50%]">
              <Badge>AI Highlight</Badge>
            </div>
            <div className="absolute -top-2 left-2/3 translate-x-[-50%]">
              <Badge>Auto Clip</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--primary-500)] text-[color:var(--primary-foreground)] px-2 py-0.5 text-[11px] shadow-soft">
      {children}
    </span>
  )
}
