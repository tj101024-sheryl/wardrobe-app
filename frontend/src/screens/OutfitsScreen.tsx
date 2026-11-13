import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Platform,
  Image,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { http } from "../api";
import { getWithCache } from "../cache";
import {
  CATEGORY_LABEL,
  Outfit,
  OutfitToday,
  outfitBadge,
  outfitCountable,
  outfitRecorded,
  itemColorHex,
  itemColorSoft,
  fullUrl,
} from "../types";
import {
  ymd,
  weekDates,
  WEEKDAY_LABELS,
  weekdayIndex,
  relativeDate,
  shortDate,
} from "../date";
import { OutfitPreview } from "../components/OutfitCanvas";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { syncOutfitReminders } from "../notifications";
import { colors, radius, shadow, type } from "../theme";

export default function OutfitsScreen() {
  const [today, setToday] = useState<OutfitToday | null>(null);
  const [week, setWeek] = useState<Outfit[]>([]);
  const [recent, setRecent] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);

  const { width } = useWindowDimensions();
  const frame = Math.min(width, PHONE_MAX_WIDTH);
  const contentW = frame - 36;
  const cardW = (contentW - 12) / 2;

  const load = useCallback(async () => {
    try {
      setError("");
      const days = weekDates();
      const from = ymd(days[0]);
      const to = ymd(days[6]);
      const [t, w, r] = await Promise.all([
        getWithCache<OutfitToday>("outfits:today", "/api/outfits/today"),
        getWithCache<Outfit[]>(
          `outfits:week:${from}:${to}`,
          `/api/outfits?from=${from}&to=${to}`
        ),
        getWithCache<Outfit[]>("outfits:recent", "/api/outfits?limit=20"),
      ]);
      setToday(t.data);
      setWeek(w.data);
      setRecent(r.data);
      setOffline(t.stale || w.stale || r.stale);
      void syncOutfitReminders().catch(() => {
        // 沒有通知權限或 Web 版時忽略；設定頁會提示
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const todayStr = ymd(new Date());
  const days = weekDates();
  const byDate = new Map<string, Outfit>();
  week.forEach((o) => {
    if (!byDate.has(o.date)) byDate.set(o.date, o);
  });
  const current = today?.outfit ?? null;
  const pendingPast = (today?.pending ?? []).filter(
    (p) => p.date < todayStr
  );
  const todayCount = week.filter((o) => o.date === todayStr).length;
  const outfitCategories = current
    ? Array.from(
        new Set(
          current.items.map(
            (row) =>
              CATEGORY_LABEL[row.item.category] || row.item.category || "其他"
          )
        )
      ).join("、")
    : "";

  function openDay(day: Date) {
    const value = ymd(day);
    if (value === todayStr) return; // 今天由下方 Hero 負責，週條不再重複跳轉
    const outfit = byDate.get(value);
    if (outfit) router.push(`/outfit/${outfit.id}`);
    else router.push(`/outfit/edit?date=${value}`);
  }

  async function completeToday() {
    if (!current || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await http.post<{
        counted_items: number[];
        skipped_already_counted: number[];
      }>(`/api/outfits/${current.id}/wear`, { worn_on: current.date });
      setNotice(
        `已累計 ${res.counted_items.length} 件穿著次數` +
          (res.skipped_already_counted.length
            ? `，${res.skipped_already_counted.length} 件今天已計過`
            : "")
      );
      await load();
      void syncOutfitReminders(true).catch(() => {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
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
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>我的穿搭</Text>
          <Text style={styles.sub}>記錄今天的穿搭與妝容，留下好看的一天</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push("/settings/notifications")}
            activeOpacity={0.8}
            accessibilityLabel="穿搭提醒設定"
          >
            <Text style={styles.bellText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={() => router.push("/outfits/calendar")}
            activeOpacity={0.8}
          >
            <Text style={styles.calendarText}>日曆</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retry}>重試</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {offline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            目前顯示離線快取，恢復連線後下拉重新整理即可更新
          </Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.text} />
      ) : (
        <>
          {/* 本週：只負責切換日期 */}
          <View style={styles.weekCaption}>
            <Text style={styles.weekCaptionText}>本週</Text>
            <Text style={styles.weekCaptionHint}>點其他日期查看</Text>
          </View>
          <View style={styles.weekCard}>
            {days.map((day, i) => {
              const value = ymd(day);
              const outfit = byDate.get(value);
              const active = value === todayStr;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.day, active && styles.dayActive]}
                  onPress={() => openDay(day)}
                  disabled={active}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.dayLabel, active && styles.dayLabelActive]}
                  >
                    {WEEKDAY_LABELS[i]}
                  </Text>
                  <Text
                    style={[styles.dayNum, active && styles.dayNumActive]}
                  >
                    {day.getDate()}
                  </Text>
                  <View
                    style={[styles.dot, outfit && styles.dotOn, active && outfit && styles.dotActive]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 今天：唯一的主角 */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Text style={styles.heroDate}>
                今天 · {shortDate(todayStr)}（
                {WEEKDAY_LABELS[weekdayIndex(new Date())]}）
                {todayCount > 1 ? ` · ${todayCount} 筆` : ""}
              </Text>
              {current ? (
                <View
                  style={[
                    styles.badge,
                    outfitRecorded(current) && styles.badgeRecorded,
                    current.status === "scheduled" && styles.badgeScheduled,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      outfitRecorded(current) && styles.badgeTextRecorded,
                    ]}
                  >
                    {outfitBadge(current)}
                  </Text>
                </View>
              ) : (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>未記錄</Text>
                </View>
              )}
            </View>

            {current ? (
              <>
                <View style={styles.lookBody}>
                  {current.items.length > 0 || current.photo_url ? (
                    <View>
                      <Text style={styles.lookLabel}>穿搭</Text>
                      <View style={styles.lookRow}>
                        <View style={styles.mosaicCol}>
                          <TouchableOpacity
                            onPress={() =>
                              router.push(`/outfit/${current.id}`)
                            }
                            activeOpacity={0.85}
                          >
                            <OutfitPreview outfit={current} size={92} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.photoChip}
                            onPress={() =>
                              router.push(
                                `/outfit/edit?id=${current.id}&date=${current.date}`
                              )
                            }
                            activeOpacity={0.8}
                          >
                            <Text style={styles.photoChipText}>
                              {current.photo_url ? "📷 換照片" : "📷 照片"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          onPress={() =>
                            router.push(`/outfit/${current.id}`)
                          }
                          activeOpacity={0.85}
                        >
                          <Text style={styles.lookCount}>
                            {current.items.length > 0
                              ? `穿了 ${current.items.length} 件`
                              : "穿搭照片"}
                          </Text>
                          {current.items.length > 0 ? (
                            <Text style={styles.lookCats} numberOfLines={2}>
                              {outfitCategories}
                            </Text>
                          ) : null}
                          <Text style={styles.lookNote}>
                            {current.status === "worn"
                              ? "穿著次數已累計"
                              : outfitCountable(current)
                              ? "尚未完成"
                              : ""}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  {(current.items.length > 0 || current.photo_url) &&
                  (current.products.length > 0 ||
                    current.makeup_photo_url) ? (
                    <View style={styles.lookDivider} />
                  ) : null}

                  {current.products.length > 0 ||
                  current.makeup_photo_url ? (
                    <View>
                      <View style={styles.lookSectionHead}>
                        <Text style={[styles.lookLabel, { marginBottom: 0 }]}>
                          妝容
                        </Text>
                        <TouchableOpacity
                          style={styles.photoBtnSmall}
                          onPress={() =>
                            router.push(
                              `/outfit/edit?id=${current.id}&date=${current.date}`
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <Text style={styles.photoBtnSmallText}>
                            {current.makeup_photo_url
                              ? "📷 換照片"
                              : "📷 加照片"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.makeupRow}
                        onPress={() =>
                          router.push(`/outfit/${current.id}`)
                        }
                        activeOpacity={0.85}
                      >
                        {current.makeup_photo_url ? (
                          <Image
                            source={{ uri: fullUrl(current.makeup_photo_url) }}
                            style={styles.makeupThumb}
                            resizeMode="cover"
                          />
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lookCount}>
                            {current.products.length > 0
                              ? `用了 ${current.products.length} 樣`
                              : "妝容照片"}
                          </Text>
                          {current.products.length > 0 ? (
                            <View style={styles.productChips}>
                              {current.products.map((row) => (
                                <View
                                  key={row.id}
                                  style={[
                                    styles.productChip,
                                    {
                                      backgroundColor: itemColorSoft(row.item),
                                    },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.colorDot,
                                      {
                                        backgroundColor: itemColorHex(row.item),
                                      },
                                    ]}
                                  />
                                  <Text
                                    style={styles.productChipText}
                                    numberOfLines={1}
                                  >
                                    {row.item.name ||
                                      CATEGORY_LABEL[row.item.category] ||
                                      "品項"}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                          <Text style={styles.lookNote}>
                            {current.status === "worn"
                              ? "使用次數已累計"
                              : outfitCountable(current)
                              ? "尚未完成"
                              : ""}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {!outfitRecorded(current) ? (
                    <Text style={styles.lookEmpty}>
                      這天還沒有內容，點「編輯這天」開始記錄
                    </Text>
                  ) : null}
                </View>

                {outfitCountable(current) && current.status !== "worn" ? (
                  <TouchableOpacity
                    style={[styles.heroAction, busy && { opacity: 0.6 }]}
                    onPress={completeToday}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.heroActionText}>
                        {current.status === "scheduled"
                          ? "確認這天穿了（+1 次）"
                          : "完成這天（+1 次）"}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() =>
                    router.push(
                      `/outfit/edit?id=${current.id}&date=${current.date}`
                    )
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.editBtnText}>編輯這天</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.emptySlots}>
                  <View style={styles.emptySlot}>
                    <Text style={styles.emptySlotTitle}>穿搭</Text>
                    <Text style={styles.emptySlotHint}>照片或單品</Text>
                  </View>
                  <View style={styles.emptySlot}>
                    <Text style={styles.emptySlotTitle}>妝容</Text>
                    <Text style={styles.emptySlotHint}>照片或品項</Text>
                  </View>
                </View>
                <Text style={styles.emptyLead}>
                  今天還沒記錄，拍張照或直接挑今天穿了什麼
                </Text>
                <TouchableOpacity
                  style={styles.heroAction}
                  onPress={() => router.push(`/outfit/edit?date=${todayStr}`)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.heroActionText}>記錄今天</Text>
                </TouchableOpacity>
              </>
            )}

            {notice ? <Text style={styles.heroNotice}>{notice}</Text> : null}
          </View>

          <TouchableOpacity
            style={styles.addOtherBtn}
            onPress={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              router.push(`/outfit/edit?date=${ymd(tomorrow)}`);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.addOtherText}>＋ 新增別天穿搭</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => router.push("/explore/color")}
            activeOpacity={0.88}
          >
            <View style={styles.exploreDots}>
              {["#E0D2BC", "#C94B4B", "#4A7FB5", "#6E9E6A", "#1F1F1F"].map(
                (hex) => (
                  <View
                    key={hex}
                    style={[styles.exploreDot, { backgroundColor: hex }]}
                  />
                )
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exploreTitle}>顏色牆</Text>
              <Text style={styles.exploreSub}>
                先看顏色，再看這個顏色有哪些衣服與穿搭
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => router.push("/explore/swipe")}
            activeOpacity={0.88}
          >
            <View style={styles.swipeArt}>
              <View
                style={[
                  styles.swipeMini,
                  { transform: [{ rotate: "-9deg" }, { translateX: -5 }] },
                ]}
              />
              <View
                style={[
                  styles.swipeMini,
                  styles.swipeMiniFront,
                  { transform: [{ rotate: "7deg" }, { translateX: 5 }] },
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exploreTitle}>隨便滑滑</Text>
              <Text style={styles.exploreSub}>
                一次一件，左右滑動，不知道穿什麼就滑到喜歡的
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => router.push("/outfits/weather")}
            activeOpacity={0.88}
          >
            <View style={styles.weatherArt}>
              <View style={styles.weatherSun} />
              <View style={styles.weatherCloud} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exploreTitle}>天氣穿搭</Text>
              <Text style={styles.exploreSub}>
                看今天幾度、會不會下雨，再挑適合的單品
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {pendingPast.length > 0 ? (
            <TouchableOpacity
              style={styles.pendingBanner}
              onPress={() => router.push("/outfits/pending")}
              activeOpacity={0.85}
            >
              <Text style={styles.pendingIcon}>⏰</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>
                  有 {pendingPast.length} 套過期未確認
                </Text>
                <Text style={styles.pendingSub}>
                  點開確認後才會累計穿著次數
                </Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ) : null}

          {/* 最近穿搭 */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>最近穿搭</Text>
            <Text style={styles.sectionMeta}>{recent.length} 套</Text>
          </View>

          {recent.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptySub}>還沒有任何穿搭紀錄</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {recent.map((outfit) => (
                <TouchableOpacity
                  key={outfit.id}
                  style={[styles.card, { width: cardW }]}
                  onPress={() => router.push(`/outfit/${outfit.id}`)}
                  activeOpacity={0.88}
                >
                  <OutfitPreview outfit={outfit} size={cardW} />
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {outfit.title || relativeDate(outfit.date)}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {relativeDate(outfit.date)} · {outfit.items.length} 件
                    {outfit.products.length > 0
                      ? ` · ${outfit.products.length} 樣`
                      : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: Platform.OS === "web" ? 20 : 16,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { ...type.display, color: colors.text },
  sub: { ...type.caption, color: colors.sub, marginTop: 5 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  bellText: { fontSize: 16 },
  calendarBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  calendarText: { fontSize: 12, fontWeight: "700", color: colors.text },
  weekCaption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 6,
  },
  weekCaptionText: { fontSize: 11, fontWeight: "700", color: colors.sub },
  weekCaptionHint: { fontSize: 10, color: colors.faint },
  weekCard: {
    marginHorizontal: 18,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    ...shadow.soft,
  },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  dayActive: { backgroundColor: colors.primary },
  dayLabel: { fontSize: 10, color: colors.faint, fontWeight: "600" },
  dayLabelActive: { color: "rgba(255,255,255,0.7)" },
  dayNum: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "700",
    marginTop: 3,
  },
  dayNumActive: { color: "#fff" },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "transparent",
    marginTop: 4,
  },
  dotOn: { backgroundColor: colors.sub },
  dotActive: { backgroundColor: colors.accent },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 18,
  },
  sectionTitle: { ...type.heading, color: colors.text },
  sectionMeta: { ...type.caption, color: colors.faint },
  heroCard: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.card,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  heroDate: { fontSize: 12, fontWeight: "600", color: colors.sub },
  lookBody: {},
  lookLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 7,
  },
  lookRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  mosaicCol: { position: "relative" },
  photoChip: {
    position: "absolute",
    right: 5,
    bottom: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  photoChipText: { fontSize: 9, color: colors.text, fontWeight: "700" },
  lookCats: {
    fontSize: 11,
    color: colors.sub,
    marginTop: 3,
    lineHeight: 16,
  },
  lookSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  photoBtnSmall: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  photoBtnSmallText: { fontSize: 9, color: colors.sub, fontWeight: "600" },
  makeupRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  makeupThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: "#f0efec",
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
  },
  lookPhoto: {
    width: 86,
    height: 86,
    borderRadius: radius.md,
    backgroundColor: "#f0efec",
  },
  lookCount: { fontSize: 12, fontWeight: "700", color: colors.text },
  miniThumbs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
  },
  miniThumbWrap: { position: "relative" },
  plusBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: { color: "#fff", fontSize: 8, fontWeight: "800" },
  moreText: { fontSize: 10, color: colors.sub, fontWeight: "700" },
  lookNote: { fontSize: 10, color: colors.faint, marginTop: 7 },
  lookDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  makeupPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  productChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 7,
  },
  productChip: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: 108,
  },
  productChipText: { fontSize: 10, color: colors.text, fontWeight: "600" },
  lookEmpty: {
    fontSize: 11,
    color: colors.faint,
    lineHeight: 17,
    textAlign: "center",
    paddingVertical: 8,
  },
  editBtn: {
    marginTop: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 12,
    alignItems: "center",
  },
  editBtnText: { fontSize: 13, fontWeight: "700", color: colors.text },
  heroBody: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 22,
  },
  heroMeta: { fontSize: 11, color: colors.sub, marginTop: 4 },
  heroHint: { fontSize: 11, color: colors.faint, marginTop: 6 },
  heroAction: {
    marginTop: 12,
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 13,
    alignItems: "center",
  },
  heroActionText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptySlots: { flexDirection: "row", gap: 10, marginBottom: 12 },
  emptySlot: {
    flex: 1,
    backgroundColor: "#faf9f7",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    paddingVertical: 22,
    alignItems: "center",
    gap: 5,
  },
  emptySlotTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  emptySlotHint: { fontSize: 10, color: colors.faint },
  emptyLead: {
    fontSize: 11,
    color: colors.sub,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 2,
  },
  heroEmpty: { alignItems: "center", paddingVertical: 6 },
  heroEmoji: { fontSize: 34 },
  heroEmptyTitle: { ...type.heading, color: colors.text, marginTop: 8 },
  heroEmptySub: {
    ...type.caption,
    color: colors.sub,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  heroNotice: {
    marginTop: 10,
    fontSize: 11,
    color: "#3d6b3d",
    textAlign: "center",
  },
  addOtherBtn: {
    alignSelf: "center",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  addOtherText: { fontSize: 12, fontWeight: "600", color: colors.sub },
  exploreCard: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.soft,
  },
  exploreDots: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    padding: 11,
  },
  exploreDot: { width: 13, height: 13, borderRadius: 7 },
  exploreTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  exploreSub: {
    fontSize: 10,
    color: colors.sub,
    marginTop: 4,
    lineHeight: 15,
  },
  swipeArt: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeMini: {
    position: "absolute",
    width: 24,
    height: 32,
    borderRadius: 7,
    backgroundColor: "#e5e2dc",
    borderWidth: 1,
    borderColor: colors.border,
  },
  swipeMiniFront: { backgroundColor: colors.card },
  weatherArt: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  weatherSun: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    marginTop: -4,
    marginLeft: -6,
  },
  weatherCloud: {
    position: "absolute",
    right: 10,
    bottom: 12,
    width: 22,
    height: 10,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  todayCard: {
    marginHorizontal: 18,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.card,
  },
  todayBody: { flex: 1 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeWorn: { backgroundColor: colors.primary },
  badgeRecorded: { backgroundColor: colors.accentSoft },
  badgeScheduled: { backgroundColor: colors.accentSoft },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.sub },
  badgeTextRecorded: { color: "#6f5a12" },
  badgeTextLight: { color: "#fff" },
  occasion: { fontSize: 11, color: colors.sub },
  todayTitle: {
    ...type.heading,
    color: colors.text,
    fontSize: 16,
    marginTop: 6,
    lineHeight: 22,
  },
  todayMeta: { ...type.caption, color: colors.sub, marginTop: 4 },
  arrow: { fontSize: 22, color: colors.faint, paddingRight: 2 },
  emptyToday: {
    marginHorizontal: 18,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 22,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { ...type.heading, color: colors.text, marginTop: 8 },
  emptySub: {
    ...type.caption,
    color: colors.sub,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 14,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  pendingBanner: {
    marginHorizontal: 18,
    marginTop: 12,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pendingIcon: { fontSize: 18 },
  pendingTitle: { fontSize: 13, fontWeight: "700", color: "#6f5a12" },
  pendingSub: { fontSize: 11, color: "#8a6d12", marginTop: 2 },
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 18,
    marginTop: 14,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  quickIcon: { fontSize: 15 },
  quickText: { fontSize: 12, fontWeight: "600", color: colors.text },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 18,
  },
  card: {},
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginTop: 7,
  },
  cardMeta: { fontSize: 11, color: colors.sub, marginTop: 2 },
  emptyRecent: { paddingHorizontal: 18, paddingVertical: 18 },
  errorBox: {
    marginHorizontal: 18,
    marginTop: 8,
    padding: 14,
    backgroundColor: "#fdeeee",
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: { color: colors.danger, flex: 1, fontSize: 13 },
  retry: { color: colors.text, fontWeight: "700", fontSize: 13 },
  offlineBanner: {
    marginHorizontal: 18,
    marginTop: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  offlineText: { fontSize: 10, color: "#6f5a12", lineHeight: 15 },
});
