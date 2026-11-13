import { useCallback, useEffect, useMemo, useState } from "react";
import { http } from "./api";
import { CATEGORY_LABEL, ServerCategory } from "./types";

export function useCategories(itemType: string) {
  const [cats, setCats] = useState<ServerCategory[]>([]);

  const reload = useCallback(() => {
    return http
      .get<ServerCategory[]>(
        `/api/categories?item_type=${encodeURIComponent(itemType)}`
      )
      .then((rows) => setCats(rows))
      .catch(() => {
        // 後端暫時不可用時維持現有清單
      });
  }, [itemType]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { cats, setCats, reload };
}

export type CategoryBranch = {
  root: ServerCategory;
  children: ServerCategory[];
};

/** 三層分類樹：大分類＝item_type，roots＝第二層，children＝第三層。 */
export function useCategoryTree(itemType: string) {
  const { cats, setCats, reload } = useCategories(itemType);

  const tree = useMemo<CategoryBranch[]>(() => {
    const childrenOf = (id: number) =>
      cats
        .filter((c) => c.parent_id === id)
        .sort((a, b) => a.position - b.position || a.id - b.id);
    return cats
      .filter((c) => c.parent_id == null)
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map((root) => ({ root, children: childrenOf(root.id) }));
  }, [cats]);

  const labelOf = useCallback(
    (key: string) => cats.find((c) => c.key === key)?.label ?? CATEGORY_LABEL[key] ?? key,
    [cats]
  );

  /** 回傳 key 所屬的第二層 / 第三層節點。 */
  const pathOf = useCallback(
    (key: string) => {
      const node = cats.find((c) => c.key === key);
      if (!node) return { root: null, leaf: null };
      if (node.parent_id == null) return { root: node, leaf: null };
      return {
        root: cats.find((c) => c.id === node.parent_id) ?? null,
        leaf: node,
      };
    },
    [cats]
  );

  const fullLabelOf = useCallback(
    (key: string) => {
      const { root, leaf } = pathOf(key);
      if (!root) return labelOf(key);
      return leaf ? `${root.label} · ${leaf.label}` : root.label;
    },
    [labelOf, pathOf]
  );

  /** 某個第二層分類底下可篩選的物品分類 key（含自己）。 */
  const keysOfBranch = useCallback(
    (rootId: number) => {
      const branch = tree.find((b) => b.root.id === rootId);
      if (!branch) return [] as string[];
      return [branch.root.key, ...branch.children.map((c) => c.key)];
    },
    [tree]
  );

  return {
    cats,
    setCats,
    tree,
    labelOf,
    fullLabelOf,
    pathOf,
    keysOfBranch,
    reload,
  };
}
