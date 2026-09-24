import { collectLoot, freeWorkers, has, housing, log, pay } from "./engine";
import type { Cost, GameState, MilitaryMission, MilitaryRole, MilitaryUnit, Resource } from "./types";

export interface OperationDef {
  id: string;
  targetId: string;
  name: string;
  kind: "patrol" | "scout" | "escort" | "raid" | "assault" | "rescue";
  duration: number;
  threat: number;
  requires: string;
  description: string;
  reward: Cost;
  reputation?: number;
  rescued?: number;
}

export const militaryTargets = [
  { id: "old-road", name: "Stary trakt", description: "Leśny szlak między osadami.", threat: 5 },
  { id: "looter-camp", name: "Obóz szabrowników", description: "Ruchoma banda zajęła opuszczone gospodarstwo.", threat: 24 },
  { id: "hostile-outpost", name: "Wrogi posterunek", description: "Umocniony punkt kontrolujący dalszy szlak.", threat: 48 },
] as const;

export const militaryOperations: OperationDef[] = [
  { id: "road-patrol", targetId: "old-road", name: "Patrol szlaku", kind: "patrol", duration: 75, threat: 5, requires: "watch", description: "Ogranicza napady i zwiększa bezpieczeństwo Starego Traktu.", reward: { gold: 3 } },
  { id: "road-scout", targetId: "old-road", name: "Rozpoznanie traktu", kind: "scout", duration: 90, threat: 4, requires: "watch", description: "Zbiera informacje o ruchu i zagrożeniach na szlaku.", reward: { maps: 1 } },
  { id: "road-escort", targetId: "old-road", name: "Eskorta karawany", kind: "escort", duration: 120, threat: 9, requires: "militia", description: "Chroni transport. Wymaga co najmniej jednego oddziału.", reward: { gold: 18 }, reputation: 1 },
  { id: "camp-scout", targetId: "looter-camp", name: "Obserwacja obozu", kind: "scout", duration: 150, threat: 10, requires: "militia", description: "Oszacuj liczebność i uzbrojenie przed atakiem.", reward: { maps: 1, knowledge: 4 } },
  { id: "camp-rescue", targetId: "looter-camp", name: "Uwolnij jeńców", kind: "rescue", duration: 180, threat: 16, requires: "militia", description: "Wyprowadź ocalałych przetrzymywanych przez szabrowników. Wymaga rozpoznania i wolnych miejsc w domach.", reward: { food: 15, medicine: 2 }, rescued: 2 },
  { id: "camp-raid", targetId: "looter-camp", name: "Wypędź szabrowników", kind: "raid", duration: 210, threat: 24, requires: "militia", description: "Uderz na obóz i zabezpiecz teren. Rozpoznanie zmniejsza ryzyko.", reward: { wood: 45, food: 28, gold: 20 } },
  { id: "outpost-scout", targetId: "hostile-outpost", name: "Rozpoznanie posterunku", kind: "scout", duration: 240, threat: 15, requires: "military_logistics", description: "Poznaj fortyfikacje i siłę obrońców.", reward: { maps: 2, knowledge: 8 } },
  { id: "outpost-assault", targetId: "hostile-outpost", name: "Zdobądź posterunek", kind: "assault", duration: 420, threat: 48, requires: "military_logistics", description: "Operacja wysokiego ryzyka. Wymaga dobrego rozpoznania i silnego oddziału.", reward: { bricks: 50, iron: 15, gold: 45 } },
];

const targetState = (s: GameState, id: string) => s.military.targets.find((target) => target.id === id)!;
const unitById = (s: GameState, id: string) => s.military.units.find((unit) => unit.id === id);
const activePeople = (unit: MilitaryUnit) => unit.people - unit.wounded;
const roleName: Record<MilitaryRole, string> = { militia: "Milicja", spearmen: "Włócznicy", archers: "Łucznicy", scouts: "Zwiadowcy" };

export const militaryUnlocked = (s: GameState) => has(s, "watch");
export const availableOperations = (s: GameState) => militaryOperations.filter((operation) => {
  if (!has(s, operation.requires)) return false;
  if (operation.id === "road-escort") return ((s as GameState & { satellites?: unknown[] }).satellites?.length ?? 0) > 0;
  if (operation.id === "camp-raid") return targetState(s, "looter-camp").intel > 0;
  if (operation.id === "camp-rescue") return targetState(s, "looter-camp").intel > 0 && !targetState(s, "looter-camp").cleared && housing(s) - s.population >= (operation.rescued ?? 0);
  if (operation.id === "outpost-assault") return targetState(s, "hostile-outpost").intel >= 2;
  return true;
});

