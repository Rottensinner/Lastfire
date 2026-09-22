import {
  advance as advanceProgression,
  currentSettlementTier,
  freshGame as freshProgressionGame,
  log,
  parseSave as parseProgressionSave,
  settlementTiers,
  type ProgressionGameState,
  type SettlementTierId,
} from "./progression";
import { canPay, freeWorkers, pay } from "./engine";
import type { Cost, Resource } from "./types";

export { log };

export type CivicServiceId = "watch" | "fire" | "police" | "investigators";

export interface CivicServiceState {
  level: number;
  funded: boolean;
}

export interface CivicServiceDef {
  id: CivicServiceId;
  name: string;
  icon: string;
  description: string;
  minTier: SettlementTierId;
  maxLevel: number;
  order: number;
  crimeSuppression: number;
  fireSuppression: number;
  upgradeBase: Cost;
  maintenance: Cost;
}

export const civicServices: CivicServiceDef[] = [
  {
    id: "watch",
    name: "Straż osady",
    icon: "person",
    description:
      "Patrole, nocna warta i strażnicy targu. Podstawa bezpieczeństwa zanim powstanie zawodowa policja.",
    minTier: "village",
    maxLevel: 8,
    order: 3,
    crimeSuppression: 3,
    fireSuppression: 0,
    upgradeBase: { wood: 45, stone: 25, food: 30, stoneTools: 1 },
    maintenance: { food: 2 },
  },
  {
    id: "fire",
    name: "Straż pożarna",
    icon: "water",
    description:
      "Studnie alarmowe, beczkowozy, bosaki i wyszkolone drużyny przeciwpożarowe. Chroni gęstą zabudowę i warsztaty.",
    minTier: "large-village",
    maxLevel: 8,
    order: 1,
    crimeSuppression: 0,
    fireSuppression: 7,
    upgradeBase: { planks: 35, stone: 35, rope: 5, water: 40 },
    maintenance: { water: 4, food: 1 },
  },
  {
    id: "police",
    name: "Policja miejska",
    icon: "person",
    description:
      "Zawodowe patrole, posterunki i stała obecność na ulicach. Najskuteczniej ogranicza gangi i przestępczość miejską.",
    minTier: "small-town",
    maxLevel: 10,
    order: 5,
    crimeSuppression: 7,
    fireSuppression: 0,
    upgradeBase: { planks: 55, bricks: 35, cloth: 8, gold: 35 },
    maintenance: { gold: 4, food: 1 },
  },
  {
    id: "investigators",
    name: "Śledczy i administracja porządkowa",
    icon: "book",
    description:
      "Rejestry, wywiad, dochodzenia i walka z korupcją. Zmniejsza wpływy rozwiniętych gangów i przemytu.",
    minTier: "town",
    maxLevel: 6,
    order: 4,
    crimeSuppression: 9,
    fireSuppression: 0,
    upgradeBase: { planks: 50, cloth: 12, knowledge: 25, gold: 70 },
    maintenance: { gold: 7, knowledge: 1 },
  },
];

export interface Gang {
  id: string;
  name: string;
  power: number;
  influence: number;
  heat: number;
  createdAt: number;
}

export type CivicEventTemplateId =
  | "petty-theft"
  | "street-brawl"
  | "warehouse-robbery"
  | "urban-fire"
  | "gang-formation"
  | "protection-racket"
  | "gang-war"
  | "smuggling"
  | "corruption"
  | "public-unrest";

export interface CivicEventInstance {
  id: string;
  templateId: CivicEventTemplateId;
  createdAt: number;
  expiresAt: number;
  gangId?: string;
}

export interface CivicState {
  civicVersion: 1;
  order: number;
  crime: number;
  fireRisk: number;
  publicTrust: number;
  services: Record<CivicServiceId, CivicServiceState>;
  gangs: Gang[];
  civicEvents: CivicEventInstance[];
  nextCivicEvent: number;
  nextCivicMaintenance: number;
  nextGangId: number;
  nextCivicEventId: number;
}

export type CivicGameState = ProgressionGameState & CivicState;

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const tierIndex = (id: SettlementTierId) =>
  settlementTiers.findIndex((tier) => tier.id === id);

export const civicTierAtLeast = (s: ProgressionGameState, id: SettlementTierId) =>
  tierIndex(currentSettlementTier(s).id) >= tierIndex(id);

export const civicServiceUnlocked = (s: ProgressionGameState, id: CivicServiceId) => {
  const def = civicServices.find((service) => service.id === id);
  return !!def && civicTierAtLeast(s, def.minTier);
};

