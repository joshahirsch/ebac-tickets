"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/settings/projects", label: "Projects" },
    { href: "/settings/labels", label: "Labels" },
    { href: "/settings/reports", label: "Reports" },
    ...(isAdmin ? [{ href: "/settings/users", label: "Users" }] : []),
  ];

  return (
    <nav className="flex flex-wrap gap-1 border-b pb-2">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
