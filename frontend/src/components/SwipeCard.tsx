import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CATEGORY_LABEL,
  Item,
  categoryIcon,
  fullUrl,
  itemColorHex,
  usageLabel,
} from "../types";
import { colorLabel } from "../color";
import { colors, radius, shadow } from "../theme";

export function DeckCardFace({
  item,
  width,
  height,
}: {
  item: Item;
  width: number;
  height: number;
}) {
  const uri = item.cutout_path || item.image_path;
  return (
    <View style={[styles.face, { width, height }]}>
      <View style={[styles.imageArea, { height: height - 116 }]}>
        {uri ? (
          <Image
            source={{ uri: fullUrl(uri) }}
            style={{ width: "100%", height: "100%" }}
            resizeMode={item.cutout_path ? "contain" : "cover"}
          />
        ) : (
          <Text style={{ fontSize: 76 }}>
            {categoryIcon(item.item_type, item.category)}
          </Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name || "未命名"}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {CATEGORY_LABEL[item.category] || item.category}
          {item.wear_count > 0
            ? ` · ${usageLabel(item.item_type)} ${item.wear_count} 次`
            : ""}
        </Text>
        <View style={styles.colorRow}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: itemColorHex(item) },
            ]}
          />
          <Text style={styles.colorText} numberOfLines={1}>
            {item.color || colorLabel(item.color_family)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function SwipeCard({
  item,
  width,
  height,
  onSwipe,
  onDetail,
}: {
  item: Item;
  width: number;
  height: number;
  onSwipe: (direction: "left" | "right") => void;
  onDetail: () => void;
}) {
  const imageHeight = height - 116;

  return (
    <View style={[styles.card, { width, height }]}>
      <DeckCardFace item={item} width={width} height={height} />

      {/* 點照片左半邊＝今天不想 */}
      <TouchableOpacity
        style={[styles.tapZone, { left: 0, width: width / 2, height: imageHeight }]}
        onPress={() => onSwipe("left")}
        activeOpacity={0.9}
        accessibilityLabel="今天不想"
      >
        <View style={[styles.tapLabel, styles.leftLabel]}>
          <Text style={styles.leftLabelText}>← 今天不想</Text>
        </View>
      </TouchableOpacity>

      {/* 點照片右半邊＝收藏 */}
      <TouchableOpacity
        style={[
          styles.tapZone,
          { right: 0, width: width / 2, height: imageHeight },
        ]}
        onPress={() => onSwipe("right")}
        activeOpacity={0.9}
        accessibilityLabel="收藏"
      >
        <View style={[styles.tapLabel, styles.rightLabel]}>
          <Text style={styles.rightLabelText}>收藏 →</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.detailChipWrap} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.detailChip}
          onPress={onDetail}
          activeOpacity={0.85}
        >
          <Text style={styles.detailText}>查看詳情</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    backgroundColor: colors.card,
    borderRadius: 24,
    overflow: "hidden",
  },
  imageArea: {
    width: "100%",
    backgroundColor: "#f0efec",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, padding: 16, justifyContent: "center" },
  name: { fontSize: 19, fontWeight: "800", color: colors.text },
  meta: { fontSize: 12, color: colors.sub, marginTop: 5 },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  colorDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
  },
  colorText: { fontSize: 10, color: colors.sub, fontWeight: "600" },
  card: {
    borderRadius: 24,
    backgroundColor: colors.card,
    ...shadow.raised,
  },
  tapZone: {
    position: "absolute",
    top: 0,
  },
  tapLabel: {
    position: "absolute",
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  leftLabel: { left: 12 },
  rightLabel: { right: 12 },
  leftLabelText: { fontSize: 11, color: colors.danger, fontWeight: "800" },
  rightLabelText: { fontSize: 11, color: "#8a6d12", fontWeight: "800" },
  detailChipWrap: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  detailChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  detailText: { fontSize: 10, color: colors.sub, fontWeight: "700" },
});