export const serviceUpgradeCost = (
  s: CivicGameState,
  id: CivicServiceId,
): Cost => {
  const def = civicServices.find((service) => service.id === id)!;
  const level = s.services[id].level;
  const multiplier = 1.7 ** level;
  return Object.fromEntries(
    Object.entries(def.upgradeBase).map(([resource, amount]) => [
      resource,
      Math.ceil(amount * multiplier),
    ]),
  ) as Cost;
};

export const serviceMaintenanceCost = (
  s: CivicGameState,
  id: CivicServiceId,
): Cost => {
  const def = civicServices.find((service) => service.id === id)!;
  const level = s.services[id].level;
  return Object.fromEntries(
    Object.entries(def.maintenance).map(([resource, amount]) => [
      resource,
      amount * level,
    ]),
  ) as Cost;
};

export function investInService(s: CivicGameState, id: CivicServiceId) {
  const def = civicServices.find((service) => service.id === id);
  if (
    !def ||
    !civicServiceUnlocked(s, id) ||
    s.services[id].level >= def.maxLevel
  )
    return false;
  const cost = serviceUpgradeCost(s, id);
  if (!pay(s, cost)) return false;
  s.services[id].level++;
  s.services[id].funded = true;
  s.order = clamp(s.order + 2);
  s.publicTrust = clamp(s.publicTrust + 1);
  log(s, `Rozbudowano służbę: ${def.name}, poziom ${s.services[id].level}.`);
  return true;
}

export function serviceEffectiveness(s: CivicGameState, id: CivicServiceId) {
  const state = s.services[id];
  if (!state.level) return 0;
  return state.level * (state.funded ? 1 : 0.4);
}

export function enforcementStrength(s: CivicGameState) {
  return civicServices.reduce((total, def) => {
    const level = serviceEffectiveness(s, def.id);
    return total + level * def.crimeSuppression;
  }, 0);
}

export function fireProtection(s: CivicGameState) {
  return civicServices.reduce((total, def) => {
    const level = serviceEffectiveness(s, def.id);
    return total + level * def.fireSuppression;
  }, 0);
}

export function civicOrderSupport(s: CivicGameState) {
  return civicServices.reduce((total, def) => {
    const level = serviceEffectiveness(s, def.id);
    return total + level * def.order;
  }, 0);
}

export function totalGangPower(s: CivicGameState) {
  return s.gangs.reduce((total, gang) => total + gang.power, 0);
}

export function civicPressure(s: CivicGameState) {
  const population = s.population;
  const freeRatio = population ? Math.max(0, freeWorkers(s)) / population : 0;
  const wealth = Math.min(1.5, s.resources.gold / 500);
  const urban = Math.max(0, tierIndex(currentSettlementTier(s).id) - tierIndex("village"));
  const industry =
    (s.buildings.smelter?.level ?? 0) +
    (s.buildings.kiln?.level ?? 0) +
    (s.buildings.smith?.level ?? 0);
  const gangs = totalGangPower(s);
  const enforcement = enforcementStrength(s);
  const fire = fireProtection(s);

  const crimePerMinute =
    0.05 +
    population / 700 +
    freeRatio * 0.22 +
    wealth * 0.08 +
    urban * 0.025 +
    gangs / 700 -
    enforcement * 0.018;

  const orderPerMinute =
    0.03 +
    civicOrderSupport(s) * 0.012 +
    s.publicTrust * 0.0015 -
    s.crime * 0.004 -
    gangs / 900;

  const firePerMinute =
    0.03 + population / 1200 + industry * 0.025 + urban * 0.01 - fire * 0.025;

  return {
    crimePerMinute,
    orderPerMinute,
    firePerMinute,
    freeRatio,
    enforcement,
    fireProtection: fire,
    gangPower: gangs,
  };
}

const gangNames = [
  "Czarne Kruki",
  "Żelazne Psy",
  "Synowie Traktu",
  "Popielni",
  "Nocna Kompania",
  "Bractwo Mostu",
  "Czerwone Noże",
  "Wilcze Kły",
];

function strongestGang(s: CivicGameState) {
  return [...s.gangs].sort((a, b) => b.power + b.influence - (a.power + a.influence))[0];
}

function createGang(s: CivicGameState, strength = 18) {
  if (s.gangs.length >= 6) return null;
  const number = s.nextGangId++;
  const base = gangNames[(number - 1) % gangNames.length];
  const gang: Gang = {
    id: `gang-${number}`,
    name: number <= gangNames.length ? base : `${base} ${number}`,
    power: clamp(strength, 5, 100),
    influence: clamp(strength * 0.7, 3, 100),
    heat: 20,
    createdAt: s.elapsed,
  };
  s.gangs.push(gang);
  log(s, `W mieście pojawiła się zorganizowana grupa: ${gang.name}.`);
  return gang;
}

