import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/server/queries/notifications";
import { NotificationList } from "@/components/notifications/notification-list";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await getNotifications(user.id);
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          {unread > 0 ? `${unread} unread` : "No unread notifications"}
        </p>
      </div>
      <NotificationList notifications={notifications} />
    </div>
  );
}
