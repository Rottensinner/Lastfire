import {
  advance as baseAdvance,
  capacity,
  freshGame as baseFreshGame,
  housing,
  log,
  MAX_OFFLINE,
  parseSave as baseParseSave,
  pay,
} from "./engine";
import { buildings, researchName, resourceName, resources } from "./data";
import type { Cost, GameState, Resource } from "./types";

export { log, MAX_OFFLINE };

export type SettlementTierId =
  | "camp"
  | "small-settlement"
  | "settlement"
  | "village"
  | "large-village"
  | "small-town"
  | "town"
  | "large-town"
  | "city"
  | "large-city"
  | "metropolis";

export interface SettlementRequirements {
  population: number;
  housing?: number;
  buildings?: Record<string, number>;
  researches?: string[];
}

export interface SettlementTier {
  id: SettlementTierId;
  name: string;
  shortDescription: string;
  requirements: SettlementRequirements;
  cost: Cost;
  satelliteLimit: number;
  available: boolean;
}

export const settlementTiers: SettlementTier[] = [
  {
    id: "camp",
    name: "Ognisko",
    shortDescription: "Kilka osób, ogień i ręczne zdobywanie wszystkiego, co potrzebne do przeżycia.",
    requirements: { population: 1 },
    cost: {},
    satelliteLimit: 0,
    available: true,
  },
  {
    id: "small-settlement",
    name: "Mała osada",
    shortDescription: "Pierwsze trwałe schronienia i zalążek zorganizowanej pracy.",
    requirements: {
      population: 8,
      housing: 9,
      buildings: { fire: 2, shelter: 1 },
      researches: ["stonecraft", "shelters"],
    },
    cost: { wood: 30, stone: 15 },
    satelliteLimit: 0,
    available: true,
  },
  {
    id: "settlement",
    name: "Osada",
    shortDescription: "Stała społeczność z warsztatem, magazynem i wyspecjalizowanymi pracownikami.",
    requirements: {
      population: 12,
      housing: 15,
      buildings: { workshop: 1, warehouse: 1, logger: 1 },
      researches: ["logging", "storage"],
    },
    cost: { wood: 60, stone: 40, stoneTools: 2 },
    satelliteLimit: 0,
    available: true,
  },
  {
    id: "village",
    name: "Wieś",
    shortDescription: "Samowystarczalna społeczność oparta o rolnictwo, wodę i trwałe domy.",
    requirements: {
      population: 20,
      housing: 24,
      buildings: { house: 2, well: 1, farm: 1 },
      researches: ["agriculture", "waterworks", "loghomes"],
    },
    cost: { wood: 100, stone: 70, food: 80, water: 50 },
    satelliteLimit: 0,
    available: true,
  },
  {
    id: "large-village",
    name: "Duża wieś",
    shortDescription: "Lokalne centrum rzemiosła z tartakiem, kamieniarstwem i większym zapleczem.",
    requirements: {
      population: 35,
      housing: 42,
      buildings: { warehouse: 2, sawmill: 1, quarry: 1, house: 4 },
      researches: ["sawing", "masonry", "trade"],
    },
    cost: { planks: 60, stone: 100, food: 120, gold: 25 },
    satelliteLimit: 0,
    available: true,
  },
  {
    id: "small-town",
    name: "Małe miasteczko",
    shortDescription: "Centrum okolicy. Od tego poziomu możesz zakładać i rozwijać zależne wsie.",
    requirements: {
      population: 60,
      housing: 70,
      buildings: { warehouse: 3, boardhouse: 2, library: 1, camp: 1 },
      researches: ["housing", "learning", "organization", "cartography"],
    },
    cost: { planks: 140, bricks: 80, food: 180, gold: 80, knowledge: 40 },
    satelliteLimit: 1,
    available: true,
  },
  {
    id: "town",
    name: "Miasteczko",
    shortDescription: "Regionalny ośrodek handlu, administracji i produkcji.",
    requirements: {
      population: 120,
      housing: 140,
      buildings: { warehouse: 4, boardhouse: 5, smith: 1, library: 2, camp: 2 },
      researches: ["bronzework", "organization"],
    },
    cost: { planks: 220, bricks: 160, bronze: 60, gold: 180, knowledge: 80 },
    satelliteLimit: 2,
    available: true,
  },
  {
    id: "large-town",
    name: "Duże miasteczko",
    shortDescription: "Silny ośrodek kontrolujący kilka wyspecjalizowanych wsi i stałe szlaki.",
    requirements: {
      population: 250,
      housing: 280,
      buildings: { warehouse: 6, stonehouse: 5, smith: 3, camp: 3, library: 4 },
      researches: ["ironwork", "architecture", "cartography"],
    },
    cost: { bricks: 300, hardplanks: 160, iron: 120, gold: 400, knowledge: 160 },
    satelliteLimit: 4,
    available: true,
  },
  {
    id: "city",
    name: "Miasto",
    shortDescription: "Pełnoprawne centrum regionu. Ten etap będzie oparty o dzielnice i administrację miejską.",
    requirements: { population: 500 },
    cost: {},
    satelliteLimit: 7,
    available: false,
  },
  {
    id: "large-city",
    name: "Duże miasto",
    shortDescription: "Węzeł kilku subregionów, rozwijany przez dzielnice i sieć podporządkowanych ośrodków.",
    requirements: { population: 1500 },
    cost: {},
    satelliteLimit: 10,
    available: false,
  },
  {
    id: "metropolis",
    name: "Metropolia",
    shortDescription: "Dominujące centrum gospodarcze i polityczne całego regionu.",
    requirements: { population: 4000 },
    cost: {},
    satelliteLimit: 16,
    available: false,
  },
];

