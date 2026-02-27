import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Image from "next/image"

const features = [
  {
    title: "End-to-End Encryption",
    desc: "True WebCrypto API integration ensures your calls are encrypted using ECDH and AES-GCM before they even leave your device.",
    img: "/images/feature-multitrack.jpg", // Reusing an existing placeholder
  },
  {
    title: "AI Live Captions",
    desc: "Never miss a word. Real-time, browser-native speech-to-text generating highly accurate subtitles seamlessly.",
    img: "/images/feature-ai-cohost.jpg",
  },
  {
    title: "Real-Time Whiteboards",
    desc: "Sketch ideas in real-time with an interactive HTML5 canvas fully synced across all peers via ultra-fast WebSockets.",
    img: "/images/feature-triple-recording.jpg",
  },
  {
    title: "Meeting Analytics",
    desc: "A dedicated premium dashboard to track your meeting hours, full activity charts, and speaking time breakdowns.",
    img: "/images/hero-dashboard.jpg",
  },
  {
    title: "Virtual Backgrounds",
    desc: "Locally executed MediaPipe selfie segmentation allows privacy blurs and custom image backgrounds instantly.",
    img: "/images/feature-ai-cohost.jpg", // Placeholder
  },
  {
    title: "Floating Reactions",
    desc: "Keep the energy high without interrupting the speaker using fully animated real-time emoji reactions.",
    img: "/images/feature-multitrack.jpg", // Placeholder
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
