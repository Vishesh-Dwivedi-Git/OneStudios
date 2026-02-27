"use client"

import Image from "next/image"

const steps = [
  {
    title: "High-Quality P2P Recording",
    desc: "Record your 1:1 sessions locally in maximum quality without relying on cloud lossy compression.",
    img: "/images/recording-and-rtmp.jpg",
  },
  {
    title: "AI Auto-Highlights",
    desc: "Our transcription engine will automatically detect key moments and generate post-meeting summaries.",
    img: "/images/timeline-editing.jpg",
  },
  {
    title: "Spatial Audio Rooms",
    desc: "Immersive group calls where participant audio reflects their visual position on your screen.",
    img: "/images/studio-setup-ui.jpg",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Upcoming Features</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.title} className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-soft">
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-background">
              <Image
                src={s.img || "/placeholder.svg"}
                alt={s.title}
                width={400}
                height={220}
                className="w-full h-auto"
              />
            </div>
            <div className="mt-3">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-foreground/80">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