export type SatelliteSpecializationId =
  | "farming"
  | "forestry"
  | "mining"
  | "trade";

export interface SatelliteSpecialization {
  id: SatelliteSpecializationId;
  name: string;
  icon: string;
  description: string;
  foundingCost: Cost;
  production: Cost;
}

export const satelliteSpecializations: SatelliteSpecialization[] = [
  {
    id: "farming",
    name: "Wieś rolnicza",
    icon: "farm",
    description: "Dostarcza żywność i zboże do głównej osady.",
    foundingCost: { wood: 120, stone: 50, food: 80, water: 60, gold: 35 },
    production: { food: 0.08, grain: 0.03 },
  },
  {
    id: "forestry",
    name: "Wieś drwali",
    icon: "logger",
    description: "Eksportuje drewno i część przetworzonych desek.",
    foundingCost: { wood: 90, stone: 60, food: 70, stoneTools: 4, gold: 35 },
    production: { wood: 0.08, planks: 0.02 },
  },
  {
    id: "mining",
    name: "Wieś górnicza",
    icon: "mine",
    description: "Dostarcza kamień i rudę miedzi. Wymaga większej inwestycji początkowej.",
    foundingCost: { planks: 80, stone: 100, food: 80, rope: 10, gold: 50 },
    production: { stone: 0.06, copperore: 0.018 },
  },
  {
    id: "trade",
    name: "Osada handlowa",
    icon: "bronze",
    description: "Obsługuje lokalny handel i przekazuje część zysków w złocie.",
    foundingCost: { planks: 100, food: 80, cloth: 15, gold: 80 },
    production: { gold: 0.012 },
  },
];

export interface SatelliteSettlement {
  id: string;
  name: string;
  specialization: SatelliteSpecializationId;
  level: number;
  population: number;
  loyalty: number;
  security: number;
  foundedAt: number;
}

export interface ProgressionState {
  progressionVersion: 1;
  settlementTier: SettlementTierId;
  satellites: SatelliteSettlement[];
  regionalStock: Cost;
  nextSatelliteId: number;
}

export type ProgressionGameState = GameState & ProgressionState;

const satelliteNames = [
  "Brzezina",
  "Kamienny Bród",
  "Stare Łąki",
  "Dębowy Trakt",
  "Żelazna Dolina",
  "Biały Potok",
  "Wrzosowo",
  "Wilczy Jar",
  "Cichy Brzeg",
  "Nowa Straż",
];

