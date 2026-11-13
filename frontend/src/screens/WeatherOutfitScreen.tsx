import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { http } from "../api";
import {
  AutoComposeResult,
  AutoOutfit,
  Outfit,
  WeatherCity,
  WeatherData,
  WeatherGroups,
  WeatherRecommend,
  outfitRoleOf,
} from "../types";
import { ItemThumb } from "../components/ItemThumb";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { WEEKDAY_LABELS, ymd, weekdayIndex } from "../date";
import { colors, radius, shadow, type } from "../theme";

const GROUP_LABELS: { key: keyof WeatherGroups; label: string }[] = [
  { key: "tops", label: "上衣" },
  { key: "bottoms", label: "下身" },
  { key: "dresses", label: "洋裝" },
  { key: "outers", label: "外套" },
  { key: "shoes", label: "鞋子" },
  { key: "accessories", label: "配件" },
];

const CONDITIONS = ["晴", "多雲", "陰", "雨"];
const RAIN_OPTIONS = [0, 30, 60, 80];

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫";
  if (code >= 51 && code <= 67) return "🌧";
  if (code >= 71 && code <= 77) return "🌨";
  if (code >= 80 && code <= 82) return "🌦";
  if (code >= 95) return "⛈";
  return "🌤";
}

export default function WeatherOutfitScreen() {
  const { width } = useWindowDimensions();
  const frame = Math.min(width, PHONE_MAX_WIDTH);
  const groupItemW = (frame - 36 - 24) / 3;

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [groups, setGroups] = useState<WeatherGroups | null>(null);
  const [outfits, setOutfits] = useState<AutoOutfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [manual, setManual] = useState(false);
  const [manualTemp, setManualTemp] = useState(22);
  const [manualRain, setManualRain] = useState(20);
  const [manualText, setManualText] = useState("多雲");
  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [cityBusy, setCityBusy] = useState(false);
  const [cities, setCities] = useState<WeatherCity[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadResults = useCallback(
    async (params: {
      manual: boolean;
      lat?: number;
      lon?: number;
      city?: string;
      temp_c?: number;
      rain_prob?: number;
      weather_text?: string;
    }) => {
      const query = params.manual
        ? `manual=true&temp_c=${params.temp_c ?? manualTemp}` +
          `&rain_prob=${params.rain_prob ?? manualRain}` +
          `&weather_text=${encodeURIComponent(
            params.weather_text ?? manualText
          )}&city=${encodeURIComponent(params.city || "手動天氣")}`
        : `lat=${params.lat ?? 0}&lon=${params.lon ?? 0}&city=${encodeURIComponent(
            params.city || ""
          )}`;

      const recommend = await http.get<WeatherRecommend>(
        `/api/outfits/recommendations?${query}`
      );
      setWeather(recommend.weather);
      setGroups(recommend.groups);

      const compose = await http.post<AutoComposeResult>(
        "/api/outfits/auto-compose",
        {
          date: ymd(new Date()),
          manual: params.manual,
          lat: params.lat ?? 0,
          lon: params.lon ?? 0,
          city: params.city || (params.manual ? "手動天氣" : ""),
          temp_c: params.temp_c ?? manualTemp,
          rain_prob: params.rain_prob ?? manualRain,
          weather_text: params.weather_text ?? manualText,
          seed: Math.floor(Math.random() * 100000),
        }
      );
      setWeather(compose.weather);
      setOutfits(compose.outfits);
    },
    [manualRain, manualTemp, manualText]
  );

  const loadManualWeather = useCallback(
    async (temp: number, rain: number, text: string) => {
      setManual(true);
      setError("");
      await loadResults({
        manual: true,
        temp_c: temp,
        rain_prob: rain,
        weather_text: text,
        city: "手動天氣",
      });
    },
    [loadResults]
  );

  const loadLive = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setNotice("沒有定位權限，已切換手動天氣");
        await loadManualWeather(manualTemp, manualRain, manualText);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      await loadResults({ manual: false, lat, lon, city: "目前位置" });
      setManual(false);
    } catch {
      setManual(true);
      setNotice("無法取得即時天氣，已切換手動天氣");
      try {
        await loadManualWeather(manualTemp, manualRain, manualText);
      } catch (e: any) {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [loadResults, manualRain, manualTemp, manualText, loadManualWeather]);

  useFocusEffect(
    useCallback(() => {
      if (loadedRef.current) return;
      loadedRef.current = true;
      loadLive();
    }, [loadLive])
  );

  async function applyManual() {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await loadManualWeather(manualTemp, manualRain, manualText);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchCity() {
    if (!cityQuery.trim()) return;
    setCityBusy(true);
    setError("");
    try {
      const results = await http.get<WeatherCity[]>(
        `/api/weather/search?q=${encodeURIComponent(cityQuery.trim())}`
      );
      setCities(results);
      if (results.length === 0) setNotice("找不到這個城市");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCityBusy(false);
    }
  }

  async function pickCity(city: WeatherCity) {
    setCityOpen(false);
    setCities([]);
    setCityQuery("");
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await loadResults({
        manual: false,
        lat: city.lat,
        lon: city.lon,
        city: city.name,
      });
      setManual(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function adopt(outfit: AutoOutfit) {
    setBusyId(outfit.occasion);
    setError("");
    try {
      const today = ymd(new Date());
      const snapshot = weather
        ? {
            city: weather.location.name,
            temp_c: weather.current.temp_c,
            text: weather.current.text,
            rain_prob: weather.current.rain_prob,
            code: weather.current.code,
          }
        : {};
      const created = await http.post<Outfit>("/api/outfits", {
        title: `${outfit.occasion}穿搭`,
        date: today,
        occasion: outfit.occasion,
        weather: snapshot,
        visibility: "public",
        makeup_visibility: "public",
        items: outfit.items.map((item) => ({
          item_id: item.id,
          role: outfitRoleOf(item),
        })),
      });
      router.replace(`/outfit/edit?id=${created.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !weather) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.text} />
        <Text style={styles.loadingText}>正在讀取天氣與推薦…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 44 }}
    >
      <Text style={styles.title}>天氣穿搭</Text>
      <Text style={styles.sub}>依今天的天氣，挑出適合的單品與整套搭配</Text>

      {weather ? (
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroCity}>{weather.location.name}</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {weather.source === "manual" ? "手動天氣" : "即時天氣"}
              </Text>
            </View>
          </View>
          <View style={styles.heroMain}>
            <Text style={styles.heroEmoji}>
              {weatherEmoji(weather.current.code)}
            </Text>
            <Text style={styles.heroTemp}>
              {Math.round(weather.current.temp_c)}°
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroText}>{weather.current.text}</Text>
              <Text style={styles.heroMeta}>
                體感 {Math.round(weather.current.feels_like_c)}° · 降雨{" "}
                {weather.current.rain_prob}%
              </Text>
              <Text style={styles.heroMeta}>
                濕度 {weather.current.humidity}% · 風速{" "}
                {Math.round(weather.current.wind_kph)} km/h
              </Text>
            </View>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => {
                setManual(false);
                loadLive();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.heroBtnText}>重新定位</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => setCityOpen((open) => !open)}
              activeOpacity={0.8}
            >
              <Text style={styles.heroBtnText}>手動選城市</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => setManual(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.heroBtnText}>手動天氣</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {cityOpen ? (
        <View style={styles.cityCard}>
          <Text style={styles.cityTitle}>搜尋城市</Text>
          <View style={styles.cityRow}>
            <TextInput
              style={styles.cityInput}
              value={cityQuery}
              onChangeText={setCityQuery}
              placeholder="例如：台北、東京、倫敦"
              placeholderTextColor={colors.faint}
              onSubmitEditing={searchCity}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.citySearchBtn}
              onPress={searchCity}
              disabled={cityBusy}
              activeOpacity={0.85}
            >
              {cityBusy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.citySearchText}>搜尋</Text>
              )}
            </TouchableOpacity>
          </View>
          {cities.map((city) => (
            <TouchableOpacity
              key={`${city.id}-${city.lat}`}
              style={styles.cityRowItem}
              onPress={() => pickCity(city)}
              activeOpacity={0.8}
            >
              <Text style={styles.cityName}>{city.name}</Text>
              <Text style={styles.citySub}>
                {[city.admin1, city.country].filter(Boolean).join(" · ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {manual ? (
        <View style={styles.manualCard}>
          <Text style={styles.manualTitle}>手動設今天的天氣</Text>
          <Text style={styles.manualSub}>
            天氣服務無法使用時，也可以自己設定
          </Text>
          <View style={styles.tempRow}>
            <TouchableOpacity
              style={styles.tempBtn}
              onPress={() => setManualTemp((v) => v - 1)}
            >
              <Text style={styles.tempBtnText}>－</Text>
            </TouchableOpacity>
            <Text style={styles.tempValue}>{manualTemp}°C</Text>
            <TouchableOpacity
              style={styles.tempBtn}
              onPress={() => setManualTemp((v) => v + 1)}
            >
              <Text style={styles.tempBtnText}>＋</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.manualLabel}>天氣</Text>
          <View style={styles.wrapRow}>
            {CONDITIONS.map((condition) => {
              const active = manualText === condition;
              return (
                <TouchableOpacity
                  key={condition}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setManualText(condition)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {condition}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.manualLabel}>降雨機率</Text>
          <View style={styles.wrapRow}>
            {RAIN_OPTIONS.map((rain) => {
              const active = manualRain === rain;
              return (
                <TouchableOpacity
                  key={rain}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setManualRain(rain)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {rain}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={applyManual}
            activeOpacity={0.85}
          >
            <Text style={styles.applyText}>套用這個天氣</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {weather && weather.daily.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>未來七天</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.forecastRow}
          >
            {weather.daily.map((day, index) => {
              const date = new Date(`${day.date}T00:00:00`);
              return (
                <View key={day.date} style={styles.forecastCard}>
                  <Text style={styles.forecastDay}>
                    {index === 0
                      ? "今天"
                      : WEEKDAY_LABELS[weekdayIndex(date)]}
                  </Text>
                  <Text style={styles.forecastEmoji}>
                    {weatherEmoji(day.code)}
                  </Text>
                  <Text style={styles.forecastTemp}>
                    {Math.round(day.max_c)}° / {Math.round(day.min_c)}°
                  </Text>
                  <Text style={styles.forecastRain}>☔ {day.rain_prob}%</Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>今天適合的單品</Text>
      {groups ? (
        GROUP_LABELS.map((group) => {
          const items = groups[group.key];
          if (!items || items.length === 0) return null;
          return (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.groupRow}
              >
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.groupItem, { width: groupItemW }]}
                    onPress={() => router.push(`/item/${item.id}`)}
                    activeOpacity={0.85}
                  >
                    <ItemThumb item={item} size={groupItemW} />
                    <Text style={styles.groupItemName} numberOfLines={1}>
                      {item.name || "未命名"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })
      ) : (
        <Text style={styles.muted}>還沒有可推薦的單品</Text>
      )}

      <Text style={styles.sectionTitle}>自動配整套 · 所有場合</Text>
      <Text style={styles.sectionSub}>點「採用這套」會建立今天的穿搭草稿</Text>
      {outfits.length === 0 ? (
        <Text style={styles.muted}>目前沒有足夠的單品可以自動搭配</Text>
      ) : (
        outfits.map((outfit) => (
          <View key={outfit.occasion} style={styles.outfitCard}>
            <View style={styles.outfitTop}>
              <Text style={styles.outfitOccasion}>{outfit.occasion}</Text>
              <Text style={styles.outfitCount}>
                {outfit.items.length} 件
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.outfitItems}
            >
              {outfit.items.map((item) => (
                <View key={item.id} style={styles.outfitItem}>
                  <ItemThumb item={item} size={52} />
                  <Text style={styles.outfitItemName} numberOfLines={1}>
                    {item.name || "未命名"}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.reasons}>
              {outfit.reasons.map((reason) => (
                <Text key={reason} style={styles.reason}>
                  · {reason}
                </Text>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.adoptBtn,
                busyId === outfit.occasion && { opacity: 0.6 },
              ]}
              onPress={() => adopt(outfit)}
              disabled={busyId === outfit.occasion}
              activeOpacity={0.85}
            >
              {busyId === outfit.occasion ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.adoptText}>採用這套</Text>
              )}
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingText: {
    textAlign: "center",
    color: colors.sub,
    fontSize: 12,
    marginTop: 12,
  },
  title: { ...type.display, color: colors.text },
  sub: { ...type.caption, color: colors.sub, marginTop: 5, lineHeight: 18 },
  hero: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.card,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroCity: { fontSize: 12, fontWeight: "700", color: colors.sub },
  heroBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  heroBadgeText: { fontSize: 10, fontWeight: "700", color: "#6f5a12" },
  heroMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  heroEmoji: { fontSize: 38 },
  heroTemp: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -1,
  },
  heroText: { fontSize: 15, fontWeight: "700", color: colors.text },
  heroMeta: { fontSize: 10, color: colors.sub, marginTop: 4 },
  heroActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  heroBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroBtnText: { fontSize: 10, color: colors.sub, fontWeight: "600" },
  cityCard: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    ...shadow.soft,
  },
  cityTitle: { fontSize: 12, fontWeight: "700", color: colors.text },
  cityRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  cityInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  citySearchBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  citySearchText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cityRowItem: {
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cityName: { fontSize: 12, fontWeight: "700", color: colors.text },
  citySub: { fontSize: 10, color: colors.sub, marginTop: 2 },
  manualCard: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    ...shadow.soft,
  },
  manualTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  manualSub: { fontSize: 10, color: colors.sub, marginTop: 3 },
  tempRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    marginTop: 12,
  },
  tempBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  tempBtnText: { fontSize: 18, color: colors.text, fontWeight: "700" },
  tempValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    minWidth: 84,
    textAlign: "center",
  },
  manualLabel: {
    fontSize: 10,
    color: colors.sub,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 6,
  },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 11, color: colors.sub, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  applyBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 11,
    alignItems: "center",
  },
  applyText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  notice: { fontSize: 11, color: colors.sub, marginTop: 10, lineHeight: 16 },
  error: { fontSize: 11, color: colors.danger, marginTop: 10 },
  sectionTitle: {
    ...type.heading,
    color: colors.text,
    marginTop: 22,
    marginBottom: 8,
  },
  sectionSub: { fontSize: 10, color: colors.sub, marginTop: -4, marginBottom: 10 },
  forecastRow: { gap: 8, paddingBottom: 2 },
  forecastCard: {
    width: 64,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 9,
    alignItems: "center",
    gap: 3,
    ...shadow.soft,
  },
  forecastDay: { fontSize: 10, color: colors.sub, fontWeight: "600" },
  forecastEmoji: { fontSize: 18 },
  forecastTemp: { fontSize: 10, color: colors.text, fontWeight: "700" },
  forecastRain: { fontSize: 9, color: colors.sub },
  group: { marginTop: 8 },
  groupTitle: {
    fontSize: 11,
    color: colors.sub,
    fontWeight: "700",
    marginBottom: 6,
  },
  groupRow: { gap: 8 },
  groupItem: {},
  groupItemName: {
    fontSize: 10,
    color: colors.text,
    fontWeight: "600",
    marginTop: 5,
  },
  muted: { fontSize: 11, color: colors.faint, marginTop: 4, lineHeight: 17 },
  outfitCard: {
    marginTop: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    ...shadow.soft,
  },
  outfitTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  outfitOccasion: { fontSize: 14, fontWeight: "800", color: colors.text },
  outfitCount: { fontSize: 10, color: colors.sub },
  outfitItems: { gap: 8, marginTop: 8 },
  outfitItem: { width: 62 },
  outfitItemName: {
    fontSize: 9,
    color: colors.sub,
    marginTop: 4,
    textAlign: "center",
  },
  reasons: { marginTop: 8, gap: 2 },
  reason: { fontSize: 10, color: colors.sub, lineHeight: 15 },
  adoptBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 10,
    alignItems: "center",
  },
  adoptText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
