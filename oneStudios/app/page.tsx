import { Hero } from "@/components/hero"
import { FeatureCards } from "@/components/feature-cards"
import { Testimonials } from "@/components/testimonials"
import { ThemeToggle } from "@/components/theme-toggle"
import { HowItWorks } from "@/components/sections/how-it-works"
import { UseCases } from "@/components/sections/use-cases"
import { Integrations } from "@/components/sections/integrations"
import { FAQ } from "@/components/sections/faq"
import { PricingCTA } from "@/components/sections/pricing-cta"

export default function Page() {
  return (
    <main>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div aria-hidden className="h-6 w-6 rounded-[8px] bg-primary"></div>
            <span className="font-semibold">OneStudio</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#learn-more" className="text-foreground/80 hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-foreground/80 hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#use-cases" className="text-foreground/80 hover:text-foreground transition-colors">
              Use cases
            </a>
            <a href="#integrations" className="text-foreground/80 hover:text-foreground transition-colors">
              Integrations
            </a>
            <a href="/studio" className="text-foreground/80 hover:text-foreground transition-colors">
              Studio
            </a>
            <a href="/editor" className="text-foreground/80 hover:text-foreground transition-colors">
              Editor
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <Hero />
      <FeatureCards />
      <HowItWorks />
      <UseCases />
      <Integrations />
      <Testimonials />
      <FAQ />
      <PricingCTA />

      <footer className="border-t border-border mt-12">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-foreground/70 grid gap-4 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <div aria-hidden className="h-5 w-5 rounded-[8px] bg-primary" />
              <span className="font-semibold">OneStudio</span>
            </div>
            <p className="mt-3 max-w-sm">Create, stream, and edit professional broadcasts—zero hassle.</p>
          </div>
          <div>
            <div className="font-medium mb-2">Product</div>
            <ul className="space-y-1">
              <li>
                <a className="hover:text-foreground" href="/studio">
                  Studio
                </a>
              </li>
              <li>
                <a className="hover:text-foreground" href="/editor">
                  Editor
                </a>
              </li>
              <li>
                <a className="hover:text-foreground" href="#integrations">
                  Integrations
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Company</div>
            <ul className="space-y-1">
              <li>
                <a className="hover:text-foreground" href="#faq">
                  FAQ
                </a>
              </li>
              <li>
                <a className="hover:text-foreground" href="#learn-more">
                  Features
                </a>
              </li>
              <li>
                <a className="hover:text-foreground" href="#how-it-works">
                  How it works
                </a>
              </li>
            </ul>
          </div>
          <div className="md:col-span-3 mt-4">© {new Date().getFullYear()} OneStudio. All rights reserved.</div>
        </div>
      </footer>
    </main>
  )
}
