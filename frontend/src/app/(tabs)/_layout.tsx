import React from "react";
import { Tabs, router } from "expo-router";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  LucideIcon,
  Shirt,
  Sparkles,
  Plus,
  Globe,
  User,
} from "lucide-react-native";
import { colors } from "../../theme";

function TabIcon({
  Icon,
  label,
  focused,
}: {
  Icon: LucideIcon;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={tabStyles.item}>
      <Icon
        size={22}
        color={focused ? colors.text : colors.faint}
        strokeWidth={focused ? 2.4 : 1.8}
      />
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>
        {label}
      </Text>
      <View style={[tabStyles.pill, focused && tabStyles.pillActive]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800", fontSize: 18 },
        tabBarStyle: tabStyles.bar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "衣櫃",
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Shirt} label="衣櫃" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="outfits"
        options={{
          title: "穿搭",
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Sparkles} label="穿搭" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarButton: (props) => (
            <TouchableOpacity
              {...(props as React.ComponentProps<typeof TouchableOpacity>)}
              style={tabStyles.fabWrap}
              activeOpacity={0.85}
            >
              <View style={tabStyles.fab}>
                <Plus size={24} color="#fff" strokeWidth={2.6} />
              </View>
            </TouchableOpacity>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/upload");
          },
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "動態",
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Globe} label="動態" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "我的",
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={User} label="我的" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === "ios" ? 88 : 68,
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    paddingTop: 8,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  item: { alignItems: "center", justifyContent: "center", width: 64, gap: 2 },
  label: { fontSize: 10, color: colors.faint, fontWeight: "600" },
  labelActive: { color: colors.text },
  pill: {
    width: 18,
    height: 3,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: "transparent",
  },
  pillActive: { backgroundColor: colors.accent },
  fabWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
});
