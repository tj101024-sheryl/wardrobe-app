import Constants from "expo-constants";
import { Platform } from "react-native";

// 手機瀏覽器開 http://<電腦IP>:8081 → 自動用同一個 IP 打後端
// 電腦開 localhost → 用 127.0.0.1
// Expo Go（原生）→ 自動取 Metro 的區域網路 IP；抓不到才用預設 IP
function metroHost(): string | null {
  const c = Constants as any;
  const hostUri: string | undefined =
    c.expoConfig?.hostUri ??
    c.expoGoConfig?.debuggerHost ??
    c.manifest?.debuggerHost;
  const host = hostUri?.split(":")[0];
  return host || null;
}

function resolveHost(): string {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      const h = window.location.hostname;
      if (h === "localhost" || h === "127.0.0.1") return "127.0.0.1";
      return h;
    }
    return "127.0.0.1";
  }
  // 換網路時不用再手改 IP：優先跟隨 Expo dev server 的位址
  return metroHost() ?? "140.118.219.6";
}

export const API_BASE = `http://${resolveHost()}:8000`;

export type Item = {
  id: number;
  name: string;
  item_type: string;
  category: string;
  color: string;
  color_family: string;
  color_hex: string;
  season: string;
  occasion: string;
  weather: string;
  style: string;
  expiry: string;
  efficacy: string;
  brand: string;
  size: string;
  price: string;
  wear_count: number;
  last_worn_on: string;
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
  notify_enabled: boolean;
  notify_time: string;
  created_at: string;
};

export type UserBrief = {
  id: number;
  username: string;
};

export type FeedResult = {
  items: Outfit[];
  next_cursor: number | null;
};

export type LikeResult = {
  liked: boolean;
  like_count: number;
};

export type FollowResult = {
  following: boolean;
  follower_count: number;
};

export type ShareImageResult = {
  url: string;
  format: "story" | "feed" | "fb";
  width: number;
  height: number;
};

export type OutfitComment = {
  id: number;
  body: string;
  created_at: string;
  user: UserBrief;
};

export type UserProfile = {
  id: number;
  username: string;
  bio: string;
  created_at: string;
  outfit_count: number;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  is_me: boolean;
  outfits: Outfit[];
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

export type OutfitStatus = "draft" | "scheduled" | "worn" | "canceled";
export type OutfitVisibility = "public" | "followers" | "private";
export type OutfitAudience = "male" | "female" | "unisex";
export type OutfitContentType =
  | "outfit"
  | "makeup"
  | "skincare"
  | "tutorial"
  | "review";

export type OutfitItem = {
  id: number;
  item_id: number;
  role: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  z_index: number;
  item: Item;
};

export type OutfitProduct = {
  id: number;
  item_id: number;
  item: Item;
};

export type CanvasTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  z_index: number;
};

export type Outfit = {
  id: number;
  title: string;
  date: string;
  status: OutfitStatus;
  notes: string;
  occasion: string;
  audience: OutfitAudience;
  content_types: OutfitContentType[];
  weather: Record<string, unknown> | null;
  layout_mode: string;
  canvas_data: Record<string, unknown>;
  visibility: OutfitVisibility;
  makeup_visibility: OutfitVisibility;
  photo_url: string | null;
  makeup_photo_url: string | null;
  published_at: string | null;
  created_at: string;
  items: OutfitItem[];
  products: OutfitProduct[];
  owner: UserBrief;
  liked_by_me: boolean;
  is_owner: boolean;
  makeup_hidden: boolean;
  like_count: number;
  comment_count: number;
};

export type OutfitToday = {
  date: string;
  outfit: Outfit | null;
  pending: Outfit[];
};

export type ColorExplore = {
  color_family: string;
  matched_family: string;
  match: "any" | "mono";
  items: Item[];
  outfits: Outfit[];
};

export type WeatherCurrent = {
  temp_c: number;
  feels_like_c: number;
  rain_mm: number;
  rain_prob: number;
  wind_kph: number;
  humidity: number;
  code: number;
  text: string;
};

export type WeatherDay = {
  date: string;
  max_c: number;
  min_c: number;
  rain_prob: number;
  code: number;
  text: string;
};

export type WeatherData = {
  location: { name: string; lat: number; lon: number };
  current: WeatherCurrent;
  daily: WeatherDay[];
  updated_at: string;
  source: "open-meteo" | "manual";
};

