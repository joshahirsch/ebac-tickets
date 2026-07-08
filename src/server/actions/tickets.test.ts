import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@prisma/client";

const mockUser: User = {
  id: "user-1",
  authId: "auth-1",
  email: "manager@example.com",
  name: "Manager",
  avatarUrl: null,
  role: "MANAGER",
  workspaceId: "ws-1",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const memberUser: User = { ...mockUser, id: "user-2", role: "MEMBER" };

const ticketFindUnique = vi.fn();
const ticketFindMany = vi.fn();
const ticketUpdate = vi.fn();
const activityCreate = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findUnique: (...args: unknown[]) => ticketFindUnique(...args),
      findMany: (...args: unknown[]) => ticketFindMany(...args),
      update: (...args: unknown[]) => ticketUpdate(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/activity", () => ({
  recordActivity: vi.fn(({ tx }: { tx?: { ticketActivity: { create: typeof activityCreate } } }) => {
    const client = tx ?? { ticketActivity: { create: activityCreate } };
    return client.ticketActivity.create({});
  }),
}));

import { requireUser } from "@/lib/auth";
import {
  archiveTicketAction,
  bulkArchiveTicketsAction,
  reopenTicketAction,
} from "@/server/actions/tickets";

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      ticket: { update: ticketUpdate },
      ticketActivity: { create: activityCreate },
    };
    await fn(tx);
  });
  ticketUpdate.mockResolvedValue({});
  activityCreate.mockResolvedValue({});
});

describe("archiveTicketAction", () => {
  it("archives a ticket in the user's workspace", async () => {
    vi.mocked(requireUser).mockResolvedValue(mockUser);
    ticketFindUnique.mockResolvedValue({
      id: "t1",
      isArchived: false,
      project: { workspaceId: "ws-1" },
    });

    const res = await archiveTicketAction("t1");

    expect(res.ok).toBe(true);
    expect(ticketUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: expect.objectContaining({ isArchived: true, status: "ARCHIVED" }),
      }),
    );
  });

  it("rejects unauthorized users", async () => {
    vi.mocked(requireUser).mockResolvedValue(memberUser);

    const res = await archiveTicketAction("t1");

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ticket:archive/);
    expect(ticketFindUnique).not.toHaveBeenCalled();
  });

  it("is a no-op for already archived tickets", async () => {
    vi.mocked(requireUser).mockResolvedValue(mockUser);
    ticketFindUnique.mockResolvedValue({
      id: "t1",
      isArchived: true,
      project: { workspaceId: "ws-1" },
    });

    const res = await archiveTicketAction("t1");

    expect(res.ok).toBe(true);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("bulkArchiveTicketsAction", () => {
  it("archives all eligible selected tickets", async () => {
    vi.mocked(requireUser).mockResolvedValue(mockUser);
    ticketFindMany.mockResolvedValue([{ id: "t1" }, { id: "t2" }]);

    const res = await bulkArchiveTicketsAction(["t1", "t2"]);

    expect(res.ok).toBe(true);
    expect(res.archivedCount).toBe(2);
    expect(ticketUpdate).toHaveBeenCalledTimes(2);
  });

  it("rejects unauthorized users", async () => {
    vi.mocked(requireUser).mockResolvedValue(memberUser);

    const res = await bulkArchiveTicketsAction(["t1", "t2"]);

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ticket:archive/);
    expect(ticketFindMany).not.toHaveBeenCalled();
  });

  it("only archives tickets in the workspace that are not already archived", async () => {
    vi.mocked(requireUser).mockResolvedValue(mockUser);
    ticketFindMany.mockResolvedValue([{ id: "t1" }]);

    const res = await bulkArchiveTicketsAction(["t1", "t-missing", "t-archived"]);

    expect(res.ok).toBe(true);
    expect(res.archivedCount).toBe(1);
    expect(res.skippedCount).toBe(2);
    expect(ticketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["t1", "t-missing", "t-archived"] },
          project: { workspaceId: "ws-1" },
          isArchived: false,
        }),
      }),
    );
  });
});

describe("reopenTicketAction", () => {
  it("still restores archived tickets for authorized users", async () => {
    vi.mocked(requireUser).mockResolvedValue(mockUser);
    ticketFindUnique.mockResolvedValue({
      id: "t1",
      isArchived: true,
      project: { workspaceId: "ws-1" },
    });

    const res = await reopenTicketAction("t1");

    expect(res.ok).toBe(true);
    expect(ticketUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: expect.objectContaining({ isArchived: false, status: "TODO" }),
      }),
    );
  });
});
