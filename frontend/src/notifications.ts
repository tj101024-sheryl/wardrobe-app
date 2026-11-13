import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
import { IosAuthorizationStatus } from "expo-notifications/build/NotificationPermissions.types";
import { http } from "./api";
import { Outfit } from "./types";
import { addDays, parseYmd, shortDate, ymd } from "./date";

export type ReminderSettings = {
  enabled: boolean;
  time: string;
};

const CHANNEL_ID = "outfit-reminders";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function notificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const settings = await Notifications.getPermissionsAsync();
  return (
    settings.granted ||
    settings.ios?.status === IosAuthorizationStatus.PROVISIONAL
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "穿搭提醒",
      importance: AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  const next = await Notifications.requestPermissionsAsync();
  return (
    next.granted ||
    next.ios?.status === IosAuthorizationStatus.PROVISIONAL
  );
}

function reminderDate(date: string, time: string): Date | null {
  const day = parseYmd(date);
  const match = /^(\d{2}):(\d{2})$/.exec(time || "08:00");
  if (!day || !match) return null;
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Number(match[1]),
    Number(match[2]),
    0,
    0
  );
}

let lastSyncAt = 0;

/**
 * 只為「有排程穿搭的日期」排本機通知。
 * 每次同步先取消舊通知，再重排，避免改時間後重複提醒。
 */
export async function syncOutfitReminders(
  force = false,
  askPermission = false
): Promise<number> {
  if (Platform.OS === "web") return 0;
  const now = Date.now();
  if (!force && now - lastSyncAt < 60_000) return 0;

  const today = ymd(new Date());
  const to = ymd(addDays(new Date(), 60));
  const [settings, outfits] = await Promise.all([
    http.get<ReminderSettings>("/api/users/me/notifications"),
    http.get<Outfit[]>(
      `/api/outfits?status=scheduled&from=${today}&to=${to}&limit=300`
    ),
  ]);

  await Notifications.cancelAllScheduledNotificationsAsync();
  lastSyncAt = now;

  if (!settings.enabled) return 0;
  let allowed = await notificationPermission();
  if (!allowed && askPermission) {
    allowed = await requestNotificationPermission();
  }
  if (!allowed) return 0;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "穿搭提醒",
      importance: AndroidImportance.DEFAULT,
    });
  }

  let scheduled = 0;
  for (const outfit of outfits) {
    const when = reminderDate(outfit.date, settings.time);
    if (!when || when.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "今天要穿這套嗎？",
        body: `${shortDate(outfit.date)} 預定穿搭 · ${outfit.items.length} 件`,
        data: { url: `/outfit/${outfit.id}` },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: CHANNEL_ID,
      },
    });
    scheduled += 1;
  }
  return scheduled;
}

export function notificationUrl(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as
    | { url?: unknown }
    | undefined;
  return typeof data?.url === "string" ? data.url : null;
}
