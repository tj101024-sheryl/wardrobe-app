import React from "react";
import { useLocalSearchParams } from "expo-router";
import ItemDetailScreen from "../../screens/ItemDetailScreen";

export default function ItemDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemDetailScreen itemId={Number(id)} />;
}
