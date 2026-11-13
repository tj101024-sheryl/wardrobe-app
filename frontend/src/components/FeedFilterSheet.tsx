import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { X } from "lucide-react-native";
import {
  BODY_TYPE_OPTIONS,
  FILTER_OCCASIONS,
  LEVEL_OPTIONS,
  MAKEUP_LOOK_OPTIONS,
  MAKEUP_STYLE_KEYS,
  OUTFIT_STYLE_KEYS,
  OutfitAudience,
  OutfitBodyType,
  OutfitLevel,
  OutfitStyle,
  STYLE_LABEL,
  STYLE_OPTIONS,
  MakeupLook,
} from "../types";
import { PHONE_MAX_WIDTH } from "./PhoneFrame";
import { colors, radius, shadow, type } from "../theme";

export type FeedDomain =
  | "all"
  | "outfit"
  | "makeup"
  | "skincare"
  | "review";

export type FeedFilterState = {
  audiences: OutfitAudience[];
  styles: OutfitStyle[];
  level: "all" | OutfitLevel;
  occasions: string[];
  bodyTypes: OutfitBodyType[];
  makeupLooks: MakeupLook[];
};

export const EMPTY_FEED_FILTERS: FeedFilterState = {
  audiences: [],
  styles: [],
  level: "all",
  occasions: [],
  bodyTypes: [],
  makeupLooks: [],
};

export function filterCount(filters: FeedFilterState): number {
  return (
    filters.audiences.length +
    filters.styles.length +
    (filters.level === "all" ? 0 : 1) +
    filters.occasions.length +
    filters.bodyTypes.length +
    filters.makeupLooks.length
  );
}

export function filterKey(filters: FeedFilterState): string {
  return JSON.stringify(filters);
}

const DOMAIN_LABEL: Record<FeedDomain, string> = {
  all: "全部",
  outfit: "穿搭",
  makeup: "妝容",
  skincare: "保養",
  review: "產品推薦",
};

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      <View style={styles.chipWrap}>{children}</View>
    </View>
  );
}

function FilterBody({
  domain,
  value,
  onClose,
  onApply,
}: {
  domain: FeedDomain;
  value: FeedFilterState;
  onClose: () => void;
  onApply: (filters: FeedFilterState) => void;
}) {
  const [draft, setDraft] = useState<FeedFilterState>(value);

  const styleKeys: OutfitStyle[] =
    domain === "makeup"
      ? MAKEUP_STYLE_KEYS
      : domain === "outfit"
      ? OUTFIT_STYLE_KEYS
      : Array.from(new Set([...MAKEUP_STYLE_KEYS, ...OUTFIT_STYLE_KEYS]));
  const styleOptions = STYLE_OPTIONS.filter((option) =>
    styleKeys.includes(option.key)
  );
  const showBodyType = domain === "outfit" || domain === "all";
  const showMakeupLook = domain === "makeup" || domain === "all";

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>篩選</Text>
          <Text style={styles.subtitle}>目前領域：{DOMAIN_LABEL[domain]}</Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <X size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        <Section title="取向" hint="可多選">
          {[
            { key: "male", label: "男生" },
            { key: "female", label: "女生" },
            { key: "unisex", label: "中性" },
          ].map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              active={draft.audiences.includes(
                option.key as OutfitAudience
              )}
              onPress={() =>
                setDraft((prev) => ({
                  ...prev,
                  audiences: toggleValue(
                    prev.audiences,
                    option.key as OutfitAudience
                  ),
                }))
              }
            />
          ))}
        </Section>

        <Section title="風格" hint="可多選">
          {styleOptions.map((option) => (
            <Chip
              key={option.key}
              label={STYLE_LABEL[option.key]}
              active={draft.styles.includes(option.key)}
              onPress={() =>
                setDraft((prev) => ({
                  ...prev,
                  styles: toggleValue(prev.styles, option.key),
                }))
              }
            />
          ))}
        </Section>

        <Section title="程度">
          {LEVEL_OPTIONS.map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              active={draft.level === option.key}
              onPress={() =>
                setDraft((prev) => ({
                  ...prev,
                  level:
                    prev.level === option.key ? "all" : option.key,
                }))
              }
            />
          ))}
        </Section>

        <Section title="場合" hint="可多選">
          {FILTER_OCCASIONS.map((occasion) => (
            <Chip
              key={occasion}
              label={occasion}
              active={draft.occasions.includes(occasion)}
              onPress={() =>
                setDraft((prev) => ({
                  ...prev,
                  occasions: toggleValue(prev.occasions, occasion),
                }))
              }
            />
          ))}
        </Section>

        {showBodyType ? (
          <Section title="身型" hint="可多選">
            {BODY_TYPE_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                active={draft.bodyTypes.includes(option.key)}
                onPress={() =>
                  setDraft((prev) => ({
                    ...prev,
                    bodyTypes: toggleValue(prev.bodyTypes, option.key),
                  }))
                }
              />
            ))}
          </Section>
        ) : null}

        {showMakeupLook ? (
          <Section title="妝感" hint="可多選">
            {MAKEUP_LOOK_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                active={draft.makeupLooks.includes(option.key)}
                onPress={() =>
                  setDraft((prev) => ({
                    ...prev,
                    makeupLooks: toggleValue(prev.makeupLooks, option.key),
                  }))
                }
              />
            ))}
          </Section>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => setDraft(EMPTY_FEED_FILTERS)}
          activeOpacity={0.8}
        >
          <Text style={styles.resetText}>重設</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={() => onApply(draft)}
          activeOpacity={0.85}
        >
          <Text style={styles.applyText}>查看結果</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedFilterSheet({
  visible,
  domain,
  value,
  onClose,
  onApply,
}: {
  visible: boolean;
  domain: FeedDomain;
  value: FeedFilterState;
  onClose: () => void;
  onApply: (filters: FeedFilterState) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {visible ? (
          <FilterBody
            domain={domain}
            value={value}
            onClose={onClose}
            onApply={onApply}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 8,
    ...(Platform.OS === "web"
      ? {
          maxWidth: PHONE_MAX_WIDTH,
          alignSelf: "center" as const,
        }
      : {}),
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.faint,
    alignSelf: "center",
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  title: { ...type.title, color: colors.text },
  subtitle: { ...type.caption, color: colors.sub, marginTop: 4 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingBottom: 18 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: { ...type.label, color: colors.text, fontSize: 13 },
  sectionHint: { fontSize: 10, color: colors.faint },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.text },
  chipTextActive: { color: "#fff" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  resetBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  resetText: { fontSize: 13, fontWeight: "700", color: colors.sub },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: "center",
    ...shadow.card,
  },
  applyText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
