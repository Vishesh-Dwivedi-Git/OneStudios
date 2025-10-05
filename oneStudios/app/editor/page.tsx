import { EditorToolbar } from "@/components/editor/toolbar"
import { Timeline } from "@/components/editor/timeline"

export default function EditorPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Post‑Production</h1>
        <div className="text-sm text-foreground/70">Project: Demo Broadcast</div>
      </header>

      <div className="mb-4">
        <EditorToolbar />
      </div>

      <Timeline />
    </main>
  )
}
