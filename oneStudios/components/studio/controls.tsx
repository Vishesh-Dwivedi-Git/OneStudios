"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Mic, Video, Square, MonitorUp, Radio } from "lucide-react"
import { cn } from "@/lib/utils"

export function FloatingControls({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-auto inline-flex items-center gap-2 rounded-full bg-background/90 px-2 py-2 shadow-soft border border-[color:var(--border)]",
        "transition-shadow duration-300 ease-in-out",
        className,
      )}
      role="toolbar"
      aria-label="Studio controls"
    >
      <IconButton label="Mute">
        <Mic size={18} />
      </IconButton>
      <IconButton label="Camera">
        <Video size={18} />
      </IconButton>
      <IconButton label="Share Screen">
        <MonitorUp size={18} />
      </IconButton>
      <IconButton label="Live">
        <Radio size={18} />
      </IconButton>
      <IconButton label="Record" variant="primary">
        <Square size={18} />
      </IconButton>
    </div>
  )
}

function IconButton({
  children,
  label,
  variant = "default",
}: {
  children: React.ReactNode
  label: string
  variant?: "default" | "primary"
}) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant={variant === "primary" ? "default" : "ghost"}
      className={cn(
        "rounded-full h-10 w-10 p-0",
        variant === "primary"
          ? "text-primary-foreground bg-[var(--primary-500)] hover:bg-[var(--primary-400)]"
          : "hover:bg-secondary",
      )}
    >
      {children}
    </Button>
  )
}
