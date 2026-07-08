"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  Columns3,
  FolderKanban,
  CircleUser,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Ticket,
  Columns3,
  FolderKanban,
  CircleUser,
  Bell,
  Settings,
};

export function AppSidebar({ notificationCount = 0 }: { notificationCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon] ?? Ticket;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.href === "/notifications" && notificationCount > 0 ? (
              <span className="rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                {notificationCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
