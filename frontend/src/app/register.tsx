import React from "react";
import { Redirect } from "expo-router";
import { RegisterScreen } from "../screens/AuthScreens";
import { useAuth } from "../auth";

export default function RegisterRoute() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Redirect href="/(tabs)" />;
  return <RegisterScreen onSwitch={() => (window.location.href = "/login")} />;
}
