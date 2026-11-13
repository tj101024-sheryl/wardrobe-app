import React from "react";
import { useLocalSearchParams } from "expo-router";
import UserProfileScreen from "../../screens/UserProfileScreen";

export default function UserProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <UserProfileScreen userId={Number(id)} />;
}
