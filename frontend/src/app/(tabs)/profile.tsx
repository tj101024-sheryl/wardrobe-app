import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { http } from "../../api";
import { Item, User, categoryIcon } from "../../types";
import { colors, radius, shadow, type } from "../../theme";

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const [u, its] = await Promise.all([
            http.get<User>("/api/auth/me"),
            http.get<Item[]>("/api/items"),
          ]);
          setUser(u);
          setItems(its);
        } catch {
          // 免登入模式可能沒有 me，忽略
        }
      })();
    }, [])
  );

  const display = user?.username ?? "訪客";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{display.slice(0, 1)}</Text>
        </View>
        <Text style={styles.name}>{display}</Text>
        <Text style={styles.bio}>
          {user?.bio || "還沒有介紹自己 — 記錄穿搭，慢慢變成精緻男女"}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{items.length}</Text>
            <Text style={styles.statLabel}>件衣物</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>套穿搭</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>追蹤中</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>最近加入</Text>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>衣櫃還沒有東西</Text>
        ) : (
          <View style={styles.recentRow}>
            {items.slice(0, 6).map((it) => (
              <TouchableOpacity
                key={it.id}
                style={styles.recentItem}
                activeOpacity={0.85}
                onPress={() => router.push(`/item/${it.id}`)}
              >
                <View style={styles.recentItem}>
                  <Text style={styles.recentIcon}>
                    {categoryIcon(it.item_type, it.category)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>設定</Text>
        {["個人檔案", "通知", "關於"].map((row) => (
          <TouchableOpacity key={row} style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowText}>{row}</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    ...shadow.raised,
  },
  avatarText: { color: "#fff", fontSize: 34, fontWeight: "800" },
  name: { ...type.title, color: colors.text },
  bio: {
    ...type.caption,
    color: colors.sub,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    width: "100%",
    ...shadow.soft,
  },
  stat: { flex: 1, alignItems: "center" },
  statNum: { ...type.heading, color: colors.text, fontSize: 20 },
  statLabel: { ...type.caption, color: colors.sub, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { ...type.label, color: colors.sub, marginBottom: 10, marginLeft: 4 },
  emptyText: { ...type.caption, color: colors.faint, marginLeft: 4 },
  recentRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  recentItem: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.chip,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  recentIcon: { fontSize: 28 },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    ...shadow.soft,
  },
  rowText: { ...type.body, color: colors.text, fontWeight: "600" },
  rowArrow: { fontSize: 20, color: colors.faint },
});
