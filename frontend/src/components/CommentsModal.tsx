import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { http } from "../api";
import { OutfitComment } from "../types";
import { PHONE_MAX_WIDTH } from "./PhoneFrame";
import { colors, radius, shadow, type } from "../theme";

export default function CommentsModal({
  outfitId,
  visible,
  onClose,
  onCountChange,
}: {
  outfitId: number | null;
  visible: boolean;
  onClose: () => void;
  onCountChange?: (outfitId: number, count: number) => void;
}) {
  const [comments, setComments] = useState<OutfitComment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible || !outfitId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await http.get<OutfitComment[]>(
          `/api/outfits/${outfitId}/comments`
        );
        if (!cancelled) {
          setComments(rows);
          onCountChange?.(outfitId, rows.length);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, outfitId, onCountChange]);

  async function send() {
    if (!outfitId || !text.trim()) return;
    setSending(true);
    setError("");
    try {
      const row = await http.post<OutfitComment>(
        `/api/outfits/${outfitId}/comments`,
        { body: text.trim() }
      );
      setComments((prev) => [...prev, row]);
      setText("");
      onCountChange?.(outfitId, comments.length + 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
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
          <Text style={styles.title}>留言</Text>
          <ScrollView style={styles.list}>
            {loading ? (
              <ActivityIndicator color={colors.text} style={{ marginTop: 20 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.empty}>還沒有留言，說點什麼吧</Text>
            ) : (
              comments.map((row) => (
                <View key={row.id} style={styles.row}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {row.user.username.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{row.user.username}</Text>
                    <Text style={styles.body}>{row.body}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="寫下你的想法…"
              placeholderTextColor={colors.faint}
              maxLength={500}
              multiline
            />
            <TouchableOpacity
              style={[styles.send, (!text.trim() || sending) && { opacity: 0.4 }]}
              onPress={send}
              disabled={!text.trim() || sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendText}>送出</Text>
              )}
            </TouchableOpacity>
          </View>
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
    padding: 16,
    maxHeight: "78%",
    ...shadow.raised,
  },
  title: { ...type.heading, color: colors.text, marginBottom: 10 },
  list: { maxHeight: 360 },
  empty: {
    fontSize: 12,
    color: colors.faint,
    textAlign: "center",
    paddingVertical: 24,
  },
  row: { flexDirection: "row", gap: 9, paddingVertical: 8 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "800", color: colors.text },
  name: { fontSize: 11, fontWeight: "700", color: colors.text },
  body: { fontSize: 12, color: colors.text, marginTop: 3, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 11, marginTop: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.text,
    maxHeight: 80,
  },
  send: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  sendText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
