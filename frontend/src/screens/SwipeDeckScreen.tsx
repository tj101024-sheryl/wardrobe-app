import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { http } from "../api";
import { Item, Outfit, outfitRoleOf } from "../types";
import { CATEGORY_GROUPS, colorGroupOf } from "../color";
import { getLocalWeather, deckMatchesWeather, SimpleWeather } from "../weather";
import { ItemThumb } from "../components/ItemThumb";
import SwipeCard, { DeckCardFace } from "../components/SwipeCard";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { ymd } from "../date";
import { colors, radius, shadow, type } from "../theme";

type SwipeDir = "left" | "right";

function shuffle<T>(list: T[]): T[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildDeck(
  items: Item[],
  scope: string,
  weatherOn: boolean,
  weather: SimpleWeather | null,
  excludeIds: number[]
): Item[] {
  const exclude = new Set(excludeIds);
  let list = items.filter(
    (item) => item.item_type === "clothes" || item.item_type === "accessories"
  );
  if (scope !== "all") {
    list = list.filter((item) => colorGroupOf(item) === scope);
  }
  if (weatherOn && weather) {
    list = list.filter((item) => deckMatchesWeather(item, weather));
  }
  return shuffle(list.filter((item) => !exclude.has(item.id)));
}

export default function SwipeDeckScreen() {
  const { width, height } = useWindowDimensions();
  const frame = Math.min(width, PHONE_MAX_WIDTH);
  const contentW = frame - 36;
  const cardW = contentW - 12;
  const cardH = Math.min(400, Math.max(240, height - 520));

  const [items, setItems] = useState<Item[]>([]);
  const [scope, setScope] = useState("all");
  const [weatherOn, setWeatherOn] = useState(true);
  const [weather, setWeather] = useState<SimpleWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [deck, setDeck] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [collected, setCollected] = useState<Item[]>([]);
  const [history, setHistory] = useState<{ item: Item; dir: SwipeDir }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const stateRef = useRef({ scope, weatherOn, weather, collected });
  useEffect(() => {
    stateRef.current = { scope, weatherOn, weather, collected };
  }, [scope, weatherOn, weather, collected]);

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await http.get<Item[]>("/api/items");
      setItems(data);
      const currentState = stateRef.current;
      let wx = currentState.weather;
      let useWeather = currentState.weatherOn;
      if (useWeather && !wx) {
        setWeatherLoading(true);
        wx = await getLocalWeather();
        setWeatherLoading(false);
        if (!wx) {
          useWeather = false;
          setWeatherOn(false);
          setNotice("沒有定位或天氣資料，這次顯示所有單品");
        } else {
          setWeather(wx);
        }
      }
      setDeck(
        buildDeck(
          data,
          currentState.scope,
          useWeather,
          wx,
          currentState.collected.map((i) => i.id)
        )
      );
      setIndex(0);
      setHistory([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const current = deck[index];
  const upcoming = deck.slice(index + 1, index + 3);
  const remaining = Math.max(deck.length - index, 0);

  function resetDeck(
    nextScope: string,
    nextWeatherOn: boolean,
    nextWeather: SimpleWeather | null,
    nextCollected: Item[]
  ) {
    setDeck(
      buildDeck(
        items,
        nextScope,
        nextWeatherOn,
        nextWeather,
        nextCollected.map((i) => i.id)
      )
    );
    setIndex(0);
    setHistory([]);
  }

  function changeScope(next: string) {
    setScope(next);
    setNotice("");
    resetDeck(next, weatherOn, weather, collected);
  }

  async function toggleWeather(next: boolean) {
    setWeatherOn(next);
    setNotice("");
    let wx = weather;
    if (next && !wx) {
      setWeatherLoading(true);
      wx = await getLocalWeather();
      setWeatherLoading(false);
      if (!wx) {
        setWeatherOn(false);
        setNotice("沒有定位或天氣資料，已顯示所有單品");
        resetDeck(scope, false, null, collected);
        return;
      }
      setWeather(wx);
    }
    resetDeck(scope, next, wx, collected);
  }

  function swipe(direction: SwipeDir) {
    if (!current) return;
    setNotice("");
    const nextCollected =
      direction === "right" &&
      !collected.some((item) => item.id === current.id)
        ? [...collected, current]
        : collected;
    if (direction === "right" && nextCollected !== collected) {
      setCollected(nextCollected);
    }
    setHistory((prev) => [...prev, { item: current, dir: direction }]);

    const nextIndex = index + 1;
    if (nextIndex >= deck.length) {
      const nextDeck = buildDeck(
        items,
        scope,
        weatherOn,
        weather,
        nextCollected.map((item) => item.id)
      );
      setDeck(nextDeck);
      setIndex(0);
      setHistory([]);
      setNotice(
        nextDeck.length > 0
          ? "一輪滑完，重新洗牌了"
          : nextCollected.length > 0
          ? "都收藏完了，可以完成挑選"
          : "沒有更多符合條件的單品"
      );
    } else {
      setIndex(nextIndex);
    }
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setNotice("");
    if (last.dir === "right") {
      setCollected((prev) => prev.filter((item) => item.id !== last.item.id));
    }
    setHistory((prev) => prev.slice(0, -1));
    setIndex((prev) => Math.max(0, prev - 1));
  }

  async function finish() {
    if (collected.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const today = ymd(new Date());
      const outfit = await http.post<Outfit>("/api/outfits", {
        title: "滑卡挑的穿搭",
        date: today,
        items: collected.map((item) => ({
          item_id: item.id,
          role: outfitRoleOf(item),
        })),
        visibility: "public",
        makeup_visibility: "public",
      });
      setCollected([]);
      setHistory([]);
      router.replace(`/outfit/edit?id=${outfit.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>隨便滑滑</Text>
        <Text style={styles.sub}>
          不知道穿什麼？一次看一件，點左邊跳過、點右邊收藏
        </Text>
      </View>

      <View style={styles.scopeRow}>
        {CATEGORY_GROUPS.map((option) => {
          const active = scope === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => changeScope(option.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.weatherRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.weatherTitle}>只滑符合今天天氣</Text>
          <Text style={styles.weatherSub}>
            {weatherLoading
              ? "讀取天氣中…"
              : weatherOn && weather
              ? `${Math.round(weather.temp)}°C · ${weather.text}`
              : "未開啟天氣篩選"}
          </Text>
        </View>
        <Switch
          value={weatherOn}
          onValueChange={toggleWeather}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <View
        style={[styles.deckArea, { height: cardH + 18, width: cardW }]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : current ? (
          <>
            {upcoming
              .slice()
              .reverse()
              .map((item, i) => {
                const depth = upcoming.length - i;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.backCard,
                      {
                        width: cardW,
                        height: cardH,
                        transform: [
                          { translateY: depth * 7 },
                          { scale: 1 - depth * 0.035 },
                        ],
                        opacity: 1 - depth * 0.15,
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <DeckCardFace item={item} width={cardW} height={cardH} />
                  </View>
                );
              })}
            <SwipeCard
              key={current.id}
              item={current}
              width={cardW}
              height={cardH}
              onSwipe={swipe}
              onDetail={() => router.push(`/item/${current.id}`)}
            />
          </>
        ) : (
          <View style={[styles.emptyDeck, { width: cardW, height: cardH }]}>
            <Text style={styles.emptyEmoji}>🧺</Text>
            <Text style={styles.emptyTitle}>
              {collected.length > 0 ? "這個範圍都收藏完了" : "沒有符合的單品"}
            </Text>
            <Text style={styles.emptySub}>
              {collected.length > 0
                ? "可以完成挑選，或切換分類再滑"
                : "換個分類，或關閉天氣篩選試試"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          剩 {remaining} 張 · 已收藏 {collected.length} 件
        </Text>
        {history.length > 0 ? (
          <TouchableOpacity onPress={undo} activeOpacity={0.8}>
            <Text style={styles.undoText}>復原上一張</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.collectedCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.collectedTitle}>
            已收藏 {collected.length} 件
          </Text>
          {collected.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collectedRow}
            >
              {collected.map((item) => (
                <ItemThumb key={item.id} item={item} size={34} />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.collectedHint}>
              往右滑，把喜歡的單品先收進來
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.finishBtn,
            (collected.length === 0 || busy) && { opacity: 0.4 },
          ]}
          onPress={finish}
          disabled={collected.length === 0 || busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.finishText}>完成挑選</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, paddingTop: 16 },
  title: { ...type.display, color: colors.text },
  sub: {
    ...type.caption,
    color: colors.sub,
    marginTop: 5,
    lineHeight: 18,
  },
  scopeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    paddingHorizontal: 18,
    marginTop: 12,
  },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.sub, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  weatherRow: {
    marginHorizontal: 18,
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  weatherTitle: { fontSize: 12, fontWeight: "700", color: colors.text },
  weatherSub: { fontSize: 10, color: colors.sub, marginTop: 3 },
  error: { color: colors.danger, fontSize: 11, paddingHorizontal: 18, marginTop: 8 },
  notice: {
    color: colors.sub,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
  deckArea: {
    marginTop: 12,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  backCard: {
    position: "absolute",
    borderRadius: 24,
    backgroundColor: colors.card,
    ...shadow.soft,
  },
  emptyDeck: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyEmoji: { fontSize: 38 },
  emptyTitle: { ...type.heading, color: colors.text, marginTop: 10 },
  emptySub: {
    ...type.caption,
    color: colors.sub,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 12,
  },
  metaText: { fontSize: 11, color: colors.faint },
  undoText: { fontSize: 11, color: colors.text, fontWeight: "700" },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 8,
  },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 6 },
  actionText: { fontSize: 13, color: colors.sub, fontWeight: "600" },
  collectText: { color: colors.text, fontWeight: "800" },
  detailBtn: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  detailText: { fontSize: 11, color: colors.sub, fontWeight: "700" },
  collectedCard: {
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.soft,
  },
  collectedTitle: { fontSize: 12, fontWeight: "700", color: colors.text },
  collectedHint: { fontSize: 10, color: colors.faint, marginTop: 4 },
  collectedRow: { gap: 5, marginTop: 6 },
  finishBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: "center",
  },
  finishText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