function damageGang(s: CivicGameState, gangId: string | undefined, amount: number) {
  const gang = s.gangs.find((item) => item.id === gangId);
  if (!gang) return false;
  gang.power = clamp(gang.power - amount);
  gang.influence = clamp(gang.influence - amount * 0.6);
  gang.heat = clamp(gang.heat + amount * 0.8);
  if (gang.power <= 4 || gang.influence <= 2) {
    s.gangs = s.gangs.filter((item) => item.id !== gang.id);
    log(s, `Rozbito gang „${gang.name}”.`);
  }
  return true;
}

function loseResource(s: CivicGameState, id: Resource, amount: number) {
  const lost = Math.min(s.resources[id], amount);
  s.resources[id] -= lost;
  return lost;
}

export interface CivicEventChoice {
  id: string;
  label: string;
  description: string;
  cost?: Cost;
  available?: (s: CivicGameState, event: CivicEventInstance) => boolean;
  unavailableReason?: string;
  apply: (s: CivicGameState, event: CivicEventInstance) => void;
}

export interface CivicEventTemplate {
  id: CivicEventTemplateId;
  name: string;
  severity: "low" | "medium" | "high" | "critical";
  minTier: SettlementTierId;
  description: (s: CivicGameState, event: CivicEventInstance) => string;
  eligible: (s: CivicGameState) => boolean;
  choices: CivicEventChoice[];
  ignored: (s: CivicGameState, event: CivicEventInstance) => void;
  lifetime?: number;
}

