import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getApiBase,
  normalizeApiBase,
  setApiBaseOverride,
} from "./types";

const KEY = "api_base_override";

export async function loadApiBaseOverride(): Promise<void> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (value) setApiBaseOverride(value);
  } catch {
    // 讀取失敗時沿用自動偵測
  }
}

export async function saveApiBaseOverride(value: string): Promise<string> {
  const normalized = normalizeApiBase(value);
  if (normalized) {
    await AsyncStorage.setItem(KEY, normalized);
    setApiBaseOverride(normalized);
    return normalized;
  }
  await AsyncStorage.removeItem(KEY);
  setApiBaseOverride(null);
  return "";
}

export async function clearApiBaseOverride(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
  setApiBaseOverride(null);
}

export async function testBackend(
  base?: string
): Promise<{ ok: boolean; message: string }> {
  const target = normalizeApiBase(base || getApiBase());
  if (!target) {
    return { ok: false, message: "請輸入後端網址" };
  }
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), 5000)
    : null;
  try {
    const res = await fetch(`${target}/api/health`, {
      signal: controller?.signal,
    });
    if (!res.ok) {
      return { ok: false, message: `後端有回應，但狀態碼是 ${res.status}` };
    }
    const data = (await res.json()) as { service?: string };
    return {
      ok: true,
      message: `連線成功：${data.service ?? "wardrobe-api"}`,
    };
  } catch (e: any) {
    return {
      ok: false,
      message: `連線失敗：${e?.message || "請檢查網路與後端"}`
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
