"use client"

import Link from "next/link"
import { BrandButton } from "@/components/brand-button"

export function PricingCTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="rounded-[var(--radius-xl)] border border-border bg-card p-6 md:p-8 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-balance">Ready to level up your broadcasts?</h3>
          <p className="text-foreground/80">Try OneStudio now and experience premium simplicity.</p>
        </div>
        <BrandButton asChild className="px-6">
          <Link href="/studio">Get Started</Link>
        </BrandButton>
      </div>
    </section>
  )
}