export type WeatherGroups = {
  tops: Item[];
  bottoms: Item[];
  dresses: Item[];
  outers: Item[];
  shoes: Item[];
  accessories: Item[];
};

export type WeatherRecommend = {
  weather: WeatherData;
  groups: WeatherGroups;
};

export type AutoOutfit = {
  occasion: string;
  items: Item[];
  reasons: string[];
};

export type AutoComposeResult = {
  weather: WeatherData;
  outfits: AutoOutfit[];
};

export type WeatherCity = {
  id: number | null;
  name: string;
  country: string;
  admin1: string;
  lat: number;
  lon: number;
};

export const OUTFIT_STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  scheduled: "已排程",
  worn: "已穿著",
  canceled: "已取消",
};

export const VISIBILITY_LABEL: Record<string, string> = {
  public: "公開",
  followers: "追蹤者",
  private: "私人",
};

export const AUDIENCE_LABEL: Record<string, string> = {
  male: "男生向",
  female: "女生向",
  unisex: "中性",
};

export const AUDIENCE_SHORT_LABEL: Record<string, string> = {
  male: "男生",
  female: "女生",
  unisex: "中性",
};

export const CONTENT_TYPE_LABEL: Record<string, string> = {
  outfit: "穿搭",
  makeup: "妝容",
  skincare: "保養",
  tutorial: "教學",
  review: "產品推薦",
};

export const CONTENT_TYPE_OPTIONS: {
  key: OutfitContentType;
  label: string;
}[] = [
  { key: "outfit", label: "穿搭" },
  { key: "makeup", label: "妝容" },
  { key: "skincare", label: "保養" },
  { key: "tutorial", label: "教學" },
  { key: "review", label: "產品推薦" },
];

export function outfitRecorded(outfit: Outfit): boolean {
  return (
    outfit.items.length > 0 ||
    outfit.products.length > 0 ||
    !!outfit.photo_url ||
    !!outfit.makeup_photo_url
  );
}

export function outfitCountable(outfit: Outfit): boolean {
  return outfit.items.length + outfit.products.length > 0;
}

export function outfitBadge(outfit: Outfit): string {
  if (outfit.status === "worn") return "已記錄";
  if (outfit.status === "scheduled") return "已排程";
  if (outfitRecorded(outfit)) return "已記錄";
  return "未記錄";
}

export function usageLabel(itemType: string): string {
  return itemType === "clothes" ? "穿過" : "用過";
}

export const COLOR_FAMILY_HEX: Record<string, string> = {
  white: "#F2F0EA",
  black: "#1F1F1F",
  gray: "#A3A3A3",
  beige: "#E0D2BC",
  brown: "#8B5E3C",
  red: "#C94B4B",
  pink: "#EFA3B6",
  orange: "#E8873A",
  yellow: "#E7C547",
  green: "#6E9E6A",
  blue: "#4A7FB5",
  purple: "#8B6BB1",
  metal: "#C0C0C0",
};

export const COLOR_FAMILY_SOFT: Record<string, string> = {
  white: "#F6F4EF",
  black: "#E9E7E3",
  gray: "#EFEEEC",
  beige: "#F3EBDD",
  brown: "#EFE4DA",
  red: "#F8E3E3",
  pink: "#FBE7EC",
  orange: "#FBEBDD",
  yellow: "#FBF3D6",
  green: "#E8F0E5",
  blue: "#E4ECF5",
  purple: "#EEE8F6",
  metal: "#EEEEEE",
};

export function itemColorHex(item: Item): string {
  return item.color_hex || COLOR_FAMILY_HEX[item.color_family] || "#D8D4CC";
}

export function itemColorSoft(item: Item): string {
  return COLOR_FAMILY_SOFT[item.color_family] || "#F3F2EF";
}

export const OUTFIT_ROLES = [
  { key: "top", label: "上衣" },
  { key: "bottom", label: "下身" },
  { key: "dress", label: "洋裝" },
  { key: "outer", label: "外套" },
  { key: "shoes", label: "鞋子" },
  { key: "bag", label: "包包" },
  { key: "accessory", label: "配件" },
  { key: "other", label: "其他" },
] as const;

