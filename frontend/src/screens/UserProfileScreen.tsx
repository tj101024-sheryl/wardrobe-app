import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { http } from "../api";
import {
  FollowResult,
  Outfit,
  UserProfile,
  outfitRecorded,
} from "../types";
import { relativeDate } from "../date";
import { OutfitPreview } from "../components/OutfitCanvas";
import { PHONE_MAX_WIDTH } from "../components/PhoneFrame";
import { colors, radius, shadow, type } from "../theme";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function OutfitCard({
  outfit,
  width,
  onPress,
}: {
  outfit: Outfit;
  width: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={{ width }}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.thumbWrap}>
        {outfitRecorded(outfit) ? (
          <OutfitPreview outfit={outfit} size={width} />
        ) : (
          <View style={[styles.emptyThumb, { width, height: width }]}>
            <Text style={{ fontSize: 32 }}>👗</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {outfit.title || `${relativeDate(outfit.date)}的穿搭`}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {relativeDate(outfit.date)}
        {outfit.like_count > 0 ? ` · ${outfit.like_count} 個讚` : ""}
      </Text>
    </TouchableOpacity>
  );
}

export default function UserProfileScreen({ userId }: { userId: number }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { width } = useWindowDimensions();
  const frame = Math.min(width, PHONE_MAX_WIDTH);
  const cardW = (frame - 32 - 12) / 2;

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await http.get<UserProfile>(`/api/users/${userId}`);
      setProfile(data);
    } catch (e: any) {
      setError(e.message || "載入個人檔案失敗");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function toggleFollow() {
    if (!profile || profile.is_me || busy) return;
    setBusy(true);
    setError("");
    try {
      const value = profile.is_following
        ? await http.del<FollowResult>(`/api/users/${profile.id}/follow`)
        : await http.post<FollowResult>(`/api/users/${profile.id}/follow`);
      setProfile({
        ...profile,
        is_following: value.following,
        follower_count: value.follower_count,
      });
    } catch (e: any) {
      setError(e.message || "追蹤失敗");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error || "找不到這位使用者"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
          <Text style={styles.retryText}>重試</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={colors.sub}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.username.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile.username}</Text>
        <Text style={styles.bio}>
          {profile.bio || "還沒有介紹自己，先看看他的穿搭吧"}
        </Text>

        <View style={styles.statsRow}>
          <Stat value={profile.outfit_count} label="套穿搭" />
          <View style={styles.statDivider} />
          <Stat value={profile.follower_count} label="粉絲" />
          <View style={styles.statDivider} />
          <Stat value={profile.following_count} label="追蹤中" />
        </View>

        {profile.is_me ? (
          <View style={styles.meChip}>
            <Text style={styles.meChipText}>這是你的公開檔案</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.followBtn,
              profile.is_following && styles.followBtnOn,
              busy && { opacity: 0.6 },
            ]}
            onPress={() => void toggleFollow()}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator
                color={profile.is_following ? colors.text : "#fff"}
                size="small"
              />
            ) : (
              <Text
                style={[
                  styles.followText,
                  profile.is_following && styles.followTextOn,
                ]}
              >
                {profile.is_following ? "已追蹤" : "＋ 追蹤"}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>穿搭</Text>
        <Text style={styles.sectionMeta}>{profile.outfits.length} 套</Text>
      </View>

      {profile.outfits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧺</Text>
          <Text style={styles.emptyTitle}>還沒有公開的穿搭</Text>
          <Text style={styles.emptyText}>
            {profile.is_me
              ? "把穿搭分享為公開，就會出現在這裡"
              : "等對方分享公開穿搭後再回來看看"}
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {profile.outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              width={cardW}
              onPress={() => router.push(`/outfit/${outfit.id}`)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  hero: {
    alignItems: "center",
    paddingTop: 26,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    ...shadow.raised,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  name: { ...type.title, color: colors.text },
  bio: {
    ...type.caption,
    color: colors.sub,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingVertical: 13,
    width: "100%",
    ...shadow.soft,
  },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 19, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 10, color: colors.sub, marginTop: 2 },
  statDivider: { width: 1, height: 26, backgroundColor: colors.border },
  followBtn: {
    marginTop: 16,
    minWidth: 150,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 11,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  followBtnOn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  followTextOn: { color: colors.text },
  meChip: {
    marginTop: 16,
    backgroundColor: colors.chip,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  meChipText: { fontSize: 11, fontWeight: "600", color: colors.sub },
  inlineError: { color: colors.danger, fontSize: 11, marginTop: 10 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { ...type.heading, color: colors.text },
  sectionMeta: { ...type.caption, color: colors.faint },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
  },
  thumbWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#f0efec",
  },
  emptyThumb: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0efec",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginTop: 6,
  },
  cardMeta: { fontSize: 10, color: colors.sub, marginTop: 2 },
  empty: {
    alignItems: "center",
    paddingVertical: 42,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { ...type.heading, color: colors.text, marginTop: 10 },
  emptyText: {
    ...type.caption,
    color: colors.sub,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  errorText: { color: colors.danger, fontSize: 13, textAlign: "center" },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
