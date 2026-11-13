import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Compass, Heart, MessageCircle, Send } from "lucide-react-native";
import { http } from "../api";
import { getWithCache } from "../cache";
import {
  AUDIENCE_SHORT_LABEL,
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_OPTIONS,
  FeedResult,
  LikeResult,
  Outfit,
  OutfitAudience,
  OutfitContentType,
  outfitRecorded,
} from "../types";
import { relativeDate } from "../date";
import { OutfitPreview } from "../components/OutfitCanvas";
import CommentsModal from "../components/CommentsModal";
import ShareSheet from "../components/ShareSheet";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { colors, radius, shadow, type } from "../theme";

type Scope = "discover" | "following";
type AudienceFilter = "all" | OutfitAudience;
type ContentFilter = "all" | OutfitContentType;
const PAGE_SIZE = 10;

const AUDIENCE_TABS: { key: AudienceFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "male", label: "男生" },
  { key: "female", label: "女生" },
  { key: "unisex", label: "中性" },
];

const CONTENT_TABS: { key: ContentFilter; label: string }[] = [
  { key: "all", label: "全部" },
  ...CONTENT_TYPE_OPTIONS.map((option) => ({
    key: option.key as ContentFilter,
    label: option.label,
  })),
];

function FeedCard({
  outfit,
  width,
  onOpen,
  onUser,
  onLike,
  onComment,
  onShare,
}: {
  outfit: Outfit;
  width: number;
  onOpen: () => void;
  onUser: () => void;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}) {
  const imageSize = width - 28;
  const meta = [
    relativeDate(outfit.date),
    outfit.occasion,
    AUDIENCE_SHORT_LABEL[outfit.audience] ?? "",
    (outfit.content_types?.length ? outfit.content_types : ["outfit"])
      .map((value) => CONTENT_TYPE_LABEL[value] ?? "")
      .filter(Boolean)
      .slice(0, 2)
      .join("／"),
    outfit.items.length > 0 ? `${outfit.items.length} 件` : "",
    outfit.products.length > 0 ? `${outfit.products.length} 樣` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.card, { width }]}>
      <TouchableOpacity
        style={styles.ownerRow}
        onPress={onUser}
        activeOpacity={0.8}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {outfit.owner.username.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ownerName} numberOfLines={1}>
            {outfit.owner.username}
          </Text>
          <Text style={styles.ownerMeta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        {outfit.is_owner ? (
          <View style={styles.mineChip}>
            <Text style={styles.mineChipText}>我的</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpen} activeOpacity={0.9}>
        <View style={styles.photoWrap}>
          {outfitRecorded(outfit) ? (
            <OutfitPreview outfit={outfit} size={imageSize} />
          ) : (
            <View
              style={[
                styles.emptyPhoto,
                { width: imageSize, height: imageSize },
              ]}
            >
              <Text style={styles.emptyPhotoIcon}>👗</Text>
              <Text style={styles.emptyPhotoText}>還沒有照片</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpen} activeOpacity={0.85}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {outfit.title || `${relativeDate(outfit.date)}的穿搭`}
        </Text>
        {outfit.notes ? (
          <Text style={styles.cardNotes} numberOfLines={2}>
            {outfit.notes}
          </Text>
        ) : null}
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.action}
          onPress={onLike}
          activeOpacity={0.75}
        >
          <Heart
            size={19}
            color={outfit.liked_by_me ? colors.danger : colors.sub}
            fill={outfit.liked_by_me ? colors.danger : "transparent"}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.actionText,
              outfit.liked_by_me && styles.actionTextActive,
            ]}
          >
            {outfit.like_count > 0 ? outfit.like_count : "讚"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.action}
          onPress={onComment}
          activeOpacity={0.75}
        >
          <MessageCircle size={19} color={colors.sub} strokeWidth={2} />
          <Text style={styles.actionText}>
            {outfit.comment_count > 0 ? outfit.comment_count : "留言"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.action}
          onPress={onShare}
          activeOpacity={0.75}
        >
          <Send size={18} color={colors.sub} strokeWidth={2} />
          <Text style={styles.actionText}>分享</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const [scope, setScope] = useState<Scope>("discover");
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [contentType, setContentType] = useState<ContentFilter>("all");
  const [items, setItems] = useState<Outfit[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [commentTarget, setCommentTarget] = useState<number | null>(null);
  const [shareTarget, setShareTarget] = useState<number | null>(null);

  const { width } = useWindowDimensions();
  const frame = Math.min(width, PHONE_MAX_WIDTH);
  const cardW = frame - 32;

  const loadFirst = useCallback(async () => {
    try {
      setError("");
      const result = await getWithCache<FeedResult>(
        `feed:${scope}:${audience}:${contentType}`,
        `/api/feed?scope=${scope}&audience=${audience}&content_type=${contentType}&limit=${PAGE_SIZE}`
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
  }, [scope, audience, contentType]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadFirst();
    }, [loadFirst])
  );

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await http.get<FeedResult>(
        `/api/feed?scope=${scope}&audience=${audience}&content_type=${contentType}&limit=${PAGE_SIZE}&cursor=${nextCursor}`
      );
      setItems((prev) => {
        const known = new Set(prev.map((o) => o.id));
        return [...prev, ...data.items.filter((o) => !known.has(o.id))];
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
    setItems([]);
    setNextCursor(null);
    setLoading(true);
    setError("");
    setOffline(false);
  }

  function switchAudience(next: AudienceFilter) {
    if (next === audience) return;
    setAudience(next);
    setItems([]);
    setNextCursor(null);
    setLoading(true);
    setError("");
    setOffline(false);
  }

  function switchContentType(next: ContentFilter) {
    if (next === contentType) return;
    setContentType(next);
    setItems([]);
    setNextCursor(null);
    setLoading(true);
    setError("");
    setOffline(false);
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

  const handleCommentCount = useCallback(
    (outfitId: number, count: number) => {
      setItems((prev) =>
        prev.map((row) =>
          row.id === outfitId ? { ...row, comment_count: count } : row
        )
      );
    },
    []
  );

  function renderHeader() {
    return (
      <View>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>動態</Text>
            <Text style={styles.sub}>看看別人今天穿什麼，也分享你的</Text>
          </View>
          <View style={styles.headerIcon}>
            <Compass size={20} color={colors.text} strokeWidth={2} />
          </View>
        </View>

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

        <View style={styles.audienceRow}>
          <Text style={styles.audienceLabel}>取向</Text>
          {AUDIENCE_TABS.map((tab) => {
            const active = audience === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.audienceChip,
                  active && styles.audienceChipActive,
                ]}
                onPress={() => switchAudience(tab.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.audienceText,
                    active && styles.audienceTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.contentRow}>
          <Text style={styles.audienceLabel}>內容</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.contentChips}
          >
            {CONTENT_TABS.map((tab) => {
              const active = contentType === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.audienceChip,
                    active && styles.audienceChipActive,
                  ]}
                  onPress={() => switchContentType(tab.key)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.audienceText,
                      active && styles.audienceTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

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
      </View>
    );
  }

  function renderEmpty() {
    if (loading) {
      return (
        <ActivityIndicator color={colors.text} style={{ marginTop: 48 }} />
      );
    }
    const audienceWord =
      audience === "all" ? "" : `${AUDIENCE_SHORT_LABEL[audience]} `;
    const contentWord =
      contentType === "all" ? "" : `${CONTENT_TYPE_LABEL[contentType]} `;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>
          {scope === "following" ? "👀" : "🌍"}
        </Text>
        <Text style={styles.emptyTitle}>
          {scope === "following"
            ? "追蹤的人還沒有動態"
            : `還沒有${audienceWord}${contentWord}公開內容`}
        </Text>
        <Text style={styles.emptyText}>
          {scope === "following"
            ? "去探索看看吧，追蹤喜歡的人就會出現在這裡"
            : contentType !== "all"
            ? "試試切換其他內容類型，或把內容設為公開"
            : audience !== "all"
            ? "試試切換其他取向，或把內容設為公開"
            : "把內容隱私設為公開，就會出現在大家的動態牆"}
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FeedCard
            outfit={item}
            width={cardW}
            onOpen={() => router.push(`/outfit/${item.id}`)}
            onUser={() => router.push(`/user/${item.owner.id}`)}
            onLike={() => void toggleLike(item)}
            onComment={() => setCommentTarget(item.id)}
            onShare={() => setShareTarget(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color={colors.sub}
              style={{ marginVertical: 20 }}
            />
          ) : items.length > 0 && !nextCursor ? (
            <Text style={styles.footerText}>已經看到底了</Text>
          ) : (
            <View style={{ height: 12 }} />
          )
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
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
        showsVerticalScrollIndicator={false}
      />

      <CommentsModal
        outfitId={commentTarget}
        visible={commentTarget !== null}
        onClose={() => setCommentTarget(null)}
        onCountChange={handleCommentCount}
      />
      <ShareSheet
        outfitId={shareTarget}
        visible={shareTarget !== null}
        onClose={() => setShareTarget(null)}
      />
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
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    padding: 3,
    marginBottom: 14,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  segmentItemActive: {
    backgroundColor: colors.primary,
    ...shadow.soft,
  },
  segmentText: { fontSize: 12, fontWeight: "700", color: colors.sub },
  segmentTextActive: { color: "#fff" },
  audienceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -4,
    marginBottom: 8,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  contentChips: { gap: 6, paddingRight: 8 },
  audienceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.faint,
    marginRight: 2,
  },
  audienceChip: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  audienceChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  audienceText: { fontSize: 10, fontWeight: "700", color: colors.sub },
  audienceTextActive: { color: "#fff" },
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.card,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 11,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: colors.text },
  ownerName: { fontSize: 13, fontWeight: "700", color: colors.text },
  ownerMeta: { fontSize: 10, color: colors.sub, marginTop: 2 },
  mineChip: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  mineChipText: { fontSize: 9, fontWeight: "700", color: colors.sub },
  photoWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#f0efec",
  },
  emptyPhoto: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0efec",
    gap: 6,
  },
  emptyPhotoIcon: { fontSize: 42 },
  emptyPhotoText: { fontSize: 11, color: colors.faint },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 11,
    lineHeight: 20,
  },
  cardNotes: {
    fontSize: 11,
    color: colors.sub,
    marginTop: 4,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginRight: 24,
    paddingVertical: 2,
  },
  actionText: { fontSize: 11, color: colors.sub, fontWeight: "600" },
  actionTextActive: { color: colors.danger },
  empty: {
    alignItems: "center",
    paddingVertical: 46,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 40 },
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
});
