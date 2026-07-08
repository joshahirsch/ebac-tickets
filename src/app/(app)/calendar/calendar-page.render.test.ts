import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/calendar",
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
  getCalendarTickets: vi.fn(),
}));

vi.mock("@/server/queries/lookups", () => ({
  getProjects: vi.fn(),
  getAssignableUsers: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { getCalendarTickets } from "@/server/queries/tickets";
import { getProjects, getAssignableUsers } from "@/server/queries/lookups";
import CalendarPage from "@/app/(app)/calendar/page";

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockResolvedValue(adminUser);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "proj-1", key: "PMGT", name: "EBAC Project Management" },
    ] as Awaited<ReturnType<typeof getProjects>>);
    vi.mocked(getAssignableUsers).mockResolvedValue([]);
    vi.mocked(getCalendarTickets).mockResolvedValue([
      {
        id: "ticket-1",
        number: 2,
        title: "Kickoff planning",
        description: "Plan agenda",
        status: "TODO",
        priority: "HIGH",
        dueDate: new Date("2026-07-13T12:00:00.000Z"),
        project: { key: "PMGT", name: "EBAC Project Management" },
        assignee: { id: adminUser.id, name: adminUser.name, email: adminUser.email },
      },
      {
        id: "ticket-2",
        number: 3,
        title: "UTC midnight due",
        description: null,
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        dueDate: new Date("2026-07-15T00:00:00.000Z"),
        project: { key: "PMGT", name: "EBAC Project Management" },
        assignee: null,
      },
    ] as unknown as Awaited<ReturnType<typeof getCalendarTickets>>);
  });

  it("renders tickets on their correct due dates without timezone drift", async () => {
    const page = await CalendarPage({
      searchParams: Promise.resolve({ month: "2026-07" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("July 2026");
    expect(html).toContain('data-date="2026-07-13"');
    expect(html).toContain("PMGT-2");
    expect(html).toContain("Kickoff planning");
    expect(html).toContain('href="/tickets/ticket-1"');

    expect(html).toContain('data-date="2026-07-15"');
    expect(html).toContain("PMGT-3");
    expect(html).toContain("UTC midnight due");

    expect(html).toContain('aria-label="Previous month"');
    expect(html).toContain('aria-label="Next month"');
    expect(html).toContain("Add to Google Calendar");
  });

  it("forwards filters and month to getCalendarTickets", async () => {
    await CalendarPage({
      searchParams: Promise.resolve({
        month: "2026-07",
        project: "proj-1",
        status: "TODO",
        priority: "HIGH",
        assignee: "user-2",
      }),
    });

    expect(getCalendarTickets).toHaveBeenCalledWith(
      "ws-1",
      "admin-1",
      expect.objectContaining({
        projectId: "proj-1",
        status: "TODO",
        priority: "HIGH",
        assigneeId: "user-2",
        sort: "dueDate:asc",
      }),
      "2026-07",
    );
  });

  it("shows empty state when no due-date tickets match", async () => {
    vi.mocked(getCalendarTickets).mockResolvedValue([]);
    const page = await CalendarPage({
      searchParams: Promise.resolve({ month: "2026-07" }),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("No due-date tickets this month");
  });

  it("shows filtered empty state when filters are active", async () => {
    vi.mocked(getCalendarTickets).mockResolvedValue([]);
    const page = await CalendarPage({
      searchParams: Promise.resolve({ month: "2026-07", status: "BLOCKED" }),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("No tickets match selected filters");
  });
});
