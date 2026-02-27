"use client"

import { useState, useEffect } from "react"
import { Hero } from "@/components/hero"
import { FeatureCards } from "@/components/feature-cards"
import { ThemeToggle } from "@/components/theme-toggle"
import { HowItWorks } from "@/components/sections/how-it-works"
import { UseCases } from "@/components/sections/use-cases"

export default function Page() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(document.cookie.includes("accessToken"))
  }, [])
  return (
    <main>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div aria-hidden className="h-6 w-6 rounded-[8px] bg-primary"></div>
            <span className="font-semibold">OneStudio</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#how-it-works" className="text-foreground/80 hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#use-cases" className="text-foreground/80 hover:text-foreground transition-colors">
              Features
            </a>
            <a href="/dashboard" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Dashboard
            </a>
            <ThemeToggle />
            {isLoggedIn ? (
              <button
                onClick={async () => {
                  try {
                    const { apiRequest } = await import('@/lib/api');
                    await apiRequest("/auth/logout", {});
                  } catch { }
                  document.cookie = "accessToken=; Max-Age=0; path=/";
                  setIsLoggedIn(false);
                  window.location.href = "/auth/login";
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
              >
                Logout
              </button>
            ) : (
              <a
                href="/auth/login"
                className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
              >
                Login
              </a>
            )}
          </nav>
        </div>
      </header>

      <Hero />
      <FeatureCards />
      <HowItWorks />
      <UseCases />

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
