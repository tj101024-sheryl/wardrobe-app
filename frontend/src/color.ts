import { COLOR_FAMILY_HEX, COLOR_FAMILY_SOFT, Item } from "./types";

export type ColorFamily = {
  key: string;
  label: string;
  hex: string;
  soft: string;
};

const LABELS: Record<string, string> = {
  white: "白",
  black: "黑",
  gray: "灰",
  beige: "米",
  brown: "棕",
  red: "紅",
  pink: "粉",
  orange: "橙",
  yellow: "黃",
  green: "綠",
  blue: "藍",
  purple: "紫",
  metal: "金屬",
};

export const COLOR_FAMILIES: ColorFamily[] = [
  "white",
  "black",
  "gray",
  "beige",
  "brown",
  "red",
  "pink",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
].map((key) => ({
  key,
  label: LABELS[key] || key,
  hex: COLOR_FAMILY_HEX[key] || "#D8D4CC",
  soft: COLOR_FAMILY_SOFT[key] || "#F3F2EF",
}));

export const CATEGORY_GROUPS = [
  { key: "all", label: "全部" },
  { key: "top", label: "上衣" },
  { key: "bottom", label: "褲子" },
  { key: "skirt", label: "裙子" },
  { key: "outer", label: "外套" },
  { key: "accessory", label: "配件" },
  { key: "other", label: "其他" },
];

const TOP_KEYS = new Set([
  "top",
  "tee",
  "hoodie",
  "activewear-top",
]);
const BOTTOM_KEYS = new Set([
  "pants",
  "long-pants",
  "shorts",
  "activewear-pants",
]);
const SKIRT_KEYS = new Set([
  "skirt",
  "mini-skirt",
  "long-skirt",
  "dress",
]);
const OUTER_KEYS = new Set([
  "outerwear",
  "windbreaker",
  "down-jacket",
  "light-outer",
]);

export function colorGroupOf(item: Item): string {
  if (item.item_type === "accessories") return "accessory";
  if (TOP_KEYS.has(item.category)) return "top";
  if (BOTTOM_KEYS.has(item.category)) return "bottom";
  if (SKIRT_KEYS.has(item.category)) return "skirt";
  if (OUTER_KEYS.has(item.category)) return "outer";
  return "other";
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const light = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function colorLabel(key: string | null | undefined): string {
  return LABELS[key || ""] || "自訂";
}
