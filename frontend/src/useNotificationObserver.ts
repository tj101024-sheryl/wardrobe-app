import React from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { notificationUrl } from "./notifications";

export function useNotificationObserver() {
  React.useEffect(() => {
    if (Platform.OS === "web") return;

    const redirect = (response: Notifications.NotificationResponse) => {
      const url = notificationUrl(response);
      if (url) {
        router.push(url);
        Notifications.clearLastNotificationResponse();
      }
    };

    const last = Notifications.getLastNotificationResponse();
    if (last) redirect(last);

    const subscription =
      Notifications.addNotificationResponseReceivedListener(redirect);
    return () => subscription.remove();
  }, []);
}
