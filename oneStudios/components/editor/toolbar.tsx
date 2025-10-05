"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Scissors, Split, ZoomIn } from "lucide-react"

export function EditorToolbar() {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-card p-2 shadow-soft">
      <ToolButton label="Split">
        <Split size={18} />
      </ToolButton>
      <ToolButton label="Cut">
        <Scissors size={18} />
      </ToolButton>
      <ToolButton label="Zoom">
        <ZoomIn size={18} />
      </ToolButton>
    </div>
  )
}

function ToolButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Button variant="ghost" className="rounded-full h-9 w-9 p-0 hover:bg-secondary" aria-label={label} title={label}>
      {children}
    </Button>
  )
}