const tierIndex = (id: SettlementTierId) =>
  settlementTiers.findIndex((tier) => tier.id === id);

export const currentSettlementTier = (s: ProgressionGameState) =>
  settlementTiers.find((tier) => tier.id === s.settlementTier) ?? settlementTiers[0];

export const nextSettlementTier = (s: ProgressionGameState) => {
  const index = tierIndex(currentSettlementTier(s).id);
  return settlementTiers[index + 1] ?? null;
};

export function meetsTierRequirements(
  s: GameState,
  tier: SettlementTier,
): boolean {
  const req = tier.requirements;
  if (s.population < req.population) return false;
  if (req.housing && housing(s) < req.housing) return false;
  if (
    req.researches?.some((id) => !s.researched.includes(id))
  )
    return false;
  if (
    Object.entries(req.buildings ?? {}).some(
      ([id, level]) => (s.buildings[id]?.level ?? 0) < level,
    )
  )
    return false;
  return true;
}

export interface RequirementRow {
  label: string;
  current: string;
  required: string;
  met: boolean;
}

export function tierRequirementRows(
  s: ProgressionGameState,
  tier = nextSettlementTier(s),
): RequirementRow[] {
  if (!tier) return [];
  const rows: RequirementRow[] = [
    {
      label: "Mieszkańcy",
      current: String(s.population),
      required: String(tier.requirements.population),
      met: s.population >= tier.requirements.population,
    },
  ];
  if (tier.requirements.housing) {
    rows.push({
      label: "Miejsca mieszkalne",
      current: String(housing(s)),
      required: String(tier.requirements.housing),
      met: housing(s) >= tier.requirements.housing,
    });
  }
  for (const [id, required] of Object.entries(tier.requirements.buildings ?? {})) {
    const def = buildings.find((building) => building.id === id);
    const current = s.buildings[id]?.level ?? 0;
    rows.push({
      label: def?.name ?? id,
      current: `poziom ${current}`,
      required: `poziom ${required}`,
      met: current >= required,
    });
  }
  for (const id of tier.requirements.researches ?? []) {
    rows.push({
      label: researchName(id),
      current: s.researched.includes(id) ? "odkryto" : "brak",
      required: "odkryto",
      met: s.researched.includes(id),
    });
  }
  return rows;
}

export const canAdvanceSettlement = (s: ProgressionGameState) => {
  const next = nextSettlementTier(s);
  return !!next && next.available && meetsTierRequirements(s, next) && Object.entries(next.cost).every(
    ([id, amount]) => s.resources[id as Resource] + 1e-8 >= amount,
  );
};

export function advanceSettlement(s: ProgressionGameState) {
  const next = nextSettlementTier(s);
  if (!next || !next.available || !meetsTierRequirements(s, next) || !pay(s, next.cost))
    return false;
  s.settlementTier = next.id;
  log(s, `Rozwój osady: ${next.name}. ${next.shortDescription}`);
  if (next.satelliteLimit > 0)
    log(s, `Odblokowano zarządzanie regionem. Limit zależnych osad: ${next.satelliteLimit}.`);
  return true;
}

export const satelliteLimit = (s: ProgressionGameState) =>
  currentSettlementTier(s).satelliteLimit;

export const canManageRegion = (s: ProgressionGameState) => satelliteLimit(s) > 0;

export function canFoundSatellite(
  s: ProgressionGameState,
  specialization: SatelliteSpecializationId,
) {
  const def = satelliteSpecializations.find((item) => item.id === specialization);
  return (
    !!def &&
    canManageRegion(s) &&
    s.satellites.length < satelliteLimit(s) &&
    Object.entries(def.foundingCost).every(
      ([id, amount]) => s.resources[id as Resource] + 1e-8 >= amount,
    )
  );
}

