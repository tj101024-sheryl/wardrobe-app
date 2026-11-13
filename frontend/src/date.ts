export const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function isToday(value: string): boolean {
  return value === ymd(new Date());
}

export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7; // 週一 = 0
}

export function startOfWeek(d: Date): Date {
  return addDays(d, -weekdayIndex(d));
}

export function weekDates(base = new Date()): Date[] {
  const start = startOfWeek(base);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 回傳該月 1 號到月底的日期格，前面補 null 對齊週一。 */
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month - 1, 1);
  const total = new Date(year, month, 0).getDate();
  const cells: (Date | null)[] = Array(weekdayIndex(first)).fill(null);
  for (let day = 1; day <= total; day += 1) {
    cells.push(new Date(year, month - 1, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shortDate(value: string): string {
  const d = parseYmd(value);
  return d ? `${d.getMonth() + 1}/${d.getDate()}` : value;
}

export function longDate(value: string): string {
  const d = parseYmd(value);
  return d ? `${d.getMonth() + 1} 月 ${d.getDate()} 日` : value;
}

export function relativeDate(value: string): string {
  const target = parseYmd(value);
  if (!target) return value;
  const today = new Date();
  const diff = Math.round(
    (target.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000
  );
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === -1) return "昨天";
  return longDate(value);
}
