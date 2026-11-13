import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  Bookmark,
  Check,
  ChevronDown,
  Heart,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { http } from "../api";
import { getWithCache } from "../cache";
import {
  AUDIENCE_SHORT_LABEL,
  BODY_TYPE_LABEL,
  FeedResult,
  LEVEL_LABEL,
  LikeResult,
  MAKEUP_LOOK_LABEL,
  Outfit,
  STYLE_LABEL,
  fullUrl,
} from "../types";
import { relativeDate } from "../date";
import FeedFilterSheet, {
  EMPTY_FEED_FILTERS,
  FeedDomain,
  FeedFilterState,
  filterCount,
  filterKey,
} from "../components/FeedFilterSheet";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { colors, radius, shadow, type } from "../theme";

type Scope = "discover" | "following";
type FormatFilter = "all" | "photo" | "video" | "tutorial";
type SortFilter = "latest" | "popular";

const PAGE_SIZE = 12;
const SAVED_KEY = "feed_saved_filter";

const DOMAIN_TABS: { key: FeedDomain; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "outfit", label: "穿搭" },
  { key: "makeup", label: "妝容" },
  { key: "skincare", label: "保養" },
  { key: "review", label: "產品推薦" },
];

const FORMAT_TABS: { key: FormatFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "photo", label: "圖文" },
  { key: "video", label: "影片" },
  { key: "tutorial", label: "教學" },
];

const SORT_OPTIONS: { key: SortFilter; label: string }[] = [
  { key: "latest", label: "最新" },
  { key: "popular", label: "最熱" },
];

const PASTELS = [
  "#EFE7DE",
  "#F5E3E7",
  "#E4ECF4",
  "#E7EFE6",
  "#F3ECD7",
  "#EAE4F2",
];

const CARD_HEIGHTS = [230, 205, 245, 215, 258, 225];

function coverHeight(outfit: Outfit): number {
  return CARD_HEIGHTS[outfit.id % CARD_HEIGHTS.length];
}

function coverLabel(outfit: Outfit): string {
  const types = outfit.content_types ?? [];
  if (types.includes("makeup")) return "妝容照片";
  if (types.includes("skincare")) return "保養照片";
  return "穿搭照片";
}

function formatBadge(outfit: Outfit): string {
  if (outfit.video_url) return "影片";
  if ((outfit.content_types ?? []).includes("tutorial")) return "教學";
  return "";
}