export function foundSatellite(
  s: ProgressionGameState,
  specialization: SatelliteSpecializationId,
) {
  const def = satelliteSpecializations.find((item) => item.id === specialization);
  if (!def || !canFoundSatellite(s, specialization) || !pay(s, def.foundingCost)) return false;
  const number = s.nextSatelliteId++;
  const baseName = satelliteNames[(number - 1) % satelliteNames.length];
  const name = number <= satelliteNames.length ? baseName : `${baseName} ${number}`;
  s.satellites.push({
    id: `satellite-${number}`,
    name,
    specialization,
    level: 1,
    population: 12,
    loyalty: 75,
    security: 50,
    foundedAt: s.elapsed,
  });
  log(s, `Założono zależną osadę „${name}” (${def.name.toLowerCase()}).`);
  return true;
}

export const satelliteUpgradeCost = (satellite: SatelliteSettlement): Cost => {
  const scale = 1.7 ** (satellite.level - 1);
  return {
    wood: Math.ceil(80 * scale),
    stone: Math.ceil(60 * scale),
    food: Math.ceil(70 * scale),
    gold: Math.ceil(30 * scale),
  };
};

export function upgradeSatellite(s: ProgressionGameState, id: string) {
  const satellite = s.satellites.find((item) => item.id === id);
  if (!satellite || satellite.level >= 5) return false;
  const cost = satelliteUpgradeCost(satellite);
  if (!pay(s, cost)) return false;
  satellite.level++;
  satellite.population += 8 + satellite.level * 2;
  satellite.security = Math.min(100, satellite.security + 5);
  satellite.loyalty = Math.min(100, satellite.loyalty + 2);
  log(s, `Rozbudowano ${satellite.name} do poziomu ${satellite.level}.`);
  return true;
}

export function renameSatellite(
  s: ProgressionGameState,
  id: string,
  name: string,
) {
  const satellite = s.satellites.find((item) => item.id === id);
  const cleaned = name.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!satellite || cleaned.length < 2) return false;
  satellite.name = cleaned;
  return true;
}

export function satelliteRates(s: ProgressionGameState): Cost {
  const rate: Cost = {};
  for (const satellite of s.satellites) {
    const def = satelliteSpecializations.find(
      (item) => item.id === satellite.specialization,
    );
    if (!def) continue;
    const levelBonus = 1 + (satellite.level - 1) * 0.55;
    const loyaltyBonus = 0.75 + satellite.loyalty / 400;
    const securityBonus = 0.8 + satellite.security / 500;
    const multiplier = levelBonus * loyaltyBonus * securityBonus;
    for (const [id, amount] of Object.entries(def.production))
      rate[id as Resource] = (rate[id as Resource] ?? 0) + amount * multiplier;
  }
  return rate;
}

function advanceRegionalEconomy(s: ProgressionGameState, seconds: number) {
  if (seconds <= 0 || !s.satellites.length) return;
  const rate = satelliteRates(s);
  for (const [id, amount] of Object.entries(rate)) {
    const resource = id as Resource;
    const current = s.regionalStock[resource] ?? 0;
    s.regionalStock[resource] = Math.min(1_000_000, current + amount * seconds);
  }
}

export function collectRegionalGoods(s: ProgressionGameState) {
  let moved = 0;
  for (const [id, value] of Object.entries(s.regionalStock)) {
    const resource = id as Resource;
    if (value <= 0) continue;
    const amount =
      resource === "gold"
        ? value
        : Math.min(value, Math.max(0, capacity(s) - s.resources[resource]));
    if (amount <= 0) continue;
    s.resources[resource] += amount;
    s.regionalStock[resource] = value - amount;
    moved += amount;
    if ((s.regionalStock[resource] ?? 0) < 1e-8) delete s.regionalStock[resource];
  }
  if (moved > 0) log(s, "Odebrano dostawy z zależnych osad.");
  return moved > 0;
}

export function progressionSummary(s: ProgressionGameState) {
  const current = currentSettlementTier(s);
  const next = nextSettlementTier(s);
  return {
    current,
    next,
    regionUnlocked: current.satelliteLimit > 0,
    satellites: s.satellites.length,
    satelliteLimit: current.satelliteLimit,
    regionalRate: satelliteRates(s),
  };
}

