import { linkifySegments } from "@/lib/linkify";

/** Render plain-text comment body with safe clickable http(s)/www links. */
export function CommentBody({ text, className }: { text: string; className?: string }) {
  const segments = linkifySegments(text);

  return (
    <p className={className ?? "whitespace-pre-wrap text-sm"}>
      {segments.map((seg, i) =>
        seg.type === "link" ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline underline-offset-2 hover:opacity-80"
          >
            {seg.value}
          </a>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </p>
  );
}
