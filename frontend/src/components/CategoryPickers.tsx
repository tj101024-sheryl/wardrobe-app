import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useCategoryTree } from "../useCategories";
import { efficaciesOf } from "../types";
import { colors, radius, type } from "../theme";

export function CategoryPicker({
  itemType,
  value,
  onChange,
  autoDefault = true,
}: {
  itemType: string;
  value: string;
  onChange: (key: string) => void;
  /** value 為空或不屬於目前分類樹時，自動選第一個小分類 */
  autoDefault?: boolean;
}) {
  const { tree, pathOf } = useCategoryTree(itemType);
  const activeRoot = pathOf(value).root;
  const branch = tree.find((b) => b.root.id === activeRoot?.id);

  // 尚未選分類、或原本的分類不在這個大分類時，預設第一個小分類
  useEffect(() => {
    if (!autoDefault) return;
    const valid =
      !!value &&
      tree.some(
        (b) =>
          b.root.key === value || b.children.some((c) => c.key === value)
      );
    if (!valid && tree.length) {
      const first = tree[0];
      onChange(first.children[0]?.key ?? first.root.key);
    }
  }, [autoDefault, value, tree, onChange]);

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.rootRow}
      >
        {tree.map(({ root, children }) => {
          const active = activeRoot?.id === root.id;
          return (
            <TouchableOpacity
              key={root.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() =>
                onChange(children[0]?.key ?? root.key)
              }
              activeOpacity={0.8}
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {root.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {branch && branch.children.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.subRow}
        >
          <TouchableOpacity
            style={[
              styles.subChip,
              value === branch.root.key && styles.subChipActive,
            ]}
            onPress={() => onChange(branch.root.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.subChipText,
                value === branch.root.key && styles.subChipTextActive,
              ]}
            >
              整個{branch.root.label}
            </Text>
          </TouchableOpacity>
          {branch.children.map((leaf) => {
            const active = value === leaf.key;
            return (
              <TouchableOpacity
                key={leaf.id}
                style={[styles.subChip, active && styles.subChipActive]}
                onPress={() => onChange(leaf.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.subChipText,
                    active && styles.subChipTextActive,
                  ]}
                >
                  {leaf.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

export function EfficacyPicker({
  itemType,
  values,
  onChange,
  label = "功效（可多選）",
}: {
  itemType: string;
  values: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const options = efficaciesOf(itemType);
  if (options.length === 0) return null;

  function toggle(option: string) {
    onChange(
      values.includes(option)
        ? values.filter((v) => v !== option)
        : [...values, option]
    );
  }

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(option)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.label,
    color: colors.sub,
    marginTop: 16,
    marginBottom: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryScroll: { flexGrow: 0, marginBottom: 2 },
  rootRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  chip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  chipActive: { backgroundColor: colors.chipActive },
  chipText: { fontSize: 13, color: colors.sub, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    paddingRight: 8,
    paddingBottom: 2,
  },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  subChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subChipText: { fontSize: 12, color: colors.sub, fontWeight: "600" },
  subChipTextActive: { color: "#fff" },
});
