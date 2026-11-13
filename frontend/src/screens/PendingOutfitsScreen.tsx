import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { http } from "../api";
import { Outfit } from "../types";
import { longDate, relativeDate } from "../date";
import { OutfitThumb } from "../components/ItemThumb";
import { colors, radius, shadow, type } from "../theme";

export default function PendingOutfitsScreen() {
  const [rows, setRows] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await http.get<Outfit[]>("/api/outfits/pending");
      setRows(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function confirm(outfit: Outfit) {
    setBusyId(outfit.id);
    setError("");
    setNotice("");
    try {
      const res = await http.post<{ counted_items: number[] }>(
        `/api/outfits/${outfit.id}/wear`,
        { worn_on: outfit.date }
      );
      setNotice(
        `${relativeDate(outfit.date)}的穿搭已確認，累計 ${res.counted_items.length} 件`
      );
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
    >
      <Text style={styles.title}>待確認穿搭</Text>
      <Text style={styles.sub}>
        這些是到了預定日期、但還沒確認的穿搭。按下「有穿」才會累計次數。
      </Text>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>沒有待確認的穿搭</Text>
          <Text style={styles.emptySub}>
            有預定穿搭的日子，當天提醒後會出現在這裡
          </Text>
        </View>
      ) : (
        rows.map((outfit) => (
          <View key={outfit.id} style={styles.card}>
            <TouchableOpacity
              style={styles.body}
              onPress={() => router.push(`/outfit/${outfit.id}`)}
              activeOpacity={0.85}
            >
              <OutfitThumb outfit={outfit} size={72} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {outfit.title || `${relativeDate(outfit.date)}的穿搭`}
                </Text>
                <Text style={styles.cardMeta}>
                  {longDate(outfit.date)} · {outfit.items.length} 件
                </Text>
                <Text style={styles.cardHint}>點開查看內容 ›</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, busyId === outfit.id && { opacity: 0.6 }]}
              onPress={() => confirm(outfit)}
              disabled={busyId === outfit.id}
              activeOpacity={0.85}
            >
              {busyId === outfit.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmText}>確認有穿（+1 次）</Text>
              )}
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { ...type.title, color: colors.text },
  sub: {
    ...type.caption,
    color: colors.sub,
    marginTop: 8,
    lineHeight: 19,
  },
  notice: { marginTop: 14, fontSize: 12, color: "#3d6b3d" },
  error: { marginTop: 14, fontSize: 12, color: colors.danger },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { ...type.heading, color: colors.text, marginTop: 12 },
  emptySub: {
    ...type.caption,
    color: colors.sub,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  card: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    ...shadow.soft,
  },
  body: { flexDirection: "row", alignItems: "center", gap: 11 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  cardMeta: { fontSize: 11, color: colors.sub, marginTop: 4 },
  cardHint: { fontSize: 10, color: colors.faint, marginTop: 5 },
  confirmBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 11,
    alignItems: "center",
  },
  confirmText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
