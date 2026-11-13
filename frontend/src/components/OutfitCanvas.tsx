import React, { useMemo } from "react";
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CanvasTransform,
  Item,
  Outfit,
  categoryIcon,
  fullUrl,
  outfitRoleOf,
} from "../types";
import { LookThumb } from "./ItemThumb";
import { colors, radius } from "../theme";

const BASE_RATIO = 0.42;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const ROLE_SPOTS: Record<
  string,
  { x: number; y: number; scale: number; rotation: number }
> = {
  top: { x: 0.36, y: 0.3, scale: 1, rotation: -4 },
  bottom: { x: 0.36, y: 0.64, scale: 1, rotation: 3 },
  dress: { x: 0.5, y: 0.47, scale: 1.12, rotation: 0 },
  outer: { x: 0.68, y: 0.4, scale: 0.94, rotation: 5 },
  shoes: { x: 0.3, y: 0.82, scale: 0.78, rotation: -6 },
  bag: { x: 0.74, y: 0.73, scale: 0.72, rotation: 5 },
  accessory: { x: 0.74, y: 0.23, scale: 0.58, rotation: 8 },
  other: { x: 0.5, y: 0.5, scale: 0.82, rotation: 0 },
};

export function defaultTransform(
  item: Item,
  index: number,
  total: number
): CanvasTransform {
  const spot = ROLE_SPOTS[outfitRoleOf(item)] ?? ROLE_SPOTS.other;
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: clamp(spot.x + (col - 1) * 0.07, 0.08, 0.92),
    y: clamp(spot.y + row * 0.05, 0.08, 0.92),
    scale: Math.max(
      0.45,
      (spot.scale - row * 0.05) * (total > 6 ? 0.88 : 1)
    ),
    rotation: spot.rotation + (col - 1) * 3,
    z_index: index,
  };
}

export function transformsFromOutfit(
  outfit: Outfit
): Record<number, CanvasTransform> {
  const result: Record<number, CanvasTransform> = {};
  const ordered = [...outfit.items].sort(
    (a, b) => a.z_index - b.z_index || a.id - b.id
  );
  ordered.forEach((row, index) => {
    const placed = row.x !== 0 || row.y !== 0;
    result[row.item_id] = placed
      ? {
          x: row.x,
          y: row.y,
          scale: row.scale || 1,
          rotation: row.rotation || 0,
          z_index: row.z_index,
        }
      : defaultTransform(row.item, index, ordered.length);
  });
  return result;
}

function CanvasItem({
  item,
  tf,
  size,
  editable,
  selected,
  onSelect,
  onTransform,
}: {
  item: Item;
  tf: CanvasTransform;
  size: number;
  editable: boolean;
  selected: boolean;
  onSelect?: (itemId: number | null) => void;
  onTransform?: (itemId: number, patch: Partial<CanvasTransform>) => void;
}) {
  const responder = useMemo(() => {
    const dragStart = { x: tf.x, y: tf.y };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => editable,
      onMoveShouldSetPanResponder: () => editable,
      onPanResponderGrant: () => {
        dragStart.x = tf.x;
        dragStart.y = tf.y;
        onSelect?.(item.id);
      },
      onPanResponderMove: (_, gesture) => {
        if (!editable) return;
        onTransform?.(item.id, {
          x: clamp(dragStart.x + gesture.dx / size, 0.06, 0.94),
          y: clamp(dragStart.y + gesture.dy / size, 0.06, 0.94),
        });
      },
    });
  }, [editable, item.id, onSelect, onTransform, size, tf.x, tf.y]);

  const uri = item.cutout_path || item.image_path;
  const box = Math.max(28, size * BASE_RATIO * tf.scale);

  return (
    <View
      {...responder.panHandlers}
      style={[
        styles.item,
        {
          left: tf.x * size - box / 2,
          top: tf.y * size - box / 2,
          width: box,
          height: box,
          zIndex: Math.round(tf.z_index),
          transform: [{ rotate: `${tf.rotation}deg` }],
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri: fullUrl(uri) }}
          style={styles.image}
          resizeMode="contain"
        />
      ) : (
        <Text style={{ fontSize: Math.max(16, box * 0.4) }}>
          {categoryIcon(item.item_type, item.category)}
        </Text>
      )}
      {editable && selected ? (
        <View style={styles.selection} pointerEvents="none" />
      ) : null}
    </View>
  );
}

export function OutfitCanvas({
  items,
  transforms,
  size,
  editable = false,
  selectedId = null,
  onSelect,
  onTransform,
}: {
  items: Item[];
  transforms: Record<number, CanvasTransform>;
  size: number;
  editable?: boolean;
  selectedId?: number | null;
  onSelect?: (itemId: number | null) => void;
  onTransform?: (itemId: number, patch: Partial<CanvasTransform>) => void;
}) {
  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          (transforms[a.id]?.z_index ?? 0) -
            (transforms[b.id]?.z_index ?? 0) || a.id - b.id
      ),
    [items, transforms]
  );

  return (
    <View style={[styles.canvas, { width: size, height: size }]}>
      {editable ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => onSelect?.(null)}
        />
      ) : null}
      {ordered.map((item, index) => {
        const tf =
          transforms[item.id] ?? defaultTransform(item, index, ordered.length);
        return (
          <CanvasItem
            key={item.id}
            item={item}
            tf={tf}
            size={size}
            editable={editable}
            selected={selectedId === item.id}
            onSelect={onSelect}
            onTransform={onTransform}
          />
        );
      })}
      {items.length === 0 ? (
        <View style={styles.empty} pointerEvents="none">
          <Text style={styles.emptyIcon}>🎨</Text>
          <Text style={styles.emptyText}>挑幾件單品，開始拼貼</Text>
        </View>
      ) : null}
    </View>
  );
}

export function OutfitPreview({
  outfit,
  size,
  rounded = radius.md,
}: {
  outfit: Outfit;
  size: number;
  rounded?: number;
}) {
  if (
    !outfit.photo_url &&
    outfit.layout_mode === "canvas" &&
    outfit.items.length > 0
  ) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: rounded,
          overflow: "hidden",
        }}
      >
        <OutfitCanvas
          items={outfit.items.map((row) => row.item)}
          transforms={transformsFromOutfit(outfit)}
          size={size}
        />
      </View>
    );
  }
  return <LookThumb outfit={outfit} size={size} />;
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: "#f4f1ea",
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  item: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  selection: {
    position: "absolute",
    left: -4,
    right: -4,
    top: -4,
    bottom: -4,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderStyle: "dashed",
    borderRadius: radius.sm,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyIcon: { fontSize: 34 },
  emptyText: { fontSize: 11, color: colors.faint },
});
