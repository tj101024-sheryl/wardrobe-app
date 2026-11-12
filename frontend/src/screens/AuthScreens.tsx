import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../auth";
import { colors, radius, shadow, type } from "../theme";

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={authStyles.field}>
      <Text style={authStyles.label}>{label}</Text>
      <TextInput
        style={authStyles.input}
        placeholderTextColor={colors.faint}
        {...props}
      />
    </View>
  );
}

export default function LoginScreen({ onSwitch }: { onSwitch: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message || "登入失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={authStyles.container}>
        <View style={authStyles.brand}>
          <View style={authStyles.logo}>
            <Text style={authStyles.logoEmoji}>👚</Text>
          </View>
          <Text style={authStyles.brandName}>衣櫃 Wardrobe</Text>
          <Text style={authStyles.subtitle}>記錄穿搭，管理你的衣服</Text>
        </View>

        <View style={authStyles.card}>
          <Text style={authStyles.cardTitle}>歡迎回來</Text>

          <Field
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />
          <Field
            label="密碼"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="至少 6 個字"
          />

          {error ? <Text style={authStyles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[authStyles.button, busy && { opacity: 0.6 }]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.buttonText}>登入</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onSwitch} style={{ marginTop: 18 }}>
            <Text style={authStyles.switch}>
              還沒有帳號？<Text style={{ color: colors.text, fontWeight: "700" }}>註冊</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function RegisterScreen({ onSwitch }: { onSwitch: () => void }) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      await register(email.trim(), username.trim(), password);
    } catch (e: any) {
      setError(e.message || "註冊失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={authStyles.container}>
        <View style={authStyles.brand}>
          <View style={authStyles.logo}>
            <Text style={authStyles.logoEmoji}>✨</Text>
          </View>
          <Text style={authStyles.brandName}>建立帳號</Text>
          <Text style={authStyles.subtitle}>每個人都可以是精緻男女</Text>
        </View>

        <View style={authStyles.card}>
          <Field
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />
          <Field
            label="使用者名稱"
            value={username}
            onChangeText={setUsername}
            placeholder="顯示名稱"
          />
          <Field
            label="密碼"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="至少 6 個字"
          />

          {error ? <Text style={authStyles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[authStyles.button, busy && { opacity: 0.6 }]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.buttonText}>註冊</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onSwitch} style={{ marginTop: 18 }}>
            <Text style={authStyles.switch}>
              已有帳號？<Text style={{ color: colors.text, fontWeight: "700" }}>登入</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const authStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  brand: { alignItems: "center", marginBottom: 32 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    ...shadow.raised,
  },
  logoEmoji: { fontSize: 34 },
  brandName: { ...type.title, color: colors.text },
  subtitle: { ...type.caption, color: colors.sub, marginTop: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 26,
    ...shadow.card,
  },
  cardTitle: { ...type.heading, color: colors.text, marginBottom: 6 },
  field: { marginTop: 14 },
  label: { ...type.label, color: colors.sub, marginBottom: 7 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
    ...shadow.card,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  error: { color: colors.danger, marginTop: 14, fontSize: 13 },
  switch: { textAlign: "center", color: colors.sub, fontSize: 14 },
});
