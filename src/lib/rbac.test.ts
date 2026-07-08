import { describe, it, expect } from "vitest";
import { can, assertCan, isReadOnly, PermissionError } from "@/lib/rbac";

describe("rbac.can", () => {
  it("gives ADMIN every core permission", () => {
    expect(can("ADMIN", "user:manage")).toBe(true);
    expect(can("ADMIN", "ticket:archive")).toBe(true);
    expect(can("ADMIN", "settings:manage")).toBe(true);
  });

  it("lets MANAGER manage projects but not users", () => {
    expect(can("MANAGER", "project:update")).toBe(true);
    expect(can("MANAGER", "label:manage")).toBe(true);
    expect(can("MANAGER", "user:manage")).toBe(false);
  });

  it("lets MEMBER create/comment but not archive or assign", () => {
    expect(can("MEMBER", "ticket:create")).toBe(true);
    expect(can("MEMBER", "ticket:comment")).toBe(true);
    expect(can("MEMBER", "ticket:archive")).toBe(false);
    expect(can("MEMBER", "ticket:assign")).toBe(false);
  });

  it("gives VIEWER no write permissions", () => {
    expect(can("VIEWER", "ticket:create")).toBe(false);
    expect(can("VIEWER", "ticket:comment")).toBe(false);
    expect(isReadOnly("VIEWER")).toBe(true);
    expect(isReadOnly("MEMBER")).toBe(false);
  });
});

describe("rbac.assertCan", () => {
  it("throws PermissionError when not permitted", () => {
    expect(() => assertCan("VIEWER", "ticket:create")).toThrow(PermissionError);
  });
  it("does not throw when permitted", () => {
    expect(() => assertCan("ADMIN", "ticket:create")).not.toThrow();
  });
});