function buildQuery(params: Record<string, string | undefined>): string {
  return Object.entries(params)
    .filter(([, value]) => !!value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
    .join("&");
}

function filtersToLabels(filters: FeedFilterState): string[] {
  const labels: string[] = [];
  filters.audiences.forEach((value) => {
    labels.push(AUDIENCE_SHORT_LABEL[value] ?? "");
  });
  filters.styles.forEach((value) => {
    labels.push(STYLE_LABEL[value] ?? "");
  });
  if (filters.level !== "all") {
    labels.push(LEVEL_LABEL[filters.level] ?? "");
  }
  filters.occasions.forEach((value) => labels.push(value));
  filters.bodyTypes.forEach((value) => {
    labels.push(BODY_TYPE_LABEL[value] ?? "");
  });
  filters.makeupLooks.forEach((value) => {
    labels.push(MAKEUP_LOOK_LABEL[value] ?? "");
  });
  return labels.filter(Boolean);
}

function FeedCard({
  outfit,
  width,
  onOpen,
  onLike,
}: {
  outfit: Outfit;
  width: number;
  onOpen: () => void;
  onLike: () => void;
}) {
  const image = outfit.photo_url || outfit.makeup_photo_url;
  const badge = formatBadge(outfit);
  const level = outfit.level === "advanced" ? "進階" : "新手";
  const meta =
    outfit.products.length > 0
      ? `用到 ${outfit.products.length} 項產品`
      : outfit.items.length > 0
      ? `${outfit.items.length} 件單品`
      : "";

  return (
    <View style={[styles.card, { width }]}>
      <TouchableOpacity onPress={onOpen} activeOpacity={0.9}>
        <View
          style={[
            styles.cover,
            {
              height: coverHeight(outfit),
              backgroundColor: PASTELS[outfit.id % PASTELS.length],
            },
          ]}
        >
          {image ? (
            <Image
              source={{ uri: fullUrl(image) }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.coverPlaceholder}>{coverLabel(outfit)}</Text>
          )}
          {badge ? (
            <View style={styles.darkBadge}>
              <Text style={styles.darkBadgeText}>{badge}</Text>
            </View>
          ) : null}
          <View style={styles.lightBadge}>
            <Text style={styles.lightBadgeText}>{level}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {outfit.title || `${relativeDate(outfit.date)}的穿搭`}
        </Text>
      </TouchableOpacity>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {outfit.owner.username}
          {meta ? ` · ${meta}` : ""}
        </Text>
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={onLike}
          activeOpacity={0.75}
        >
          <Heart
            size={15}
            color={outfit.liked_by_me ? colors.danger : colors.sub}
            fill={outfit.liked_by_me ? colors.danger : "transparent"}
            strokeWidth={2}
          />
          {outfit.like_count > 0 ? (
            <Text style={styles.likeCount}>{outfit.like_count}</Text>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const [scope, setScope] = useState<Scope>("discover");
  const [domain, setDomain] = useState<FeedDomain>("all");
  const [format, setFormat] = useState<FormatFilter>("all");
  const [sort, setSort] = useState<SortFilter>("latest");
  const [filters, setFilters] = useState<FeedFilterState>(EMPTY_FEED_FILTERS);

  const [items, setItems] = useState<Outfit[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [savedFilter, setSavedFilter] = useState<FeedFilterState | null>(null);

  const { width } = useWindowDimensions();
  const frame = Math.min(width, PHONE_MAX_WIDTH);
  const cardW = (frame - 32 - 12) / 2;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVED_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as Partial<FeedFilterState>;
          setSavedFilter({ ...EMPTY_FEED_FILTERS, ...parsed });
        }
      } catch {
        // 快取失敗不影響瀏覽
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFirst = useCallback(async () => {
    void reloadKey;
    try {
      setError("");
      const body = buildQuery({
        scope,
        content_type: domain === "all" ? undefined : domain,
        format: format === "all" ? undefined : format,
        sort: sort === "latest" ? undefined : sort,
        audiences:
          filters.audiences.length > 0
            ? filters.audiences.join(",")
            : undefined,
        styles:
          filters.styles.length > 0 ? filters.styles.join(",") : undefined,
        level: filters.level === "all" ? undefined : filters.level,
        occasions:
          filters.occasions.length > 0
            ? filters.occasions.join(",")
            : undefined,
        body_types:
          filters.bodyTypes.length > 0
            ? filters.bodyTypes.join(",")
            : undefined,
        makeup_looks:
          filters.makeupLooks.length > 0
            ? filters.makeupLooks.join(",")
            : undefined,
        q: query || undefined,
        limit: String(PAGE_SIZE),
      });
      const result = await getWithCache<FeedResult>(
        `feed:${body}`,
        `/api/feed?${body}`
      );
      setItems(result.data.items);
      setNextCursor(result.data.next_cursor);
      setOffline(result.stale);
    } catch (e: any) {
      setError(e.message || "載入動態失敗");
      setOffline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope, domain, format, sort, filters, query, reloadKey]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadFirst();
    }, [loadFirst])
  );

  const resetList = useCallback(() => {
    setItems([]);
    setNextCursor(null);
    setLoading(true);
    setError("");
    setOffline(false);
    setReloadKey((value) => value + 1);
  }, []);

  async function loadMore() {
    if (!nextCursor || loadingMore || sort !== "latest") return;
    setLoadingMore(true);
    try {
      const body = buildQuery({
        scope,
        content_type: domain === "all" ? undefined : domain,
        format: format === "all" ? undefined : format,
        audiences:
          filters.audiences.length > 0
            ? filters.audiences.join(",")
            : undefined,
        styles:
          filters.styles.length > 0 ? filters.styles.join(",") : undefined,
        level: filters.level === "all" ? undefined : filters.level,
        occasions:
          filters.occasions.length > 0
            ? filters.occasions.join(",")
            : undefined,
        body_types:
          filters.bodyTypes.length > 0
            ? filters.bodyTypes.join(",")
            : undefined,
        makeup_looks:
          filters.makeupLooks.length > 0
            ? filters.makeupLooks.join(",")
            : undefined,
        q: query || undefined,
        cursor: String(nextCursor),
        limit: String(PAGE_SIZE),
      });
      const data = await http.get<FeedResult>(`/api/feed?${body}`);
      setItems((prev) => {
        const known = new Set(prev.map((row) => row.id));
        return [...prev, ...data.items.filter((row) => !known.has(row.id))];
      });
      setNextCursor(data.next_cursor);
    } catch (e: any) {
      setError(e.message || "載入更多失敗");
    } finally {
      setLoadingMore(false);
    }
  }

  function switchScope(next: Scope) {
    if (next === scope) return;
    setScope(next);
    resetList();
  }

  function switchDomain(next: FeedDomain) {
    if (next === domain) return;
    setDomain(next);
    setFilters((prev) => ({
      ...prev,
      bodyTypes:
        next === "outfit" || next === "all" ? prev.bodyTypes : [],
      makeupLooks:
        next === "makeup" || next === "all" ? prev.makeupLooks : [],
    }));
    resetList();
  }

  function switchFormat(next: FormatFilter) {
    if (next === format) return;
    setFormat(next);
    resetList();
  }

  function applyFilters(next: FeedFilterState) {
    setFilters(next);
    setFilterOpen(false);
    resetList();
  }

  function clearFilters() {
    setFilters({ ...EMPTY_FEED_FILTERS });
    setQuery("");
    setSearchText("");
    resetList();
  }

  function applySearch() {
    setQuery(searchText.trim());
    setSearchOpen(false);
    resetList();
  }

  const clearSearch = useCallback(() => {
    setSearchText("");
    setQuery("");
    resetList();
  }, [resetList]);

  async function saveCurrentFilter() {
    try {
      await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(filters));
      setSavedFilter(filters);
    } catch {
      // 忽略儲存失敗
    }
  }

  function applySavedFilter() {
    if (!savedFilter) return;
    setFilters(savedFilter);
    resetList();
  }

  async function toggleLike(outfit: Outfit) {
    const liked = !outfit.liked_by_me;
    const patch = (value: LikeResult) =>
      setItems((prev) =>
        prev.map((row) =>
          row.id === outfit.id
            ? {
                ...row,
                liked_by_me: value.liked,
                like_count: value.like_count,
              }
            : row
        )
      );
    setItems((prev) =>
      prev.map((row) =>
        row.id === outfit.id
          ? {
              ...row,
              liked_by_me: liked,
              like_count: Math.max(0, row.like_count + (liked ? 1 : -1)),
            }
          : row
      )
    );
    try {
      const value = liked
        ? await http.post<LikeResult>(`/api/outfits/${outfit.id}/like`)
        : await http.del<LikeResult>(`/api/outfits/${outfit.id}/like`);
      patch(value);
    } catch (e: any) {
      setItems((prev) =>
        prev.map((row) => (row.id === outfit.id ? outfit : row))
      );
      setError(e.message || "按讚失敗");
    }
  }

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; remove: () => void }[] = [];
    filters.audiences.forEach((value) => {
      chips.push({
        key: `audience-${value}`,
        label: AUDIENCE_SHORT_LABEL[value] ?? value,
        remove: () =>
          setFilters((prev) => ({
            ...prev,
            audiences: prev.audiences.filter((x) => x !== value),
          })),
      });
    });
    filters.styles.forEach((value) => {
      chips.push({
        key: `style-${value}`,
        label: STYLE_LABEL[value] ?? value,
        remove: () =>
          setFilters((prev) => ({
            ...prev,
            styles: prev.styles.filter((x) => x !== value),
          })),
      });
    });
    if (filters.level !== "all") {
      chips.push({
        key: "level",
        label: LEVEL_LABEL[filters.level] ?? filters.level,
        remove: () =>
          setFilters((prev) => ({ ...prev, level: "all" })),
      });
    }
    filters.occasions.forEach((value) => {
      chips.push({
        key: `occasion-${value}`,
        label: value,
        remove: () =>
          setFilters((prev) => ({
            ...prev,
            occasions: prev.occasions.filter((x) => x !== value),
          })),
      });
    });
    filters.bodyTypes.forEach((value) => {
      chips.push({
        key: `body-${value}`,
        label: BODY_TYPE_LABEL[value] ?? value,
        remove: () =>
          setFilters((prev) => ({
            ...prev,
            bodyTypes: prev.bodyTypes.filter((x) => x !== value),
          })),
      });
    });
    filters.makeupLooks.forEach((value) => {
      chips.push({
        key: `look-${value}`,
        label: MAKEUP_LOOK_LABEL[value] ?? value,
        remove: () =>
          setFilters((prev) => ({
            ...prev,
            makeupLooks: prev.makeupLooks.filter((x) => x !== value),
          })),
      });
    });
    if (query) {
      chips.push({
        key: "query",
        label: `搜尋：${query}`,
        remove: clearSearch,
      });
    }
    return chips;
  }, [filters, query, clearSearch]);

  const facetCount = filterCount(filters);
  const savedMatches =
    !!savedFilter && filterKey(savedFilter) === filterKey(filters);

  const columns = useMemo(() => {
    const cols: Outfit[][] = [[], []];
    const heights = [0, 0];
    items.forEach((outfit) => {
      const column = heights[0] <= heights[1] ? 0 : 1;
      cols[column].push(outfit);
      heights[column] += coverHeight(outfit) + 96;
    });
    return cols;
  }, [items]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } =
      event.nativeEvent;
    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - 260
    ) {
      void loadMore();
    }
  }

  function renderEmpty() {
    if (loading) {
      return (
        <ActivityIndicator color={colors.text} style={{ marginTop: 48 }} />
      );
    }
    const hasFilter = facetCount > 0 || !!query;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🔎</Text>
        <Text style={styles.emptyTitle}>
          {hasFilter ? "找不到符合的內容" : "這個分類還沒有公開內容"}
        </Text>
        <Text style={styles.emptyText}>
          {hasFilter
            ? "試試切換領域、格式，或清除一些篩選"
            : "換個領域或格式看看"}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadFirst();
            }}
            tintColor={colors.sub}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>動態</Text>
            <Text style={styles.sub}>看看別人今天穿什麼，也分享你的</Text>
          </View>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => setSearchOpen((value) => !value)}
            activeOpacity={0.8}
            accessibilityLabel="搜尋"
          >
            <Search size={19} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {searchOpen ? (
          <View style={styles.searchRow}>
            <Search size={15} color={colors.faint} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={applySearch}
              placeholder="搜尋穿搭、妝容、保養…"
              placeholderTextColor={colors.faint}
              returnKeyType="search"
              autoFocus
            />
            {searchText ? (
              <TouchableOpacity onPress={clearSearch} activeOpacity={0.7}>
                <X size={15} color={colors.sub} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={styles.segment}>
          {(
            [
              { key: "discover", label: "探索" },
              { key: "following", label: "追蹤中" },
            ] as { key: Scope; label: string }[]
          ).map((tab) => {
            const active = scope === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => switchScope(tab.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.segmentText,
                    active && styles.segmentTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.domainChips}
        >
          {DOMAIN_TABS.map((tab) => {
            const active = domain === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.domainChip, active && styles.domainChipActive]}
                onPress={() => switchDomain(tab.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.domainText,
                    active && styles.domainTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              facetCount > 0 && styles.filterBtnActive,
            ]}
            onPress={() => setFilterOpen(true)}
            activeOpacity={0.85}
          >
            <SlidersHorizontal size={14} color={colors.text} strokeWidth={2} />
            <Text style={styles.filterText}>篩選</Text>
            {facetCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{facetCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <View style={styles.formatTabs}>
            {FORMAT_TABS.map((tab) => {
              const active = format === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.formatTab}
                  onPress={() => switchFormat(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.formatText,
                      active && styles.formatTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={[
                      styles.formatLine,
                      active && styles.formatLineActive,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.sortText}>
              {sort === "latest" ? "最新" : "最熱"}
            </Text>
            <ChevronDown size={13} color={colors.sub} />
          </TouchableOpacity>
        </View>

        {activeChips.length > 0 ? (
          <View style={styles.activeRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.activeScroll}
              contentContainerStyle={styles.activeChips}
            >
              {activeChips.map((chip) => (
                <TouchableOpacity
                  key={chip.key}
                  style={styles.activeChip}
                  onPress={chip.remove}
                  activeOpacity={0.8}
                >
                  <Text style={styles.activeChipText}>{chip.label}</Text>
                  <X size={11} color={colors.text} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={clearFilters} activeOpacity={0.7}>
              <Text style={styles.clearText}>清除</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {facetCount > 0 ? (
          <View style={styles.savedBanner}>
            <Text style={styles.savedText}>
              下次想快速找到這類內容？
            </Text>
            <TouchableOpacity
              style={styles.savedBtn}
              onPress={() => void saveCurrentFilter()}
              activeOpacity={0.85}
            >
              <Bookmark size={12} color={colors.accent} />
              <Text style={styles.savedBtnText}>
                {savedMatches ? "已儲存" : "儲存這次篩選"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : savedFilter ? (
          <View style={styles.savedBanner}>
            <Text style={styles.savedText} numberOfLines={1}>
              上次儲存：{filtersToLabels(savedFilter).join(" · ") || "自訂篩選"}
            </Text>
            <TouchableOpacity
              style={styles.savedBtn}
              onPress={applySavedFilter}
              activeOpacity={0.85}
            >
              <Bookmark size={12} color={colors.accent} />
              <Text style={styles.savedBtnText}>套用</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {offline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              目前顯示離線快取，恢復連線後重新整理即可更新
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setLoading(true);
                void loadFirst();
              }}
            >
              <Text style={styles.retry}>重試</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.text} style={{ marginTop: 48 }} />
        ) : items.length === 0 ? (
          renderEmpty()
        ) : (
          <View style={styles.masonry}>
            {columns.map((column, columnIndex) => (
              <View key={columnIndex} style={styles.column}>
                {column.map((outfit) => (
                  <FeedCard
                    key={outfit.id}
                    outfit={outfit}
                    width={cardW}
                    onOpen={() => router.push(`/outfit/${outfit.id}`)}
                    onLike={() => void toggleLike(outfit)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}

        {loadingMore ? (
          <ActivityIndicator
            color={colors.sub}
            style={{ marginVertical: 20 }}
          />
        ) : items.length > 0 && !nextCursor ? (
          <Text style={styles.footerText}>已經看到底了</Text>
        ) : null}
      </ScrollView>

      <FeedFilterSheet
        visible={filterOpen}
        domain={domain}
        value={filters}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
      />

      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <Pressable
          style={styles.sortBackdrop}
          onPress={() => setSortOpen(false)}
        >
          <Pressable style={styles.sortCard} onPress={() => {}}>
            <Text style={styles.sortTitle}>排序</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.sortOption}
                onPress={() => {
                  setSort(option.key);
                  setSortOpen(false);
                  resetList();
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sort === option.key && styles.sortOptionActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sort === option.key ? (
                  <Check size={16} color={colors.text} />
                ) : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "web" ? 20 : 14,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 2,
    paddingBottom: 12,
  },
  title: { ...type.display, color: colors.text },
  sub: { ...type.caption, color: colors.sub, marginTop: 5 },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.text,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    padding: 3,
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  segmentItemActive: {
    backgroundColor: colors.primary,
    ...shadow.soft,
  },
  segmentText: { fontSize: 12, fontWeight: "700", color: colors.sub },
  segmentTextActive: { color: "#fff" },
  domainChips: { gap: 7, paddingRight: 8, paddingBottom: 2 },
  domainChip: {
    borderRadius: radius.full,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  domainChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  domainText: { fontSize: 11, fontWeight: "700", color: colors.sub },
  domainTextActive: { color: "#fff" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  filterBtnActive: {
    borderColor: colors.text,
  },
  filterText: { fontSize: 11, fontWeight: "700", color: colors.text },
  filterBadge: {
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: { fontSize: 9, fontWeight: "800", color: colors.text },
  formatTabs: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  formatTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  formatText: { fontSize: 11, fontWeight: "600", color: colors.sub },
  formatTextActive: { color: colors.text, fontWeight: "800" },
  formatLine: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
    marginTop: 4,
  },
  formatLineActive: { backgroundColor: colors.accent },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 6,
  },
  sortText: { fontSize: 11, fontWeight: "700", color: colors.sub },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  activeScroll: { flex: 1 },
  activeChips: { gap: 6, paddingRight: 8 },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeChipText: { fontSize: 10, fontWeight: "600", color: colors.text },
  clearText: { fontSize: 10, fontWeight: "700", color: colors.sub },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f4f1ea",
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    marginBottom: 12,
  },
  savedText: { flex: 1, fontSize: 10, color: colors.sub },
  savedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  savedBtnText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  offlineBanner: {
    marginBottom: 12,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  offlineText: { fontSize: 10, color: "#6f5a12", lineHeight: 15 },
  errorBox: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#fdeeee",
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  errorText: { color: colors.danger, flex: 1, fontSize: 11, lineHeight: 16 },
  retry: { color: colors.text, fontWeight: "700", fontSize: 11 },
  masonry: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 4,
  },
  column: { flex: 1, gap: 16 },
  card: {},
  cover: {
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: { width: "100%", height: "100%" },
  coverPlaceholder: { fontSize: 11, color: colors.sub },
  darkBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: "rgba(26,26,26,0.92)",
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  darkBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  lightBadge: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  lightBadgeText: { fontSize: 9, fontWeight: "700", color: colors.text },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    marginTop: 7,
    lineHeight: 18,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 3,
  },
  cardMeta: { flex: 1, fontSize: 10, color: colors.sub },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  likeCount: { fontSize: 9, color: colors.sub, fontWeight: "600" },
  empty: {
    alignItems: "center",
    paddingVertical: 46,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 38 },
  emptyTitle: {
    ...type.heading,
    color: colors.text,
    marginTop: 10,
    textAlign: "center",
  },
  emptyText: {
    ...type.caption,
    color: colors.sub,
    marginTop: 7,
    textAlign: "center",
    lineHeight: 18,
  },
  footerText: {
    fontSize: 10,
    color: colors.faint,
    textAlign: "center",
    marginVertical: 20,
  },
  sortBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sortCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.raised,
  },
  sortTitle: { ...type.heading, color: colors.text, marginBottom: 8 },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sortOptionText: { fontSize: 13, color: colors.sub },
  sortOptionActive: { color: colors.text, fontWeight: "800" },
});