export const militaryStrength = (s: GameState, unit: MilitaryUnit) => {
  const roleBonus = unit.role === "spearmen" ? 1.15 : unit.role === "archers" ? 1.2 : unit.role === "scouts" ? 0.8 : 1;
  const gearBonus = (unit.weapons / Math.max(1, unit.people)) * (has(s, "iron_arms") ? 1.15 : has(s, "bronzework") ? 0.8 : 0.45)
    + (unit.armor / Math.max(1, unit.people)) * 0.4;
  return activePeople(unit) * roleBonus * (1 + unit.training * 0.12) * (0.65 + unit.morale / 200) * (1 + gearBonus);
};

export function formUnit(s: GameState, role: MilitaryRole, people: number, name?: string) {
  if (!has(s, "militia") || !Number.isInteger(people) || people < 2 || people > 40 || freeWorkers(s) < people) return false;
  if (role === "archers" && !has(s, "bows")) return false;
  if (role === "spearmen" && !has(s, "spears")) return false;
  if (role === "scouts" && !has(s, "scouting")) return false;
  const id = `unit-${s.military.nextUnitId++}`;
  s.military.units.push({ id, name: (name?.trim() || `${roleName[role]} ${s.military.nextUnitId - 1}`).slice(0, 40), role, people, wounded: 0, training: 0, morale: 70, weapons: 0, armor: 0, location: "home" });
  log(s, `Utworzono oddział: ${s.military.units.at(-1)!.name} (${people} osób).`);
  return true;
}

export function disbandUnit(s: GameState, id: string) {
  if (s.military.mission?.unitIds.includes(id)) return false;
  const index = s.military.units.findIndex((unit) => unit.id === id);
  if (index < 0) return false;
  if (s.military.units[index].wounded > 0) return false;
  const [unit] = s.military.units.splice(index, 1);
  log(s, `Oddział ${unit.name} rozwiązano; ${unit.people} osób wróciło do osady.`);
  return true;
}

export function equipUnit(s: GameState, id: string, equipment: "weapons" | "armor") {
  const unit = unitById(s, id);
  if (!unit || s.military.mission?.unitIds.includes(id)) return false;
  const missing = unit.people - unit[equipment];
  if (missing <= 0) return false;
  const advanced = has(s, "iron_arms");
  const bronze = !advanced && has(s, "bronzework");
  const perPerson: Cost = equipment === "weapons"
    ? advanced ? { iron: 1, tools: 0.25 } : bronze ? { bronze: 1, wood: 0.4 } : { wood: 2, stone: 1 }
    : advanced ? { iron: 0.7, leather: 0.5 } : bronze ? { bronze: 0.6, leather: 1 } : { leather: 1, wood: 1 };
  const cost = Object.fromEntries(Object.entries(perPerson).map(([key, value]) => [key, Math.ceil(value * missing)])) as Cost;
  if (!pay(s, cost)) return false;
  unit[equipment] += missing;
  return true;
}

export function trainUnit(s: GameState, id: string) {
  const unit = unitById(s, id);
  if (!unit || unit.training >= 3 || s.military.mission?.unitIds.includes(id)) return false;
  const factor = unit.training + 1;
  if (!pay(s, { food: unit.people * 3 * factor, knowledge: Math.max(2, unit.people * factor) })) return false;
  unit.training++;
  unit.morale = Math.min(100, unit.morale + 8);
  log(s, `${unit.name} ukończył szkolenie (${unit.training}/3).`);
  return true;
}

export function relocateUnit(s: GameState, id: string, location: string) {
  const unit = unitById(s, id);
  if (!unit || s.military.mission?.unitIds.includes(id)) return false;
  const settlements = (s as GameState & { satellites?: { id: string; security: number }[] }).satellites ?? [];
  const satellite = settlements.find((item) => item.id === location);
  const target = s.military.targets.find((item) => item.id === location);
  if (location !== "home" && !(target?.outpost && has(s, "fortifications")) && !(satellite && has(s, "militia"))) return false;
  const oldSatellite = settlements.find((item) => item.id === unit.location);
  if (oldSatellite) oldSatellite.security = Math.max(0, oldSatellite.security - Math.min(30, Math.max(0, activePeople(unit) * 1.5)));
  unit.location = location;
  const newSatellite = settlements.find((item) => item.id === location);
  if (newSatellite) newSatellite.security = Math.min(100, newSatellite.security + Math.min(30, Math.max(0, activePeople(unit) * 1.5)));
  return true;
}

