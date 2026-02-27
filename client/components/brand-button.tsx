"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type VariantProps } from "class-variance-authority"

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

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
