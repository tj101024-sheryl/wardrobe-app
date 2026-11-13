import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Modal,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { http } from "../api";
import {
  notificationPermission,
  requestNotificationPermission,
  syncOutfitReminders,
} from "../notifications";
import { useFocusEffect } from "expo-router";
import { colors, radius, shadow, type } from "../theme";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0")
);

export default function NotificationSettingsScreen() {
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState("08:00");
  const [permission, setPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [picker, setPicker] = useState(false);
  const [hour, setHour] = useState("08");
  const [minute, setMinute] = useState("00");

  const load = useCallback(async () => {
    try {
      const settings = await http.get<{ enabled: boolean; time: string }>(
        "/api/users/me/notifications"
      );
      setEnabled(settings.enabled);
      setTime(settings.time || "08:00");
      setPermission(await notificationPermission());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function save(nextEnabled: boolean, nextTime: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      let allowed = permission;
      if (nextEnabled && Platform.OS !== "web") {
        allowed = await requestNotificationPermission();
        setPermission(allowed);
      }
      await http.patch("/api/users/me/notifications", {
        enabled: nextEnabled,
        time: nextTime,
      });
      const count = await syncOutfitReminders(true);
      if (!nextEnabled) {
        setNotice("已關閉提醒");
      } else if (Platform.OS === "web") {
        setNotice("已儲存。Web 版無法排程通知，請在手機 Expo Go 測試");
      } else if (!allowed) {
        setNotice("已儲存，但系統尚未允許通知");
      } else {
        setNotice(
          count > 0
            ? `已排定 ${count} 個穿搭提醒`
            : "已儲存；目前沒有需要提醒的預定穿搭"
        );
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function toggle(next: boolean) {
    setEnabled(next);
    save(next, time);
  }

  function openPicker() {
    const [h, m] = time.split(":");
    setHour(h || "08");
    setMinute(m && MINUTES.includes(m) ? m : "00");
    setPicker(true);
  }

  function applyPicker() {
    const next = `${hour}:${minute}`;
    setTime(next);
    setPicker(false);
    save(enabled, next);
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>穿搭提醒</Text>
            <Text style={styles.rowSub}>
              只在有預定穿搭的日子提醒，不會每天固定吵
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.row, !enabled && { opacity: 0.4 }]}
          onPress={openPicker}
          disabled={!enabled}
          activeOpacity={0.75}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>提醒時間</Text>
            <Text style={styles.rowSub}>預設早上 08:00</Text>
          </View>
          <Text style={styles.timeText}>{time}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {enabled && permission === false && Platform.OS !== "web" ? (
        <View style={styles.warnCard}>
          <Text style={styles.warnTitle}>系統通知尚未開啟</Text>
          <Text style={styles.warnBody}>
            沒有權限的話，時間到了不會跳出提醒。可以到系統設定開啟，
            或直接從穿搭首頁的「待確認」手動確認。
          </Text>
          <TouchableOpacity
            style={styles.warnBtn}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.85}
          >
            <Text style={styles.warnBtnText}>前往系統設定</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {Platform.OS === "web" ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Web 版可以儲存設定，但本機通知要在手機上的 Expo Go 才會運作。
          </Text>
        </View>
      ) : null}

      {saving ? (
        <View style={styles.savingRow}>
          <ActivityIndicator size="small" color={colors.sub} />
          <Text style={styles.savingText}>儲存中…</Text>
        </View>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.footnote}>
        提醒會在你設定的時間跳出，點通知可直接開啟那套穿搭確認。
        只有按「有穿」才會累計穿著次數。
      </Text>

      <Modal
        visible={picker}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPicker(false)}
        >
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <Text style={styles.pickerTitle}>選擇提醒時間</Text>
            <Text style={styles.pickerValue}>
              {hour}:{minute}
            </Text>
            <View style={styles.pickerColumns}>
              <ScrollView
                style={styles.pickerColumn}
                showsVerticalScrollIndicator={false}
              >
                {HOURS.map((h) => {
                  const active = h === hour;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.pickerItem,
                        active && styles.pickerItemActive,
                      ]}
                      onPress={() => setHour(h)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          active && styles.pickerItemTextActive,
                        ]}
                      >
                        {h} 時
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <ScrollView
                style={styles.pickerColumn}
                showsVerticalScrollIndicator={false}
              >
                {MINUTES.map((m) => {
                  const active = m === minute;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.pickerItem,
                        active && styles.pickerItemActive,
                      ]}
                      onPress={() => setMinute(m)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          active && styles.pickerItemTextActive,
                        ]}
                      >
                        {m} 分
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.pickerButtons}>
              <TouchableOpacity
                style={styles.pickerGhost}
                onPress={() => setPicker(false)}
              >
                <Text style={styles.pickerGhostText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pickerPrimary}
                onPress={applyPicker}
              >
                <Text style={styles.pickerPrimaryText}>確定</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    ...shadow.soft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  rowSub: { fontSize: 11, color: colors.sub, marginTop: 4, lineHeight: 16 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  timeText: { fontSize: 16, fontWeight: "800", color: colors.text },
  chevron: { fontSize: 20, color: colors.faint },
  warnCard: {
    marginTop: 14,
    backgroundColor: "#fdf3e6",
    borderRadius: radius.md,
    padding: 14,
  },
  warnTitle: { fontSize: 13, fontWeight: "700", color: "#8a5a12" },
  warnBody: {
    fontSize: 11,
    color: "#8a5a12",
    lineHeight: 17,
    marginTop: 5,
  },
  warnBtn: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#d9b06b",
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  warnBtnText: { fontSize: 11, fontWeight: "700", color: "#8a5a12" },
  infoCard: {
    marginTop: 14,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: 13,
  },
  infoText: { fontSize: 11, color: "#6f5a12", lineHeight: 17 },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  savingText: { fontSize: 11, color: colors.sub },
  notice: { marginTop: 14, fontSize: 12, color: "#3d6b3d", lineHeight: 18 },
  error: { marginTop: 14, fontSize: 12, color: colors.danger },
  footnote: {
    fontSize: 11,
    color: colors.faint,
    lineHeight: 18,
    marginTop: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  pickerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
  },
  pickerTitle: { ...type.heading, color: colors.text },
  pickerValue: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginTop: 12,
    letterSpacing: 1,
  },
  pickerColumns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    height: 220,
  },
  pickerColumn: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
  },
  pickerItem: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.sm,
    margin: 4,
  },
  pickerItemActive: { backgroundColor: colors.primary },
  pickerItemText: { fontSize: 13, color: colors.sub, fontWeight: "600" },
  pickerItemTextActive: { color: "#fff" },
  pickerButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  pickerGhost: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  pickerGhostText: { fontSize: 13, fontWeight: "600", color: colors.text },
  pickerPrimary: {
    flex: 1,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: "center",
  },
  pickerPrimaryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
