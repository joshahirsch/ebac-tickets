"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, AtSign, CalendarClock, Ban, RefreshCw, Bell, CheckCheck } from "lucide-react";
import type { NotificationType } from "@prisma/client";
import type { NotificationItem } from "@/server/queries/notifications";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/server/actions/notifications";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ICONS: Record<NotificationType, typeof Bell> = {
  TICKET_ASSIGNED: UserPlus,
  MENTIONED: AtSign,
  DUE_SOON: CalendarClock,
  TICKET_BLOCKED: Ban,
  STATUS_CHANGED: RefreshCw,
};

export function NotificationList({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.isRead);

  const open = (n: NotificationItem) => {
    startTransition(async () => {
      if (!n.isRead) await markNotificationReadAction(n.id);
      if (n.link) router.push(n.link);
      else router.refresh();
    });
  };

  const markAll = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  };

  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">You&apos;re all caught up</p>
        <p className="mt-1 text-sm text-muted-foreground">New notifications will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={markAll} disabled={!hasUnread || pending}>
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {notifications.map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          return (
            <li key={n.id}>
              <button
                onClick={() => open(n)}
                disabled={pending}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                  !n.isRead && "bg-primary/5",
                )}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{n.title}</span>
                    {!n.isRead ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                  </span>
                  {n.body ? <span className="line-clamp-2 text-sm text-muted-foreground">{n.body}</span> : null}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
