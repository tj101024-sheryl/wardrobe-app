import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { http } from "../api";
import { CATEGORY_LABEL, ColorExplore, Item } from "../types";
import {
  CATEGORY_GROUPS,
  COLOR_FAMILIES,
  colorGroupOf,
  colorLabel,
} from "../color";
import { ItemThumb, LookThumb } from "../components/ItemThumb";
import ColorWheel from "../components/ColorWheel";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { colors, radius, shadow, type } from "../theme";

const EMPTY_ITEMS: Item[] = [];
const EMPTY_OUTFITS: ColorExplore["outfits"] = [];

export default function ColorWallScreen() {
  const { width } = useWindowDimensions();
  const frame = Math.min(width, PHONE_MAX_WIDTH);
  const contentW = frame - 36;
  const gap = 8;
  const swatchW = Math.floor((contentW - gap * 5) / 6) - 1;
  const itemW = (contentW - gap * 2) / 3;
  const outfitW = (contentW - gap) / 2;

  const [family, setFamily] = useState("beige");
  const [customHex, setCustomHex] = useState<string | null>(null);
  const [match, setMatch] = useState<"any" | "mono">("any");
  const [tab, setTab] = useState<"items" | "outfits">("items");
  const [group, setGroup] = useState("all");
  const [data, setData] = useState<ColorExplore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wheelOpen, setWheelOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const query = customHex
        ? `color_hex=${encodeURIComponent(customHex)}`
        : `color_family=${encodeURIComponent(family)}`;
      const res = await http.get<ColorExplore>(
        `/api/explore/color?${query}&match=${match}`
      );
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [family, customHex, match]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const items = data?.items ?? EMPTY_ITEMS;
  const outfits = data?.outfits ?? EMPTY_OUTFITS;
  const visibleItems = useMemo(
    () => (group === "all" ? items : items.filter((i) => colorGroupOf(i) === group)),
    [items, group]
  );
  const activeLabel = customHex
    ? `自訂色 ${customHex}`
    : `${colorLabel(data?.color_family ?? family)}色`;

  function pickFamily(key: string) {
    setFamily(key);
    setCustomHex(null);
    setGroup("all");
  }

  function renderItem(item: Item) {
    return (
      <TouchableOpacity
        key={item.id}
        style={{ width: itemW }}
        onPress={() => router.push(`/item/${item.id}`)}
        activeOpacity={0.85}
      >
        <ItemThumb item={item} size={itemW} />
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name || "未命名"}
        </Text>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {CATEGORY_LABEL[item.category] || item.category}
          {item.color ? ` · ${item.color}` : ""}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 44 }}
    >
      <Text style={styles.title}>顏色牆</Text>
      <Text style={styles.sub}>先選一個顏色，再看這個顏色有哪些衣服與穿搭</Text>

      <View style={styles.swatchGrid}>
        {COLOR_FAMILIES.map((swatch) => {
          const active = !customHex && family === swatch.key;
          return (
            <TouchableOpacity
              key={swatch.key}
              style={[
                styles.swatch,
                {
                  width: swatchW,
                  height: swatchW,
                  backgroundColor: swatch.hex,
                },
                active && styles.swatchActive,
              ]}
              onPress={() => pickFamily(swatch.key)}
              activeOpacity={0.85}
              accessibilityLabel={`${swatch.label}色`}
            />
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.customRow}
        onPress={() => setWheelOpen(true)}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.customDot,
            { backgroundColor: customHex || "#d8d4cc" },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.customTitle}>
            {customHex ? "自訂顏色" : "找不到想要的顏色？"}
          </Text>
          <Text style={styles.customSub}>
            {customHex
              ? `最近色系：${colorLabel(data?.color_family)}`
              : "用色彩圓盤挑一個自訂色"}
          </Text>
        </View>
        <Text style={styles.customLink}>
          {wheelOpen ? "收起 ‹" : "開啟圓盤 ›"}
        </Text>
      </TouchableOpacity>

      {wheelOpen ? (
        <View style={styles.wheelCard}>
          <ColorWheel
            onApply={(hex) => {
              setCustomHex(hex);
              setWheelOpen(false);
              setTab("items");
            }}
          />
        </View>
      ) : null}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "items" && styles.tabActive]}
          onPress={() => setTab("items")}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.tabText, tab === "items" && styles.tabTextActive]}
          >
            衣服 {items.length}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "outfits" && styles.tabActive]}
          onPress={() => setTab("outfits")}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.tabText, tab === "outfits" && styles.tabTextActive]}
          >
            穿搭 {outfits.length}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.text} />
      ) : tab === "items" ? (
        <>
          <Text style={styles.sectionSub}>
            目前顯示：{activeLabel} · 衣服與品項
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            {CATEGORY_GROUPS.map((option) => {
              const active = group === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setGroup(option.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {visibleItems.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>這個顏色還沒有衣服</Text>
              <Text style={styles.emptySub}>
                換一個顏色，或到衣櫃新增這個顏色的單品
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {visibleItems.map(renderItem)}
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={styles.sectionSub}>目前顯示：{activeLabel} · 你的穿搭</Text>
          <View style={styles.matchRow}>
            <TouchableOpacity
              style={[styles.matchBtn, match === "any" && styles.matchActive]}
              onPress={() => setMatch("any")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.matchText,
                  match === "any" && styles.matchTextActive,
                ]}
              >
                一整套（含此色）
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.matchBtn, match === "mono" && styles.matchActive]}
              onPress={() => setMatch("mono")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.matchText,
                  match === "mono" && styles.matchTextActive,
                ]}
              >
                單色穿搭
              </Text>
            </TouchableOpacity>
          </View>

          {outfits.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>這個顏色還沒有穿搭</Text>
              <Text style={styles.emptySub}>
                {match === "mono"
                  ? "試試「一整套」，或先記錄一套以這個顏色為主的穿搭"
                  : "先記錄一套包含這個顏色的穿搭"}
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {outfits.map((outfit) => (
                <TouchableOpacity
                  key={outfit.id}
                  style={{ width: outfitW }}
                  onPress={() => router.push(`/outfit/${outfit.id}`)}
                  activeOpacity={0.88}
                >
                  <LookThumb outfit={outfit} size={outfitW} />
                  <Text style={styles.itemName} numberOfLines={1}>
                    {outfit.title || relativeLabel(outfit.date)}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {relativeLabel(outfit.date)} · {outfit.items.length} 件
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function relativeLabel(value: string): string {
  const today = new Date();
  const ymdToday = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (value === ymdToday) return "今天";
  const [, m, d] = value.split("-");
  return `${Number(m)}/${Number(d)}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { ...type.display, color: colors.text },
  sub: { ...type.caption, color: colors.sub, marginTop: 5, lineHeight: 18 },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
  },
  swatch: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  swatchActive: {
    borderWidth: 2.5,
    borderColor: colors.primary,
  },
  customRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadow.soft,
  },
  customDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  customTitle: { fontSize: 12, fontWeight: "700", color: colors.text },
  customSub: { fontSize: 10, color: colors.sub, marginTop: 2 },
  customLink: { fontSize: 11, color: colors.sub, fontWeight: "600" },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    padding: 3,
    marginTop: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.full,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, color: colors.sub, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  sectionSub: { fontSize: 10, color: colors.faint, marginTop: 12 },
  filterScroll: { marginTop: 10, flexGrow: 0 },
  filterRow: { gap: 7, paddingRight: 8 },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 11, color: colors.sub, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginTop: 6,
  },
  itemMeta: { fontSize: 10, color: colors.sub, marginTop: 2 },
  matchRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  matchBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingVertical: 9,
    alignItems: "center",
  },
  matchActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  matchText: { fontSize: 11, color: colors.sub, fontWeight: "600" },
  matchTextActive: { color: "#fff" },
  empty: { alignItems: "center", paddingVertical: 42, paddingHorizontal: 20 },
  emptyTitle: { ...type.heading, color: colors.text, fontSize: 15 },
  emptySub: {
    ...type.caption,
    color: colors.sub,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 18,
  },
  error: { color: colors.danger, marginTop: 12, fontSize: 12 },
  wheelCard: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    ...shadow.soft,
  },
});
