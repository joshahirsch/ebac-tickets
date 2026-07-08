import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/tickets",
  useSearchParams: () => new URLSearchParams(),
}));

const adminUser = {
  id: "admin-1",
  authId: "auth-admin",
  email: "admin@ebac.org",
  name: "EBAC Admin",
  role: "ADMIN" as const,
  avatarUrl: null,
  workspaceId: "ws-1",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/server/queries/tickets", () => ({
  getTicketsList: vi.fn(),
}));

vi.mock("@/server/queries/lookups", () => ({
  getProjects: vi.fn(),
  getAssignableUsers: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { getTicketsList } from "@/server/queries/tickets";
import { getProjects, getAssignableUsers } from "@/server/queries/lookups";
import TicketsPage from "@/app/(app)/tickets/page";

describe("TicketsPage archive controls for ADMIN", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockResolvedValue(adminUser);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(getAssignableUsers).mockResolvedValue([]);
    vi.mocked(getTicketsList).mockResolvedValue([
      {
        id: "ticket-1",
        number: 1,
        title: "Sample ticket",
        status: "TODO",
        priority: "MEDIUM",
        type: "TASK",
        isArchived: false,
        dueDate: null,
        updatedAt: new Date("2026-07-08T00:00:00.000Z"),
        project: { key: "EBAC", name: "EBAC" },
        assignee: { id: adminUser.id, name: adminUser.name, email: adminUser.email },
        labels: [],
      },
    ] as unknown as Awaited<ReturnType<typeof getTicketsList>>);
  });

  it("renders archive controls for admin@ebac.org", async () => {
    const page = await TicketsPage({ searchParams: {} });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Archive debug: role=ADMIN, canArchive=true");
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-label="Archive ticket"');
  });
});
