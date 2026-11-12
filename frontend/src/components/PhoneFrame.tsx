import React, { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { colors } from "../theme";

export const PHONE_MAX_WIDTH = 430;

export function PhoneFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== "web") {
    return <View style={styles.native}>{children}</View>;
  }
  return (
    <View style={styles.webOuter}>
      <View style={styles.webFrame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  native: { flex: 1 },
  webOuter: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    backgroundColor: "#ddd9d2",
  },
  webFrame: {
    flex: 1,
    width: "100%",
    maxWidth: PHONE_MAX_WIDTH,
    backgroundColor: colors.bg,
    overflow: "hidden",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
});