export const civicEventTemplates: CivicEventTemplate[] = [
  {
    id: "petty-theft",
    name: "Seria drobnych kradzieży",
    severity: "low",
    minTier: "village",
    description: () =>
      "Na targu i przy magazynach mnożą się zgłoszenia kradzieży. Brak reakcji zwiększy poczucie bezkarności.",
    eligible: (s) => s.crime >= 12,
    choices: [
      {
        id: "patrols",
        label: "Wzmocnij patrole",
        description: "Doraźne patrole uspokoją sytuację.",
        cost: { food: 8 },
        available: (s) => serviceEffectiveness(s, "watch") > 0 || serviceEffectiveness(s, "police") > 0,
        unavailableReason: "Potrzebujesz działającej straży lub policji.",
        apply: (s) => {
          s.crime = clamp(s.crime - 5);
          s.order = clamp(s.order + 3);
        },
      },
      {
        id: "compensate",
        label: "Wypłać odszkodowania",
        description: "Nie rozwiązuje problemu, ale podnosi zaufanie mieszkańców.",
        cost: { gold: 15 },
        apply: (s) => {
          s.publicTrust = clamp(s.publicTrust + 5);
          s.order = clamp(s.order + 1);
          s.crime = clamp(s.crime + 1);
        },
      },
      {
        id: "ignore",
        label: "Nie reaguj",
        description: "Oszczędzasz zasoby, ale przestępczość rośnie.",
        apply: (s) => {
          s.crime = clamp(s.crime + 4);
          s.order = clamp(s.order - 2);
        },
      },
    ],
    ignored: (s) => {
      loseResource(s, "gold", 8);
      s.crime = clamp(s.crime + 4);
      s.order = clamp(s.order - 3);
    },
  },
  {
    id: "street-brawl",
    name: "Bójki na ulicach",
    severity: "medium",
    minTier: "large-village",
    description: () =>
      "Spór między grupami mieszkańców przerodził się w regularne bójki. Kupcy zaczynają omijać tę część osady.",
    eligible: (s) => s.order < 72 || s.crime >= 20,
    choices: [
      {
        id: "separate",
        label: "Wyślij straż",
        description: "Szybka interwencja przywróci porządek.",
        cost: { food: 10 },
        available: (s) => enforcementStrength(s) >= 3,
        unavailableReason: "Służby porządkowe są zbyt słabe.",
        apply: (s) => {
          s.order = clamp(s.order + 5);
          s.crime = clamp(s.crime - 2);
        },
      },
      {
        id: "mediate",
        label: "Wyślij mediatorów",
        description: "Tańsza, ale mniej zdecydowana odpowiedź.",
        cost: { food: 5 },
        apply: (s) => {
          s.order = clamp(s.order + 2);
          s.publicTrust = clamp(s.publicTrust + 2);
        },
      },
    ],
    ignored: (s) => {
      s.order = clamp(s.order - 6);
      s.crime = clamp(s.crime + 3);
    },
  },
  {
    id: "warehouse-robbery",
    name: "Napad na magazyn",
    severity: "high",
    minTier: "large-village",
    description: () =>
      "Zorganizowana grupa obserwuje dostawy i przygotowuje napad na magazyn. To już nie są przypadkowe kradzieże.",
    eligible: (s) => s.crime >= 28 && s.buildings.warehouse.level >= 2,
    choices: [
      {
        id: "ambush",
        label: "Zastaw zasadzkę",
        description: "Wymaga sprawnych służb, ale może znacząco ograniczyć przestępczość.",
        cost: { food: 12, gold: 10 },
        available: (s) => enforcementStrength(s) >= 8,
        unavailableReason: "Potrzebujesz silniejszej straży lub policji.",
        apply: (s) => {
          s.crime = clamp(s.crime - 7);
          s.order = clamp(s.order + 5);
          const gang = strongestGang(s);
          if (gang) damageGang(s, gang.id, 8);
        },
      },
      {
        id: "guards",
        label: "Wzmocnij ochronę magazynu",
        description: "Ogranicza straty, ale sprawcy pozostają na wolności.",
        cost: { food: 8, wood: 10 },
        apply: (s) => {
          s.order = clamp(s.order + 2);
          s.crime = clamp(s.crime - 1);
        },
      },
    ],
    ignored: (s) => {
      loseResource(s, "food", 30);
      loseResource(s, "wood", 25);
      loseResource(s, "gold", 20);
      s.crime = clamp(s.crime + 6);
      s.order = clamp(s.order - 5);
    },
  },
  {
    id: "urban-fire",
    name: "Pożar w zwartej zabudowie",
    severity: "high",
    minTier: "large-village",
    description: () =>
      "Ogień pojawił się między warsztatami i domami. Przy gęstej zabudowie może szybko wymknąć się spod kontroli.",
    eligible: (s) => s.fireRisk >= 25,
    choices: [
      {
        id: "brigade",
        label: "Uruchom straż pożarną",
        description: "Profesjonalna akcja ograniczy straty do minimum.",
        cost: { water: 20 },
        available: (s) => serviceEffectiveness(s, "fire") >= 1,
        unavailableReason: "Nie masz działającej straży pożarnej.",
        apply: (s) => {
          s.fireRisk = clamp(s.fireRisk - 12);
          s.order = clamp(s.order + 2);
          s.publicTrust = clamp(s.publicTrust + 3);
        },
      },
      {
        id: "bucket-line",
        label: "Zorganizuj mieszkańców",
        description: "Improwizowana akcja wymaga dużej ilości wody i ludzi.",
        cost: { water: 45, food: 8 },
        apply: (s) => {
          s.fireRisk = clamp(s.fireRisk - 6);
          loseResource(s, "wood", 10);
        },
      },
    ],
    ignored: (s) => {
      loseResource(s, "wood", 55);
      loseResource(s, "planks", 25);
      s.fireRisk = clamp(s.fireRisk + 8);
      s.order = clamp(s.order - 4);
    },
  },
  {
    id: "gang-formation",
    name: "Powstanie gangu",
    severity: "high",
    minTier: "small-town",
    description: () =>
      "W biedniejszych ulicach tworzy się trwała grupa przestępcza. Zaczyna werbować ludzi i przejmować lokalny handel.",
    eligible: (s) => s.crime >= 30 && s.gangs.length < 5,
    choices: [
      {
        id: "prevent",
        label: "Rozbij grupę w zarodku",
        description: "Zdecydowana akcja zanim gang zbuduje wpływy.",
        cost: { gold: 20, food: 12 },
        available: (s) => enforcementStrength(s) >= 12,
        unavailableReason: "Potrzebujesz silniejszej policji lub straży.",
        apply: (s) => {
          s.crime = clamp(s.crime - 5);
          s.order = clamp(s.order + 4);
          s.publicTrust = clamp(s.publicTrust + 2);
        },
      },
      {
        id: "informants",
        label: "Zbuduj sieć informatorów",
        description: "Gang powstanie słabszy, ale władze zyskają wiedzę o jego strukturze.",
        cost: { gold: 12, knowledge: 5 },
        apply: (s) => {
          const gang = createGang(s, 11);
          if (gang) gang.heat = 45;
          s.publicTrust = clamp(s.publicTrust - 1);
        },
      },
      {
        id: "ignore",
        label: "Zignoruj problem",
        description: "Grupa rozrośnie się bez przeszkód.",
        apply: (s) => {
          createGang(s, 22);
          s.crime = clamp(s.crime + 5);
        },
      },
    ],
    ignored: (s) => {
      createGang(s, 25);
      s.crime = clamp(s.crime + 6);
      s.order = clamp(s.order - 4);
    },
  },
  {
    id: "protection-racket",
    name: "Haracze na targu",
    severity: "high",
    minTier: "small-town",
    description: (s, event) => {
      const gang = s.gangs.find((item) => item.id === event.gangId);
      return `${gang?.name ?? "Gang"} wymusza opłaty od kupców. Część handlarzy grozi zamknięciem stoisk.`;
    },
    eligible: (s) => s.gangs.length > 0,
    choices: [
      {
        id: "raid",
        label: "Nalot na kryjówki",
        description: "Ryzykowna, ale skuteczna akcja przeciw gangowi.",
        cost: { gold: 25, food: 10 },
        available: (s) => enforcementStrength(s) >= 16,
        unavailableReason: "Policja i straż są za słabe do takiej operacji.",
        apply: (s, event) => {
          damageGang(s, event.gangId, 18);
          s.crime = clamp(s.crime - 5);
          s.order = clamp(s.order + 4);
        },
      },
      {
        id: "protect-merchants",
        label: "Ochroń kupców",
        description: "Patrole ograniczą haracze bez bezpośredniego ataku na gang.",
        cost: { food: 10, gold: 8 },
        available: (s) => enforcementStrength(s) >= 6,
        unavailableReason: "Potrzebujesz choć podstawowych patroli.",
        apply: (s, event) => {
          damageGang(s, event.gangId, 6);
          s.publicTrust = clamp(s.publicTrust + 4);
          s.order = clamp(s.order + 2);
        },
      },
      {
        id: "pay",
        label: "Toleruj układ",
        description: "Kupcy zachowają spokój, ale gang zwiększy wpływy.",
        cost: { gold: 18 },
        apply: (s, event) => {
          const gang = s.gangs.find((item) => item.id === event.gangId);
          if (gang) {
            gang.power = clamp(gang.power + 5);
            gang.influence = clamp(gang.influence + 8);
          }
          s.order = clamp(s.order + 1);
          s.publicTrust = clamp(s.publicTrust - 4);
        },
      },
    ],
    ignored: (s, event) => {
      const gang = s.gangs.find((item) => item.id === event.gangId);
      if (gang) {
        gang.power = clamp(gang.power + 7);
        gang.influence = clamp(gang.influence + 10);
      }
      loseResource(s, "gold", 20);
      s.crime = clamp(s.crime + 5);
      s.publicTrust = clamp(s.publicTrust - 4);
    },
  },
  {
    id: "gang-war",
    name: "Wojna gangów",
    severity: "critical",
    minTier: "town",
    description: () =>
      "Rywalizujące grupy walczą o ulice i szlaki przemytu. Bez interwencji konflikt uderzy w mieszkańców i handel.",
    eligible: (s) => s.gangs.length >= 2 && totalGangPower(s) >= 45,
    choices: [
      {
        id: "operation",
        label: "Operacja przeciw obu stronom",
        description: "Duża skoordynowana akcja policji i śledczych.",
        cost: { gold: 45, food: 18, knowledge: 5 },
        available: (s) => enforcementStrength(s) >= 28,
        unavailableReason: "Potrzebujesz rozbudowanej policji i zaplecza śledczego.",
        apply: (s) => {
          for (const gang of [...s.gangs]) damageGang(s, gang.id, 15);
          s.crime = clamp(s.crime - 9);
          s.order = clamp(s.order + 7);
          s.publicTrust = clamp(s.publicTrust + 5);
        },
      },
      {
        id: "contain",
        label: "Odizoluj dzielnice",
        description: "Ogranicza skutki konfliktu, ale nie usuwa przyczyn.",
        cost: { food: 20, wood: 20 },
        apply: (s) => {
          s.order = clamp(s.order - 1);
          s.crime = clamp(s.crime + 1);
          s.publicTrust = clamp(s.publicTrust - 2);
        },
      },
    ],
    ignored: (s) => {
      s.order = clamp(s.order - 12);
      s.crime = clamp(s.crime + 10);
      loseResource(s, "gold", 35);
      loseResource(s, "food", 20);
      for (const gang of s.gangs) gang.power = clamp(gang.power + 5);
    },
    lifetime: 150,
  },
  {
    id: "smuggling",
    name: "Szlak przemytniczy",
    severity: "medium",
    minTier: "small-town",
    description: () =>
      "Kupcy zgłaszają towary omijające oficjalny rynek. Przemyt przynosi zysk części mieszkańców, ale wzmacnia podziemie.",
    eligible: (s) => s.crime >= 22 && s.researched.includes("trade"),
    choices: [
      {
        id: "seize",
        label: "Skonfiskuj towary",
        description: "Wymaga dochodzenia i patroli.",
        available: (s) => enforcementStrength(s) >= 10,
        unavailableReason: "Służby nie mają wystarczającej kontroli nad handlem.",
        apply: (s) => {
          s.resources.gold += 12;
          s.crime = clamp(s.crime - 4);
          s.order = clamp(s.order + 2);
        },
      },
      {
        id: "legalize",
        label: "Wciągnij handel do legalnego obrotu",
        description: "Mniejszy efekt porządkowy, ale poprawia relacje z kupcami.",
        cost: { gold: 8 },
        apply: (s) => {
          s.reputation += 1;
          s.publicTrust = clamp(s.publicTrust + 2);
          s.crime = clamp(s.crime - 1);
        },
      },
    ],
    ignored: (s) => {
      s.crime = clamp(s.crime + 4);
      const gang = strongestGang(s);
      if (gang) gang.influence = clamp(gang.influence + 5);
    },
  },
  {
    id: "corruption",
    name: "Podejrzenie korupcji",
    severity: "high",
    minTier: "town",
    description: () =>
      "Pojawiły się dowody, że część urzędników i funkcjonariuszy bierze łapówki od kupców oraz grup przestępczych.",
    eligible: (s) => s.crime >= 25 && s.services.police.level >= 2,
    choices: [
      {
        id: "investigate",
        label: "Wszczęcie śledztwa",
        description: "Kosztowne, ale wzmacnia instytucje i zaufanie.",
        cost: { gold: 30, knowledge: 8 },
        available: (s) => serviceEffectiveness(s, "investigators") >= 1,
        unavailableReason: "Potrzebujesz śledczych i administracji porządkowej.",
        apply: (s) => {
          s.publicTrust = clamp(s.publicTrust + 8);
          s.crime = clamp(s.crime - 5);
          s.order = clamp(s.order + 3);
        },
      },
      {
        id: "quiet-dismissal",
        label: "Ciche zwolnienia",
        description: "Szybsze rozwiązanie, ale mieszkańcy nie poznają pełnej skali sprawy.",
        cost: { gold: 12 },
        apply: (s) => {
          s.publicTrust = clamp(s.publicTrust + 1);
          s.crime = clamp(s.crime - 2);
        },
      },
    ],
    ignored: (s) => {
      s.publicTrust = clamp(s.publicTrust - 9);
      s.crime = clamp(s.crime + 6);
      for (const gang of s.gangs) gang.influence = clamp(gang.influence + 3);
    },
  },
  {
    id: "public-unrest",
    name: "Niepokoje społeczne",
    severity: "critical",
    minTier: "small-town",
    description: () =>
      "Niskie poczucie bezpieczeństwa i brak zaufania do władz wywołują protesty. Sytuacja może przerodzić się w zamieszki.",
    eligible: (s) => s.order <= 35 || s.publicTrust <= 25,
    choices: [
      {
        id: "relief",
        label: "Program pomocy i rozmowy",
        description: "Droższe rozwiązanie poprawiające zaufanie bez eskalacji.",
        cost: { food: 45, gold: 25 },
        apply: (s) => {
          s.order = clamp(s.order + 8);
          s.publicTrust = clamp(s.publicTrust + 10);
          s.crime = clamp(s.crime - 2);
        },
      },
      {
        id: "police",
        label: "Zabezpiecz ulice policją",
        description: "Przywraca porządek, ale może obniżyć zaufanie.",
        cost: { food: 15 },
        available: (s) => enforcementStrength(s) >= 18,
        unavailableReason: "Służby są zbyt słabe do opanowania zamieszek.",
        apply: (s) => {
          s.order = clamp(s.order + 10);
          s.publicTrust = clamp(s.publicTrust - 5);
          s.crime = clamp(s.crime - 3);
        },
      },
    ],
    ignored: (s) => {
      s.order = clamp(s.order - 12);
      s.publicTrust = clamp(s.publicTrust - 8);
      s.crime = clamp(s.crime + 7);
      loseResource(s, "food", 30);
      loseResource(s, "gold", 20);
    },
    lifetime: 140,
  },
];

