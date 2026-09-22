import { researches } from "./data";
import type { Research } from "./types";

export type DiscoveryCategoryId =
  | "survival"
  | "food"
  | "extraction"
  | "craft"
  | "construction"
  | "metallurgy"
  | "knowledge"
  | "trade"
  | "society"
  | "special";

export interface DiscoveryCategory {
  id: DiscoveryCategoryId;
  name: string;
  icon: string;
  description: string;
  researchIds: string[];
}

export const discoveryCategories: DiscoveryCategory[] = [
  {
    id: "survival",
    name: "Przetrwanie",
    icon: "tent",
    description: "Schronienie, polowanie, woda, medycyna i wyposażenie potrzebne do przetrwania.",
    researchIds: ["shelters", "hunting", "waterworks", "packing", "herbalism"],
  },
  {
    id: "food",
    name: "Żywność",
    icon: "farm",
    description: "Rolnictwo, przetwarzanie plonów oraz rozwój wydajnej gospodarki żywnościowej.",
    researchIds: ["agriculture", "milling", "farmer"],
  },
  {
    id: "extraction",
    name: "Pozyskiwanie",
    icon: "logger",
    description: "Drewno, kamień, złoża i coraz bardziej zaawansowane wydobycie surowców.",
    researchIds: ["logging", "quarrying", "forestry", "mining", "tin", "miner"],
  },
  {
    id: "craft",
    name: "Rzemiosło",
    icon: "tools",
    description: "Narzędzia, obróbka drewna, tkactwo, garncarstwo i rzemiosło specjalistyczne.",
    researchIds: ["stonecraft", "sawing", "weaving", "pottery", "carpentry", "carpenter"],
  },
  {
    id: "construction",
    name: "Budownictwo",
    icon: "house",
    description: "Od prostych domów i magazynów do trwałej, miejskiej architektury.",
    researchIds: ["loghomes", "storage", "masonry", "housing", "architecture"],
  },
  {
    id: "metallurgy",
    name: "Metalurgia",
    icon: "ingot",
    description: "Paliwa hutnicze oraz przejście od miedzi i brązu do żelaza.",
    researchIds: ["charcoal", "copperwork", "bronzework", "ironwork"],
  },
  {
    id: "knowledge",
    name: "Wiedza",
    icon: "book",
    description: "Piśmiennictwo, kartografia i organizacja coraz większej społeczności.",
    researchIds: ["learning", "cartography", "organization"],
  },
  {
    id: "trade",
    name: "Handel i wyprawy",
    icon: "bronze",
    description: "Zwiad, wymiana, reputacja kupiecka i otwieranie świata poza osadą.",
    researchIds: ["scouting", "trade", "merchant"],
  },
  {
    id: "society",
    name: "Społeczeństwo",
    icon: "person",
    description: "Miejsce na przyszłe technologie administracji, prawa, edukacji i bezpieczeństwa.",
    researchIds: [],
  },
  {
    id: "special",
    name: "Specjaliści i znaleziska",
    icon: "relics",
    description: "Ludzie i odkrycia zdobywane w wydarzeniach oraz podczas wypraw.",
    researchIds: researches.filter((r) => r.kind !== "research").map((r) => r.id),
  },
];

const explicitCategory = new Map<string, DiscoveryCategoryId>();
for (const category of discoveryCategories) {
  if (category.id === "special") continue;
  for (const id of category.researchIds) explicitCategory.set(id, category.id);
}

export function discoveryCategory(id: string): DiscoveryCategoryId {
  const research = researches.find((item) => item.id === id);
  if (research?.kind !== "research") return "special";
  return explicitCategory.get(id) ?? "society";
}

export function discoveriesInCategory(id: DiscoveryCategoryId): Research[] {
  return researches.filter((research) => discoveryCategory(research.id) === id);
}

export function discoveryDepth(id: string, seen = new Set<string>()): number {
  if (seen.has(id)) return 0;
  const research = researches.find((item) => item.id === id);
  if (!research?.requires.length) return 0;
  const next = new Set(seen);
  next.add(id);
  return 1 + Math.max(...research.requires.map((parent) => discoveryDepth(parent, next)));
}

export function validateDiscoveryAtlas() {
  const missing = researches.filter(
    (research) => !discoveryCategories.some((category) =>
      category.id === "special"
        ? research.kind !== "research"
        : category.researchIds.includes(research.id),
    ),
  );
  return missing.map((research) => research.id);
}
