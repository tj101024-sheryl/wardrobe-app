import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../auth";
import { PhoneFrame } from "../components/PhoneFrame";
import { useNotificationObserver } from "../useNotificationObserver";
import { colors } from "../theme";

export default function RootLayout() {
  useNotificationObserver();

  return (
    <AuthProvider>
      <PhoneFrame>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: "800", fontSize: 17 },
            headerTitleAlign: "center",
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="scrape" options={{ title: "抓圖" }} />
          <Stack.Screen name="upload" options={{ title: "新增項目" }} />
          <Stack.Screen name="item/[id]" options={{ title: "項目資訊" }} />
          <Stack.Screen name="user/[id]" options={{ title: "個人檔案" }} />
          <Stack.Screen name="outfit/edit" options={{ title: "編輯這天" }} />
          <Stack.Screen name="outfit/[id]" options={{ title: "這天的紀錄" }} />
          <Stack.Screen name="outfits/calendar" options={{ title: "穿搭日曆" }} />
          <Stack.Screen name="outfits/pending" options={{ title: "待確認穿搭" }} />
          <Stack.Screen name="outfits/weather" options={{ title: "天氣穿搭" }} />
          <Stack.Screen name="explore/color" options={{ title: "顏色牆" }} />
          <Stack.Screen
            name="explore/swipe"
            options={{ title: "隨便滑滑", gestureEnabled: false }}
          />
          <Stack.Screen
            name="settings/notifications"
            options={{ title: "穿搭提醒" }}
          />
        </Stack>
      </PhoneFrame>
    </AuthProvider>
  );
}
