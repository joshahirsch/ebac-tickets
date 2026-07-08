import { describe, it, expect } from "vitest";
import { createTicketSchema, updateTicketSchema, addCommentSchema } from "@/lib/validations/ticket";

describe("createTicketSchema", () => {
  it("accepts a minimal valid ticket and applies defaults", () => {
    const r = createTicketSchema.safeParse({ title: "Fix footer links", projectId: "p1" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("BACKLOG");
      expect(r.data.priority).toBe("MEDIUM");
      expect(r.data.type).toBe("TASK");
      expect(r.data.assigneeId).toBeUndefined();
      expect(r.data.dueDate).toBeNull();
    }
  });

  it("rejects a too-short title", () => {
    const r = createTicketSchema.safeParse({ title: "ab", projectId: "p1" });
    expect(r.success).toBe(false);
  });

  it("requires a project", () => {
    const r = createTicketSchema.safeParse({ title: "Valid title", projectId: "" });
    expect(r.success).toBe(false);
  });

  it("parses a due date string into a Date", () => {
    const r = createTicketSchema.safeParse({
      title: "With due date",
      projectId: "p1",
      dueDate: "2026-08-01",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dueDate).toBeInstanceOf(Date);
  });
});

describe("updateTicketSchema", () => {
  it("requires an id", () => {
    expect(updateTicketSchema.safeParse({ status: "DONE" }).success).toBe(false);
    expect(updateTicketSchema.safeParse({ id: "t1", status: "DONE" }).success).toBe(true);
  });

  it("rejects an invalid status enum", () => {
    expect(updateTicketSchema.safeParse({ id: "t1", status: "NOPE" }).success).toBe(false);
  });
});

describe("addCommentSchema", () => {
  it("rejects empty comments", () => {
    expect(addCommentSchema.safeParse({ ticketId: "t1", body: "" }).success).toBe(false);
  });
  it("accepts a normal comment", () => {
    expect(addCommentSchema.safeParse({ ticketId: "t1", body: "Looks good" }).success).toBe(true);
  });
});
