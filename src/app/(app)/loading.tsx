export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted/50" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border bg-muted/50" />
    </div>
  );
}