export const civicEventTemplate = (id: CivicEventTemplateId) =>
  civicEventTemplates.find((template) => template.id === id)!;

export function eventChoiceAvailable(
  s: CivicGameState,
  event: CivicEventInstance,
  choice: CivicEventChoice,
) {
  return (!choice.cost || canPay(s, choice.cost)) && (!choice.available || choice.available(s, event));
}

export function resolveCivicEvent(
  s: CivicGameState,
  eventId: string,
  choiceId: string,
) {
  const event = s.civicEvents.find((item) => item.id === eventId);
  if (!event) return false;
  const template = civicEventTemplate(event.templateId);
  const choice = template.choices.find((item) => item.id === choiceId);
  if (!choice || !eventChoiceAvailable(s, event, choice)) return false;
  if (choice.cost && !pay(s, choice.cost)) return false;
  choice.apply(s, event);
  s.civicEvents = s.civicEvents.filter((item) => item.id !== eventId);
  log(s, `Rozstrzygnięto wydarzenie: ${template.name} — ${choice.label}.`);
  return true;
}

function eventInterval(s: CivicGameState) {
  return Math.round(clamp(170 - s.crime * 1.1 - s.gangs.length * 12, 55, 180));
}

export function generateCivicEvent(s: CivicGameState) {
  if (!civicTierAtLeast(s, "village") || s.civicEvents.length >= 4) return false;
  const current = new Set(s.civicEvents.map((event) => event.templateId));
  const eligible = civicEventTemplates.filter(
    (template) =>
      !current.has(template.id) &&
      civicTierAtLeast(s, template.minTier) &&
      template.eligible(s),
  );
  if (!eligible.length) return false;

  const index = (s.nextCivicEventId + Math.floor(s.crime) + s.gangs.length) % eligible.length;
  const template = eligible[index];
  const gang = template.id === "protection-racket" ? strongestGang(s) : undefined;
  const id = `civic-${s.nextCivicEventId++}`;
  s.civicEvents.push({
    id,
    templateId: template.id,
    createdAt: s.elapsed,
    expiresAt: s.elapsed + (template.lifetime ?? 220),
    gangId: gang?.id,
  });
  log(s, `Nowe wydarzenie miejskie: ${template.name}.`);
  return true;
}

