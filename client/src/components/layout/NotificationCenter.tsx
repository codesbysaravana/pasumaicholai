import { useNotificationStore } from "../../store/notificationStore";

export function NotificationCenter() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <aside className="notification-stack">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          {notification.message}
        </button>
      ))}
    </aside>
  );
}
