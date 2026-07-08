import { describe, expect, it } from "vitest";
import { linkifySegments } from "@/lib/linkify";

describe("linkifySegments", () => {
  it("leaves plain text without URLs unchanged", () => {
    expect(linkifySegments("Just a normal comment.")).toEqual([
      { type: "text", value: "Just a normal comment." },
    ]);
  });

  it("linkifies an https URL", () => {
    const segs = linkifySegments("See https://example.com for details");
    expect(segs).toEqual([
      { type: "text", value: "See " },
      { type: "link", value: "https://example.com", href: "https://example.com/" },
      { type: "text", value: " for details" },
    ]);
  });

  it("linkifies an http URL", () => {
    const segs = linkifySegments("http://example.com");
    expect(segs).toEqual([
      { type: "link", value: "http://example.com", href: "http://example.com/" },
    ]);
  });

  it("normalizes www. URLs to https", () => {
    const segs = linkifySegments("Visit www.example.com today");
    expect(segs).toEqual([
      { type: "text", value: "Visit " },
      { type: "link", value: "www.example.com", href: "https://www.example.com/" },
      { type: "text", value: " today" },
    ]);
  });

  it("keeps Google Drive URLs with query params clickable", () => {
    const url =
      "https://drive.google.com/drive/folders/185HgPx9iB_bax5Bk3YgIWO4Qux1AdYyS?usp=drive_link";
    const segs = linkifySegments(url);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({
      type: "link",
      value: url,
      href: url,
    });
  });

  it("linkifies multiple URLs in one comment", () => {
    const segs = linkifySegments("A https://a.example.com and www.b.example.com end");
    expect(segs.filter((s) => s.type === "link")).toHaveLength(2);
    expect(segs[1]).toMatchObject({ type: "link", value: "https://a.example.com" });
    expect(segs[3]).toMatchObject({
      type: "link",
      value: "www.b.example.com",
      href: "https://www.b.example.com/",
    });
  });

  it("does not linkify unsafe schemes", () => {
    const text = "Bad javascript:alert(1) and data:text/html,hi and file:///etc/passwd";
    const segs = linkifySegments(text);
    expect(segs.every((s) => s.type === "text")).toBe(true);
    expect(segs.map((s) => s.value).join("")).toBe(text);
  });

  it("strips trailing punctuation from links", () => {
    const segs = linkifySegments("See https://example.com).");
    expect(segs).toEqual([
      { type: "text", value: "See " },
      { type: "link", value: "https://example.com", href: "https://example.com/" },
      { type: "text", value: ")." },
    ]);
  });

  it("preserves line breaks in surrounding text segments", () => {
    const segs = linkifySegments("Line one\nhttps://example.com\nLine three");
    expect(segs[0]).toEqual({ type: "text", value: "Line one\n" });
    expect(segs[1]).toMatchObject({ type: "link", value: "https://example.com" });
    expect(segs[2]).toEqual({ type: "text", value: "\nLine three" });
  });
});
