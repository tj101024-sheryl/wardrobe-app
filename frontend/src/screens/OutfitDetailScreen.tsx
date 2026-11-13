import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { http } from "../api";
import {
  CATEGORY_LABEL,
  Outfit,
  outfitBadge,
  outfitCountable,
  outfitRecorded,
  usageLabel,
  VISIBILITY_LABEL,
  fullUrl,
} from "../types";
import { longDate, relativeDate, ymd } from "../date";
import { ItemThumb, LookThumb } from "../components/ItemThumb";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { syncOutfitReminders } from "../notifications";
import { colors, radius, shadow, type } from "../theme";

function confirmDelete(onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm("確定要刪除這天的紀錄嗎？")) {
      onConfirm();
    }
    return;
  }
  Alert.alert("刪除這天", "確定要刪除這天的紀錄嗎？", [
    { text: "取消", style: "cancel" },
    { text: "刪除", style: "destructive", onPress: onConfirm },
  ]);
}

export default function OutfitDetailScreen({ outfitId }: { outfitId: number }) {
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { width } = useWindowDimensions();
  const frame = Math.min(width, PHONE_MAX_WIDTH);
  const heroSize = Math.min(frame - 36, 260);
  const today = ymd(new Date());

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await http.get<Outfit>(`/api/outfits/${outfitId}`);
      setOutfit(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [outfitId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function complete() {
    if (!outfit) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await http.post<{
        counted_items: number[];
        skipped_already_counted: number[];
      }>(`/api/outfits/${outfit.id}/wear`, { worn_on: outfit.date });
      setNotice(
        `已累計 ${res.counted_items.length} 件／樣` +
          (res.skipped_already_counted.length
            ? `，${res.skipped_already_counted.length} 項今天已計過`
            : "")
      );
      await load();
      void syncOutfitReminders(true).catch(() => {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!outfit) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await http.del(`/api/outfits/${outfit.id}/wear`);
      setNotice("已復原這天的次數");
      await load();
      void syncOutfitReminders(true).catch(() => {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    confirmDelete(async () => {
      try {
        await http.del(`/api/outfits/${outfitId}`);
        router.back();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!outfit) {
    return (
      <View style={[styles.container, { padding: 24 }]}>
        <Text style={{ color: colors.danger }}>{error || "找不到這天的紀錄"}</Text>
      </View>
    );
  }

  const isFuture = outfit.date > today;
  const canComplete =
    outfit.status !== "worn" && !isFuture && outfitCountable(outfit);
  const hasMakeup = outfit.products.length > 0 || !!outfit.makeup_photo_url;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
    >
      <View style={styles.hero}>
        <LookThumb outfit={outfit} size={heroSize} />
      </View>

      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {outfit.title || relativeDate(outfit.date)}
          </Text>
          <Text style={styles.meta}>
            {longDate(outfit.date)}
            {outfit.items.length > 0 ? ` · ${outfit.items.length} 件` : ""}
            {outfit.products.length > 0
              ? ` · ${outfit.products.length} 樣`
              : ""}
            {outfit.occasion ? ` · ${outfit.occasion}` : ""}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            outfitRecorded(outfit) && styles.badgeRecorded,
            outfit.status === "scheduled" && styles.badgeScheduled,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              outfitRecorded(outfit) && styles.badgeTextRecorded,
            ]}
          >
            {outfitBadge(outfit)}
          </Text>
        </View>
      </View>

      {notice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isFuture ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            這是預定 Look。到 {relativeDate(outfit.date)} 當天才會提醒你確認，
            確認後才累計次數。
          </Text>
        </View>
      ) : null}

      {outfit.items.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>這天的穿搭</Text>
          <View style={styles.itemsCard}>
            {outfit.items.map((row) => (
              <TouchableOpacity
                key={row.id}
                style={styles.itemRow}
                onPress={() => router.push(`/item/${row.item.id}`)}
                activeOpacity={0.8}
              >
                <ItemThumb item={row.item} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {row.item.name || "未命名"}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {CATEGORY_LABEL[row.item.category] || row.item.category}
                    {row.item.color ? ` · ${row.item.color}` : ""}
                    {row.item.wear_count > 0
                      ? ` · ${usageLabel(row.item.item_type)} ${row.item.wear_count} 次`
                      : ""}
                  </Text>
                </View>
                <Text style={styles.itemArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      {hasMakeup ? (
        <>
          <Text style={styles.sectionTitle}>這天的妝容</Text>
          {outfit.makeup_photo_url ? (
            <Image
              source={{ uri: fullUrl(outfit.makeup_photo_url) }}
              style={styles.makeupPhoto}
              resizeMode="cover"
            />
          ) : null}
          {outfit.products.length > 0 ? (
            <View style={styles.itemsCard}>
              {outfit.products.map((row) => (
                <TouchableOpacity
                  key={row.id}
                  style={styles.itemRow}
                  onPress={() => router.push(`/item/${row.item.id}`)}
                  activeOpacity={0.8}
                >
                  <ItemThumb item={row.item} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {row.item.name || "未命名"}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {CATEGORY_LABEL[row.item.category] || row.item.category}
                      {row.item.wear_count > 0
                        ? ` · ${usageLabel(row.item.item_type)} ${row.item.wear_count} 次`
                        : ""}
                    </Text>
                  </View>
                  <Text style={styles.itemArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {outfit.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>筆記</Text>
          <Text style={styles.notesText}>{outfit.notes}</Text>
        </View>
      ) : null}

      <View style={styles.metaCard}>
        <View style={styles.metaRow}>
          <Text style={styles.metaKey}>穿搭隱私</Text>
          <Text style={styles.metaValue}>
            {VISIBILITY_LABEL[outfit.visibility] ?? outfit.visibility}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaKey}>妝容隱私</Text>
          <Text style={styles.metaValue}>
            {VISIBILITY_LABEL[outfit.makeup_visibility] ??
              outfit.makeup_visibility}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaKey}>建立時間</Text>
          <Text style={styles.metaValue}>
            {new Date(outfit.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {canComplete ? (
        <TouchableOpacity
          style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
          onPress={complete}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>完成這天（+1 次）</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {outfit.status === "worn" ? (
        <TouchableOpacity
          style={[styles.ghostBtn, busy && { opacity: 0.6 }]}
          onPress={undo}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={styles.ghostText}>復原這天的次數</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.ghostBtn}
        onPress={() =>
          router.push(`/outfit/edit?id=${outfit.id}&date=${outfit.date}`)
        }
        activeOpacity={0.85}
      >
        <Text style={styles.ghostText}>編輯這天</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={remove}>
        <Text style={styles.deleteText}>刪除這天</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { alignItems: "center" },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 16,
  },
  title: { ...type.title, color: colors.text },
  meta: { ...type.caption, color: colors.sub, marginTop: 5 },
  badge: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  badgeWorn: { backgroundColor: colors.primary },
  badgeRecorded: { backgroundColor: colors.accentSoft },
  badgeScheduled: { backgroundColor: colors.accentSoft },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.sub },
  badgeTextRecorded: { color: "#6f5a12" },
  badgeTextWorn: { color: "#fff" },
  notice: {
    marginTop: 14,
    backgroundColor: "#eef6ee",
    borderRadius: radius.md,
    padding: 12,
  },
  noticeText: { color: "#3d6b3d", fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, marginTop: 12, fontSize: 13 },
  infoBanner: {
    marginTop: 14,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: 12,
  },
  infoText: { color: "#6f5a12", fontSize: 12, lineHeight: 18 },
  sectionTitle: {
    ...type.heading,
    color: colors.text,
    marginTop: 22,
    marginBottom: 9,
  },
  itemsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 8,
    ...shadow.soft,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 6,
  },
  itemName: { fontSize: 13, fontWeight: "700", color: colors.text },
  itemMeta: { fontSize: 11, color: colors.sub, marginTop: 3 },
  itemArrow: { fontSize: 20, color: colors.faint },
  makeupPhoto: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: "#f0efec",
    marginBottom: 10,
  },
  notesCard: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.soft,
  },
  notesLabel: { ...type.label, color: colors.sub, marginBottom: 6 },
  notesText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  metaCard: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.soft,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  metaKey: { fontSize: 12, color: colors.sub },
  metaValue: { fontSize: 12, color: colors.text, fontWeight: "600" },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 15,
    alignItems: "center",
    ...shadow.card,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  ghostBtn: {
    marginTop: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 13,
    alignItems: "center",
  },
  ghostText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  deleteBtn: { alignItems: "center", marginTop: 18, padding: 10 },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
});