const ROLE_BY_CATEGORY: Record<string, string> = {
  top: "top",
  tee: "top",
  hoodie: "top",
  "activewear-top": "top",
  activewear: "other",
  "activewear-pants": "bottom",
  outerwear: "outer",
  windbreaker: "outer",
  "down-jacket": "outer",
  "light-outer": "outer",
  pants: "bottom",
  "long-pants": "bottom",
  shorts: "bottom",
  skirt: "bottom",
  "mini-skirt": "bottom",
  "long-skirt": "bottom",
  dress: "dress",
  shoes: "shoes",
  sneakers: "shoes",
  "casual-shoes": "shoes",
  "formal-shoes": "shoes",
  sandals: "shoes",
  bag: "bag",
  backpack: "bag",
  handbag: "bag",
  crossbody: "bag",
  "travel-bag": "bag",
  accessory: "accessory",
  necklace: "accessory",
  earrings: "accessory",
  ring: "accessory",
  bracelet: "accessory",
  hat: "accessory",
  cap: "accessory",
  "bucket-hat": "accessory",
  scarf: "accessory",
  gloves: "accessory",
  "mask-acc": "accessory",
  "acc-other": "accessory",
};

export function outfitRoleOf(item: Item): string {
  return ROLE_BY_CATEGORY[item.category] ?? "other";
}

export const ITEM_TYPES = [
  { key: "clothes", label: "衣服" },
  { key: "accessories", label: "配件" },
  { key: "makeup", label: "化妝品" },
  { key: "skincare", label: "保養品" },
] as const;

export type ItemTypeKey = (typeof ITEM_TYPES)[number]["key"];

export type Category = { key: string; label: string };

// 後端動態分類（三層樹的平表；parent_id 為 NULL＝第二層小分類）
export type ServerCategory = {
  id: number;
  item_type: string;
  key: string;
  label: string;
  position: number;
  parent_id: number | null;
};

export type CategoryNode = {
  key: string;
  label: string;
  children: { key: string; label: string }[];
};

