// Web 不支援本機通知；用空實作避免把 expo-notifications 打包進 Web。
export type ReminderSettings = {
  enabled: boolean;
  time: string;
};

export async function notificationPermission(): Promise<boolean> {
  return false;
}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function syncOutfitReminders(): Promise<number> {
  return 0;
}

export function notificationUrl(): string | null {
  return null;
}
