import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/settings/integrations",
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/server/queries/google-calendar", () => ({
  getGoogleCalendarConnectionView: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { getGoogleCalendarConnectionView } from "@/server/queries/google-calendar";
import IntegrationsSettingsPage from "@/app/(app)/settings/integrations/page";
import { SettingsNav } from "@/components/settings/settings-nav";

const memberUser = {
  id: "member-1",
  authId: "auth-m",
  email: "member@ebac.org",
  name: "Member",
  role: "MEMBER" as const,
  avatarUrl: null,
  workspaceId: "ws-1",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("IntegrationsSettingsPage Google Calendar card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue(memberUser);
  });

  it("renders disconnected Connect CTA", async () => {
    vi.mocked(getGoogleCalendarConnectionView).mockResolvedValue({
      configured: true,
      connected: false,
      status: "NOT_CONNECTED",
      googleAccountEmail: null,
      calendarId: "primary",
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
    });

    const page = await IntegrationsSettingsPage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("Google Calendar");
    expect(html).toContain("Connect Google Calendar");
    expect(html).toContain("/api/integrations/google-calendar/connect");
  });

  it("renders connected account and sync controls", async () => {
    vi.mocked(getGoogleCalendarConnectionView).mockResolvedValue({
      configured: true,
      connected: true,
      status: "CONNECTED",
      googleAccountEmail: "josh@gmail.com",
      calendarId: "primary",
      lastSyncAt: new Date("2026-07-08T12:00:00.000Z"),
      lastSyncStatus: "OK: 1 created, 0 updated, 0 deleted, 0 skipped",
      lastSyncError: null,
    });

    const page = await IntegrationsSettingsPage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("josh@gmail.com");
    expect(html).toContain("Primary calendar");
    expect(html).toContain("Sync now");
    expect(html).toContain("Disconnect");
  });
});

describe("SettingsNav", () => {
  it("shows Integrations for members without manage tabs", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsNav, { isAdmin: false, canManage: false }),
    );
    expect(html).toContain("Integrations");
    expect(html).not.toContain("Projects");
    expect(html).not.toContain("Users");
  });

  it("shows manage tabs plus Integrations for managers", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsNav, { isAdmin: true, canManage: true }),
    );
    expect(html).toContain("Projects");
    expect(html).toContain("Integrations");
    expect(html).toContain("Users");
  });
});