// 預設三層分類樹（與後端 defaults.py 一致；僅作為後端尚未連線時的顯示後備）
export const CATEGORY_TREE: Record<ItemTypeKey, readonly CategoryNode[]> = {
  clothes: [
    {
      key: "top",
      label: "上衣",
      children: [
        { key: "tee", label: "T恤" },
        { key: "hoodie", label: "帽T" },
      ],
    },
    {
      key: "outerwear",
      label: "外套",
      children: [
        { key: "windbreaker", label: "風衣" },
        { key: "down-jacket", label: "羽絨" },
        { key: "light-outer", label: "薄外套" },
      ],
    },
    {
      key: "pants",
      label: "褲子",
      children: [
        { key: "long-pants", label: "長褲" },
        { key: "shorts", label: "短褲" },
      ],
    },
    {
      key: "skirt",
      label: "裙子",
      children: [
        { key: "mini-skirt", label: "短裙" },
        { key: "long-skirt", label: "長裙" },
        { key: "dress", label: "洋裝" },
      ],
    },
    { key: "sleepwear", label: "睡衣", children: [] },
    { key: "underwear", label: "內衣", children: [] },
    {
      key: "activewear",
      label: "運動",
      children: [
        { key: "activewear-top", label: "運動上衣" },
        { key: "activewear-pants", label: "運動褲" },
      ],
    },
    { key: "clothes-other", label: "其他", children: [] },
  ],
  accessories: [
    {
      key: "shoes",
      label: "鞋子",
      children: [
        { key: "sneakers", label: "運動鞋" },
        { key: "casual-shoes", label: "休閒鞋" },
        { key: "formal-shoes", label: "正式鞋" },
        { key: "sandals", label: "涼拖鞋" },
      ],
    },
    {
      key: "bag",
      label: "包包",
      children: [
        { key: "backpack", label: "後背包" },
        { key: "handbag", label: "手提肩背" },
        { key: "crossbody", label: "側背小包" },
        { key: "travel-bag", label: "旅行包" },
      ],
    },
    {
      key: "accessory",
      label: "飾品",
      children: [
        { key: "necklace", label: "項鍊" },
        { key: "earrings", label: "耳環" },
        { key: "ring", label: "戒指" },
        { key: "bracelet", label: "手鍊手錶" },
      ],
    },
    {
      key: "hat",
      label: "帽子",
      children: [
        { key: "cap", label: "棒球帽" },
        { key: "bucket-hat", label: "漁夫帽" },
      ],
    },
    {
      key: "acc-other",
      label: "其他",
      children: [
        { key: "scarf", label: "圍巾" },
        { key: "gloves", label: "手套" },
        { key: "mask-acc", label: "口罩" },
      ],
    },
  ],
  makeup: [
    {
      key: "base",
      label: "臉部底妝",
      children: [
        { key: "foundation", label: "粉底液" },
        { key: "cushion", label: "氣墊" },
        { key: "concealer", label: "遮瑕" },
        { key: "powder", label: "蜜粉·定妝" },
      ],
    },
    {
      key: "eye",
      label: "眼妝",
      children: [
        { key: "eyeshadow", label: "眼影" },
        { key: "eyeliner", label: "眼線" },
        { key: "mascara", label: "睫毛膏" },
        { key: "brow", label: "眉筆" },
      ],
    },
    {
      key: "lip",
      label: "唇妝",
      children: [
        { key: "lipstick", label: "口紅" },
        { key: "lip-glaze", label: "唇釉" },
        { key: "lip-gloss", label: "唇彩" },
      ],
    },
    {
      key: "cheek",
      label: "腮紅修容",
      children: [
        { key: "blush", label: "腮紅" },
        { key: "contour", label: "修容" },
        { key: "highlighter", label: "打亮" },
      ],
    },
    {
      key: "nail",
      label: "美甲",
      children: [
        { key: "nail-polish", label: "指甲油" },
        { key: "nail-gel", label: "凝膠" },
        { key: "nail-remover", label: "卸甲" },
      ],
    },
    {
      key: "makeup-tool",
      label: "美妝工具",
      children: [
        { key: "brush", label: "刷具" },
        { key: "puff", label: "粉撲·美妝蛋" },
        { key: "lash-curler", label: "睫毛夾" },
      ],
    },
    {
      key: "fragrance",
      label: "香氛",
      children: [
        { key: "perfume", label: "香水" },
        { key: "perfume-balm", label: "香膏" },
      ],
    },
    { key: "makeup-other", label: "其他", children: [] },
  ],
  skincare: [
    {
      key: "cleanser",
      label: "清潔卸妝",
      children: [
        { key: "makeup-remover", label: "卸妝" },
        { key: "face-wash", label: "洗面乳" },
        { key: "scrub", label: "去角質" },
      ],
    },
    {
      key: "toner-lotion",
      label: "水乳霜",
      children: [
        { key: "toner", label: "化妝水" },
        { key: "lotion", label: "乳液" },
        { key: "cream", label: "乳霜" },
      ],
    },
    {
      key: "serum-eye",
      label: "精華眼霜",
      children: [
        { key: "serum", label: "精華液" },
        { key: "eyecream", label: "眼霜" },
        { key: "ampoule", label: "安瓶" },
      ],
    },
    {
      key: "mask",
      label: "面膜",
      children: [
        { key: "sheet-mask", label: "貼片" },
        { key: "clay-mask", label: "泥膜" },
        { key: "sleeping-mask", label: "睡眠面膜" },
      ],
    },
    {
      key: "sunscreen",
      label: "防曬",
      children: [
        { key: "face-sunscreen", label: "臉部防曬" },
        { key: "body-sunscreen", label: "身體防曬" },
      ],
    },
    {
      key: "body-care",
      label: "身體護理",
      children: [
        { key: "body-wash", label: "沐浴" },
        { key: "body-lotion", label: "身體乳" },
        { key: "hand-cream", label: "護手霜" },
      ],
    },
    {
      key: "hair-care",
      label: "頭髮護理",
      children: [
        { key: "shampoo", label: "洗髮" },
        { key: "hair-treatment", label: "護髮·髮油" },
      ],
    },
    { key: "skincare-other", label: "其他", children: [] },
  ],
};

export const CATEGORIES: Record<ItemTypeKey, readonly Category[]> =
  ITEM_TYPES.reduce((acc, t) => {
    acc[t.key] = CATEGORY_TREE[t.key].map((n) => ({
      key: n.key,
      label: n.label,
    }));
    return acc;
  }, {} as Record<ItemTypeKey, readonly Category[]>);

// 功效不做分類，改為列表篩選條件
export const EFFICACIES: Record<string, readonly string[]> = {
  skincare: ["保濕", "美白", "抗老", "控油", "舒緩", "防曬"],
  makeup: ["控油", "持久", "防水"],
};

