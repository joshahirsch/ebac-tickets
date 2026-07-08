import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommentBody } from "@/components/ticket/comment-body";

describe("CommentBody", () => {
  it("renders a URL as an anchor with safe attributes", () => {
    const html = renderToStaticMarkup(
      createElement(CommentBody, { text: "See https://example.com please" }),
    );

    expect(html).toContain('href="https://example.com/"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(">https://example.com</a>");
    expect(html).toContain("See ");
    expect(html).toContain(" please");
  });

  it("renders a Google Drive URL with query params as a link", () => {
    const url =
      "https://drive.google.com/drive/folders/185HgPx9iB_bax5Bk3YgIWO4Qux1AdYyS?usp=drive_link";
    const html = renderToStaticMarkup(createElement(CommentBody, { text: url }));

    expect(html).toContain(`href="${url}"`);
    expect(html).toContain(`>${url}</a>`);
  });

  it("renders multiple URLs as separate anchors", () => {
    const html = renderToStaticMarkup(
      createElement(CommentBody, {
        text: "A https://a.example.com and https://b.example.com",
      }),
    );

    expect(html).toContain('href="https://a.example.com/"');
    expect(html).toContain('href="https://b.example.com/"');
  });

  it("keeps plain text without URLs as text", () => {
    const html = renderToStaticMarkup(
      createElement(CommentBody, { text: "No links here." }),
    );

    expect(html).toContain("No links here.");
    expect(html).not.toContain("<a ");
  });

  it("does not linkify unsafe schemes", () => {
    const html = renderToStaticMarkup(
      createElement(CommentBody, { text: "javascript:alert(1)" }),
    );

    expect(html).not.toContain("<a ");
    expect(html).toContain("javascript:alert(1)");
  });

  it("preserves line breaks via whitespace-pre-wrap", () => {
    const html = renderToStaticMarkup(
      createElement(CommentBody, { text: "one\ntwo" }),
    );

    expect(html).toContain("whitespace-pre-wrap");
    expect(html).toContain("one\ntwo");
  });

  it("does not use dangerouslySetInnerHTML", () => {
    const html = renderToStaticMarkup(
      createElement(CommentBody, {
        text: '<script>alert(1)</script> https://example.com',
      }),
    );

    // React escapes the script tags as text; no raw injection.
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('href="https://example.com/"');
  });
});
