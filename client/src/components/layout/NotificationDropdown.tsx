import { motion } from "framer-motion";
import { Bell, Check, Megaphone, Calendar, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/context/NotificationContext";
import type { Notification } from "@shared/schema";

interface NotificationDropdownProps {
  onClose: () => void;
}

const typeIcons = {
  announcement: Megaphone,
  event: Calendar,
  group: Users,
  system: Settings,
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const Icon = typeIcons[notification.type];

  return (
    <div
      className={`flex items-start gap-3 p-3 transition-colors hover-elevate ${
        !notification.read ? "bg-primary/5" : ""
      }`}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-tight">{notification.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground">{formatTimeAgo(notification.createdAt)}</p>
      </div>
      {!notification.read && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0"
          onClick={() => onMarkRead(notification.id)}
          aria-label="Mark as read"
          data-testid={`button-mark-read-${notification.id}`}
        >
          <Check className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        data-testid="notification-overlay"
      />
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-popover shadow-lg sm:w-96"
        data-testid="notification-dropdown"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-medium">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">({unreadCount} new)</span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto px-2 py-1 text-xs"
              data-testid="button-mark-all-read"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground">
                We'll notify you about important updates
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </motion.div>
    </>
  );
}
