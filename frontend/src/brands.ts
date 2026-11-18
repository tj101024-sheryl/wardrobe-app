import AsyncStorage from "@react-native-async-storage/async-storage";
import { BRAND_SUGGESTIONS } from "./types";

const KEY = "brand_options_v1";

/** 讀取品牌選項；第一次使用時帶入預設清單。 */
export async function loadBrandOptions(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) return [...BRAND_SUGGESTIONS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...BRAND_SUGGESTIONS];
    const list = parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  } catch {
    return [...BRAND_SUGGESTIONS];
  }
}

export async function saveBrandOptions(list: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 儲存失敗時維持目前畫面狀態即可
  }
}
