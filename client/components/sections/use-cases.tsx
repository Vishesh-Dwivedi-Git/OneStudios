"use client"

const cases = [
  {
    title: "1-on-1 Interviews",
    desc: "HD, low-latency peer-to-peer webRTC video calls for private discussions.",
    src: "/images/timeline-editing.jpg",
  },
  {
    title: "Team Standups",
    desc: "Robust SFU architecture supporting multiple active video streams smoothly.",
    src: "/images/studio-setup-ui.jpg",
  },
  {
    title: "Secure Collaborations",
    desc: "End-to-end encrypted whiteboarding sessions for sensitive brainstorming.",
    src: "/images/hero-dashboard.jpg"
  },
  {
    title: "HR & Onboarding",
    desc: "Real-time accurate AI live captions to ensure accessibility for all new hires.",
    src: "/images/feature-ai-cohost.jpg",
  },
]

export function UseCases() {
  return (
    <section id="use-cases" className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Use cases</h2>
      <div className="grid gap-6 md:grid-cols-4">
        {cases.map((c) => (
          <div key={c.title} className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-soft">
            <div className="aspect-[4/3] rounded-[var(--radius-md)] border border-border bg-background overflow-hidden mb-3">
              <img
                src={c.src || "/placeholder.svg?height=180&width=320&query=use case"}
                alt={`${c.title} illustration`}
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-foreground/80">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
