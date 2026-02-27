"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    q: "How reliable is recording?",
    a: "We use triple backup recording (browser, server, and cloud) to ensure your content is safe.",
  },
  { q: "Can I broadcast live?", a: "Yes, use RTMP output to stream to platforms like YouTube, Twitch, and more." },
  {
    q: "Do you support multi‑track editing?",
    a: "Yes, both audio and video tracks are editable in the timeline with AI highlights.",
  },
]

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">FAQs</h2>
      <Accordion
        type="single"
        collapsible
        className="rounded-[var(--radius-lg)] border border-border bg-card p-2 shadow-soft"
      >
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
            <AccordionContent className="text-foreground/80">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