function expireCivicEvents(s: CivicGameState) {
  const expired = s.civicEvents.filter((event) => event.expiresAt <= s.elapsed);
  for (const event of expired) {
    const template = civicEventTemplate(event.templateId);
    template.ignored(s, event);
    log(s, `Brak reakcji: ${template.name}. Sytuacja przyniosła negatywne skutki.`);
  }
  if (expired.length) {
    const ids = new Set(expired.map((event) => event.id));
    s.civicEvents = s.civicEvents.filter((event) => !ids.has(event.id));
  }
}

function chargeMaintenance(s: CivicGameState) {
  for (const def of civicServices) {
    const state = s.services[def.id];
    if (!state.level) continue;
    const cost = serviceMaintenanceCost(s, def.id);
    if (pay(s, cost)) {
      if (!state.funded) log(s, `${def.name} znów otrzymuje pełne finansowanie.`);
      state.funded = true;
    } else {
      if (state.funded) log(s, `Brakuje środków na utrzymanie: ${def.name}. Skuteczność spada.`);
      state.funded = false;
      s.order = clamp(s.order - 1.5);
      s.publicTrust = clamp(s.publicTrust - 1);
    }
  }
}

function advanceGangs(s: CivicGameState, minutes: number) {
  const enforcement = enforcementStrength(s);
  for (const gang of [...s.gangs]) {
    const growth = 0.035 + s.crime / 900 - enforcement / 1700;
    gang.power = clamp(gang.power + growth * minutes * 10);
    gang.influence = clamp(gang.influence + (growth * 0.7 + 0.012) * minutes * 10);
    gang.heat = clamp(gang.heat + (enforcement / 500 - 0.02) * minutes * 10);
    if (gang.power <= 4 || gang.influence <= 2) {
      s.gangs = s.gangs.filter((item) => item.id !== gang.id);
      log(s, `Gang „${gang.name}” rozpadł się pod presją służb.`);
    }
  }
}

