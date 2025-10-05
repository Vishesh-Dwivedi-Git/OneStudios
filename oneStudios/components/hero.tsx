"use client"

import Image from "next/image"
import Link from "next/link"
import { BrandButton } from "./brand-button"
import { Button } from "@/components/ui/button"

export function Hero() {
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
          <div className="flex items-center gap-3">
            <BrandButton asChild>
              <Link href="/studio">Try Out</Link>
            </BrandButton>
            <Button
              variant="outline"
              className="rounded-[var(--radius-lg)] border-[color:var(--border)] text-foreground hover:bg-secondary bg-transparent"
              asChild
            >
              <Link href="#learn-more">Learn More</Link>
            </Button>
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
