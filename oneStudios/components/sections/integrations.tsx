"use client"

const logos = [
  { name: "YouTube Live", src: "/images/logos/youtube.jpg" },
  { name: "Twitch", src: "/images/logos/twitch.jpg" },
  { name: "LinkedIn Live", src: "/images/logos/linkedin.jpg" },
  { name: "Microsoft Teams", src: "/images/logos/teams.jpg" },
  { name: "Slack", src: "/images/logos/slack.jpg" },
  { name: "Google Drive", src: "/images/logos/drive.jpg" },
]

export function Integrations() {
  return (
    <section id="integrations" className="mx-auto max-w-6xl px-6 py-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Integrations</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {logos.map((l) => (
          <div
            key={l.name}
            className="flex items-center justify-center rounded-[var(--radius-lg)] border border-border bg-card px-3 py-4"
          >
            <img src={l.src || "/placeholder.svg"} alt={`${l.name} logo`} className="h-6 w-auto opacity-80" />
          </div>
        ))}
      </div>
    </section>
  )
}