function advanceCivicMetrics(s: CivicGameState, seconds: number) {
  if (!civicTierAtLeast(s, "village") || seconds <= 0) return;
  const minutes = seconds / 60;
  const pressure = civicPressure(s);
  s.crime = clamp(s.crime + pressure.crimePerMinute * minutes);
  s.order = clamp(s.order + pressure.orderPerMinute * minutes);
  s.fireRisk = clamp(s.fireRisk + pressure.firePerMinute * minutes);

  const trustTrend =
    civicOrderSupport(s) * 0.0025 - s.crime * 0.0012 - s.gangs.length * 0.012;
  s.publicTrust = clamp(s.publicTrust + trustTrend * minutes * 10);

  advanceGangs(s, minutes);
}

function processCivicSchedule(s: CivicGameState) {
  let maintenanceSafety = 0;
  while (s.elapsed >= s.nextCivicMaintenance && maintenanceSafety++ < 64) {
    chargeMaintenance(s);
    s.nextCivicMaintenance += 600;
  }

  expireCivicEvents(s);

  let eventSafety = 0;
  while (s.elapsed >= s.nextCivicEvent && eventSafety++ < 6) {
    generateCivicEvent(s);
    s.nextCivicEvent += eventInterval(s);
  }
}

export function civicSummary(s: CivicGameState) {
  const pressure = civicPressure(s);
  return {
    order: s.order,
    crime: s.crime,
    fireRisk: s.fireRisk,
    publicTrust: s.publicTrust,
    enforcement: pressure.enforcement,
    fireProtection: pressure.fireProtection,
    gangPower: pressure.gangPower,
    pendingEvents: s.civicEvents.length,
  };
}

