"use client"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function BrandButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      className={cn(
        "rounded-[var(--radius-lg)] border-0",
        "bg-[var(--primary-500)] text-[color:var(--primary-foreground)]",
        "bg-gradient-to-b from-[var(--primary-400)] to-[var(--primary-500)]",
        "transition-transform duration-300 ease-in-out",
        "hover:scale-[1.01] hover:shadow-soft",
        className,
      )}
      {...props}
    />
  )
}