export function buildOutpost(s: GameState, targetId: string) {
  const target = targetState(s, targetId);
  if (!target || !has(s, "fortifications") || target.outpost || s.military.outposts >= 6 || (targetId !== "old-road" && !target.cleared)) return false;
  if (!pay(s, { planks: 70, bricks: 35, rope: 12, food: 30 })) return false;
  target.outpost = true;
  s.military.outposts++;
  target.security = Math.min(100, target.security + 25);
  log(s, `Zbudowano posterunek w rejonie: ${militaryTargets.find((item) => item.id === targetId)!.name}.`);
  return true;
}

export function startMilitaryOperation(s: GameState, operationId: string, unitIds: string[]) {
  const operation = availableOperations(s).find((item) => item.id === operationId);
  if (!operation || s.military.mission || !unitIds.length || new Set(unitIds).size !== unitIds.length) return false;
  const units = unitIds.map((id) => unitById(s, id));
  if (units.some((unit) => !unit || unit.wounded >= unit.people || s.military.mission?.unitIds.includes(unit.id))) return false;
  const selected = units as MilitaryUnit[];
  const target = targetState(s, operation.targetId);
  const satelliteIds = ((s as GameState & { satellites?: { id: string }[] }).satellites ?? []).map(item => item.id);
  if (selected.some((unit) => unit.location !== "home" && unit.location !== operation.targetId && !satelliteIds.includes(unit.location))) return false;
  const stationed = selected.every((unit) => unit.location === operation.targetId || satelliteIds.includes(unit.location));
  if (selected.every((unit) => unit.location === operation.targetId) && !target.outpost) return false;
  if ((operation.kind === "raid" || operation.kind === "rescue") && target.intel < 1 || operation.kind === "assault" && target.intel < 2) return false;
  const people = selected.reduce((n, unit) => n + activePeople(unit), 0);
  if (people < (operation.kind === "patrol" || operation.kind === "scout" ? 1 : 3)) return false;
  const scale = operation.duration / 120;
  const supplies: Cost = { food: Math.ceil(people * scale * 0.7), water: Math.ceil(people * scale * 0.45) };
  if (operation.kind === "raid" || operation.kind === "assault" || operation.kind === "rescue") supplies.medicine = Math.max(1, Math.ceil(people * 0.04));
  if (!pay(s, supplies)) return false;
  const duration = Math.max(45, Math.ceil(operation.duration * (has(s, "military_logistics") ? 0.8 : 1) * (stationed ? 0.72 : 1)));
  s.military.mission = { id: operation.id, targetId: operation.targetId, unitIds: [...unitIds], remaining: duration, duration, supplies };
  for (const unit of selected) unit.morale = Math.max(0, unit.morale - (operation.kind === "raid" || operation.kind === "assault" ? 3 : 1));
  log(s, `Rozpoczęto operację „${operation.name}”. Zapasy przydzielono oddziałom.`);
  return true;
}

function report(s: GameState, title: string, text: string) {
  s.military.reports.unshift({ id: s.military.nextReportId++, title, text, createdAt: s.elapsed });
  s.military.reports = s.military.reports.slice(0, 30);
  log(s, `Raport wojskowy: ${title}.`);
}

