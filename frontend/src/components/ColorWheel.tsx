import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
} from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { hslToHex } from "../color";
import { colors, radius } from "../theme";

const SIZE = 228;
const CENTER = SIZE / 2;
const INNER = 82;
const OUTER = 104;
const THUMB_R = 93;

const LIGHTNESS = [
  { value: 0.72, label: "淺" },
  { value: 0.55, label: "中" },
  { value: 0.38, label: "深" },
];

export default function ColorWheel({
  onApply,
}: {
  onApply: (hex: string) => void;
}) {
  const [hue, setHue] = useState(28);
  const [lightness, setLightness] = useState(0.55);
  const selected = hslToHex(hue, 0.7, lightness);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          updateHue(event.nativeEvent.locationX, event.nativeEvent.locationY);
        },
        onPanResponderMove: (event) => {
          updateHue(event.nativeEvent.locationX, event.nativeEvent.locationY);
        },
      }),
    []
  );

  function updateHue(x: number, y: number) {
    const dx = x - CENTER;
    const dy = y - CENTER;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    setHue((angle + 360) % 360);
  }

  const segments = Array.from({ length: 72 }, (_, i) => {
    const angle = ((i * 5 - 90) * Math.PI) / 180;
    return {
      key: i,
      x1: CENTER + Math.cos(angle) * INNER,
      y1: CENTER + Math.sin(angle) * INNER,
      x2: CENTER + Math.cos(angle) * OUTER,
      y2: CENTER + Math.sin(angle) * OUTER,
      color: hslToHex(i * 5, 0.72, lightness),
    };
  });

  const thumbAngle = ((hue - 90) * Math.PI) / 180;
  const thumbX = CENTER + Math.cos(thumbAngle) * THUMB_R;
  const thumbY = CENTER + Math.sin(thumbAngle) * THUMB_R;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>自訂顏色</Text>
      <Text style={styles.hint}>轉動圓盤選色，再用深淺調整</Text>

      <View style={styles.wheelWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={(INNER + OUTER) / 2}
            stroke="#f3f2ef"
            strokeWidth={OUTER - INNER}
            fill="none"
          />
          {segments.map((s) => (
            <Line
              key={s.key}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={s.color}
              strokeWidth={24}
            />
          ))}
          <Circle
            cx={thumbX}
            cy={thumbY}
            r={9}
            fill={selected}
            stroke="#fff"
            strokeWidth={3}
          />
        </Svg>
        <View style={styles.gestureLayer} {...responder.panHandlers} />
      </View>

      <View style={styles.lightnessRow}>
        {LIGHTNESS.map((item) => {
          const active = item.value === lightness;
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.lightChip, active && styles.lightChipActive]}
              onPress={() => setLightness(item.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.lightText, active && styles.lightTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.previewRow}>
        <View style={[styles.preview, { backgroundColor: selected }]} />
        <View>
          <Text style={styles.previewLabel}>自訂色</Text>
          <Text style={styles.previewHex}>{selected}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.applyBtn}
        onPress={() => onApply(selected)}
        activeOpacity={0.85}
      >
        <Text style={styles.applyText}>套用這個顏色</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  title: { fontSize: 16, fontWeight: "800", color: colors.text },
  hint: { fontSize: 11, color: colors.sub, marginTop: 4 },
  wheelWrap: {
    width: SIZE,
    height: SIZE,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  gestureLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
  },
  lightnessRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  lightChip: {
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  lightChipActive: { backgroundColor: colors.primary },
  lightText: { fontSize: 11, color: colors.sub, fontWeight: "600" },
  lightTextActive: { color: "#fff" },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  preview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  previewLabel: { fontSize: 10, color: colors.sub },
  previewHex: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 2 },
  applyBtn: {
    marginTop: 16,
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 13,
    alignItems: "center",
  },
  applyText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
