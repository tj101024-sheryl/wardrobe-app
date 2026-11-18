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
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Link2,
  X,
} from "lucide-react-native";
import { http } from "../api";
import {
  BRAND_SUGGESTIONS,
  ITEM_TYPES,
  hasClothingFields,
  OCCASIONS,
  SEASONS,
  STYLES,
  WEATHERS,
  joinEfficacy,
} from "../types";
import { CategoryPicker, EfficacyPicker } from "../components/CategoryPickers";
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
  const params = useLocalSearchParams<{ type?: string }>();
  const [uri, setUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [itemType, setItemType] = useState(() => {
    const initial = params.type;
    return typeof initial === "string" &&
      ITEM_TYPES.some((t) => t.key === initial)
      ? initial
      : "clothes";
  });
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [season, setSeason] = useState("");
  const [occasion, setOccasion] = useState("");
  const [weather, setWeather] = useState("");
  const [style, setStyle] = useState("");
  const [expiry, setExpiry] = useState("");
  const [efficacy, setEfficacy] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function chooseType(key: string) {
    setItemType(key);
    setCategory("");
    setSeason("");
    setWeather("");
    setExpiry("");
    setEfficacy([]);
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
      if (Platform.OS === "web") {
        const blob = await (await fetch(uri)).blob();
        form.append("file", blob, filename);
      } else {
        form.append("file", new File(uri) as any);
      }
      form.append("name", name);
      form.append("brand", brand);
      form.append("item_type", itemType);
      form.append("category", category);
      form.append("color", color);
      form.append("season", hasClothingFields(itemType) ? season : "");
      form.append("occasion", occasion);
      form.append("weather", hasClothingFields(itemType) ? weather : "");
      form.append("style", style);
      form.append("expiry", hasClothingFields(itemType) ? "" : expiry);
      form.append("efficacy", joinEfficacy(efficacy));
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
    setBrand("");
    setColor("");
    setSeason("");
    setOccasion("");
    setWeather("");
    setStyle("");
    setExpiry("");
    setItemType("clothes");
    setCategory("");
    setEfficacy([]);
    setShowMore(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.mediaRow}>
        <View style={styles.previewBox}>
          {uri ? (
            <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.previewEmpty}>
              <Text style={styles.previewIcon}>👕</Text>
              <Text style={styles.previewText}>尚未選擇圖片</Text>
            </View>
          )}
          {uri ? (
            <TouchableOpacity
              style={styles.previewRemove}
              onPress={() => setUri(null)}
              activeOpacity={0.8}
            >
              <X size={14} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.mediaActions}>
          <TouchableOpacity
            style={styles.mediaBtn}
            onPress={() => pick(false)}
            activeOpacity={0.85}
          >
            <ImageIcon size={18} color={colors.text} strokeWidth={2} />
            <Text style={styles.mediaBtnText}>相簿選圖</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaBtn}
            onPress={() => pick(true)}
            activeOpacity={0.85}
          >
            <Camera size={18} color={colors.text} strokeWidth={2} />
            <Text style={styles.mediaBtnText}>拍照</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaBtn}
            onPress={() => router.push("/scrape")}
            activeOpacity={0.85}
          >
            <Link2 size={18} color={colors.text} strokeWidth={2} />
            <Text style={styles.mediaBtnText}>貼商品連結</Text>
          </TouchableOpacity>
        </View>
      </View>

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
          value={brand}
          onChangeText={setBrand}
          placeholder="品牌，例如：UNIQLO"
          placeholderTextColor={colors.faint}
          autoCapitalize="characters"
        />
        <View style={styles.brandChips}>
          {BRAND_SUGGESTIONS.map((suggestion) => {
            const active = brand.trim().toUpperCase() === suggestion;
            return (
              <TouchableOpacity
                key={suggestion}
                style={[styles.brandChip, active && styles.brandChipActive]}
                onPress={() => setBrand(active ? "" : suggestion)}
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

        <TouchableOpacity
          style={styles.moreToggle}
          onPress={() => setShowMore((value) => !value)}
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.moreTitle}>更多資訊</Text>
            <Text style={styles.moreSub}>季節、場合、天氣、風格</Text>
          </View>
          {showMore ? (
            <ChevronUp size={20} color={colors.sub} />
          ) : (
            <ChevronDown size={20} color={colors.sub} />
          )}
        </TouchableOpacity>

        {showMore ? (
          <View style={styles.moreBody}>
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
  mediaRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  previewBox: {
    width: "42%",
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: { width: "100%", height: "100%" },
  previewEmpty: { alignItems: "center", gap: 8, padding: 8 },
  previewIcon: { fontSize: 42, opacity: 0.45 },
  previewText: { fontSize: 10, color: colors.faint },
  previewRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaActions: {
    flex: 1,
    justifyContent: "space-between",
    gap: 8,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  mediaBtnText: { fontSize: 13, fontWeight: "700", color: colors.text },
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
    marginBottom: 9,
  },
  brandChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: -2,
    marginBottom: 9,
  },
  brandChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  brandChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  brandChipText: { fontSize: 12, color: colors.text, fontWeight: "600" },
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
  moreToggle: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moreTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  moreSub: { fontSize: 10, color: colors.faint, marginTop: 3 },
  moreBody: { marginTop: 2 },
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
