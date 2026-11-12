import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../auth";
import { colors } from "../theme";

export default function Index() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 測試階段免登入，直接進衣櫃；要恢復登入改回 useAuth().user 判斷
  return <Redirect href="/(tabs)" />;
}
