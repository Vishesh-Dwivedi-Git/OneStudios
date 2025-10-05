"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Users, Cast } from "lucide-react"

export type StudioMode = "p2p" | "sfu" | "broadcast"

export function StudioModeSwitcher({
  mode,
  onChange,
}: {
  mode: StudioMode
  onChange: (m: StudioMode) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleChip
        active={mode === "p2p"}
        onClick={() => onChange("p2p")}
        icon={<Users size={16} />}
        label="P2P (1:1)"
      />
      <ToggleChip
        active={mode === "sfu"}
        onClick={() => onChange("sfu")}
        icon={<Users size={16} />}
        label="Multi (SFU)"
      />
      <ToggleChip
        active={mode === "broadcast"}
        onClick={() => onChange("broadcast")}
        icon={<Cast size={16} />}
        label="Broadcast (RTMP)"
      />
    </div>
  )
}

function ToggleChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      className={active ? "rounded-full" : "rounded-full bg-transparent"}
      onClick={onClick}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </Button>
  )
}
