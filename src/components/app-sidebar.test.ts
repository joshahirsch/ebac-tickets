import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/calendar",
}));

import { AppSidebar } from "@/components/app-sidebar";
import { NAV_ITEMS } from "@/lib/constants";

describe("AppSidebar Calendar nav", () => {
  it("includes Calendar between Board and Projects", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(hrefs).toContain("/calendar");
    expect(hrefs.indexOf("/calendar")).toBeGreaterThan(hrefs.indexOf("/board"));
    expect(hrefs.indexOf("/calendar")).toBeLessThan(hrefs.indexOf("/projects"));
  });

  it("marks Calendar as active on /calendar", () => {
    const html = renderToStaticMarkup(createElement(AppSidebar, { notificationCount: 0 }));
    expect(html).toContain("Calendar");
    expect(html).toContain('href="/calendar"');
    // Active Calendar link uses primary background (class may appear before or after href).
    expect(html).toMatch(/<a[^>]*href="\/calendar"[^>]*bg-primary|<a[^>]*bg-primary[^>]*href="\/calendar"/);
  });
});