function defaultProgression(): ProgressionState {
  return {
    progressionVersion: 1,
    settlementTier: "camp",
    satellites: [],
    regionalStock: {},
    nextSatelliteId: 1,
  };
}

function inferLegacyTier(s: GameState): SettlementTierId {
  let best: SettlementTierId = "camp";
  for (const tier of settlementTiers) {
    if (!tier.available || !meetsTierRequirements(s, tier)) break;
    best = tier.id;
  }
  return best;
}

function validCost(value: unknown): value is Cost {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([id, amount]) =>
      resources.some((resource) => resource.id === id) &&
      typeof amount === "number" &&
      Number.isFinite(amount) &&
      amount >= 0 &&
      amount <= 1_000_000_000,
  );
}

function hydrateProgression(
  base: GameState,
  source?: Partial<ProgressionState>,
): ProgressionGameState {
  const defaults = defaultProgression();
  const state = base as ProgressionGameState;
  if (!source || source.progressionVersion === undefined) {
    Object.assign(state, defaults, { settlementTier: inferLegacyTier(base) });
    return state;
  }
  if (source.progressionVersion !== 1)
    throw Error("Nieobsługiwana wersja rozwoju osady");
  if (!settlementTiers.some((tier) => tier.id === source.settlementTier))
    throw Error("Nieprawidłowy poziom osady");
  if (!Array.isArray(source.satellites) || source.satellites.length > 32)
    throw Error("Nieprawidłowe osady zależne");
  const ids = new Set<string>();
  const satellites: SatelliteSettlement[] = source.satellites.map((raw) => {
    const item = raw as SatelliteSettlement;
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.name !== "string" ||
      item.name.trim().length < 2 ||
      item.name.length > 40 ||
      !satelliteSpecializations.some((def) => def.id === item.specialization) ||
      !Number.isInteger(item.level) ||
      item.level < 1 ||
      item.level > 5 ||
      !Number.isFinite(item.population) ||
      item.population < 1 ||
      item.population > 100_000 ||
      !Number.isFinite(item.loyalty) ||
      item.loyalty < 0 ||
      item.loyalty > 100 ||
      !Number.isFinite(item.security) ||
      item.security < 0 ||
      item.security > 100 ||
      !Number.isFinite(item.foundedAt) ||
      item.foundedAt < 0
    )
      throw Error("Nieprawidłowa osada zależna");
    ids.add(item.id);
    return { ...item, name: item.name.trim() };
  });
  if (!validCost(source.regionalStock ?? {}))
    throw Error("Nieprawidłowy magazyn regionalny");
  if (
    !Number.isInteger(source.nextSatelliteId) ||
    (source.nextSatelliteId ?? 0) < 1 ||
    (source.nextSatelliteId ?? 0) > 1_000_000
  )
    throw Error("Nieprawidłowy licznik osad");
  Object.assign(state, {
    progressionVersion: 1 as const,
    settlementTier: source.settlementTier as SettlementTierId,
    satellites,
    regionalStock: { ...(source.regionalStock ?? {}) },
    nextSatelliteId: source.nextSatelliteId,
  });
  if (state.satellites.length > satelliteLimit(state))
    throw Error("Za dużo osad zależnych dla obecnego poziomu");
  return state;
}

export function freshGame(now = Date.now()): ProgressionGameState {
  return hydrateProgression(baseFreshGame(now));
}

export function parseSave(raw: string): ProgressionGameState {
  const source = JSON.parse(raw) as Partial<ProgressionState>;
  return hydrateProgression(baseParseSave(raw), source);
}

export function advance(s: ProgressionGameState, seconds: number) {
  const before = s.elapsed;
  baseAdvance(s, seconds);
  advanceRegionalEconomy(s, Math.max(0, s.elapsed - before));
}

export const regionalResourceRows = (s: ProgressionGameState) =>
  Object.entries(s.regionalStock)
    .filter(([, amount]) => amount > 1e-8)
    .map(([id, amount]) => ({
      id: id as Resource,
      name: resourceName(id),
      amount,
    }));
