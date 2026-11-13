import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { http } from "../api";
import {
  AUDIENCE_SHORT_LABEL,
  CATEGORY_LABEL,
  CanvasTransform,
  Item,
  OCCASIONS,
  Outfit,
  OUTFIT_ROLES,
  outfitRoleOf,
  usageLabel,
  VISIBILITY_LABEL,
  fullUrl,
} from "../types";
import {
  addDays,
  longDate,
  parseYmd,
  relativeDate,
  ymd,
} from "../date";
import { ItemThumb } from "../components/ItemThumb";
import {
  OutfitCanvas,
  defaultTransform,
  transformsFromOutfit,
} from "../components/OutfitCanvas";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { syncOutfitReminders } from "../notifications";
import { colors, radius, shadow, type } from "../theme";

const PRODUCT_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "makeup", label: "化妝品" },
  { key: "skincare", label: "保養品" },
  { key: "accessories", label: "配件" },
  { key: "clothes", label: "衣服" },
];

function PhotoCard({
  label,
  hint,
  uri,
  kind,
  width,
  onPick,
  onRemove,
}: {
  label: string;
  hint: string;
  uri: string | null;
  kind: "outfit" | "makeup";
  width: number;
  onPick: (camera: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.photoCard, { width }]}>
      <View style={[styles.photoBox, { width, height: width }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.photoEmpty}>
            <Text style={styles.photoEmptyIcon}>
              {kind === "outfit" ? "🪞" : "💄"}
            </Text>
            <Text style={styles.photoEmptyText}>{hint}</Text>
          </View>
        )}
        {uri ? (
          <TouchableOpacity
            style={styles.photoRemove}
            onPress={onRemove}
            activeOpacity={0.8}
          >
            <Text style={styles.photoRemoveText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.photoLabel}>{label}</Text>
      <View style={styles.photoBtns}>
        <TouchableOpacity
          style={styles.photoBtn}
          onPress={() => onPick(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.photoBtnText}>拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.photoBtn}
          onPress={() => onPick(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.photoBtnText}>相簿</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CanvasToolButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.toolButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.toolButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function OutfitEditorScreen() {
  const params = useLocalSearchParams<{ date?: string; id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const initialDate = params.date || ymd(new Date());
  const { width } = useWindowDimensions();
  const frame = Math.min(width, PHONE_MAX_WIDTH);
  const photoW = (frame - 36 - 10) / 2;

  const [dateStr, setDateStr] = useState(initialDate);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [occasion, setOccasion] = useState("");
  const [audience, setAudience] = useState("unisex");
  const [visibility, setVisibility] = useState("public");
  const [makeupVisibility, setMakeupVisibility] = useState("public");
  const [selected, setSelected] = useState<number[]>([]);
  const [productIds, setProductIds] = useState<number[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [canvasMode, setCanvasMode] = useState(false);
  const [canvasTransforms, setCanvasTransforms] = useState<
    Record<number, CanvasTransform>
  >({});
  const [canvasSelected, setCanvasSelected] = useState<number | null>(null);

  const [outfitPhotoLocal, setOutfitPhotoLocal] = useState<string | null>(null);
  const [outfitPhotoUrl, setOutfitPhotoUrl] = useState<string | null>(null);
  const [outfitPhotoRemoved, setOutfitPhotoRemoved] = useState(false);
  const [makeupPhotoLocal, setMakeupPhotoLocal] = useState<string | null>(null);
  const [makeupPhotoUrl, setMakeupPhotoUrl] = useState<string | null>(null);
  const [makeupPhotoRemoved, setMakeupPhotoRemoved] = useState(false);

  const [productPicker, setProductPicker] = useState(false);
  const [productFilter, setProductFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const all = await http.get<Item[]>("/api/items");
      setItems(all);
      if (editId) {
        const outfit = await http.get<Outfit>(`/api/outfits/${editId}`);
        setDateStr(outfit.date || initialDate);
        setTitle(outfit.title);
        setNotes(outfit.notes);
        setOccasion(outfit.occasion);
        setAudience(outfit.audience || "unisex");
        setVisibility(outfit.visibility);
        setMakeupVisibility(outfit.makeup_visibility || "public");
        setSelected(outfit.items.map((row) => row.item_id));
        setProductIds(outfit.products.map((row) => row.item_id));
        setCanvasMode(outfit.layout_mode === "canvas");
        setCanvasTransforms(transformsFromOutfit(outfit));
        setCanvasSelected(outfit.items[0]?.item_id ?? null);
        setOutfitPhotoUrl(outfit.photo_url);
        setMakeupPhotoUrl(outfit.makeup_photo_url);
        setOutfitPhotoLocal(null);
        setMakeupPhotoLocal(null);
        setOutfitPhotoRemoved(false);
        setMakeupPhotoRemoved(false);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [editId, initialDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const byId = useMemo(() => {
    const map = new Map<number, Item>();
    items.forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const outfitItems = useMemo(
    () =>
      items.filter(
        (i) => i.item_type === "clothes" || i.item_type === "accessories"
      ),
    [items]
  );

  const groups = useMemo(
    () =>
      OUTFIT_ROLES.map((role) => ({
        ...role,
        items: outfitItems.filter((i) => outfitRoleOf(i) === role.key),
      })).filter((g) => g.items.length > 0),
    [outfitItems]
  );

  const visibleGroups =
    roleFilter === "all" ? groups : groups.filter((g) => g.key === roleFilter);

  const productOptions = useMemo(() => {
    if (productFilter === "all") return items;
    return items.filter((i) => i.item_type === productFilter);
  }, [items, productFilter]);

  const selectedProducts = productIds
    .map((id) => byId.get(id))
    .filter((i): i is Item => !!i);

  const canvasSize = Math.min(frame - 36, 380);
  const selectedItems = useMemo(
    () =>
      selected
        .map((id) => byId.get(id))
        .filter((i): i is Item => !!i),
    [selected, byId]
  );
  const canvasItem =
    canvasSelected != null ? byId.get(canvasSelected) ?? null : null;

  const outfitPreview = outfitPhotoLocal
    ? outfitPhotoLocal
    : !outfitPhotoRemoved && outfitPhotoUrl
    ? fullUrl(outfitPhotoUrl)
    : null;
  const makeupPreview = makeupPhotoLocal
    ? makeupPhotoLocal
    : !makeupPhotoRemoved && makeupPhotoUrl
    ? fullUrl(makeupPhotoUrl)
    : null;

  const countable = selected.length + productIds.length > 0;
  const isFuture = dateStr > ymd(new Date());

  function toggle(id: number) {
    const exists = selected.includes(id);
    if (exists) {
      setSelected(selected.filter((x) => x !== id));
      if (canvasSelected === id) setCanvasSelected(null);
      return;
    }
    setSelected([...selected, id]);
    if (canvasMode) {
      const item = byId.get(id);
      if (item) {
        setCanvasTransforms((prev) =>
          prev[id]
            ? prev
            : {
                ...prev,
                [id]: defaultTransform(
                  item,
                  selected.length,
                  selected.length + 1
                ),
              }
        );
        setCanvasSelected(id);
      }
    }
  }

  function switchCanvasMode(on: boolean) {
    setCanvasMode(on);
    if (!on) return;
    setCanvasTransforms((prev) => {
      const next = { ...prev };
      selected.forEach((id, index) => {
        if (!next[id]) {
          const item = byId.get(id);
          if (item) {
            next[id] = defaultTransform(item, index, selected.length);
          }
        }
      });
      return next;
    });
    if (canvasSelected == null && selected.length > 0) {
      setCanvasSelected(selected[0]);
    }
  }

  function updateCanvasTransform(
    itemId: number,
    patch: Partial<CanvasTransform>
  ) {
    setCanvasTransforms((prev) => {
      let current = prev[itemId];
      if (!current) {
        const item = byId.get(itemId);
        if (!item) return prev;
        current = defaultTransform(
          item,
          selected.indexOf(itemId),
          selected.length
        );
      }
      return { ...prev, [itemId]: { ...current, ...patch } };
    });
  }

  function nudgeScale(delta: number) {
    if (canvasSelected == null) return;
    const tf = canvasTransforms[canvasSelected];
    if (!tf) return;
    updateCanvasTransform(canvasSelected, {
      scale: Math.max(0.35, Math.min(2.2, tf.scale + delta)),
    });
  }

  function nudgeRotation(delta: number) {
    if (canvasSelected == null) return;
    const tf = canvasTransforms[canvasSelected];
    if (!tf) return;
    updateCanvasTransform(canvasSelected, {
      rotation: tf.rotation + delta,
    });
  }

  function layerCanvasItem(direction: "up" | "down") {
    if (canvasSelected == null) return;
    const values = selected
      .map((id) => canvasTransforms[id]?.z_index)
      .filter((z): z is number => typeof z === "number");
    const target =
      direction === "up"
        ? Math.max(0, ...values) + 1
        : Math.min(0, ...values) - 1;
    updateCanvasTransform(canvasSelected, { z_index: target });
  }

  function resetCanvasItem() {
    if (canvasSelected == null) return;
    const item = byId.get(canvasSelected);
    if (!item) return;
    updateCanvasTransform(
      canvasSelected,
      defaultTransform(item, selected.indexOf(canvasSelected), selected.length)
    );
  }

  function removeCanvasItem() {
    if (canvasSelected == null) return;
    const id = canvasSelected;
    setSelected(selected.filter((x) => x !== id));
    setCanvasSelected(null);
  }

  function toggleProduct(id: number) {
    setProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function shiftDate(delta: number) {
    const base = parseYmd(dateStr) ?? new Date();
    setDateStr(ymd(addDays(base, delta)));
  }

  async function pickPhoto(kind: "outfit" | "makeup", camera = false) {
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError("沒有相機權限");
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setError("沒有相簿權限");
          return;
        }
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            quality: 0.85,
            allowsEditing: true,
            aspect: [1, 1],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.85,
            allowsEditing: true,
            aspect: [1, 1],
          });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      if (kind === "outfit") {
        setOutfitPhotoLocal(uri);
        setOutfitPhotoRemoved(false);
      } else {
        setMakeupPhotoLocal(uri);
        setMakeupPhotoRemoved(false);
      }
    } catch (e: any) {
      setError(e.message || "選擇照片失敗");
    }
  }

  function removePhoto(kind: "outfit" | "makeup") {
    if (kind === "outfit") {
      setOutfitPhotoLocal(null);
      setOutfitPhotoRemoved(true);
    } else {
      setMakeupPhotoLocal(null);
      setMakeupPhotoRemoved(true);
    }
  }

  async function uploadPhoto(uri: string): Promise<string> {
    const filename = uri.split("/").pop() || "photo.jpg";
    const ext = filename.toLowerCase().split(".").pop() || "jpg";
    const mime =
      ext === "png"
        ? "image/png"
        : ext === "webp"
        ? "image/webp"
        : "image/jpeg";
    const form = new FormData();
    form.append("file", { uri, name: filename, type: mime } as any);
    const res = await http.post<{ path: string }>("/api/uploads", form);
    return res.path;
  }

  async function save(complete: boolean) {
    setSaving(true);
    setError("");
    try {
      let outfitPath: string | undefined;
      if (outfitPhotoLocal) {
        outfitPath = await uploadPhoto(outfitPhotoLocal);
      } else if (outfitPhotoRemoved) {
        outfitPath = "";
      }
      let makeupPath: string | undefined;
      if (makeupPhotoLocal) {
        makeupPath = await uploadPhoto(makeupPhotoLocal);
      } else if (makeupPhotoRemoved) {
        makeupPath = "";
      }

      const payload: Record<string, unknown> = {
        title: title.trim(),
        date: dateStr,
        notes,
        occasion,
        audience,
        visibility,
        makeup_visibility: makeupVisibility,
        layout_mode: canvasMode ? "canvas" : "list",
        canvas_data: canvasMode ? { background: "paper" } : {},
        items: selected.map((id, index) => {
          const item = byId.get(id);
          const base = {
            item_id: id,
            role: item ? outfitRoleOf(item) : "",
          };
          if (!canvasMode) return base;
          const tf =
            canvasTransforms[id] ??
            (item ? defaultTransform(item, index, selected.length) : null);
          if (!tf) return base;
          return {
            ...base,
            x: tf.x,
            y: tf.y,
            scale: tf.scale,
            rotation: tf.rotation,
            z_index: tf.z_index,
          };
        }),
        product_ids: productIds,
      };
      if (outfitPath !== undefined) payload.photo_path = outfitPath;
      if (makeupPath !== undefined) payload.makeup_photo_path = makeupPath;

      const outfit = editId
        ? await http.patch<Outfit>(`/api/outfits/${editId}`, payload)
        : await http.post<Outfit>("/api/outfits", payload);

      if (complete && countable && !isFuture) {
        await http.post(`/api/outfits/${outfit.id}/wear`, {
          worn_on: dateStr,
        });
      }
      void syncOutfitReminders(true, isFuture).catch(() => {});
      router.replace(`/outfit/${outfit.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>哪一天</Text>
        <View style={styles.dateCard}>
          <TouchableOpacity
            style={styles.dateArrow}
            onPress={() => shiftDate(-1)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateArrowText}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.dateMain}>{relativeDate(dateStr)}</Text>
            <Text style={styles.dateSub}>{longDate(dateStr)}</Text>
          </View>
          <TouchableOpacity
            style={styles.dateArrow}
            onPress={() => shiftDate(1)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateArrowText}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickDates}>
          {[
            { label: "今天", offset: 0 },
            { label: "明天", offset: 1 },
            { label: "後天", offset: 2 },
          ].map((q) => {
            const value = ymd(addDays(new Date(), q.offset));
            const active = dateStr === value;
            return (
              <TouchableOpacity
                key={q.label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setDateStr(value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {q.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>這天的照片</Text>
        <Text style={styles.sectionHint}>都可以留空，之後再補</Text>
        <View style={styles.photoRow}>
          <PhotoCard
            label="穿搭照"
            hint="拍下今天的穿搭"
            uri={outfitPreview}
            kind="outfit"
            width={photoW}
            onPick={(camera) => pickPhoto("outfit", camera)}
            onRemove={() => removePhoto("outfit")}
          />
          <PhotoCard
            label="妝容照"
            hint="拍下今天的妝容"
            uri={makeupPreview}
            kind="makeup"
            width={photoW}
            onPick={(camera) => pickPhoto("makeup", camera)}
            onRemove={() => removePhoto("makeup")}
          />
        </View>

        <Text style={styles.sectionTitle}>排版模式</Text>
        <Text style={styles.sectionHint}>
          快速列表最省事；想做成拼貼就用畫布，拖曳喜歡的位置
        </Text>
        <View style={styles.modeTabs}>
          {[
            { key: false, label: "快速列表" },
            { key: true, label: "畫布拼貼" },
          ].map((tab) => {
            const active = canvasMode === tab.key;
            return (
              <TouchableOpacity
                key={tab.label}
                style={[styles.modeTab, active && styles.modeTabActive]}
                onPress={() => switchCanvasMode(tab.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.modeText, active && styles.modeTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {canvasMode ? (
          selectedItems.length === 0 ? (
            <View style={styles.canvasEmpty}>
              <Text style={styles.canvasEmptyEmoji}>🎨</Text>
              <Text style={styles.canvasEmptyText}>
                先從下面的單品挑幾件{"\n"}畫布會自動幫你排好位置
              </Text>
            </View>
          ) : (
            <>
              <OutfitCanvas
                items={selectedItems}
                transforms={canvasTransforms}
                size={canvasSize}
                editable
                selectedId={canvasSelected}
                onSelect={setCanvasSelected}
                onTransform={updateCanvasTransform}
              />
              <Text style={styles.canvasHint}>
                直接拖曳單品移動；點選後可用下方按鈕縮放、旋轉與調整圖層
              </Text>
              {canvasItem ? (
                <View style={styles.canvasTools}>
                  <View style={styles.canvasToolHead}>
                    <Text style={styles.canvasToolName} numberOfLines={1}>
                      {canvasItem.name || "未命名單品"}
                    </Text>
                    <Text style={styles.canvasToolMeta}>已選取</Text>
                  </View>
                  <View style={styles.toolRow}>
                    <CanvasToolButton
                      label="縮小"
                      onPress={() => nudgeScale(-0.1)}
                    />
                    <CanvasToolButton
                      label="放大"
                      onPress={() => nudgeScale(0.1)}
                    />
                    <CanvasToolButton
                      label="左轉"
                      onPress={() => nudgeRotation(-15)}
                    />
                    <CanvasToolButton
                      label="右轉"
                      onPress={() => nudgeRotation(15)}
                    />
                    <CanvasToolButton
                      label="上層"
                      onPress={() => layerCanvasItem("up")}
                    />
                    <CanvasToolButton
                      label="下層"
                      onPress={() => layerCanvasItem("down")}
                    />
                    <CanvasToolButton label="重設" onPress={resetCanvasItem} />
                    <CanvasToolButton label="移除" onPress={removeCanvasItem} />
                  </View>
                </View>
              ) : (
                <Text style={styles.canvasHint}>
                  點一下畫布上的單品，就能調整大小、角度與圖層
                </Text>
              )}
            </>
          )
        ) : null}

        <Text style={styles.sectionTitle}>穿搭</Text>
        <Text style={styles.sectionHint}>
          已選 {selected.length} 件
          {isFuture ? " · 到當天才會累計次數" : ""}
        </Text>

        {selected.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.selectedScroll}
            contentContainerStyle={styles.selectedRow}
          >
            {selected.map((id) => {
              const item = byId.get(id);
              if (!item) return null;
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.selectedItem}
                  onPress={() => toggle(id)}
                  activeOpacity={0.8}
                >
                  <ItemThumb item={item} size={54} />
                  <View style={styles.selectedRemove}>
                    <Text style={styles.selectedRemoveText}>×</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.chip, roleFilter === "all" && styles.chipActive]}
            onPress={() => setRoleFilter("all")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.chipText,
                roleFilter === "all" && styles.chipTextActive,
              ]}
            >
              全部
            </Text>
          </TouchableOpacity>
          {groups.map((g) => {
            const active = roleFilter === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setRoleFilter(g.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {g.label} {g.items.length}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {outfitItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧺</Text>
            <Text style={styles.emptyText}>
              衣櫃裡還沒有衣物{"\n"}先到衣櫃新增，再回來記錄
            </Text>
          </View>
        ) : (
          visibleGroups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              {group.items.map((item) => {
                const picked = selected.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemRow, picked && styles.itemRowActive]}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.8}
                  >
                    <ItemThumb item={item} size={48} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name || "未命名"}
                      </Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {CATEGORY_LABEL[item.category] || item.category}
                        {item.color ? ` · ${item.color}` : ""}
                        {item.wear_count > 0
                          ? ` · ${usageLabel(item.item_type)} ${item.wear_count} 次`
                          : ""}
                      </Text>
                    </View>
                    <View
                      style={[styles.check, picked && styles.checkActive]}
                    >
                      <Text
                        style={[
                          styles.checkText,
                          picked && styles.checkTextActive,
                        ]}
                      >
                        {picked ? "✓" : "+"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}

        <View style={styles.makeupHead}>
          <View>
            <Text style={styles.sectionTitle}>妝容與使用品項</Text>
            <Text style={styles.sectionHint}>
              可選填，選今天用的化妝品、保養品或其他品項
            </Text>
          </View>
        </View>

        {selectedProducts.length > 0 ? (
          <View style={styles.productChips}>
            {selectedProducts.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.productChip}
                onPress={() => toggleProduct(item.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.productChipText} numberOfLines={1}>
                  {item.name || CATEGORY_LABEL[item.category] || "品項"}
                </Text>
                <Text style={styles.productChipRemove}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.mutedText}>還沒有選今天用的品項</Text>
        )}

        <TouchableOpacity
          style={styles.chooseProducts}
          onPress={() => setProductPicker(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.chooseProductsText}>＋ 選擇今天用了什麼</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Look 資訊</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="替這天取個名字（選填）"
          placeholderTextColor={colors.faint}
        />
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          placeholder="筆記：場合、心情、搭配重點…"
          placeholderTextColor={colors.faint}
          multiline
        />

        <Text style={styles.label}>場合</Text>
        <View style={styles.wrapRow}>
          {OCCASIONS.map((o) => {
            const active = occasion === o;
            return (
              <TouchableOpacity
                key={o}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setOccasion(active ? "" : o)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {o}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>內容取向</Text>
        <Text style={styles.privacyHint}>
          公開後會出現在對應的探索分類；不確定就選中性。
        </Text>
        <View style={styles.wrapRow}>
          {(["male", "female", "unisex"] as const).map((v) => {
            const active = audience === v;
            return (
              <TouchableOpacity
                key={v}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setAudience(v)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {AUDIENCE_SHORT_LABEL[v]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>穿搭與照片隱私</Text>
        <View style={styles.wrapRow}>
          {(["public", "followers", "private"] as const).map((v) => {
            const active = visibility === v;
            return (
              <TouchableOpacity
                key={v}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setVisibility(v)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {VISIBILITY_LABEL[v]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>妝容與品項隱私</Text>
        <View style={styles.wrapRow}>
          {(["public", "followers", "private"] as const).map((v) => {
            const active = makeupVisibility === v;
            return (
              <TouchableOpacity
                key={v}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setMakeupVisibility(v)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {VISIBILITY_LABEL[v]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.privacyHint}>
          預設公開；也可以只給追蹤者或只給自己看。
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {!isFuture && countable ? (
          <TouchableOpacity
            style={[styles.ghostBtn, saving && { opacity: 0.5 }]}
            onPress={() => save(false)}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostText}>只儲存</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
          onPress={() =>
            save(!isFuture && countable)
          }
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              {isFuture
                ? `排入 ${longDate(dateStr)}`
                : countable
                ? "完成這天（+1 次）"
                : "儲存這天"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={productPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setProductPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setProductPicker(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>今天用了什麼？</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modalFilters}
            >
              {PRODUCT_FILTERS.map((f) => {
                const active = productFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setProductFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <ScrollView style={styles.modalList}>
              {productOptions.length === 0 ? (
                <Text style={styles.mutedText}>這個分類還沒有品項</Text>
              ) : (
                productOptions.map((item) => {
                  const picked = productIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.productRow}
                      onPress={() => toggleProduct(item.id)}
                      activeOpacity={0.8}
                    >
                      <ItemThumb item={item} size={40} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {item.name || "未命名"}
                        </Text>
                        <Text style={styles.productMeta} numberOfLines={1}>
                          {CATEGORY_LABEL[item.category] || item.category}
                        </Text>
                      </View>
                      <View
                        style={[styles.check, picked && styles.checkActive]}
                      >
                        <Text
                          style={[
                            styles.checkText,
                            picked && styles.checkTextActive,
                          ]}
                        >
                          {picked ? "✓" : "+"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalDone}
              onPress={() => setProductPicker(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneText}>
                完成（已選 {productIds.length} 樣）
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: {
    ...type.heading,
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHint: {
    ...type.caption,
    color: colors.sub,
    marginTop: -4,
    marginBottom: 8,
  },
  dateCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    ...shadow.soft,
  },
  dateArrow: { width: 48, alignItems: "center", paddingVertical: 4 },
  dateArrowText: { fontSize: 26, color: colors.sub },
  dateMain: { ...type.heading, color: colors.text, fontSize: 18 },
  dateSub: { ...type.caption, color: colors.sub, marginTop: 2 },
  quickDates: { flexDirection: "row", gap: 8, marginTop: 10 },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.sub, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  photoRow: { flexDirection: "row", gap: 10 },
  photoCard: {},
  photoBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmpty: { alignItems: "center", gap: 5, padding: 8 },
  photoEmptyIcon: { fontSize: 26 },
  photoEmptyText: { fontSize: 10, color: colors.faint, textAlign: "center" },
  photoRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: { color: "#fff", fontSize: 14, lineHeight: 16 },
  photoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginTop: 7,
    textAlign: "center",
  },
  photoBtns: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 5,
  },
  photoBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  photoBtnText: { fontSize: 10, color: colors.sub, fontWeight: "600" },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    padding: 3,
    marginBottom: 10,
  },
  modeTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  modeTabActive: { backgroundColor: colors.primary },
  modeText: { fontSize: 12, fontWeight: "700", color: colors.sub },
  modeTextActive: { color: "#fff" },
  canvasEmpty: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    paddingVertical: 34,
    alignItems: "center",
  },
  canvasEmptyEmoji: { fontSize: 32 },
  canvasEmptyText: {
    fontSize: 11,
    color: colors.sub,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 17,
  },
  canvasHint: {
    fontSize: 10,
    color: colors.faint,
    lineHeight: 15,
    marginTop: 7,
  },
  canvasTools: {
    marginTop: 9,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  canvasToolHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  canvasToolName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  canvasToolMeta: { fontSize: 9, color: colors.faint },
  toolRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  toolButton: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  toolButtonText: { fontSize: 10, fontWeight: "700", color: colors.text },
  selectedScroll: { marginBottom: 4 },
  selectedRow: { gap: 8 },
  selectedItem: { position: "relative" },
  selectedRemove: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRemoveText: { color: "#fff", fontSize: 12, lineHeight: 14 },
  filterScroll: { marginTop: 10, marginBottom: 6 },
  filterRow: { gap: 8, paddingRight: 8 },
  group: { marginTop: 12 },
  groupTitle: {
    ...type.label,
    color: colors.sub,
    marginBottom: 6,
    marginLeft: 2,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 8,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: "transparent",
  },
  itemRowActive: { borderColor: colors.primary },
  itemName: { fontSize: 13, fontWeight: "700", color: colors.text },
  itemMeta: { fontSize: 11, color: colors.sub, marginTop: 3 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { color: colors.faint, fontSize: 15, fontWeight: "700" },
  checkTextActive: { color: "#fff" },
  empty: { alignItems: "center", paddingVertical: 36 },
  emptyEmoji: { fontSize: 36 },
  emptyText: {
    ...type.caption,
    color: colors.sub,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 19,
  },
  makeupHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  productChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 6,
  },
  productChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
    maxWidth: 160,
  },
  productChipText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  productChipRemove: { fontSize: 13, color: colors.sub, fontWeight: "700" },
  mutedText: { fontSize: 11, color: colors.faint, marginTop: 6 },
  chooseProducts: {
    marginTop: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 11,
    alignItems: "center",
  },
  chooseProductsText: { fontSize: 12, fontWeight: "700", color: colors.text },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 9,
  },
  notes: { minHeight: 76, textAlignVertical: "top" },
  label: {
    ...type.label,
    color: colors.sub,
    marginTop: 14,
    marginBottom: 8,
  },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  privacyHint: {
    fontSize: 10,
    color: colors.faint,
    marginTop: 8,
    lineHeight: 15,
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: 10 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ghostBtn: {
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  ghostText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: { ...type.heading, color: colors.text, marginBottom: 10 },
  modalFilters: { gap: 8, paddingBottom: 10 },
  modalList: { maxHeight: 380 },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  productName: { fontSize: 13, fontWeight: "700", color: colors.text },
  productMeta: { fontSize: 10, color: colors.sub, marginTop: 3 },
  modalDone: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDoneText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
