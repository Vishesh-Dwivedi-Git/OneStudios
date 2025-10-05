"use client"

export function VideoPanel() {
  return (
    <div className="relative h-full w-full rounded-[var(--radius-xl)] bg-card border border-border overflow-hidden shadow-soft">
      <img
        src="/primary-video-feed-preview.jpg"
        alt="Primary video feed preview"
        className="h-full w-full object-cover"
      />
      <div className="absolute right-3 top-3 flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 w-28 overflow-hidden rounded-[12px] border border-border bg-card/90 shadow-soft"
            aria-label={`Participant ${i}`}
          >
            <img
              src={`/participant-.jpg?key=376z5&height=64&width=112&query=participant%20${i}`}
              alt={`Participant ${i} video`}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
