import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { http } from "../api";
import { fullUrl } from "../types";
import { PHONE_MAX_WIDTH } from "./PhoneFrame";
import { colors, radius, shadow, type } from "../theme";

const FORMATS = [
  { key: "story", label: "IG 限動", hint: "1080 × 1920" },
  { key: "feed", label: "IG 貼文", hint: "1080 × 1350" },
  { key: "fb", label: "FB 貼文", hint: "1200 × 630" },
];

export default function ShareSheet({
  outfitId,
  visible,
  onClose,
}: {
  outfitId: number | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible || !outfitId) return;
    let cancelled = false;
    (async () => {
      setLoadingPreview(true);
      setError("");
      try {
        const [image, text] = await Promise.all([
          http.get<{ url: string }>(
            `/api/outfits/${outfitId}/share-image?format=feed`
          ),
          http.get<{ text: string }>(`/api/outfits/${outfitId}/share-text`),
        ]);
        if (!cancelled) {
          setPreview(image.url);
          setCaption(text.text);
        }
      } catch {
        // 預覽失敗不阻擋後續分享
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, outfitId]);

  async function share(format: string) {
    if (!outfitId) return;
    setBusy(format);
    setError("");
    try {
      const [image, text] = await Promise.all([
        http.get<{ url: string }>(
          `/api/outfits/${outfitId}/share-image?format=${format}`
        ),
        http.get<{ text: string }>(`/api/outfits/${outfitId}/share-text`),
      ]);
      setCaption(text.text);
      setPreview(image.url);
      const url = fullUrl(image.url);

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.open(url, "_blank");
        return;
      }

      const dir = FileSystem.cacheDirectory;
      if (!dir) throw new Error("無法建立暫存檔案");
      const fileUri = `${dir}outfit-${outfitId}-${format}.png`;
      const downloaded = await FileSystem.downloadAsync(url, fileUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri, {
          mimeType: "image/png",
          dialogTitle: text.text,
        });
      } else {
        setError("此裝置不支援系統分享");
      }
    } catch (e: any) {
      setError(e.message || "分享失敗");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>分享這套穿搭</Text>
          <Text style={styles.sub}>
            選擇尺寸後會開啟系統分享面板，可選 IG 或 Facebook
          </Text>
          {preview ? (
            <View style={styles.previewWrap}>
              <Image
                source={{ uri: fullUrl(preview) }}
                style={styles.preview}
                resizeMode="cover"
              />
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>預覽</Text>
              </View>
            </View>
          ) : loadingPreview ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator color={colors.sub} size="small" />
              <Text style={styles.previewLoadingText}>產生分享圖…</Text>
            </View>
          ) : null}
          {FORMATS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.option}
              onPress={() => share(item.key)}
              disabled={!!busy}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{item.label}</Text>
                <Text style={styles.optionHint}>{item.hint}</Text>
              </View>
              {busy === item.key ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={styles.optionArrow}>›</Text>
              )}
            </TouchableOpacity>
          ))}
          {caption ? (
            <View style={styles.captionCard}>
              <Text style={styles.captionLabel}>分享文案</Text>
              <Text selectable style={styles.caption}>
                {caption}
              </Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>關閉</Text>
          </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    paddingHorizontal: 24,
    ...(Platform.OS === "web"
      ? {
          width: "100%" as const,
          maxWidth: PHONE_MAX_WIDTH,
          alignSelf: "center" as const,
        }
      : {}),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    maxHeight: "86%",
    ...shadow.raised,
  },
  previewWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.bg,
    marginBottom: 12,
    aspectRatio: 4 / 5,
    maxHeight: 200,
  },
  preview: { width: "100%", height: "100%" },
  previewBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  previewLoading: {
    height: 86,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  previewLoadingText: { fontSize: 9, color: colors.faint },
  title: { ...type.heading, color: colors.text },
  sub: {
    fontSize: 10,
    color: colors.sub,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 15,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  optionTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  optionHint: { fontSize: 10, color: colors.sub, marginTop: 2 },
  optionArrow: { fontSize: 20, color: colors.faint },
  captionCard: {
    marginTop: 12,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 12,
  },
  captionLabel: { fontSize: 10, color: colors.sub, marginBottom: 4 },
  caption: { fontSize: 11, color: colors.text, lineHeight: 17 },
  error: { color: colors.danger, fontSize: 11, marginTop: 10 },
  close: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeText: { fontSize: 12, fontWeight: "700", color: colors.text },
});
