"use client"

const cases = [
  {
    title: "Podcasts",
    desc: "Remote, studio‑quality interviews with reliable backups.",
    src: "/podcasts.jpg",
  },
  {
    title: "Webinars",
    desc: "Engage your audience with Q&A and slides via screen share.",
    src: "/webinars.jpg",
  },
  { title: "Live Shows", desc: "Broadcast to your favorite platforms via RTMP.", src: "/live-shows.jpg" },
  {
    title: "Internal Comms",
    desc: "Record meetings and generate crisp, shareable clips.",
    src: "/internal-comms.jpg",
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
