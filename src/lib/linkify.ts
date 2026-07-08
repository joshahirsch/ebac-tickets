/**
 * Safe plain-text → link segment splitter.
 * Does not produce HTML; callers render React (or other) nodes from segments.
 */

export type LinkifySegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

/** Trailing punctuation commonly pasted after a URL. */
const TRAILING_PUNCT = /[\].,;:!?)\}>'"]+$/;

/**
 * Match http(s) URLs and www. hosts. Query strings and path segments are included.
 * Intentionally excludes javascript:, data:, file:, vbscript:, etc.
 */
const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

function normalizeHref(raw: string): string | null {
  const trimmed = raw.replace(TRAILING_PUNCT, "");
  if (!trimmed) return null;

  let href = trimmed;
  if (/^www\./i.test(href)) {
    href = `https://${href}`;
  }

  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

/** Split plain text into text and safe http(s) link segments. */
export function linkifySegments(text: string): LinkifySegment[] {
  if (!text) return [];

  const segments: LinkifySegment[] = [];
  let lastIndex = 0;
  const re = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;

    // Peel trailing punctuation so "see https://x.com)." keeps the ")".
    const punctMatch = raw.match(TRAILING_PUNCT);
    const punct = punctMatch ? punctMatch[0] : "";
    const urlPart = punct ? raw.slice(0, -punct.length) : raw;
    const href = normalizeHref(urlPart);

    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start) });
    }

    if (href && urlPart) {
      segments.push({ type: "link", value: urlPart, href });
      if (punct) {
        segments.push({ type: "text", value: punct });
      }
    } else {
      segments.push({ type: "text", value: raw });
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}
