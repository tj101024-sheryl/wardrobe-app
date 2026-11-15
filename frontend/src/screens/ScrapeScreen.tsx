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
import { ITEM_TYPES, BRAND_SUGGESTIONS, ScrapeResult, joinEfficacy } from "../types";
import { CategoryPicker, EfficacyPicker } from "../components/CategoryPickers";
import { colors, radius, shadow, type } from "../theme";

export default function ScrapeScreen() {
  const [url, setUrl] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [itemType, setItemType] = useState("clothes");
  const [category, setCategory] = useState("");
  const [efficacy, setEfficacy] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function chooseType(key: string) {
    setItemType(key);
    setCategory("");
    setEfficacy([]);
  }

  async function scrape() {
    if (!url.trim()) {
      setError("請貼上商品網址");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
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

  function toggleAll() {
    if (!result) return;
    if (selected.size === result.images.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(result.images.map((img) => img.url)));
  }

  function loadDirectImage() {
    const value = directUrl.trim();
    if (
      !value.startsWith("http://") &&
      !value.startsWith("https://")
    ) {
      setError("請輸入完整的圖片網址（含 https://）");
      return;
    }
    setError("");
    const image = {
      url: value,
      width: null,
      height: null,
      kind: "direct",
    };
    setNotice("");
    setResult({ url: value, page_title: "直接圖片", images: [image] });
    setSelected(new Set([value]));
  }

  async function saveSelected() {
    if (!result || selected.size === 0) return;
    setSaving(true);
    setError("");
    setNotice("");
    let ok = 0;
    let fail = 0;
    for (const img of selected) {
      try {
        await http.post("/api/scrape/save", {
          url: img,
          name: name.trim(),
          item_type: itemType,
          category,
          color: color.trim(),
          brand: brand.trim(),
          efficacy: joinEfficacy(efficacy),
          source_page: result.url,
        });
        ok++;
      } catch {
        fail++;
      }
    }
    setSaving(false);
    if (ok > 0) {
      setNotice(`已存入衣櫃 ${ok} 張${fail ? `，失敗 ${fail} 張` : ""}`);
      setSelected(new Set());
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
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>貼連結抓圖</Text>
      <Text style={styles.sub}>
        貼上商品頁網址，挑選你要的圖片存入衣櫃。支援服飾、配件、化妝品與保養品。
      </Text>

      <View style={styles.storeRow}>
        {["GRL", "GU", "UNIQLO", "NET", "ZOZOTOWN", "蝦皮", "淘寶"].map(
          (store) => (
            <View key={store} style={styles.storeChip}>
              <Text style={styles.storeText}>{store}</Text>
            </View>
          )
        )}
      </View>

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

      <View style={styles.directCard}>
        <Text style={styles.directTitle}>抓不到？直接貼圖片網址</Text>
        <View style={styles.directRow}>
          <TextInput
            style={styles.directInput}
            value={directUrl}
            onChangeText={setDirectUrl}
            placeholder="https://...jpg"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={loadDirectImage}
            returnKeyType="go"
          />
          <TouchableOpacity
            style={styles.directBtn}
            onPress={loadDirectImage}
            activeOpacity={0.85}
          >
            <Text style={styles.directBtnText}>載入</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.directHint}>
          在商品圖片上長按／右鍵 → 複製圖片網址。蝦皮、淘寶被擋時可先用這招。
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {notice ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={{ marginTop: 20 }}>
          <View style={styles.resultHead}>
            <Text style={styles.pageTitle} numberOfLines={2}>
              {result.page_title || result.url}
            </Text>
            <View style={styles.resultActions}>
              <TouchableOpacity onPress={toggleAll} activeOpacity={0.7}>
                <Text style={styles.selectAll}>
                  {selected.size === result.images.length ? "取消全選" : "全選"}
                </Text>
              </TouchableOpacity>
              <View style={styles.countPill}>
                <Text style={styles.countText}>
                  {selected.size} / {result.images.length}
                </Text>
              </View>
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

          <View style={styles.classCard}>
            <Text style={styles.fieldLabel}>存入的大分類</Text>
            <View style={styles.chipRow}>
              {ITEM_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.chip, itemType === t.key && styles.chipActive]}
                  onPress={() => chooseType(t.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      itemType === t.key && styles.chipTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>分類</Text>
            <CategoryPicker
              itemType={itemType}
              value={category}
              onChange={setCategory}
            />

            <EfficacyPicker
              itemType={itemType}
              values={efficacy}
              onChange={setEfficacy}
            />

            <Text style={styles.fieldLabel}>名稱（選填）</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="例如：白色棉T、保濕粉底液"
              placeholderTextColor={colors.faint}
            />
            <Text style={styles.fieldLabel}>品牌（選填）</Text>
            <TextInput
              style={styles.fieldInput}
              value={brand}
              onChangeText={setBrand}
              placeholder="例如：UNIQLO"
              placeholderTextColor={colors.faint}
              autoCapitalize="characters"
            />
            <View style={styles.brandChips}>
              {BRAND_SUGGESTIONS.map((suggestion) => {
                const active =
                  brand.trim().toUpperCase() === suggestion;
                return (
                  <TouchableOpacity
                    key={suggestion}
                    style={[
                      styles.brandChip,
                      active && styles.brandChipActive,
                    ]}
                    onPress={() =>
                      setBrand(active ? "" : suggestion)
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.brandChipText,
                        active && styles.brandChipTextActive,
                      ]}
                    >
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.fieldLabel}>顏色（選填）</Text>
            <TextInput
              style={styles.fieldInput}
              value={color}
              onChangeText={setColor}
              placeholder="例如：白、黑、米"
              placeholderTextColor={colors.faint}
            />
            <Text style={styles.multiHint}>
              一次存多張時會套用相同名稱與顏色，之後可在單品頁修改。
            </Text>
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
          大部分服飾店可以直接抓；蝦皮、淘寶等網站有時會擋自動抓取或需要登入。
          這時請改用手機截圖上傳，或先按「抓圖」再換一張圖片。
        </Text>
        <TouchableOpacity
          style={styles.uploadInstead}
          onPress={() => router.push("/upload")}
          activeOpacity={0.85}
        >
          <Text style={styles.uploadInsteadText}>改用截圖上傳</Text>
        </TouchableOpacity>
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
  storeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  storeChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  storeText: { fontSize: 9, color: colors.sub, fontWeight: "600" },
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
  directCard: {
    marginTop: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  directTitle: { fontSize: 11, fontWeight: "700", color: colors.sub },
  directRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 8,
  },
  directInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: colors.text,
  },
  directBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  directBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  directHint: {
    fontSize: 9,
    color: colors.faint,
    lineHeight: 14,
    marginTop: 7,
  },
  errorBox: {
    marginTop: 14,
    padding: 14,
    backgroundColor: "#fdeeee",
    borderRadius: radius.md,
  },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  noticeBox: {
    marginTop: 14,
    padding: 14,
    backgroundColor: "#eef6ee",
    borderRadius: radius.md,
  },
  noticeText: { color: "#3d6b3d", fontSize: 13, lineHeight: 18 },
  resultHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  resultActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectAll: { fontSize: 11, fontWeight: "700", color: colors.sub },
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
  classCard: {
    marginTop: 18,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.soft,
  },
  fieldLabel: {
    ...type.label,
    color: colors.sub,
    marginTop: 12,
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  multiHint: {
    fontSize: 9,
    color: colors.faint,
    marginTop: 8,
    lineHeight: 14,
  },
  brandChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  brandChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  brandChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  brandChipText: { fontSize: 10, color: colors.text, fontWeight: "600" },
  brandChipTextActive: { color: "#fff" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  chipActive: { backgroundColor: colors.chipActive },
  chipText: { fontSize: 13, color: colors.sub, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
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
  uploadInstead: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(138,109,18,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  uploadInsteadText: { fontSize: 11, fontWeight: "700", color: "#8a6d12" },
});
