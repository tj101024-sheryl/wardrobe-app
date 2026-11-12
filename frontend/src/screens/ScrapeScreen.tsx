import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { http } from "../api";
import { ScrapeResult } from "../types";
import { colors, radius, shadow, type } from "../theme";

export default function ScrapeScreen() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function scrape() {
    if (!url.trim()) {
      setError("請貼上商品網址");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    setSelected(new Set());
    try {
      const data = await http.post<ScrapeResult>("/api/scrape", {
        url: url.trim(),
      });
      setResult(data);
      if (data.images.length) {
        setSelected(new Set([data.images[0].url]));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function toggle(u: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(u)) next.delete(u);
      else next.add(u);
      return next;
    });
  }

  async function saveSelected() {
    if (!result || selected.size === 0) return;
    setSaving(true);
    setError("");
    let ok = 0;
    let fail = 0;
    for (const img of selected) {
      try {
        await http.post("/api/scrape/save", {
          url: img,
          name: "",
          category: "other",
          source_page: result.url,
        });
        ok++;
      } catch {
        fail++;
      }
    }
    setSaving(false);
    if (ok > 0) {
      Alert.alert(
        "已存入衣櫃",
        `成功 ${ok} 張${fail ? `，失敗 ${fail} 張` : ""}`,
        [
          {
            text: "繼續抓圖",
            onPress: () => {
              setSelected(new Set());
            },
          },
          { text: "回衣櫃", onPress: () => router.push("/(tabs)") },
        ]
      );
    } else {
      setError("所有圖片都下載失敗，請換一張或改用截圖上傳");
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
    >
      <Text style={styles.title}>抓取商品圖片</Text>
      <Text style={styles.sub}>
        貼上蝦皮、UNIQLO、GU、NET 或任何商品頁網址，選一張或多張存入衣櫃
      </Text>

      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://..."
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          onSubmitEditing={scrape}
          returnKeyType="go"
        />
        <TouchableOpacity
          style={[styles.goBtn, (busy || !url.trim()) && { opacity: 0.5 }]}
          onPress={scrape}
          disabled={busy || !url.trim()}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.goBtnText}>抓圖</Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={{ marginTop: 20 }}>
          <View style={styles.resultHead}>
            <Text style={styles.pageTitle} numberOfLines={2}>
              {result.page_title || result.url}
            </Text>
            <View style={styles.countPill}>
              <Text style={styles.countText}>
                {selected.size} / {result.images.length}
              </Text>
            </View>
          </View>
          <Text style={styles.hint}>點選圖片加入衣櫃</Text>

          <View style={styles.grid}>
            {result.images.map((img) => {
              const isSel = selected.has(img.url);
              return (
                <TouchableOpacity
                  key={img.url}
                  style={[styles.thumbWrap, isSel && styles.thumbSel]}
                  onPress={() => toggle(img.url)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: img.url }} style={styles.thumb} />
                  <View
                    style={[
                      styles.check,
                      isSel && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.checkText}>{isSel ? "✓" : ""}</Text>
                  </View>
                  {!isSel ? (
                    <View style={styles.kindBadge}>
                      <Text style={styles.kindText}>{img.kind}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              (selected.size === 0 || saving) && { opacity: 0.45 },
            ]}
            onPress={saveSelected}
            disabled={selected.size === 0 || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>
                存入衣櫃 · {selected.size} 張
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>抓不到圖？</Text>
        <Text style={styles.tipBody}>
          部分網站（如蝦皮）有反爬或純動態載入，可能抓不到。這時請改用「上傳截圖」：
          在商品頁截圖後從衣櫃頁上傳即可。
        </Text>
      </View>
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
    fontSize: 13,
    lineHeight: 19,
  },
  inputCard: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 8,
    paddingLeft: 16,
    alignItems: "center",
    ...shadow.card,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    fontSize: 14,
    color: colors.text,
  },
  goBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.full,
    minWidth: 76,
    alignItems: "center",
  },
  goBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  errorBox: {
    marginTop: 14,
    padding: 14,
    backgroundColor: "#fdeeee",
    borderRadius: radius.md,
  },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  resultHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  pageTitle: { ...type.heading, color: colors.text, flex: 1, fontSize: 15 },
  countPill: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  countText: { fontSize: 12, fontWeight: "700", color: "#8a6d12" },
  hint: { ...type.caption, color: colors.sub, marginTop: 6, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumbWrap: {
    width: "48%",
    maxWidth: 240,
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: "transparent",
    ...shadow.soft,
  },
  thumbSel: { borderColor: colors.primary },
  thumb: { width: "100%", height: "100%" },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  kindBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  kindText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
    ...shadow.card,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  tipCard: {
    marginTop: 32,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: 16,
  },
  tipTitle: { fontWeight: "700", color: "#8a6d12", marginBottom: 6, fontSize: 14 },
  tipBody: { color: "#5c5340", fontSize: 13, lineHeight: 20 },
});
