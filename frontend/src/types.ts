import { Platform } from "react-native";

// 手機瀏覽器開 http://<電腦IP>:8081 → 自動用同一個 IP 打後端
// 電腦開 localhost → 用 127.0.0.1
// Expo Go（原生）→ 直接用電腦區域網路 IP（換網路時改這裡）
function resolveHost(): string {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      const h = window.location.hostname;
      if (h === "localhost" || h === "127.0.0.1") return "127.0.0.1";
      return h;
    }
    return "127.0.0.1";
  }
  return "140.118.219.6";
}

export const API_BASE = `http://${resolveHost()}:8000`;

export type Item = {
  id: number;
  name: string;
  item_type: string;
  category: string;
  color: string;
  season: string;
  occasion: string;
  weather: string;
  style: string;
  expiry: string;
  brand: string;
  size: string;
  price: string;
  wear_count: number;
  tags: string[];
  image_path: string;
  cutout_path: string | null;
  source_url: string | null;
  created_at: string;
};

export type User = {
  id: number;
  email: string;
  username: string;
  bio: string;
  created_at: string;
};

export type ScrapeImage = {
  url: string;
  width: number | null;
  height: number | null;
  kind: string;
};

export type ScrapeResult = {
  url: string;
  page_title: string;
  images: ScrapeImage[];
};

export const ITEM_TYPES = [
  { key: "clothes", label: "衣服" },
  { key: "makeup", label: "化妝品" },
  { key: "skincare", label: "保養品" },
] as const;

export type ItemTypeKey = (typeof ITEM_TYPES)[number]["key"];

export type Category = { key: string; label: string };

export const CATEGORIES: Record<ItemTypeKey, readonly Category[]> = {
  clothes: [
    { key: "top", label: "上衣" },
    { key: "bottom", label: "下身" },
    { key: "dress", label: "洋裝" },
    { key: "outerwear", label: "外套" },
    { key: "shoes", label: "鞋子" },
    { key: "bag", label: "包" },
    { key: "accessory", label: "配件" },
    { key: "underwear", label: "內衣" },
    { key: "sleepwear", label: "睡衣" },
    { key: "activewear", label: "運動服" },
    { key: "clothes-other", label: "其他" },
  ],
  makeup: [
    { key: "base", label: "底妝" },
    { key: "lip", label: "唇彩" },
    { key: "blush", label: "腮紅" },
    { key: "eyeshadow", label: "眼影" },
    { key: "brow", label: "眉毛" },
    { key: "lash", label: "睫毛" },
    { key: "powder", label: "蜜粉" },
    { key: "perfume", label: "香水" },
    { key: "nail", label: "指甲" },
    { key: "makeup-tool", label: "美妝工具" },
    { key: "makeup-other", label: "其他" },
  ],
  skincare: [
    { key: "cleanser", label: "潔面" },
    { key: "toner", label: "化妝水" },
    { key: "serum", label: "精華" },
    { key: "lotion", label: "乳液" },
    { key: "cream", label: "面霜" },
    { key: "sunscreen", label: "防曬" },
    { key: "mask", label: "面膜" },
    { key: "eyecream", label: "眼霜" },
    { key: "scrub", label: "去角質" },
    { key: "body-care", label: "身體保養" },
    { key: "skincare-other", label: "其他" },
  ],
};

export const ITEM_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.key, t.label])
);

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries([
  ...Object.values(CATEGORIES).flatMap((list) =>
    list.map((c) => [c.key, c.label])
  ),
  // 舊資料的預設分類 key
  ["other", "其他"],
]);

export function categoriesOf(itemType: string): readonly Category[] {
  return CATEGORIES[itemType as ItemTypeKey] ?? CATEGORIES.clothes;
}

// 衣服專屬欄位；化妝品/保養品隱藏季節與天氣
export function hasClothingFields(itemType: string): boolean {
  return itemType === "clothes";
}

// 分類簡圖（暫以 emoji 圖示取代照片）
export const CATEGORY_ICON: Record<string, string> = {
  // 衣服
  top: "👕",
  bottom: "👖",
  dress: "👗",
  outerwear: "🧥",
  shoes: "👟",
  bag: "👜",
  accessory: "🧢",
  underwear: "🩲",
  sleepwear: "😴",
  activewear: "🏃",
  "clothes-other": "👚",
  other: "👚",
  // 化妝品
  base: "🪞",
  lip: "💄",
  blush: "🌸",
  eyeshadow: "🎨",
  brow: "✏️",
  lash: "👁️",
  powder: "✨",
  perfume: "🌹",
  nail: "💅",
  "makeup-tool": "🖌️",
  "makeup-other": "💄",
  // 保養品
  cleanser: "🫧",
  toner: "💧",
  serum: "🧪",
  lotion: "🧴",
  cream: "🪣",
  sunscreen: "☀️",
  mask: "🎭",
  eyecream: "👁️",
  scrub: "🧽",
  "body-care": "🛁",
  "skincare-other": "🧴",
};

const TYPE_ICON_FALLBACK: Record<string, string> = {
  clothes: "👚",
  makeup: "💄",
  skincare: "🧴",
};

export function categoryIcon(itemType: string, category: string): string {
  return (
    CATEGORY_ICON[category] || TYPE_ICON_FALLBACK[itemType] || "📦"
  );
}

export const SEASONS = ["春", "夏", "秋", "冬", "四季"];
export const OCCASIONS = ["日常", "上班", "約會", "運動", "正式", "旅行"];
export const WEATHERS = ["晴", "陰", "雨", "冷", "熱", "風大"];
export const STYLES = ["休閒", "韓系", "日系", "簡約", "個性", "甜美", "運動"];

export function fullUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}
