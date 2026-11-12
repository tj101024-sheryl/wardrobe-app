import React, { useState } from "react";
import { Redirect } from "expo-router";
import LoginScreen, { RegisterScreen } from "../screens/AuthScreens";
import { useAuth } from "../auth";

export default function LoginRoute() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  if (!loading && user) return <Redirect href="/(tabs)" />;

  return mode === "login" ? (
    <LoginScreen onSwitch={() => setMode("register")} />
  ) : (
    <RegisterScreen onSwitch={() => setMode("login")} />
  );
}
