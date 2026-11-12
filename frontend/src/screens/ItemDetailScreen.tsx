import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { http } from "../api";
import {
  CATEGORY_LABEL,
  ITEM_TYPE_LABEL,
  Item,
  OCCASIONS,
  SEASONS,
  STYLES,
  WEATHERS,
  categoryIcon,
  hasClothingFields,
} from "../types";
import { colors, radius, shadow, type } from "../theme";

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      <TouchableOpacity
        style={[styles.chip, !value && styles.chipActive]}
        onPress={() => onChange("")}
        activeOpacity={0.8}
      >
        <Text style={[styles.chipText, !value && styles.chipTextActive]}>
          不設
        </Text>
      </TouchableOpacity>
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

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export default function ItemDetailScreen({ itemId }: { itemId: number }) {
  const id = itemId;
  const [item, setItem] = useState<Item | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [season, setSeason] = useState("");
  const [occasion, setOccasion] = useState("");
  const [weather, setWeather] = useState("");
  const [style, setStyle] = useState("");
  const [expiry, setExpiry] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const all = await http.get<Item[]>("/api/items");
      const found = all.find((i) => i.id === id);
      if (!found) {
        setError("找不到這件項目");
        return;
      }
      setItem(found);
      setName(found.name);
      setColor(found.color);
      setSeason(found.season);
      setOccasion(found.occasion);
      setWeather(found.weather);
      setStyle(found.style);
      setExpiry(found.expiry);
      setBrand(found.brand);
      setSize(found.size);
      setPrice(found.price);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function save() {
    if (!item) return;
    setSaving(true);
    setError("");
    try {
      await http.patch(`/api/items/${item.id}`, {
        name,
        color,
        season: hasClothingFields(item.item_type) ? season : "",
        occasion,
        weather: hasClothingFields(item.item_type) ? weather : "",
        style,
        expiry: hasClothingFields(item.item_type) ? "" : expiry,
        brand,
        size,
        price,
      });
      Alert.alert("已更新");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeItem() {
    if (!item) return;
    Alert.alert("刪除項目", "確定要刪掉這件嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          try {
            await http.del(`/api/items/${item.id}`);
            router.back();
          } catch (e: any) {
            setError(e.message);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.container, { padding: 24 }]}>
        <Text style={{ color: colors.danger }}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
    >
      <View style={styles.imgCard}>
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>
            {categoryIcon(item.item_type, item.category)}
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Label>名稱</Label>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="名稱"
          placeholderTextColor={colors.faint}
        />

        <Label>種類</Label>
        <View style={styles.readonlyPill}>
          <Text style={styles.readonlyPillText}>
            {ITEM_TYPE_LABEL[item.item_type] || "衣服"}
            {" · "}
            {CATEGORY_LABEL[item.category] || item.category}
          </Text>
        </View>

        <Label>顏色</Label>
        <TextInput
          style={styles.input}
          value={color}
          onChangeText={setColor}
          placeholder="白、黑…"
          placeholderTextColor={colors.faint}
        />

        {!hasClothingFields(item.item_type) ? (
          <>
            <Label>到期日（選填）</Label>
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

      <View style={styles.formCard}>
        <Label>穿著次數</Label>
        <View style={styles.wearRow}>
          <Text style={styles.wearCount}>
            {item.wear_count > 0 ? `穿過 ${item.wear_count} 次` : "還沒穿過"}
          </Text>
        </View>

        <Label>品牌</Label>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="例如：Uniqlo"
          placeholderTextColor={colors.faint}
        />

        <Label>尺寸</Label>
        <TextInput
          style={styles.input}
          value={size}
          onChangeText={setSize}
          placeholder="例如：M / 280mm / 50ml"
          placeholderTextColor={colors.faint}
        />

        <Label>價錢</Label>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="例如：1290"
          placeholderTextColor={colors.faint}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formCard}>
        {hasClothingFields(item.item_type) ? (
          <>
            <Label>季節</Label>
            <ChipRow options={SEASONS} value={season} onChange={setSeason} />
          </>
        ) : null}
        <Label>場合</Label>
        <ChipRow options={OCCASIONS} value={occasion} onChange={setOccasion} />
        {hasClothingFields(item.item_type) ? (
          <>
            <Label>天氣</Label>
            <ChipRow options={WEATHERS} value={weather} onChange={setWeather} />
          </>
        ) : null}
        <Label>風格</Label>
        <ChipRow options={STYLES} value={style} onChange={setStyle} />
      </View>

      {item.source_url ? (
        <View style={styles.formCard}>
          <Label>來源</Label>
          <Text style={styles.link} numberOfLines={2}>
            {item.source_url}
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.save, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>儲存變更</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.delete} onPress={removeItem}>
        <Text style={styles.deleteText}>刪除這件項目</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  imgCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow.card,
  },
  iconBox: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f0efec",
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: { fontSize: 96 },
  formCard: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    ...shadow.soft,
  },
  label: { ...type.label, color: colors.sub, marginBottom: 8, marginTop: 4 },
  labelFirst: { marginTop: 0 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  readonlyPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  readonlyPillText: { fontSize: 14, color: colors.text, fontWeight: "600" },
  wearRow: { flexDirection: "row", alignItems: "center" },
  wearCount: { fontSize: 15, color: colors.text, fontWeight: "700" },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  chipActive: { backgroundColor: colors.chipActive },
  chipText: { fontSize: 13, color: colors.sub, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  link: { color: colors.text, fontSize: 13, textDecorationLine: "underline" },
  error: { color: colors.danger, marginTop: 16, fontSize: 13 },
  save: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: "center",
    marginTop: 24,
    ...shadow.card,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  delete: { alignItems: "center", marginTop: 14, padding: 12 },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
});
