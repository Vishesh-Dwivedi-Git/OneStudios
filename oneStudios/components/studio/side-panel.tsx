"use client"

import type React from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

export function SidePanel() {
  return (
    <aside className="h-full rounded-[var(--radius-xl)] border border-border bg-card shadow-soft">
      <Tabs defaultValue="chat" className="h-full flex flex-col">
        <TabsList className="grid grid-cols-3 rounded-t-[var(--radius-xl)]">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
          <TabsTrigger value="invite">Invite</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-1">
          <ScrollArea className="h-[calc(100vh-240px)] p-3">
            <MessageCard name="Alex">We’re live in 3... 2... 1...</MessageCard>
            <MessageCard name="Sam">Levels look good!</MessageCard>
            <MessageCard name="Taylor">Sharing screen now.</MessageCard>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="qa" className="p-3">
          <MessageCard name="Audience">What mic are you using?</MessageCard>
        </TabsContent>
        <TabsContent value="invite" className="p-3">
          <div className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-background/60 p-3">
            Share this link to invite guests:
            <div className="mt-2 rounded-[var(--radius-md)] bg-secondary px-3 py-2 text-sm">
              onestudio.app/join/ROOM123
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}

function MessageCard({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-card p-3 shadow-soft">
      <div className="text-sm font-semibold">{name}</div>
      <div className="text-sm text-foreground/80">{children}</div>
    </div>
  )
}
