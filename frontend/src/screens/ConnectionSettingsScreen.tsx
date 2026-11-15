import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import {
  clearApiBaseOverride,
  saveApiBaseOverride,
  testBackend,
} from "../connection";
import { getApiBase, getAutoApiBase } from "../types";
import { colors, radius, shadow, type } from "../theme";

export default function ConnectionSettingsScreen() {
  const [value, setValue] = useState(getApiBase());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);

  const current = getApiBase();
  const isLocalhost = /127\.0\.0\.1|localhost/.test(current);
  const isTunnel =
    /exp\.direct|exp\.host|ngrok|trycloudflare/.test(current);

  async function test() {
    setBusy(true);
    setResult("");
    setOk(null);
    try {
      const res = await testBackend(value);
      setOk(res.ok);
      setResult(res.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setResult("");
    setOk(null);
    try {
      const normalized = await saveApiBaseOverride(value);
      setValue(normalized || getAutoApiBase());
      setOk(true);
      setResult("已儲存，返回上一頁後會用新的位址重新載入");
    } catch (e: any) {
      setOk(false);
      setResult(e?.message || "儲存失敗");
    } finally {
      setBusy(false);
    }
  }

  async function restoreAuto() {
    setBusy(true);
    setResult("");
    setOk(null);
    try {
      await clearApiBaseOverride();
      const auto = getAutoApiBase();
      setValue(auto);
      setOk(true);
      setResult(`已恢復自動偵測：${auto}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Text style={styles.title}>後端連線</Text>
        <Text style={styles.sub}>
          手機或平板要連到「電腦的區網 IP」，不能用 localhost。
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>自動偵測</Text>
        <Text selectable style={styles.infoValue}>
          {getAutoApiBase()}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.infoLabel}>目前使用</Text>
        <Text selectable style={styles.infoValue}>
          {getApiBase()}
        </Text>
        {Platform.OS !== "web" && isLocalhost ? (
          <Text style={styles.warn}>
            目前是 localhost，手機連不到電腦。請改成電腦的區網 IP，例如
            http://140.118.219.6:8000。
          </Text>
        ) : null}
        {isTunnel ? (
          <Text style={styles.warn}>
            目前是 Expo tunnel 位址，port 8000 不會被轉發。請改成電腦區網 IP。
          </Text>
        ) : null}
      </View>

      <Text style={styles.label}>後端網址</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="http://192.168.1.10:8000"
        placeholderTextColor={colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Text style={styles.hint}>
        例如：http://140.118.219.6:8000（電腦目前的區網 IP）
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.testBtn, busy && { opacity: 0.5 }]}
          onPress={() => void test()}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <Text style={styles.testText}>測試連線</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, busy && { opacity: 0.5 }]}
          onPress={() => void save()}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={styles.saveText}>儲存並套用</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.autoBtn}
        onPress={() => void restoreAuto()}
        disabled={busy}
        activeOpacity={0.8}
      >
        <Text style={styles.autoText}>恢復自動偵測</Text>
      </TouchableOpacity>

      {result ? (
        <View
          style={[
            styles.resultBox,
            ok === true && styles.resultOk,
            ok === false && styles.resultError,
          ]}
        >
          <Text
            style={[
              styles.resultText,
              ok === true && styles.resultTextOk,
              ok === false && styles.resultTextError,
            ]}
          >
            {result}
          </Text>
        </View>
      ) : null}

      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>連不上時檢查</Text>
        <Text style={styles.helpItem}>
          1. 電腦後端要執行：{"\n"}
          <Text style={styles.code}>
            python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
          </Text>
        </Text>
        <Text style={styles.helpItem}>
          2. 手機與電腦要在同一個 Wi-Fi；校園網路有時會隔離裝置。
        </Text>
        <Text style={styles.helpItem}>
          3. Windows 防火牆要允許 Python／port 8000。
        </Text>
        <Text style={styles.helpItem}>
          4. 若電腦 IP 換了，重新啟動 Expo 或直接在上方改成新的 IP。
        </Text>
        <Text style={styles.helpItem}>
          5. 測不到時可先用手機熱點，讓電腦與手機在同一個網路。
        </Text>
      </View>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Text style={styles.backText}>返回</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { marginBottom: 16 },
  title: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.sub, marginTop: 6, lineHeight: 18 },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.soft,
  },
  infoLabel: { fontSize: 10, color: colors.sub, fontWeight: "700" },
  infoValue: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
    fontWeight: "600",
  },
  warn: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 15,
    color: colors.danger,
    backgroundColor: "#fdeeee",
    borderRadius: radius.sm,
    padding: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  label: {
    ...type.label,
    color: colors.sub,
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.text,
  },
  hint: { fontSize: 10, color: colors.faint, marginTop: 6, lineHeight: 15 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  testBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingVertical: 13,
    alignItems: "center",
  },
  testText: { fontSize: 13, fontWeight: "700", color: colors.text },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  autoBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  autoText: { fontSize: 12, fontWeight: "700", color: colors.sub },
  resultBox: {
    marginTop: 8,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.chip,
  },
  resultOk: { backgroundColor: "#eef6ee" },
  resultError: { backgroundColor: "#fdeeee" },
  resultText: { fontSize: 11, color: colors.text, lineHeight: 16 },
  resultTextOk: { color: "#3d6b3d" },
  resultTextError: { color: colors.danger },
  helpCard: {
    marginTop: 18,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.soft,
  },
  helpTitle: { ...type.label, color: colors.text, marginBottom: 8 },
  helpItem: {
    fontSize: 10,
    color: colors.sub,
    lineHeight: 17,
    marginTop: 6,
  },
  code: {
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.bg,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  backBtn: {
    marginTop: 18,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 13,
    alignItems: "center",
  },
  backText: { fontSize: 13, fontWeight: "700", color: colors.text },
});
