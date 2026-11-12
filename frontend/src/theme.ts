export const colors = {
  bg: "#faf9f7",
  bgElevated: "#ffffff",
  card: "#ffffff",
  text: "#1a1a1a",
  sub: "#8a8a8f",
  faint: "#b5b5ba",
  border: "#ececea",
  divider: "#f2f1ef",
  primary: "#1a1a1a",
  primarySoft: "#f0efec",
  accent: "#c9a227",
  accentSoft: "#f7f0d8",
  danger: "#d64545",
  chip: "#f3f2ef",
  chipActive: "#1a1a1a",
  overlay: "rgba(0,0,0,0.45)",
};

export const spacing = (n: number) => n * 8;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const shadow = {
  card: {
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  soft: {
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
};

export const type = {
  display: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
};