function defaultCivic(elapsed = 0): CivicState {
  return {
    civicVersion: 1,
    order: 72,
    crime: 8,
    fireRisk: 8,
    publicTrust: 62,
    services: {
      watch: { level: 0, funded: true },
      fire: { level: 0, funded: true },
      police: { level: 0, funded: true },
      investigators: { level: 0, funded: true },
    },
    gangs: [],
    civicEvents: [],
    nextCivicEvent: elapsed + 150,
    nextCivicMaintenance: elapsed + 600,
    nextGangId: 1,
    nextCivicEventId: 1,
  };
}

const finiteRange = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

function hydrateCivic(
  base: ProgressionGameState,
  source?: Partial<CivicState>,
): CivicGameState {
  const state = base as CivicGameState;
  if (!source || source.civicVersion === undefined) {
    Object.assign(state, defaultCivic(base.elapsed));
    return state;
  }
  if (source.civicVersion !== 1) throw Error("Nieobsługiwana wersja systemu miejskiego");
  if (
    !finiteRange(source.order, 0, 100) ||
    !finiteRange(source.crime, 0, 100) ||
    !finiteRange(source.fireRisk, 0, 100) ||
    !finiteRange(source.publicTrust, 0, 100)
  )
    throw Error("Nieprawidłowe wskaźniki miejskie");

  const defaults = defaultCivic(base.elapsed);
  const services = {} as Record<CivicServiceId, CivicServiceState>;
  for (const def of civicServices) {
    const raw = source.services?.[def.id];
    if (
      !raw ||
      !Number.isInteger(raw.level) ||
      raw.level < 0 ||
      raw.level > def.maxLevel ||
      typeof raw.funded !== "boolean"
    )
      throw Error("Nieprawidłowy stan służb");
    services[def.id] = { level: raw.level, funded: raw.funded };
  }

  if (!Array.isArray(source.gangs) || source.gangs.length > 8)
    throw Error("Nieprawidłowe gangi");
  const gangIds = new Set<string>();
  const gangs = source.gangs.map((gang) => {
    if (
      !gang ||
      typeof gang.id !== "string" ||
      !gang.id ||
      gangIds.has(gang.id) ||
      typeof gang.name !== "string" ||
      gang.name.length < 2 ||
      gang.name.length > 60 ||
      !finiteRange(gang.power, 0, 100) ||
      !finiteRange(gang.influence, 0, 100) ||
      !finiteRange(gang.heat, 0, 100) ||
      !finiteRange(gang.createdAt, 0, 1e12)
    )
      throw Error("Nieprawidłowy gang");
    gangIds.add(gang.id);
    return { ...gang };
  });

  if (!Array.isArray(source.civicEvents) || source.civicEvents.length > 8)
    throw Error("Nieprawidłowe wydarzenia miejskie");
  const eventIds = new Set<string>();
  const civicEvents = source.civicEvents.map((event) => {
    if (
      !event ||
      typeof event.id !== "string" ||
      eventIds.has(event.id) ||
      !civicEventTemplates.some((template) => template.id === event.templateId) ||
      !finiteRange(event.createdAt, 0, 1e12) ||
      !finiteRange(event.expiresAt, event.createdAt, 1e12) ||
      (event.gangId !== undefined && !gangIds.has(event.gangId))
    )
      throw Error("Nieprawidłowe wydarzenie miejskie");
    eventIds.add(event.id);
    return { ...event };
  });

  for (const value of [source.nextCivicEvent, source.nextCivicMaintenance])
    if (!finiteRange(value, 0, 1e12)) throw Error("Nieprawidłowy harmonogram miejski");
  for (const value of [source.nextGangId, source.nextCivicEventId])
    if (!Number.isInteger(value) || (value ?? 0) < 1 || (value ?? 0) > 1e9)
      throw Error("Nieprawidłowy licznik miejski");

  Object.assign(state, {
    ...defaults,
    civicVersion: 1 as const,
    order: source.order,
    crime: source.crime,
    fireRisk: source.fireRisk,
    publicTrust: source.publicTrust,
    services,
    gangs,
    civicEvents,
    nextCivicEvent: source.nextCivicEvent,
    nextCivicMaintenance: source.nextCivicMaintenance,
    nextGangId: source.nextGangId,
    nextCivicEventId: source.nextCivicEventId,
  });
  return state;
}

export function freshGame(now = Date.now()): CivicGameState {
  return hydrateCivic(freshProgressionGame(now));
}

export function parseSave(raw: string): CivicGameState {
  const source = JSON.parse(raw) as Partial<CivicState>;
  return hydrateCivic(parseProgressionSave(raw), source);
}

export function advance(s: CivicGameState, seconds: number) {
  const before = s.elapsed;
  advanceProgression(s, seconds);
  const elapsed = Math.max(0, s.elapsed - before);
  advanceCivicMetrics(s, elapsed);
  processCivicSchedule(s);
}
