import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/server/queries/tickets", () => ({
  getTicketById: vi.fn(),
}));

vi.mock("@/server/queries/lookups", () => ({
  getAssignableUsers: vi.fn(),
}));

import { requireUser } from "@/lib/auth";
import { getTicketById } from "@/server/queries/tickets";
import { getAssignableUsers } from "@/server/queries/lookups";
import TicketDetailPage from "@/app/(app)/tickets/[id]/page";

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

const pmgtDescription = [
  "## Purpose",
  "",
  "Document the training guide and quick-start SOP.",
  "",
  "## Checklist",
  "- Draft outline",
  "- Review with program leads",
  "",
  "## Acceptance criteria",
  "- Guide is published",
].join("\n");

const pmgtTicket = {
  id: "cmrc5885y002ylmhmodfqkx5g",
  number: 19,
  title: "Draft training guide and quick-start SOP",
  description: pmgtDescription,
  status: "TODO",
  priority: "MEDIUM",
  type: "TASK",
  isArchived: false,
  dueDate: null,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-08T00:00:00.000Z"),
  project: { id: "proj-pmgt", key: "PMGT", name: "EBAC Project Management" },
  assignee: null,
  reporter: { id: "admin-1", name: "EBAC Admin", email: "admin@ebac.org" },
  labels: [],
  comments: [],
  activities: [],
  attachments: [],
};

describe("TicketDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue(adminUser);
    vi.mocked(getAssignableUsers).mockResolvedValue([]);
  });

  it("awaits route params and resolves the clicked PMGT ticket by database id", async () => {
    vi.mocked(getTicketById).mockResolvedValue(pmgtTicket as never);

    const page = await TicketDetailPage({
      params: Promise.resolve({ id: "cmrc5885y002ylmhmodfqkx5g" }),
    });
    const html = renderToStaticMarkup(page);

    expect(getTicketById).toHaveBeenCalledWith("cmrc5885y002ylmhmodfqkx5g", "ws-1");
    expect(html).toContain("PMGT-19");
    expect(html).toContain("Draft training guide and quick-start SOP");
    expect(html).toContain("Purpose");
    expect(html).toContain("Checklist");
    expect(html).toContain("Acceptance criteria");
    expect(html).toContain("Document the training guide and quick-start SOP.");
  });

  it("does not render OPS-3 when resolving a PMGT ticket id", async () => {
    vi.mocked(getTicketById).mockResolvedValue(pmgtTicket as never);

    const page = await TicketDetailPage({
      params: Promise.resolve({ id: "cmrc5885y002ylmhmodfqkx5g" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).not.toContain("Archived: legacy intranet migration");
    expect(html).not.toContain("OPS-3");
  });

  it("calls notFound when the ticket cannot be resolved", async () => {
    vi.mocked(getTicketById).mockResolvedValue(null);

    await expect(
      TicketDetailPage({
        params: Promise.resolve({ id: "missing-ticket-id" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });

  it("renders the same calendar due date in the editable input for admins", async () => {
    vi.mocked(getTicketById).mockResolvedValue({
      ...pmgtTicket,
      number: 2,
      title: "Confirm EBAC stakeholder roster",
      dueDate: new Date("2026-07-13T00:00:00.000Z"),
    } as never);

    const page = await TicketDetailPage({
      params: Promise.resolve({ id: "ticket-pmgt-2" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('value="2026-07-13"');
    expect(html).not.toContain('value="2026-07-12"');
  });
});
