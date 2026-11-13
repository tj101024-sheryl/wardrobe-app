import React, { useState } from "react";
import { Image, Text, View, StyleSheet } from "react-native";
import { Item, Outfit, categoryIcon, fullUrl } from "../types";
import { radius } from "../theme";

export function ItemThumb({
  item,
  size = 56,
  height,
  rounded = radius.md,
  contain = true,
}: {
  item: Item;
  size?: number;
  height?: number;
  rounded?: number;
  contain?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const uri = item.cutout_path || item.image_path;
  return (
    <View
      style={[
        styles.thumb,
        { width: size, height: height ?? size, borderRadius: rounded },
      ]}
    >
      {uri && !failed ? (
        <Image
          source={{ uri: fullUrl(uri) }}
          style={{ width: "100%", height: "100%" }}
          resizeMode={contain ? "contain" : "cover"}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ fontSize: Math.max(16, size * 0.45) }}>
          {categoryIcon(item.item_type, item.category)}
        </Text>
      )}
    </View>
  );
}

export function OutfitThumb({
  outfit,
  size = 160,
}: {
  outfit: Outfit;
  size?: number;
}) {
  const items = outfit.items.map((row) => row.item);
  if (items.length === 0) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.3 }}>👗</Text>
      </View>
    );
  }
  if (items.length === 1) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <ItemThumb item={items[0]} size={size} rounded={0} />
      </View>
    );
  }
  if (items.length === 2) {
    return (
      <View
        style={[styles.wrap, styles.row, { width: size, height: size }]}
      >
        {items.map((item) => (
          <ItemThumb
            key={item.id}
            item={item}
            size={size / 2 - 1}
            height={size}
            rounded={0}
          />
        ))}
      </View>
    );
  }
  const cell = size / 2;
  return (
    <View style={[styles.wrap, styles.grid, { width: size, height: size }]}>
      {items.slice(0, 4).map((item) => (
        <ItemThumb
          key={item.id}
          item={item}
          size={cell - 2}
          rounded={0}
          contain
        />
      ))}
    </View>
  );
}

export function OutfitMosaic({
  outfit,
  size = 92,
}: {
  outfit: Outfit;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (outfit.photo_url && !failed) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Image
          source={{ uri: fullUrl(outfit.photo_url) }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }
  const items = outfit.items.map((row) => row.item);
  if (items.length === 0) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.3 }}>👗</Text>
      </View>
    );
  }
  if (items.length === 1) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <ItemThumb item={items[0]} size={size} rounded={0} />
      </View>
    );
  }
  if (items.length === 2) {
    return (
      <View style={[styles.wrap, styles.row, { width: size, height: size }]}>
        {items.map((item) => (
          <ItemThumb
            key={item.id}
            item={item}
            size={size / 2 - 1}
            height={size}
            rounded={0}
          />
        ))}
      </View>
    );
  }
  if (items.length === 3) {
    const rightW = size * 0.34;
    const leftW = size - rightW - 2;
    const cellH = (size - 2) / 2;
    return (
      <View style={[styles.wrap, styles.row, { width: size, height: size }]}>
        <ItemThumb item={items[0]} size={leftW} height={size} rounded={0} />
        <View style={{ width: rightW, gap: 2 }}>
          <ItemThumb item={items[1]} size={rightW} height={cellH} rounded={0} />
          <ItemThumb item={items[2]} size={rightW} height={cellH} rounded={0} />
        </View>
      </View>
    );
  }
  const cell = size / 2;
  return (
    <View style={[styles.wrap, styles.grid, { width: size, height: size }]}>
      {items.slice(0, 4).map((item) => (
        <ItemThumb
          key={item.id}
          item={item}
          size={cell - 2}
          rounded={0}
          contain
        />
      ))}
    </View>
  );
}

export function LookThumb({
  outfit,
  size = 160,
}: {
  outfit: Outfit;
  size?: number;
}) {  const [failed, setFailed] = useState(false);
  const photo = outfit.photo_url || outfit.makeup_photo_url;
  if (photo && !failed) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Image
          source={{ uri: fullUrl(photo) }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }
  if (outfit.items.length > 0) {
    return <OutfitThumb outfit={outfit} size={size} />;
  }
  const products = outfit.products.slice(0, 4).map((row) => row.item);
  if (products.length === 0) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.3 }}>💄</Text>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.wrap,
        styles.grid,
        { width: size, height: size, alignItems: "center", justifyContent: "center" },
      ]}
    >
      {products.map((item) => (
        <ItemThumb
          key={item.id}
          item={item}
          size={size / 2 - 2}
          rounded={0}
          contain
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    backgroundColor: "#f0efec",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  wrap: {
    backgroundColor: "#f0efec",
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  row: {
    flexDirection: "row",
    gap: 2,
  },
  empty: {
    backgroundColor: "#f0efec",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
