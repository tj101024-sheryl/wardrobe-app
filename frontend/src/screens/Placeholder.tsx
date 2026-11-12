import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, shadow, type } from "../theme";

export default function Placeholder({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.art}>
        <Text style={styles.emoji}>🪄</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{desc}</Text>
      <View style={styles.tag}>
        <Text style={styles.tagText}>下一階段開發</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
  },
  art: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    ...shadow.soft,
  },
  emoji: { fontSize: 40 },
  title: { ...type.title, color: colors.text },
  desc: {
    ...type.body,
    color: colors.sub,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 23,
  },
  tag: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  tagText: { color: colors.sub, fontWeight: "600", fontSize: 13 },
});