function resolveOperation(s: GameState, mission: MilitaryMission) {
  const operation = militaryOperations.find((item) => item.id === mission.id)!;
  const units = mission.unitIds.map((id) => unitById(s, id)).filter((unit): unit is MilitaryUnit => !!unit);
  const target = targetState(s, mission.targetId);
  const strength = units.reduce((total, unit) => total + militaryStrength(s, unit), 0);
  const threat = Math.max(1, operation.threat * (operation.kind === "raid" || operation.kind === "assault" || operation.kind === "rescue" ? 1 - target.intel * 0.14 : 1));
  if (operation.kind === "scout") {
    target.intel = Math.min(3, target.intel + (units.some((unit) => unit.role === "scouts") ? 2 : 1));
    target.security = Math.min(100, target.security + 2);
    for (const unit of units) unit.morale = Math.min(100, unit.morale + 3);
    for (const [key, value] of Object.entries(operation.reward)) s.loot[key as Resource] = (s.loot[key as Resource] ?? 0) + value;
    collectLoot(s);
    report(s, `${operation.name}: powodzenie`, `Zebrano informacje. Rozpoznanie rejonu: ${target.intel}/3. Oddział wrócił bez strat.`);
    return;
  }
  const ratio = strength / threat;
  if (ratio >= 1) {
    target.security = Math.min(100, target.security + (operation.kind === "patrol" ? 18 : 10));
    if (operation.kind === "raid" || operation.kind === "assault") target.cleared = true;
    for (const unit of units) unit.morale = Math.min(100, unit.morale + 12);
    for (const [key, value] of Object.entries(operation.reward)) {
      s.loot[key as Resource] = (s.loot[key as Resource] ?? 0) + value;
    }
    s.reputation += operation.reputation ?? 0;
    const rescued = Math.min(operation.rescued ?? 0, Math.max(0, housing(s) - s.population));
    s.population += rescued;
    collectLoot(s);
    const losses = applyLosses(s, units, Math.max(0.04, 0.16 - (ratio - 1) * 0.025), 0.04);
    const outcome = operation.kind === "rescue" ? `Uwolniono ${rescued} osób.` : "Teren zabezpieczony; łupy odebrane.";
    report(s, `${operation.name}: zwycięstwo`, `Siła ${strength.toFixed(0)} wobec zagrożenia ${threat.toFixed(0)}. Ranni: ${losses.wounded}; polegli: ${losses.casualties}. ${outcome}`);
  } else if (ratio >= 0.68) {
    target.security = Math.max(0, target.security - 4);
    const losses = applyLosses(s, units, 0.22, 0.08);
    for (const unit of units) unit.morale = Math.max(5, unit.morale - 15);
    report(s, `${operation.name}: odwrót`, `Oddział wycofał się po starciu (siła ${strength.toFixed(0)} / zagrożenie ${threat.toFixed(0)}). Ranni: ${losses.wounded}; polegli: ${losses.casualties}; cel pozostaje aktywny.`);
  } else {
    target.security = Math.max(0, target.security - 10);
    const losses = applyLosses(s, units, 0.26, 0.18);
    for (const unit of units) unit.morale = Math.max(0, unit.morale - 25);
    report(s, `${operation.name}: porażka`, `Przeciwnik okazał się silniejszy (siła ${strength.toFixed(0)} / zagrożenie ${threat.toFixed(0)}). Polegli: ${losses.casualties}; ranni: ${losses.wounded}; pozostali się wycofali.`);
  }
}

function applyLosses(s: GameState, units: MilitaryUnit[], woundRatio: number, casualtyRatio: number) {
  let wounded = 0;
  let casualties = 0;
  for (const unit of units) {
    const available = activePeople(unit);
    const dead = Math.min(available, Math.floor(available * casualtyRatio));
    const hurt = Math.min(available - dead, Math.ceil(available * woundRatio));
    unit.people -= dead;
    unit.wounded += hurt;
    unit.weapons = Math.min(unit.weapons, unit.people);
    unit.armor = Math.min(unit.armor, unit.people);
    wounded += hurt;
    casualties += dead;
  }
  s.population = Math.max(1, s.population - casualties);
  s.military.units = s.military.units.filter((unit) => unit.people > 0);
  return { wounded, casualties };
}

export function advanceMilitary(s: GameState, seconds: number) {
  const elapsed = Math.max(0, seconds);
  const mission = s.military.mission;
  let timeAtHome = elapsed;
  if (mission) {
    timeAtHome = Math.max(0, elapsed - mission.remaining);
    mission.remaining -= elapsed;
    if (mission.remaining <= 0) {
      resolveOperation(s, mission);
      s.military.mission = null;
    } else timeAtHome = 0;
  }
  for (const unit of s.military.units) {
    if (unit.location === "home" && timeAtHome > 0) unit.morale = Math.min(100, unit.morale + timeAtHome / 180);
    if (unit.location === "home" && unit.wounded > 0 && timeAtHome >= 120) {
      const healed = Math.min(unit.wounded, Math.floor(timeAtHome / 120) * (has(s, "herbalism") && s.resources.medicine > 0 ? 2 : 1));
      const medicine = has(s, "herbalism") ? Math.min(s.resources.medicine, Math.ceil(healed / 2)) : 0;
      s.resources.medicine -= medicine;
      unit.wounded -= healed;
      if (healed) report(s, "Leczenie rannych", `${unit.name}: ${healed} osób wróciło do służby.`);
    }
  }
}

export const unitRoleName = (role: MilitaryRole) => roleName[role];
export const operationName = (id: string) => militaryOperations.find((operation) => operation.id === id)?.name ?? id;
export function homeGarrison(s: GameState) {
  return s.military.units.filter((unit) => unit.location === "home").reduce((total, unit) => total + activePeople(unit), 0);
}
