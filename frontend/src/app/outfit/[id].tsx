import React from "react";
import { useLocalSearchParams } from "expo-router";
import OutfitDetailScreen from "../../screens/OutfitDetailScreen";

export default function OutfitDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OutfitDetailScreen outfitId={Number(id)} />;
}
