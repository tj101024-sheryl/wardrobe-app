import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { http } from "../api";
import {
  ITEM_TYPES,
  categoriesOf,
  hasClothingFields,
  OCCASIONS,
  SEASONS,
  STYLES,
  WEATHERS,
} from "../types";
import { colors, radius, shadow, type } from "../theme";

function ChipRow({
  options,
  value,
  onChange,
  allowEmpty,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: string;
}) {
  return (
    <View style={styles.chipRow}>
      {allowEmpty ? (
        <TouchableOpacity
          style={[styles.chip, !value && styles.chipActive]}
          onPress={() => onChange("")}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, !value && styles.chipTextActive]}>
            {allowEmpty}
          </Text>
        </TouchableOpacity>
      ) : null}
      {options.map((o) => (
        <TouchableOpacity
          key={o}
          style={[styles.chip, value === o && styles.chipActive]}
          onPress={() => onChange(value === o ? "" : o)}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>
            {o}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export default function UploadScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("clothes");
  const [category, setCategory] = useState("top");
  const [color, setColor] = useState("");
  const [season, setSeason] = useState("");
  const [occasion, setOccasion] = useState("");
  const [weather, setWeather] = useState("");
  const [style, setStyle] = useState("");
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function chooseType(key: string) {
    setItemType(key);
    setCategory(categoriesOf(key)[0]?.key ?? "other");
    setSeason("");
    setWeather("");
    setExpiry("");
  }

  async function pick(fromCamera: boolean) {
    setError("");
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("沒有權限讀取媒體，請在設定中允許");
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.9,
        });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
    }
  }

  async function save() {
    if (!uri) {
      setError("請先選擇或拍攝照片");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      const filename = uri.split("/").pop() || "photo.jpg";
      const type = filename.endsWith(".png") ? "image/png" : "image/jpeg";
      form.append("file", { uri, name: filename, type } as any);
      form.append("name", name);
      form.append("item_type", itemType);
      form.append("category", category);
      form.append("color", color);
      form.append("season", hasClothingFields(itemType) ? season : "");
      form.append("occasion", occasion);
      form.append("weather", hasClothingFields(itemType) ? weather : "");
      form.append("style", style);
      form.append("expiry", hasClothingFields(itemType) ? "" : expiry);
      form.append("tags", "[]");

      await http.post("/api/items", form);
      Alert.alert("已存入收納", undefined, [
        { text: "繼續上傳", onPress: () => reset() },
        { text: "回首頁", onPress: () => router.push("/(tabs)") },
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setUri(null);
    setName("");
    setColor("");
    setSeason("");
    setOccasion("");
    setWeather("");
    setStyle("");
    setExpiry("");
    setItemType("clothes");
    setCategory("top");
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
    >
      <Text style={styles.title}>新增項目</Text>
      <Text style={styles.sub}>上傳截圖、照片，或從相簿選一張</Text>

      <View style={styles.pickRow}>
        <TouchableOpacity
          style={styles.pickBtn}
          onPress={() => pick(false)}
          activeOpacity={0.85}
        >
          <Text style={styles.pickEmoji}>🖼</Text>
          <Text style={styles.pickBtnText}>相簿選圖</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.pickBtn}
          onPress={() => pick(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.pickEmoji}>📷</Text>
          <Text style={styles.pickBtnText}>拍照</Text>
        </TouchableOpacity>
      </View>

      {uri ? (
        <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>👕</Text>
          <Text style={styles.placeholderText}>尚未選擇圖片</Text>
        </View>
      )}

      <View style={styles.formCard}>
        <SectionTitle>基本資訊</SectionTitle>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="名稱，例如：白色棉T"
          placeholderTextColor={colors.faint}
        />
        <TextInput
          style={styles.input}
          value={color}
          onChangeText={setColor}
          placeholder="顏色，例如：白、黑、米"
          placeholderTextColor={colors.faint}
        />

        <SectionTitle>種類</SectionTitle>
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

        <SectionTitle>分類</SectionTitle>
        <View style={styles.chipRow}>
          {categoriesOf(itemType).map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, category === c.key && styles.chipActive]}
              onPress={() => setCategory(c.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.chipText,
                  category === c.key && styles.chipTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {hasClothingFields(itemType) ? (
          <>
            <SectionTitle>季節</SectionTitle>
            <ChipRow
              options={SEASONS}
              value={season}
              onChange={setSeason}
              allowEmpty="不設"
            />
          </>
        ) : null}

        <SectionTitle>場合</SectionTitle>
        <ChipRow
          options={OCCASIONS}
          value={occasion}
          onChange={setOccasion}
          allowEmpty="不設"
        />

        {hasClothingFields(itemType) ? (
          <>
            <SectionTitle>天氣</SectionTitle>
            <ChipRow
              options={WEATHERS}
              value={weather}
              onChange={setWeather}
              allowEmpty="不設"
            />
          </>
        ) : null}

        <SectionTitle>風格</SectionTitle>
        <ChipRow
          options={STYLES}
          value={style}
          onChange={setStyle}
          allowEmpty="不設"
        />

        {!hasClothingFields(itemType) ? (
          <>
            <SectionTitle>到期日（選填）</SectionTitle>
            <TextInput
              style={styles.input}
              value={expiry}
              onChangeText={setExpiry}
              placeholder="例如：2027-06 或 2027-06-30"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
            />
          </>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.save, (busy || !uri) && { opacity: 0.45 }]}
        onPress={save}
        disabled={busy || !uri}
        activeOpacity={0.85}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>存入收納</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.sub, marginTop: 6 },
  pickRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  pickBtn: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 18,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  pickEmoji: { fontSize: 26 },
  pickBtnText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  preview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.lg,
    marginTop: 16,
    backgroundColor: "#eee",
    ...shadow.card,
  },
  placeholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.lg,
    marginTop: 16,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderEmoji: { fontSize: 44, opacity: 0.5 },
  placeholderText: { ...type.caption, color: colors.faint },
  formCard: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    ...shadow.soft,
  },
  sectionTitle: {
    ...type.label,
    color: colors.sub,
    marginTop: 16,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
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
  error: { color: colors.danger, marginTop: 16, fontSize: 13 },
  save: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: "center",
    marginTop: 22,
    ...shadow.card,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
