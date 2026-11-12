import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  ScrollView,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { http } from "../api";
import {
  ITEM_TYPES,
  categoriesOf,
  CATEGORY_LABEL,
  categoryIcon,
  Item,
} from "../types";
import { colors, radius, shadow, type } from "../theme";

export default function WardrobeScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemType, setItemType] = useState<string>("clothes");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const numColumns = 2;

  const load = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams();
      params.set("item_type", itemType);
      if (category !== "all") params.set("category", category);
      const qs = params.toString();
      const data = await http.get<Item[]>(
        `/api/items${qs ? `?${qs}` : ""}`
      );
      setItems(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [itemType, category]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>我的衣櫃</Text>
            <Text style={styles.sub}>{items.length} 件 · 隨手記錄每一天</Text>
          </View>
        </View>
      </View>

      <View style={styles.segment}>
        {ITEM_TYPES.map((t) => {
          const active = itemType === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => {
                setItemType(t.key);
                setCategory("all");
              }}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.segmentText,
                  active && styles.segmentTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipScrollContent}
      >
        <TouchableOpacity
          onPress={() => setCategory("all")}
          activeOpacity={0.7}
          style={styles.subTab}
        >
          <Text
            style={[
              styles.subTabText,
              category === "all" && styles.subTabTextActive,
            ]}
          >
            全部
          </Text>
          <View
            style={[
              styles.subTabUnderline,
              category === "all" && styles.subTabUnderlineActive,
            ]}
          />
        </TouchableOpacity>
        {categoriesOf(itemType).map((c) => {
          const active = category === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setCategory(c.key)}
              activeOpacity={0.7}
              style={styles.subTab}
            >
              <Text
                style={[styles.subTabText, active && styles.subTabTextActive]}
              >
                {c.label}
              </Text>
              <View
                style={[
                  styles.subTabUnderline,
                  active && styles.subTabUnderlineActive,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retry}>重試</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.text} />
      ) : (
        <FlatList
          data={items}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.sub}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyArt}>
                <Text style={styles.emptyEmoji}>👗</Text>
              </View>
              <Text style={styles.emptyTitle}>衣櫃是空的</Text>
              <Text style={styles.emptySub}>
                貼商品網址抓圖，或上傳截圖{"\n"}開始建立你的衣櫃
              </Text>
              <View style={styles.emptyCtas}>
                <TouchableOpacity
                  style={styles.ctaPrimary}
                  onPress={() => router.push("/scrape")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ctaPrimaryText}>貼網址抓圖</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ctaGhost}
                  onPress={() => router.push("/upload")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ctaGhostText}>上傳截圖</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/item/${item.id}`)}
              activeOpacity={0.85}
            >
              <View
                style={styles.cardImg}
                accessible
                accessibilityLabel="項目圖示"
              >
                <Text style={styles.cardIcon}>
                  {categoryIcon(item.item_type, item.category)}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {item.name || "未命名"}
                </Text>
                {item.wear_count > 0 ? (
                  <Text style={styles.cardMeta}>
                    {CATEGORY_LABEL[item.category] || item.category}
                    {" · 穿過 "}
                    {item.wear_count}
                    {" 次"}
                  </Text>
                ) : (
                  <View style={styles.wornBadge}>
                    <Text style={styles.wornBadgeText}>還沒穿過</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: Platform.OS === "web" ? 24 : 12,
    paddingHorizontal: 18,
    paddingBottom: 6,
    backgroundColor: colors.bg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  greeting: { ...type.display, color: colors.text },
  sub: { ...type.caption, color: colors.sub, marginTop: 4 },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginTop: 14,
    marginHorizontal: 18,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 14, color: colors.sub, fontWeight: "600" },
  segmentTextActive: { color: "#fff", fontWeight: "700" },
  chipScroll: { marginTop: 12, marginBottom: 4, flexGrow: 0 },
  chipScrollContent: {
    paddingHorizontal: 18,
    gap: 18,
    alignItems: "flex-start",
  },
  subTab: {
    justifyContent: "flex-start",
    paddingVertical: 4,
  },
  subTabText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.sub,
    fontWeight: "500",
  },
  subTabTextActive: {
    color: colors.text,
    fontWeight: "800",
  },
  subTabUnderline: {
    height: 2,
    borderRadius: 2,
    marginTop: 4,
    backgroundColor: "transparent",
    alignSelf: "stretch",
  },
  subTabUnderlineActive: { backgroundColor: colors.text },
  errorBox: {
    marginHorizontal: 18,
    marginBottom: 8,
    padding: 14,
    backgroundColor: "#fdeeee",
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: { color: colors.danger, flex: 1, fontSize: 13 },
  retry: { color: colors.text, fontWeight: "700", fontSize: 13 },
  grid: { padding: 14, gap: 20, paddingBottom: 40 },
  card: {
    width: "47%",
    backgroundColor: "transparent",
  },
  cardImg: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f0efec",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIcon: { fontSize: 44 },
  cardBody: { paddingTop: 8 },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  cardMeta: {
    color: colors.sub,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  wornBadge: {
    alignSelf: "flex-start",
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  wornBadgeText: { color: colors.text, fontSize: 11, fontWeight: "500" },
  empty: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 28,
  },
  emptyArt: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { ...type.title, color: colors.text, fontSize: 20 },
  emptySub: {
    ...type.body,
    color: colors.sub,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  emptyCtas: { flexDirection: "row", gap: 12, marginTop: 24 },
  ctaPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radius.full,
    ...shadow.card,
  },
  ctaPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  ctaGhost: {
    backgroundColor: colors.card,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaGhostText: { color: colors.text, fontWeight: "700", fontSize: 14 },
});
