import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { http } from "../api";
import {
  WEEKDAY_LABELS,
  monthGrid,
  ymd,
} from "../date";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { colors, radius, shadow, type } from "../theme";

type CalendarDay = {
  date: string;
  count: number;
  outfit_ids: number[];
  statuses: string[];
};

export default function OutfitCalendarScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();
  const frame = Math.min(width, PHONE_MAX_WIDTH);
  const cell = (frame - 36) / 7;
  const todayStr = ymd(new Date());

  const load = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const rows = await http.get<CalendarDay[]>(
        `/api/outfits/calendar?year=${year}&month=${month}`
      );
      setDays(rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const byDate = new Map(days.map((d) => [d.date, d]));
  const cells = monthGrid(year, month);
  const total = days.reduce((sum, d) => sum + d.count, 0);

  function shiftMonth(delta: number) {
    let y = year;
    let m = month + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  }

  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  function openDay(dateStr: string) {
    const found = byDate.get(dateStr);
    if (found?.outfit_ids.length) {
      router.push(`/outfit/${found.outfit_ids[0]}`);
    } else {
      router.push(`/outfit/edit?date=${dateStr}`);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => shiftMonth(-1)}
          activeOpacity={0.7}
        >
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.monthText}>
            {year} 年 {month} 月
          </Text>
          <Text style={styles.countText}>{total} 套穿搭</Text>
        </View>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => shiftMonth(1)}
          activeOpacity={0.7}
        >
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeader}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={[styles.weekLabel, { width: cell }]}>
            {label}
          </Text>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.text} />
      ) : (
        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (!day) {
              return <View key={`e${index}`} style={{ width: cell, height: cell }} />;
            }
            const value = ymd(day);
            const info = byDate.get(value);
            const isTodayCell = value === todayStr;
            const worn = info?.statuses.includes("worn");
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.cell,
                  { width: cell, height: cell },
                  info && styles.cellFilled,
                  isTodayCell && styles.cellToday,
                ]}
                onPress={() => openDay(value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayNum,
                    info && styles.dayNumFilled,
                    isTodayCell && !info && styles.dayNumToday,
                  ]}
                >
                  {day.getDate()}
                </Text>
                {info ? (
                  <View style={styles.dots}>
                    {Array.from({ length: Math.min(info.count, 3) }).map(
                      (_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            { backgroundColor: worn ? "#fff" : colors.accent },
                          ]}
                        />
                      )
                    )}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>已穿著</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>預定／草稿</Text>
        </View>
        <TouchableOpacity onPress={goToday} style={styles.todayBtn}>
          <Text style={styles.todayText}>回到本月</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>點日期查看穿搭；空白日期可以新增。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 18 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 18,
    paddingBottom: 14,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: { fontSize: 22, color: colors.text, lineHeight: 24 },
  monthText: { ...type.heading, color: colors.text, fontSize: 18 },
  countText: { ...type.caption, color: colors.sub, marginTop: 2 },
  weekHeader: { flexDirection: "row", marginBottom: 4 },
  weekLabel: {
    textAlign: "center",
    fontSize: 11,
    color: colors.faint,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 8,
    ...shadow.soft,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  cellFilled: { backgroundColor: colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: colors.primary },
  dayNum: { fontSize: 14, color: colors.text, fontWeight: "600" },
  dayNumFilled: { color: "#fff", fontWeight: "800" },
  dayNumToday: { color: colors.text, fontWeight: "800" },
  dots: { flexDirection: "row", gap: 2, marginTop: 3, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  error: { color: colors.danger, marginTop: 12, fontSize: 12 },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.sub },
  todayBtn: { marginLeft: "auto" },
  todayText: { fontSize: 12, fontWeight: "700", color: colors.text },
  hint: {
    ...type.caption,
    color: colors.faint,
    marginTop: 12,
    textAlign: "center",
  },
});
