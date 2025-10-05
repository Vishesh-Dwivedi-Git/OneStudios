"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function StudioTopBar({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div aria-hidden className="h-5 w-5 rounded-[8px] bg-primary"></div>
        <span className="font-semibold">OneStudio</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="rounded-[var(--radius-lg)] bg-transparent">
          New
        </Button>
        <Button variant="ghost" className="rounded-[var(--radius-lg)]">
          Settings
        </Button>
      </div>
    </header>
  )
}
