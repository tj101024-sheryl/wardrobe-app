import AsyncStorage from "@react-native-async-storage/async-storage";
import { http } from "./api";

const PREFIX = "wardrobe-cache:";

type CacheEntry<T> = {
  at: number;
  data: T;
};

export async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PREFIX + key,
      JSON.stringify({ at: Date.now(), data })
    );
  } catch {
    // 快取失敗不影響主要流程
  }
}

export async function getWithCache<T>(
  key: string,
  path: string
): Promise<{ data: T; stale: boolean; at: number | null }> {
  try {
    const data = await http.get<T>(path);
    await writeCache(key, data);
    return { data, stale: false, at: Date.now() };
  } catch (error) {
    const cached = await readCache<T>(key);
    if (cached) {
      return { data: cached.data, stale: true, at: cached.at };
    }
    throw error;
  }
}
