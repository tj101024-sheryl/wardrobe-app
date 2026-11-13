import * as Location from "expo-location";
import { colorGroupOf } from "./color";
import { Item } from "./types";

export type SimpleWeather = {
  temp: number;
  code: number;
  rain: number;
  text: string;
};

const WEATHER_TEXT: Record<number, string> = {
  0: "晴",
  1: "大致晴朗",
  2: "多雲",
  3: "陰",
  45: "有霧",
  48: "霧凇",
  51: "細雨",
  53: "小雨",
  55: "大雨",
  61: "小雨",
  63: "下雨",
  65: "大雨",
  71: "小雪",
  73: "下雪",
  75: "大雪",
  80: "陣雨",
  81: "強陣雨",
  82: "暴雨",
  95: "雷雨",
  96: "雷雨冰雹",
  99: "強雷雨",
};

export async function getLocalWeather(): Promise<SimpleWeather | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;
    const position = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000)),
    ]);
    if (!position) return null;
    const { latitude, longitude } = position.coords;
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}` +
      "&current=temperature_2m,precipitation,weather_code&timezone=auto";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    let data: any;
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      data = await res.json();
    } finally {
      clearTimeout(timer);
    }
    const current = data?.current;
    if (!current) return null;
    const code = Number(current.weather_code ?? 0);
    return {
      temp: Number(current.temperature_2m ?? 0),
      code,
      rain: Number(current.precipitation ?? 0),
      text: WEATHER_TEXT[code] || "多雲",
    };
  } catch {
    return null;
  }
}

/** 只排除明顯不適合的單品；沒有標籤的單品保留。 */
export function deckMatchesWeather(
  item: Item,
  weather: SimpleWeather | null
): boolean {
  if (!weather) return true;
  const season = item.season || "";
  const tag = item.weather || "";
  if (weather.temp >= 28) {
    if (season.includes("冬") || tag.includes("冷")) return false;
    if (colorGroupOf(item) === "outer") return false;
  }
  if (weather.temp <= 15) {
    if (season.includes("夏") || tag.includes("熱")) return false;
  }
  return true;
}
