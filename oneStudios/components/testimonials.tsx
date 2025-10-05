import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    name: "Ava Hernandez",
    quote: "OneStudio feels like a desktop app in the browser. Recording is rock‑solid.",
  },
  {
    name: "Kai Nakamura",
    quote: "The AI co‑host suggestions are surprisingly useful. We move faster with less prep.",
  },
  {
    name: "Sofia Martins",
    quote: "Editing multi‑track timelines is smooth and intuitive. Details just click.",
  },
]

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <Card
            key={t.name}
            className="rounded-[var(--radius-lg)] border border-border bg-card shadow-soft"
            role="figure"
            aria-label={`Testimonial by ${t.name}`}
          >
            <CardContent className="pt-6">
              <p className="text-pretty text-foreground/80">{`"${t.quote}"`}</p>
              <p className="mt-4 font-medium">{t.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
