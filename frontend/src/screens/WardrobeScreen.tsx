import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  ScrollView,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { http } from "../api";
import {
  ITEM_TYPES,
  categoryIcon,
  usageLabel,
  efficaciesOf,
  hasEfficacyFields,
  Item,
  ServerCategory,
} from "../types";
import { useCategoryTree } from "../useCategories";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { colors, radius, shadow, type } from "../theme";

export default function WardrobeScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemType, setItemType] = useState<string>("clothes");
  // 左側選中的第二層分類；null＝全部
  const [rootId, setRootId] = useState<number | null>(null);
  // 右側選中的第三層分類 key；null＝整個第二層
  const [leafKey, setLeafKey] = useState<string | null>(null);
  const [efficacyFilter, setEfficacyFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [manage, setManage] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const numColumns = 2;

  const { cats, tree, labelOf, fullLabelOf, keysOfBranch, reload: reloadCats } =
    useCategoryTree(itemType);

  const root = useMemo(
    () => tree.find((b) => b.root.id === rootId) ?? null,
    [tree, rootId]
  );
  const selectedRoot = root?.root ?? null;

  // 分類長按選單 / 對話框 / 併入
  const [catMenu, setCatMenu] = useState<ServerCategory | null>(null);
  const [inputModal, setInputModal] = useState<{
    mode: "add" | "rename";
    parentId?: number | null;
    catId?: number;
    text: string;
  } | null>(null);
  const [mergeSource, setMergeSource] = useState<ServerCategory | null>(null);

  function chooseType(key: string) {
    setItemType(key);
    setRootId(null);
    setLeafKey(null);
    setEfficacyFilter("");
    setManage(false);
  }

  function chooseRoot(id: number | null) {
    setRootId(id);
    setLeafKey(null);
  }

  function openMenu(cat: ServerCategory) {
    setCatMenu(cat);
  }

  function submitInput() {
    if (!inputModal) return;
    const text = inputModal.text.trim();
    if (!text) return;
    const run = async () => {
      if (inputModal.mode === "add") {
        await http.post("/api/categories", {
          item_type: itemType,
          label: text,
          parent_id: inputModal.parentId ?? null,
        });
      } else if (inputModal.catId != null) {
        await http.patch(`/api/categories/${inputModal.catId}`, { label: text });
      }
      setInputModal(null);
      await reloadCats();
    };
    run().catch((e: any) => Alert.alert("失敗", e.message));
  }

  function deleteCat() {
    const cat = catMenu;
    setCatMenu(null);
    if (!cat) return;
    Alert.alert("刪除分類", `確定要刪除「${cat.label}」嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          try {
            await http.del(`/api/categories/${cat.id}`);
            if (rootId === cat.id) chooseRoot(null);
            if (leafKey === cat.key) setLeafKey(null);
            await reloadCats();
          } catch (e: any) {
            Alert.alert("無法刪除", e.message);
          }
        },
      },
    ]);
  }

  function pickMergeTarget(target: ServerCategory) {
    const source = mergeSource;
    setMergeSource(null);
    if (!source || source.id === target.id) return;
    (async () => {
      await http.post(`/api/categories/${source.id}/merge`, {
        target_id: target.id,
      });
      if (rootId === source.id) setRootId(target.id);
      if (leafKey === source.key) setLeafKey(target.key);
      await reloadCats();
    })().catch((e: any) => Alert.alert("失敗", e.message));
  }

  const load = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams();
      params.set("item_type", itemType);
      if (efficacyFilter) params.set("efficacy", efficacyFilter);
      const data = await http.get<Item[]>(`/api/items?${params.toString()}`);
      setItems(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [itemType, efficacyFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // 後端只做 item_type / 功效篩選；分類範圍在前端用樹組出來
  const visibleItems = useMemo(() => {
    if (!rootId) return items;
    const keys = keysOfBranch(rootId);
    if (leafKey) return items.filter((i) => i.category === leafKey);
    return items.filter((i) => keys.includes(i.category));
  }, [items, rootId, leafKey, keysOfBranch]);

  const mergeTargets = useMemo(() => {
    if (!mergeSource) return [];
    return cats.filter(
      (c) =>
        c.id !== mergeSource.id &&
        c.parent_id === mergeSource.parent_id &&
        c.item_type === mergeSource.item_type
    );
  }, [cats, mergeSource]);

  const efficacyOptions = efficaciesOf(itemType);
  const showFilter = hasEfficacyFields(itemType);

  function renderMenuButton(cat: ServerCategory) {
    if (!manage) return null;
    return (
      <TouchableOpacity
        style={styles.moreBtn}
        onPress={() => openMenu(cat)}
        hitSlop={8}
        activeOpacity={0.7}
      >
        <Text style={styles.moreText}>⋯</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>我的衣櫃</Text>
            <Text style={styles.sub}>
              {items.length} 件 · 隨手記錄每一天
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.manageBtn, manage && styles.manageBtnActive]}
            onPress={() => setManage((m) => !m)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.manageText, manage && styles.manageTextActive]}
            >
              {manage ? "完成" : "管理模式"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.segment}>
        {ITEM_TYPES.map((t) => {
          const active = itemType === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => chooseType(t.key)}
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

      <View style={styles.body}>
        {/* 左側：第二層小分類 */}
        <ScrollView
          style={styles.sidebar}
          contentContainerStyle={styles.sidebarContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[styles.sideRow, !rootId && styles.sideRowActive]}
            onPress={() => chooseRoot(null)}
            activeOpacity={0.75}
          >
            <Text
              style={[styles.sideText, !rootId && styles.sideTextActive]}
              numberOfLines={1}
            >
              全部
            </Text>
          </TouchableOpacity>
          {tree.map(({ root: c }) => {
            const active = rootId === c.id;
            return (
              <View key={c.id} style={styles.sideRowWrap}>
                <TouchableOpacity
                  style={[styles.sideRow, active && styles.sideRowActive]}
                  onPress={() => chooseRoot(c.id)}
                  onLongPress={() => openMenu(c)}
                  delayLongPress={350}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[styles.sideText, active && styles.sideTextActive]}
                    numberOfLines={1}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
                {renderMenuButton(c)}
              </View>
            );
          })}
          <TouchableOpacity
            style={styles.sideAdd}
            onPress={() => setInputModal({ mode: "add", parentId: null, text: "" })}
            activeOpacity={0.75}
          >
            <Text style={styles.sideAddText}>＋ 新增</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 右側：第三層瓷磚 + 物品網格 */}
        <View style={styles.pane}>
          <View style={styles.paneHead}>
            <TouchableOpacity
              style={styles.crumb}
              onPress={() => setLeafKey(null)}
              disabled={!leafKey}
              activeOpacity={0.7}
            >
              <Text style={styles.crumbText} numberOfLines={1}>
                {selectedRoot ? selectedRoot.label : "全部"}
                {leafKey ? ` / ${labelOf(leafKey)}` : ""}
              </Text>
            </TouchableOpacity>
            {showFilter ? (
              <TouchableOpacity
                style={[styles.filterBtn, efficacyFilter && styles.filterBtnActive]}
                onPress={() => setFilterOpen(true)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    efficacyFilter && styles.filterTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {efficacyFilter ? `功效 · ${efficacyFilter}` : "篩選 ▼"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {selectedRoot && root && root.children.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tileScroll}
              contentContainerStyle={styles.tileRow}
            >
              {root.children.map((leaf) => {
                const active = leafKey === leaf.key;
                return (
                  <View key={leaf.id} style={styles.tileWrap}>
                    <TouchableOpacity
                      style={[styles.tile, active && styles.tileActive]}
                      onPress={() =>
                        setLeafKey((k) => (k === leaf.key ? null : leaf.key))
                      }
                      onLongPress={() => openMenu(leaf)}
                      delayLongPress={350}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.tileIcon}>
                        {categoryIcon(itemType, leaf.key)}
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.tileLabel,
                        active && styles.tileLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {leaf.label}
                    </Text>
                    {manage ? (
                      <TouchableOpacity
                        style={styles.tileMore}
                        onPress={() => openMenu(leaf)}
                        hitSlop={6}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.moreText}>⋯</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
              <View style={styles.tileWrap}>
                <TouchableOpacity
                  style={[styles.tile, styles.tileAdd]}
                  onPress={() =>
                    setInputModal({
                      mode: "add",
                      parentId: root.root.id,
                      text: "",
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.tileAddPlus}>＋</Text>
                </TouchableOpacity>
                <Text style={styles.tileLabel}>新增</Text>
              </View>
            </ScrollView>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={load}>
                <Text style={styles.retry}>重試</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.text} />
          ) : (
            <FlatList
              data={visibleItems}
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
                    <Text style={styles.emptyEmoji}>
                      {categoryIcon(itemType, "")}
                    </Text>
                  </View>
                  <Text style={styles.emptyTitle}>這裡還沒有物品</Text>
                  <Text style={styles.emptySub}>
                    {selectedRoot
                      ? `「${selectedRoot.label}」底下還沒有東西\n換個分類，或新增一件吧`
                      : "貼商品網址抓圖，或上傳截圖\n開始建立你的衣櫃"}
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
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {fullLabelOf(item.category)}
                        {` · ${usageLabel(item.item_type)} `}
                        {item.wear_count}
                        {" 次"}
                      </Text>
                    ) : (
                      <View style={styles.wornBadge}>
                        <Text style={styles.wornBadgeText}>
                          {item.item_type === "clothes"
                            ? "還沒穿過"
                            : "還沒用過"}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>

      {/* 分類動作選單 */}
      <Modal
        visible={!!catMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setCatMenu(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCatMenu(null)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <Text style={styles.menuTitle}>{catMenu?.label}</Text>
            {catMenu && catMenu.parent_id == null ? (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  const cat = catMenu;
                  setCatMenu(null);
                  if (cat)
                    setInputModal({
                      mode: "add",
                      parentId: cat.id,
                      text: "",
                    });
                }}
              >
                <Text style={styles.menuIcon}>＋</Text>
                <Text style={styles.menuText}>新增第三層分類</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                const cat = catMenu;
                setCatMenu(null);
                if (cat)
                  setInputModal({
                    mode: "rename",
                    catId: cat.id,
                    text: cat.label,
                  });
              }}
            >
              <Text style={styles.menuIcon}>✏️</Text>
              <Text style={styles.menuText}>重新命名</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMergeSource(catMenu);
                setCatMenu(null);
              }}
            >
              <Text style={styles.menuIcon}>🔁</Text>
              <Text style={styles.menuText}>併入同層分類</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={deleteCat}>
              <Text style={styles.menuIcon}>🗑️</Text>
              <Text style={[styles.menuText, { color: colors.danger }]}>
                刪除
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuCancelRow]}
              onPress={() => setCatMenu(null)}
            >
              <Text style={[styles.menuText, styles.menuCancel]}>取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 新增 / 重新命名 */}
      <Modal
        visible={!!inputModal}
        transparent
        animationType="fade"
        onRequestClose={() => setInputModal(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setInputModal(null)}
        >
          <Pressable style={styles.dialogCard} onPress={() => {}}>
            <Text style={styles.menuTitle}>
              {inputModal?.mode === "add"
                ? inputModal.parentId != null
                  ? "新增第三層分類"
                  : "新增小分類"
                : "重新命名"}
            </Text>
            <TextInput
              style={styles.dialogInput}
              value={inputModal?.text ?? ""}
              onChangeText={(t) =>
                setInputModal((m) => (m ? { ...m, text: t } : m))
              }
              placeholder="分類名稱"
              placeholderTextColor={colors.faint}
              autoFocus
            />
            <View style={styles.dialogBtns}>
              <TouchableOpacity
                style={styles.dialogBtnGhost}
                onPress={() => setInputModal(null)}
              >
                <Text style={styles.dialogBtnGhostText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogBtnPrimary}
                onPress={submitInput}
              >
                <Text style={styles.dialogBtnPrimaryText}>確定</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 併入目標選擇（同層） */}
      <Modal
        visible={!!mergeSource}
        transparent
        animationType="fade"
        onRequestClose={() => setMergeSource(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMergeSource(null)}
        >
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <Text style={styles.menuTitle}>併入哪個同層分類？</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {mergeTargets.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.menuItem}
                  onPress={() => pickMergeTarget(c)}
                >
                  <Text style={styles.menuText}>{c.label}</Text>
                </TouchableOpacity>
              ))}
              {mergeTargets.length === 0 ? (
                <Text style={styles.menuEmpty}>這一層沒有其他分類</Text>
              ) : null}
            </ScrollView>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuCancelRow]}
              onPress={() => setMergeSource(null)}
            >
              <Text style={[styles.menuText, styles.menuCancel]}>取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 功效篩選 */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFilterOpen(false)}
        >
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <Text style={styles.menuTitle}>功效篩選</Text>
            <View style={styles.filterChips}>
              {efficacyOptions.map((e) => {
                const active = efficacyFilter === e;
                return (
                  <TouchableOpacity
                    key={e}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      setEfficacyFilter((cur) => (cur === e ? "" : e));
                      setFilterOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {e}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.filterClear}
              onPress={() => {
                setEfficacyFilter("");
                setFilterOpen(false);
              }}
            >
              <Text style={styles.filterClearText}>清除篩選</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: Platform.OS === "web" ? 24 : 12,
    paddingHorizontal: 18,
    paddingBottom: 2,
    backgroundColor: colors.bg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  greeting: { ...type.display, color: colors.text },
  sub: { ...type.caption, color: colors.sub, marginTop: 4 },
  manageBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  manageBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  manageText: { fontSize: 12, fontWeight: "700", color: colors.text },
  manageTextActive: { color: "#fff" },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginTop: 6,
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
  body: { flex: 1, flexDirection: "row", marginTop: 10 },
  sidebar: {
    width: 100,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: "#f4f2ee",
  },
  sidebarContent: { paddingBottom: 32, paddingTop: 4 },
  sideRowWrap: { position: "relative" },
  sideRow: {
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 20,
  },
  sideRowActive: { backgroundColor: "#e7e3dd" },
  sideText: { fontSize: 14, color: colors.sub, fontWeight: "500" },
  sideTextActive: { color: colors.text, fontWeight: "800" },
  moreBtn: {
    position: "absolute",
    right: 4,
    top: 12,
    width: 14,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: { fontSize: 14, color: colors.faint, fontWeight: "700" },
  sideAdd: { paddingVertical: 14, paddingLeft: 14 },
  sideAddText: { fontSize: 13, color: colors.sub, fontWeight: "600" },
  pane: { flex: 1 },
  paneHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 6,
  },
  crumb: { flex: 1 },
  crumbText: { ...type.heading, fontSize: 15, color: colors.text },
  filterBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 140,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 11, fontWeight: "600", color: colors.sub },
  filterTextActive: { color: "#fff" },
  tileScroll: { flexGrow: 0, flexShrink: 0, height: 102, marginBottom: 6 },
  tileRow: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 10,
    alignItems: "flex-start",
  },
  tileWrap: { width: 96, alignItems: "center", position: "relative" },
  tile: {
    width: "100%",
    height: 62,
    borderRadius: radius.md,
    backgroundColor: "#f0efec",
    alignItems: "center",
    justifyContent: "center",
  },
  tileActive: { backgroundColor: colors.primary },
  tileIcon: { fontSize: 24 },
  tileLabel: {
    marginTop: 6,
    fontSize: 12,
    color: colors.text,
    fontWeight: "700",
  },
  tileLabelActive: { fontWeight: "800" },
  tileMore: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tileAdd: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  tileAddPlus: { fontSize: 22, color: colors.sub, lineHeight: 24 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: 36,
    // Web 的 Modal 會 portal 到 body，這裡把內容限制在手機框寬度內
    ...(Platform.OS === "web"
      ? { width: "100%" as const, maxWidth: PHONE_MAX_WIDTH, alignSelf: "center" as const }
      : {}),
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 6,
    overflow: "hidden",
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  menuIcon: { fontSize: 15 },
  menuText: { fontSize: 15, color: colors.text },
  menuEmpty: {
    fontSize: 13,
    color: colors.faint,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuCancelRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  menuCancel: { color: colors.sub, textAlign: "center", width: "100%" },
  dialogCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
  },
  dialogInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  dialogBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  dialogBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  dialogBtnGhostText: { color: colors.text, fontWeight: "600", fontSize: 14 },
  dialogBtnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  dialogBtnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  chip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  chipActive: { backgroundColor: colors.chipActive },
  chipText: { fontSize: 13, color: colors.sub, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  filterClear: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 13,
    alignItems: "center",
  },
  filterClearText: { fontSize: 14, color: colors.sub, fontWeight: "600" },
  errorBox: {
    marginHorizontal: 14,
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
  grid: { paddingHorizontal: 14, paddingBottom: 40, gap: 18 },
  card: { width: "48%", backgroundColor: "transparent" },
  cardImg: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f0efec",
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIcon: { fontSize: 40 },
  cardBody: { paddingTop: 7 },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  cardMeta: {
    color: colors.sub,
    fontSize: 11,
    lineHeight: 17,
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
    paddingVertical: 40,
    paddingHorizontal: 18,
  },
  emptyArt: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyEmoji: { fontSize: 38 },
  emptyTitle: { ...type.title, color: colors.text, fontSize: 18 },
  emptySub: {
    ...type.body,
    color: colors.sub,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
    fontSize: 13,
  },
  emptyCtas: { flexDirection: "row", gap: 10, marginTop: 20 },
  ctaPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.full,
    ...shadow.card,
  },
  ctaPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  ctaGhost: {
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaGhostText: { color: colors.text, fontWeight: "700", fontSize: 13 },
});
