import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  CalendarHeart,
  ChevronRight,
  Images,
  Shirt,
  Sparkles,
} from "lucide-react-native";
import { colors, radius, shadow, type } from "../theme";
import { WEEKDAY_LABELS, weekdayIndex, ymd } from "../date";
import { PHONE_MAX_WIDTH } from "./PhoneFrame";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Row = {
  key: string;
  title: string;
  subtitle: string;
  Icon: typeof Shirt;
  dark?: boolean;
  href: { pathname: "/outfit/edit" | "/upload"; params?: Record<string, string> };
};

export default function AddSheet({ visible, onClose }: Props) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim]);

  function close() {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  }

  function choose(href: Row["href"]) {
    onClose();
    router.push(href as any);
  }

  const now = new Date();
  const today = ymd(now);
  const todayLabel = `${now.getMonth() + 1}/${now.getDate()}（${
    WEEKDAY_LABELS[weekdayIndex(now)]
  }）`;

  const rows: Row[] = [
    {
      key: "today",
      title: "記錄今天",
      subtitle: `${todayLabel} · 穿搭、妝容、保養`,
      Icon: CalendarHeart,
      dark: true,
      href: { pathname: "/outfit/edit", params: { date: today } },
    },
    {
      key: "clothes",
      title: "新增衣服 / 配件",
      subtitle: "拍照、相簿匯入或貼商品連結",
      Icon: Shirt,
      href: { pathname: "/upload", params: { type: "clothes" } },
    },
    {
      key: "beauty",
      title: "新增化妝品 / 保養品",
      subtitle: "只記品牌與品名也可以",
      Icon: Sparkles,
      href: { pathname: "/upload", params: { type: "makeup" } },
    },
    {
      key: "post",
      title: "發佈動態",
      subtitle: "圖文、影片、教學",
      Icon: Images,
      href: { pathname: "/outfit/edit", params: { date: today } },
    },
  ];

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [360, 0],
  });
  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetWrap,
            { transform: [{ translateY }] },
            Platform.OS === "web" && styles.sheetWrapWeb,
          ]}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>想新增什麼？</Text>

            {rows.map((row) => (
              <TouchableOpacity
                key={row.key}
                style={[styles.row, row.dark && styles.rowDark]}
                activeOpacity={0.85}
                onPress={() => choose(row.href)}
                accessibilityRole="button"
                accessibilityLabel={`${row.title}，${row.subtitle}`}
              >
                <View style={[styles.iconWrap, row.dark && styles.iconWrapDark]}>
                  <row.Icon
                    size={19}
                    color={row.dark ? "#fff" : colors.text}
                    strokeWidth={2}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text
                    style={[styles.rowTitle, row.dark && styles.rowTitleDark]}
                  >
                    {row.title}
                  </Text>
                  <Text
                    style={[styles.rowSub, row.dark && styles.rowSubDark]}
                    numberOfLines={1}
                  >
                    {row.subtitle}
                  </Text>
                </View>
                <ChevronRight
                  size={18}
                  color={row.dark ? "rgba(255,255,255,0.62)" : colors.faint}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetWrap: { width: "100%" },
  sheetWrapWeb: { maxWidth: PHONE_MAX_WIDTH, alignSelf: "center" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    ...shadow.raised,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e3e1dc",
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    ...type.heading,
    fontSize: 17,
    marginBottom: 12,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.lg,
    marginBottom: 6,
  },
  rowDark: { backgroundColor: colors.primary },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f4f3ef",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDark: { backgroundColor: "rgba(255,255,255,0.14)" },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
  },
  rowTitleDark: { color: "#fff" },
  rowSub: {
    fontSize: 11.5,
    fontWeight: "500",
    color: colors.sub,
  },
  rowSubDark: { color: "rgba(255,255,255,0.58)" },
});
