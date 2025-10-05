import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Image from "next/image"

const features = [
  {
    title: "Triple Recording",
    desc: "Browser, Server, and Cloud backups—so you never miss a moment.",
    img: "/images/feature-triple-recording.jpg",
  },
  {
    title: "AI Co‑Host",
    desc: "Live suggestions to keep conversations sharp and engaging.",
    img: "/images/feature-ai-cohost.jpg",
  },
  {
    title: "Multi‑Track Editing",
    desc: "Fine control over audio and video tracks for precise post.",
    img: "/images/feature-multitrack.jpg",
  },
]

export function FeatureCards({ className }: { className?: string }) {
  return (
    <section id="learn-more" className={cn("mx-auto max-w-6xl px-6 py-8 md:py-12", className)}>
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="rounded-[var(--radius-lg)] border border-border bg-card shadow-soft">
            <div className="border-b border-border">
              <Image
                src={f.img || "/placeholder.svg?height=220&width=400&query=Feature image"}
                alt={f.title}
                width={400}
                height={220}
                className="w-full h-auto rounded-t-[var(--radius-lg)]"
              />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{f.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-foreground/80">{f.desc}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
