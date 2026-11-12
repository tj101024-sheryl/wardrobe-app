import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../auth";
import { PhoneFrame } from "../components/PhoneFrame";
import { colors } from "../theme";

export default function RootLayout() {
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
        </Stack>
      </PhoneFrame>
    </AuthProvider>
  );
}