export function efficaciesOf(itemType: string): readonly string[] {
  return EFFICACIES[itemType] ?? [];
}

export function hasEfficacyFields(itemType: string): boolean {
  return efficaciesOf(itemType).length > 0;
}

export function parseEfficacy(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinEfficacy(list: readonly string[]): string {
  return list.join(",");
}

export const ITEM_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.key, t.label])
);

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries([
  ...Object.values(CATEGORY_TREE).flatMap((nodes) =>
    nodes.flatMap((n) => [
      [n.key, n.label] as [string, string],
      ...n.children.map((c) => [c.key, c.label] as [string, string]),
    ])
  ),
  // 舊資料的預設分類 key
  ["other", "其他"],
]);

export function categoriesOf(itemType: string): readonly Category[] {
  return CATEGORIES[itemType as ItemTypeKey] ?? CATEGORIES.clothes;
}

// 衣服專屬欄位；配件/化妝品/保養品隱藏季節與天氣
export function hasClothingFields(itemType: string): boolean {
  return itemType === "clothes";
}

// 分類簡圖（暫以 emoji 圖示取代照片）
export const CATEGORY_ICON: Record<string, string> = {
  // 衣服
  top: "👕",
  tee: "👕",
  hoodie: "🧥",
  outerwear: "🧥",
  windbreaker: "🧥",
  "down-jacket": "🧥",
  "light-outer": "🧥",
  pants: "👖",
  "long-pants": "👖",
  shorts: "🩳",
  skirt: "👗",
  "mini-skirt": "👗",
  "long-skirt": "👗",
  dress: "👗",
  underwear: "🩲",
  sleepwear: "😴",
  activewear: "🏃",
  "activewear-top": "🏃",
  "activewear-pants": "🏃",
  "clothes-other": "👚",
  other: "👚",
  // 配件
  shoes: "👟",
  sneakers: "👟",
  "casual-shoes": "👞",
  "formal-shoes": "👞",
  sandals: "🩴",
  bag: "👜",
  backpack: "🎒",
  handbag: "👜",
  crossbody: "👜",
  "travel-bag": "🧳",
  accessory: "💍",
  necklace: "📿",
  earrings: "💎",
  ring: "💍",
  bracelet: "⌚",
  hat: "🧢",
  cap: "🧢",
  "bucket-hat": "👒",
  "acc-other": "🧣",
  scarf: "🧣",
  gloves: "🧤",
  "mask-acc": "😷",
  // 化妝品
  base: "🪞",
  foundation: "🪞",
  cushion: "🪞",
  concealer: "🪞",
  powder: "✨",
  eye: "🎨",
  eyeshadow: "🎨",
  eyeliner: "🖊️",
  mascara: "👁️",
  brow: "✏️",
  lip: "💄",
  lipstick: "💄",
  "lip-glaze": "💄",
  "lip-gloss": "💄",
  cheek: "🌸",
  blush: "🌸",
  contour: "🪞",
  highlighter: "✨",
  nail: "💅",
  "nail-polish": "💅",
  "nail-gel": "💅",
  "nail-remover": "🧽",
  "makeup-tool": "🖌️",
  brush: "🖌️",
  puff: "🧽",
  "lash-curler": "👁️",
  fragrance: "🌹",
  perfume: "🌹",
  "perfume-balm": "🌹",
  "makeup-other": "💄",
  lash: "👁️",
  // 保養品
  cleanser: "🫧",
  "makeup-remover": "🫧",
  "face-wash": "🫧",
  scrub: "🧽",
  "toner-lotion": "💧",
  toner: "💧",
  lotion: "🧴",
  cream: "🪣",
  "serum-eye": "🧪",
  serum: "🧪",
  eyecream: "👁️",
  ampoule: "🧪",
  mask: "🎭",
  "sheet-mask": "🎭",
  "clay-mask": "🎭",
  "sleeping-mask": "😴",
  sunscreen: "☀️",
  "face-sunscreen": "☀️",
  "body-sunscreen": "☀️",
  "body-care": "🛁",
  "body-wash": "🛁",
  "body-lotion": "🧴",
  "hand-cream": "🧴",
  "hair-care": "💇",
  shampoo: "🧴",
  "hair-treatment": "💇",
  "skincare-other": "🧴",
};

const TYPE_ICON_FALLBACK: Record<string, string> = {
  clothes: "👚",
  accessories: "👜",
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
