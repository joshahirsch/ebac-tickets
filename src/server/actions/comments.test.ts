import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@prisma/client";

const author: User = {
  id: "user-1",
  authId: "auth-1",
  email: "author@example.com",
  name: "Author",
  avatarUrl: null,
  role: "MEMBER",
  workspaceId: "ws-1",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const otherMember: User = {
  ...author,
  id: "user-2",
  email: "other@example.com",
  name: "Other",
};

const manager: User = {
  ...author,
  id: "mgr-1",
  role: "MANAGER",
  email: "manager@example.com",
  name: "Manager",
};

const commentFindUnique = vi.fn();
const commentUpdate = vi.fn();
const activityCreate = vi.fn();
const transaction = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticketComment: {
      findUnique: (...args: unknown[]) => commentFindUnique(...args),
      update: (...args: unknown[]) => commentUpdate(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("@/server/activity", () => ({
  recordActivity: vi.fn(({ tx }: { tx?: { ticketActivity: { create: typeof activityCreate } } }) => {
    const client = tx ?? { ticketActivity: { create: activityCreate } };
    return client.ticketActivity.create({});
  }),
}));

import { requireUser } from "@/lib/auth";
import { recordActivity } from "@/server/activity";
import { updateCommentAction } from "@/server/actions/comments";

function mockComment(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    body: "Original body",
    ticketId: "t1",
    authorId: "user-1",
    isEdited: false,
    ticket: { project: { workspaceId: "ws-1" } },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    const tx = {
      ticketComment: { update: commentUpdate },
      ticketActivity: { create: activityCreate },
    };
    await fn(tx);
  });
  commentUpdate.mockResolvedValue({});
  activityCreate.mockResolvedValue({});
});

describe("updateCommentAction", () => {
  it("allows the author to edit their comment", async () => {
    vi.mocked(requireUser).mockResolvedValue(author);
    commentFindUnique.mockResolvedValue(mockComment());

    const res = await updateCommentAction({ commentId: "c1", body: "Updated body" });

    expect(res.ok).toBe(true);
    expect(commentUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { body: "Updated body", isEdited: true },
    });
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: "t1",
        type: "COMMENT_UPDATED",
        message: "Author updated a comment",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/tickets/t1");
  });

  it("allows a manager to edit someone else's comment", async () => {
    vi.mocked(requireUser).mockResolvedValue(manager);
    commentFindUnique.mockResolvedValue(mockComment({ authorId: "user-1" }));

    const res = await updateCommentAction({ commentId: "c1", body: "Manager edit" });

    expect(res.ok).toBe(true);
    expect(commentUpdate).toHaveBeenCalled();
  });

  it("rejects an unauthorized member editing someone else's comment", async () => {
    vi.mocked(requireUser).mockResolvedValue(otherMember);
    commentFindUnique.mockResolvedValue(mockComment({ authorId: "user-1" }));

    const res = await updateCommentAction({ commentId: "c1", body: "Nope" });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/can't edit/i);
    expect(commentUpdate).not.toHaveBeenCalled();
  });

  it("rejects empty / whitespace-only updates", async () => {
    vi.mocked(requireUser).mockResolvedValue(author);

    const res = await updateCommentAction({ commentId: "c1", body: "   " });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/empty/i);
    expect(commentFindUnique).not.toHaveBeenCalled();
  });

  it("rejects comments outside the user's workspace", async () => {
    vi.mocked(requireUser).mockResolvedValue(author);
    commentFindUnique.mockResolvedValue(
      mockComment({ ticket: { project: { workspaceId: "ws-other" } } }),
    );

    const res = await updateCommentAction({ commentId: "c1", body: "Cross workspace" });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/not found/i);
    expect(commentUpdate).not.toHaveBeenCalled();
  });

  it("returns not found when the comment does not exist", async () => {
    vi.mocked(requireUser).mockResolvedValue(author);
    commentFindUnique.mockResolvedValue(null);

    const res = await updateCommentAction({ commentId: "missing", body: "Hi" });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/not found/i);
  });
});
