import {
  buildings,
  resources,
  researches,
  expeditions,
  events,
  marketGoods,
  orders,
} from "./data";
import type {
  GameState,
  Stock,
  Cost,
  Resource,
  Tool,
  Job,
  Recipe,
  MilitaryState,
} from "./types";
export const MAX_OFFLINE = 28800;
export const toolTiers: Tool[] = ["stoneTools", "bronzeTools", "tools"];
export const toolPower: Record<Tool, number> = {
  stoneTools: 1.5,
  bronzeTools: 2,
  tools: 3,
};
export const stock = (): Stock =>
  Object.fromEntries(resources.map((r) => [r.id, 0])) as Stock;
const newJob = (): Job => ({
  workers: 0,
  equipment: {},
  limit: 0,
  paused: false,
});
export function freshGame(now = Date.now()): GameState {
  const s: GameState = {
    version: 2,
    resources: stock(),
    buildings: {},
    population: 6,
    researched: [],
    research: null,
    expedition: null,
    loot: {},
    buildQueue: [],
    builders: 0,
    reserves: {},
    elapsed: 0,
    fraction: 0,
    savedAt: now,
    log: [
      "Sześć osób rozpala ognisko. Odkryj narzędzia i zbuduj pierwszy warsztat.",
    ],
    events: [],
    seenEvents: [],
    nextVisitors: 45,
    reputation: 0,
    orders: [],
    market: {},
    marketTimer: 300,
    autoEquip: true,
    military: {
      militaryVersion: 1,
      units: [],
      targets: [
        { id: "old-road", intel: 0, security: 25, cleared: false, outpost: false },
        { id: "looter-camp", intel: 0, security: 0, cleared: false, outpost: false },
        { id: "hostile-outpost", intel: 0, security: 0, cleared: false, outpost: false },
      ],
      mission: null,
      reports: [],
      nextUnitId: 1,
      nextReportId: 1,
      outposts: 0,
    },
  };
  Object.assign(s.resources, { wood: 20, stone: 15, food: 35, water: 35 });
  for (const b of buildings)
    s.buildings[b.id] = {
      level: ["gatherers", "fire"].includes(b.id) ? 1 : 0,
      jobs: Object.fromEntries(b.recipes.map((r) => [r.id, newJob()])),
    };
  for (const id of ["wood", "stone", "food", "water"])
    s.buildings.gatherers.jobs[id].workers = 1;
  for (const m of marketGoods) s.market[m.id] = 40;
  return s;
}
export const capacity = (s: GameState) =>
  200 + 200 * s.buildings.warehouse.level;
export const housing = (s: GameState) =>
  6 +
  buildings.reduce(
    (sum, b) => sum + (b.housing ?? 0) * s.buildings[b.id].level,
    0,
  );
export const has = (s: GameState, id?: string) =>
  !id || s.researched.includes(id);
export const unlocked = (s: GameState, id: string) =>
  has(s, buildings.find((b) => b.id === id)?.research);
export const visibleResearch = (s: GameState, id: string) => {
  const r = researches.find((r) => r.id === id);
  return !!r && (has(s, id) || r.requires.every((p) => has(s, p)));
};
export const workersIn = (s: GameState, id: string) =>
  Object.values(s.buildings[id].jobs).reduce((n, j) => n + j.workers, 0);
export const maxWorkers = (s: GameState, id: string) =>
  s.buildings[id].level * (id === "gatherers" ? 8 : 4);
export const expeditionCrew = (s: GameState) =>
  expeditions.find((e) => e.id === s.expedition?.id)?.workers ?? 0;
export const freeWorkers = (s: GameState) =>
  s.population -
  s.builders -
  expeditionCrew(s) -
  s.military.units.reduce((n, unit) => n + unit.people, 0) -
  buildings.reduce((n, b) => n + workersIn(s, b.id), 0);
export const canPay = (s: GameState, c: Cost) =>
  Object.entries(c).every(([k, v]) => s.resources[k as Resource] + 1e-8 >= v);
export function pay(s: GameState, c: Cost) {
  if (!canPay(s, c)) return false;
  for (const [k, v] of Object.entries(c))
    s.resources[k as Resource] = Math.max(0, s.resources[k as Resource] - v);
  return true;
}
export function log(s: GameState, message: string) {
  s.log.unshift(message);
  s.log = s.log.slice(0, 40);
}
export const upgradeCost = (s: GameState, id: string): Cost =>
  Object.fromEntries(
    Object.entries(buildings.find((b) => b.id === id)!.cost).map(([k, v]) => [
      k,
      Math.ceil(v * 1.55 ** s.buildings[id].level),
    ]),
  );
export function queueBuild(s: GameState, id: string) {
  const b = buildings.find((b) => b.id === id);
  if (
    !b ||
    !unlocked(s, id) ||
    s.buildings[id].level >= 20 ||
    s.buildQueue.some((q) => q.id === id) ||
    s.buildQueue.length >= 5
  )
    return false;
  const cost = upgradeCost(s, id);
  if (!pay(s, cost)) return false;
  const duration = b.duration * (1 + s.buildings[id].level * 0.3);
  s.buildQueue.push({
    id,
    level: s.buildings[id].level + 1,
    remaining: duration,
    duration,
    cost,
  });
  return true;
}
export function cancelBuild(s: GameState, index: number) {
  const q = s.buildQueue[index];
  if (!q) return;
  for (const [k, v] of Object.entries(q.cost))
    s.loot[k as Resource] = (s.loot[k as Resource] ?? 0) + v;
  s.buildQueue.splice(index, 1);
  collectLoot(s);
}
export function moveBuild(s: GameState, index: number) {
  if (index > 0 && index < s.buildQueue.length)
    [s.buildQueue[index - 1], s.buildQueue[index]] = [
      s.buildQueue[index],
      s.buildQueue[index - 1],
    ];
}
export function assignBuilder(s: GameState, delta: number) {
  if (delta === 1 && freeWorkers(s) > 0 && s.builders < 6) {
    s.builders++;
    return true;
  }
  if (delta === -1 && s.builders > 0) {
    s.builders--;
    return true;
  }
  return false;
}
export function assign(
  s: GameState,
  id: string,
  recipe: string,
  delta: number,
) {
  const b = s.buildings[id],
    d = buildings.find((b) => b.id === id),
    r = d?.recipes.find((r) => r.id === recipe),
    j = b?.jobs[recipe];
  if (!j || !r || !b.level || !has(s, r.research)) return false;
  if (
    delta === 1 &&
    freeWorkers(s) > 0 &&
    workersIn(s, id) < maxWorkers(s, id)
  ) {
    j.workers++;
    if (s.autoEquip) equipBest(s, id, recipe);
    return true;
  }
  if (delta === -1 && j.workers > 0) {
    j.workers--;
    releaseExcess(s, j);
    return true;
  }
  return false;
}
function releaseExcess(s: GameState, j: Job) {
  let n = Object.values(j.equipment).reduce((a, b) => a + b, 0) - j.workers;
  for (const t of toolTiers) {
    while (n > 0 && (j.equipment[t] ?? 0) > 0) {
      j.equipment[t]!--;
      s.resources[t]++;
      n--;
    }
  }
}
export function removeEquipment(s: GameState, id: string, rid: string) {
  const j = s.buildings[id].jobs[rid];
  for (const t of toolTiers) {
    s.resources[t] += j.equipment[t] ?? 0;
    j.equipment[t] = 0;
  }
}
export function equipBest(s: GameState, id: string, rid: string) {
  const r = buildings
    .find((b) => b.id === id)
    ?.recipes.find((r) => r.id === rid);
  if (!r?.tool) return;
  const j = s.buildings[id].jobs[rid];
  removeEquipment(s, id, rid);
  let count = j.workers;
  for (const t of [...toolTiers].reverse()) {
    if (r.minTool && toolTiers.indexOf(t) < toolTiers.indexOf(r.minTool))
      continue;
    const n = Math.min(count, Math.floor(s.resources[t] + 1e-8));
    j.equipment[t] = n;
    s.resources[t] = Math.max(0, s.resources[t] - n);
    count -= n;
  }
}
export function multiplier(s: GameState, id: string) {
  let bonus =
    Math.max(0, s.buildings.fire.level - 1) * 0.05 +
    (has(s, "organization") ? 0.1 : 0);
  for (const r of researches)
    if (has(s, r.id) && r.bonus?.buildings.includes(id))
      bonus += r.bonus.percent / 100;
  return 1 + bonus;
}
export function effectiveWorkers(j: Job, r: Recipe) {
  let equipped = 0,
    power = 0;
  for (const t of toolTiers) {
    const n = j.equipment[t] ?? 0;
    equipped += n;
    if (!r.minTool || toolTiers.indexOf(t) >= toolTiers.indexOf(r.minTool))
      power += n * toolPower[t];
  }
  return power + (r.minTool ? 0 : Math.max(0, j.workers - equipped));
}
export function jobStatus(s: GameState, id: string, r: Recipe) {
  const j = s.buildings[id].jobs[r.id];
  if (!s.buildings[id].level) return "Niewybudowany";
  if (j.paused) return "Wstrzymano";
  if (!j.workers) return "Brak pracowników";
  if (!effectiveWorkers(j, r)) return "Brak narzędzi";
  if (
    Object.keys(r.output).some(
      (k) =>
        s.resources[k as Resource] >=
        Math.min(capacity(s), j.limit || Infinity) - 1e-8,
    )
  )
    return j.limit ? "Osiągnięto limit" : "Magazyn pełny";
  if (
    Object.entries(r.input).some(
      ([k]) =>
        s.resources[k as Resource] <= (s.reserves[k as Resource] ?? 0) + 1e-8,
    )
  )
    return "Brak surowca / rezerwa";
  return "Pracuje";
}
export function productionStatus(s: GameState, id: string) {
  if (!s.buildings[id].level) return "Niewybudowany";
  return buildings.find((b) => b.id === id)!.recipes.length
    ? `${workersIn(s, id)} pracowników`
    : "Działa";
}
export function startResearch(s: GameState, id: string) {
  const r = researches.find((r) => r.id === id);
  if (
    !r ||
    r.kind !== "research" ||
    s.research ||
    has(s, id) ||
    !visibleResearch(s, id) ||
    !pay(s, r.cost)
  )
    return false;
  s.research = { id, remaining: r.duration, duration: r.duration };
  return true;
}
function discover(s: GameState, id: string) {
  if (has(s, id)) return;
  const r = researches.find((r) => r.id === id);
  if (!r) return;
  s.researched.push(id);
  log(s, `Odkrycie: ${r.name}.`);
}
export function startExpedition(
  s: GameState,
  id: string,
  pack = false,
  tools = false,
) {
  const e = expeditions.find((e) => e.id === id);
  if (
    !e ||
    s.expedition ||
    !s.buildings.camp.level ||
    !has(s, e.requires) ||
    freeWorkers(s) < e.workers
  )
    return false;
  const cargo: Cost = { ...e.gear };
  if (pack) cargo.packs = Math.max(cargo.packs ?? 0, 1);
  if (tools) cargo.stoneTools = Math.max(cargo.stoneTools ?? 0, 1);
  const total: Cost = { ...e.cost };
  for (const [k, v] of Object.entries(cargo))
    total[k as Resource] = (total[k as Resource] ?? 0) + v;
  if (!pay(s, total)) return false;
  const duration = Math.ceil(
    e.duration * Math.max(0.75, 1 - (s.buildings.camp.level - 1) * 0.05),
  );
  s.expedition = { id, remaining: duration, duration, cargo };
  return true;
}
export function collectLoot(s: GameState) {
  for (const [k, v] of Object.entries(s.loot)) {
    const key = k as Resource;
    const amount =
      key === "gold"
        ? v
        : Math.min(v, Math.max(0, capacity(s) - s.resources[key]));
    s.resources[key] += amount;
    s.loot[key] = v - amount;
    if (s.loot[key]! < 1e-8) delete s.loot[key];
  }
}
export function canAcceptEvent(s: GameState, id: string) {
  const e = events.find((e) => e.id === id);
  return (
    !!e &&
    s.events.includes(id) &&
    canPay(s, e.cost) &&
    s.population + (e.people ?? 0) <= housing(s)
  );
}
export function resolveEvent(s: GameState, id: string, accept: boolean) {
  const e = events.find((e) => e.id === id);
  if (!e || !s.events.includes(id)) return false;
  if (accept) {
    if (!canAcceptEvent(s, id) || !pay(s, e.cost)) return false;
    s.population += e.people ?? 0;
    if (e.discovery) discover(s, e.discovery);
    for (const [k, v] of Object.entries(e.reward ?? {}))
      s.loot[k as Resource] = (s.loot[k as Resource] ?? 0) + v;
    collectLoot(s);
    log(
      s,
      e.people
        ? `Przyjęto ${e.people} mieszkańców.`
        : `Rozstrzygnięto: ${e.name}.`,
    );
  }
  s.events = s.events.filter((x) => x !== id);
  if (id === "visitors") s.nextVisitors = s.elapsed + 300;
  return true;
}
function checkEvents(s: GameState) {
  if (s.elapsed >= s.nextVisitors && !s.events.includes("visitors"))
    s.events.push("visitors");
  for (const e of events) {
    if (
      e.id === "visitors" ||
      s.seenEvents.includes(e.id) ||
      s.elapsed < e.after ||
      !has(s, e.requires) ||
      (e.id === "merchant" && s.reputation < 3)
    )
      continue;
    s.events.push(e.id);
    s.seenEvents.push(e.id);
  }
}
export const buyPrice = (s: GameState, id: Resource) => {
  const m = marketGoods.find((x) => x.id === id)!;
  return Math.ceil(m.buy * (has(s, "merchant") ? 0.85 : 1) * 10) / 10;
};
export function trade(
  s: GameState,
  id: Resource,
  side: "buy" | "sell",
  qty: number,
) {
  const m = marketGoods.find((m) => m.id === id);
  if (
    !m ||
    !has(s, "trade") ||
    !has(s, m.unlock) ||
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > 1000
  )
    return false;
  if (side === "buy") {
    if (
      (s.market[id] ?? 0) < qty ||
      s.resources[id] + qty > capacity(s) ||
      !pay(s, { gold: buyPrice(s, id) * qty })
    )
      return false;
    s.market[id] -= qty;
    s.resources[id] += qty;
  } else {
    if (!pay(s, { [id]: qty })) return false;
    s.resources.gold += m.sell * qty;
  }
  return true;
}
export function fulfillOrder(s: GameState, id: string) {
  const o = orders.find((o) => o.id === id);
  if (
    !o ||
    !has(s, "trade") ||
    !has(s, o.requires) ||
    s.orders.includes(id) ||
    !pay(s, o.cost)
  )
    return false;
  s.resources.gold += o.gold;
  s.reputation++;
  s.orders.push(id);
  return true;
}
export function rates(s: GameState): Stock {
  const out = stock(),
    hungry = s.resources.food <= 0 || s.resources.water <= 0;
  for (const b of buildings)
    for (const r of b.recipes) {
      if (!has(s, r.research) || jobStatus(s, b.id, r) !== "Pracuje") continue;
      const amount =
        effectiveWorkers(s.buildings[b.id].jobs[r.id], r) *
        multiplier(s, b.id) *
        (hungry ? 0.25 : 1);
      for (const [k, v] of Object.entries(r.output))
        out[k as Resource] += v * amount;
      for (const [k, v] of Object.entries(r.input))
        out[k as Resource] -= v * amount;
    }
  out.food -= s.population * 0.012;
  out.water -= s.population * 0.01;
  return out;
}
// Jeden atomowy krok gospodarki. Części sekundy są przenoszone przez advance().
export function tick(s: GameState) {
  const cap = capacity(s),
    hungry = s.resources.food <= 0 || s.resources.water <= 0;
  if (s.autoEquip && s.elapsed % 5 === 0)
    for (const b of buildings)
      for (const r of b.recipes)
        if (r.tool && s.buildings[b.id].jobs[r.id].workers)
          equipBest(s, b.id, r.id);
  for (const b of buildings) {
    if (!s.buildings[b.id].level) continue;
    for (const r of b.recipes) {
      const j = s.buildings[b.id].jobs[r.id];
      if (!has(s, r.research) || j.paused || !j.workers) continue;
      let amount =
        effectiveWorkers(j, r) * multiplier(s, b.id) * (hungry ? 0.25 : 1);
      for (const [k, v] of Object.entries(r.input))
        amount = Math.min(
          amount,
          Math.max(
            0,
            s.resources[k as Resource] - (s.reserves[k as Resource] ?? 0),
          ) / v,
        );
      for (const [k, v] of Object.entries(r.output))
        amount = Math.min(
          amount,
          Math.max(
            0,
            Math.min(cap, j.limit || Infinity) - s.resources[k as Resource],
          ) / v,
        );
      amount = Math.max(0, amount);
      for (const [k, v] of Object.entries(r.input))
        s.resources[k as Resource] = Math.max(
          0,
          s.resources[k as Resource] - v * amount,
        );
      for (const [k, v] of Object.entries(r.output))
        s.resources[k as Resource] += v * amount;
    }
  }
  s.resources.food = Math.max(0, s.resources.food - s.population * 0.012);
  s.resources.water = Math.max(0, s.resources.water - s.population * 0.01);
  const build = s.buildQueue[0];
  if (build && s.builders) {
    build.remaining -=
      s.builders * (has(s, "organization") ? 1.1 : 1) * (hungry ? 0.25 : 1);
    if (build.remaining <= 0) {
      s.buildings[build.id].level = build.level;
      s.buildQueue.shift();
      log(
        s,
        `Ukończono: ${buildings.find((b) => b.id === build.id)!.name}, poziom ${build.level}.`,
      );
    }
  }
  if (s.research && --s.research.remaining <= 0) {
    discover(s, s.research.id);
    s.research = null;
  }
  if (s.expedition && --s.expedition.remaining <= 0) {
    const e = expeditions.find((e) => e.id === s.expedition!.id)!,
      gear = s.expedition.cargo,
      bonus = 1 + (gear.packs ? 0.25 : 0) + (gear.stoneTools ? 0.15 : 0);
    for (const [k, v] of Object.entries(e.reward))
      s.loot[k as Resource] =
        (s.loot[k as Resource] ?? 0) + Math.floor(v * bonus);
    for (const [k, v] of Object.entries(gear)) s.resources[k as Resource] += v;
    if (e.find) discover(s, e.find);
    s.expedition = null;
    log(s, `Wyprawa „${e.name}” wróciła. Łupy czekają na odbiór.`);
  }
  s.elapsed++;
  checkEvents(s);
  if (--s.marketTimer <= 0) {
    for (const m of marketGoods) s.market[m.id] = 40;
    s.orders = [];
    s.marketTimer = 300;
  }
}
export function advance(s: GameState, seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const total = s.fraction + Math.min(MAX_OFFLINE, seconds);
  const steps = Math.floor(total + 1e-9);
  s.fraction = Math.max(0, total - steps);
  for (let i = 0; i < steps; i++) tick(s);
}
// Starszy zapis jest przenoszony bez odbierania mieszkańców i zasobów.
function migrateV1(v: any): GameState {
  if (
    !v.resources ||
    !v.buildings ||
    !Array.isArray(v.researched) ||
    !Number.isInteger(v.population) ||
    v.population < 1 ||
    v.population > 1000
  )
    throw Error("Niepoprawny zapis v1");
  const s = freshGame();
  for (const r of resources) {
    const n = v.resources[r.id];
    if (n !== undefined) {
      if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1e9)
        throw Error("Niepoprawny surowiec");
      s.resources[r.id] = n;
    }
  }
  const unlock = (id?: string) => {
    if (!id || has(s, id)) return;
    const r = researches.find((r) => r.id === id);
    if (!r) return;
    for (const p of r.requires) unlock(p);
    s.researched.push(id);
  };
  for (const b of buildings) {
    const old = v.buildings[b.id];
    if (!old) continue;
    if (!Number.isInteger(old.level) || old.level < 0 || old.level > 100)
      throw Error("Niepoprawny budynek");
    if (old.level) {
      unlock(b.research);
      s.buildings[b.id].level = old.level;
    }
  }
  for (const id of v.researched)
    unlock(
      id === "metallurgy"
        ? "ironwork"
        : id === "efficiency"
          ? "organization"
          : id,
    );
  for (const b of buildings)
    for (const j of Object.values(s.buildings[b.id].jobs)) j.workers = 0;
  s.population = v.population;
  while (housing(s) < s.population) {
    unlock("shelters");
    s.buildings.shelter.level++;
  }
  s.builders = 0;
  for (const b of buildings) {
    const old = v.buildings[b.id];
    if (old?.workers > 0 && s.buildings[b.id].level) {
      const recipe =
        b.recipes.find((r) => r.id === old.recipe && has(s, r.research)) ??
        b.recipes[0];
      if (recipe)
        s.buildings[b.id].jobs[recipe.id].workers = Math.min(
          Math.floor(old.workers),
          freeWorkers(s),
          maxWorkers(s, b.id),
        );
    }
  }
  for (const id of ["food", "water"])
    if (freeWorkers(s) > 0) s.buildings.gatherers.jobs[id].workers++;
  s.resources.stoneTools += 6;
  s.savedAt =
    typeof v.savedAt === "number" && Number.isFinite(v.savedAt)
      ? v.savedAt
      : Date.now();
  s.elapsed =
    typeof v.elapsed === "number" &&
    Number.isFinite(v.elapsed) &&
    v.elapsed >= 0
      ? v.elapsed
      : 0;
  log(
    s,
    "Przeniesiono osadę ze starszej wersji. Dodano 6 kamiennych kompletów na nowe stanowiska.",
  );
  return s;
}
export function parseSave(raw: string): GameState {
  const v = JSON.parse(raw);
  if (v?.version === 1) return migrateV1(v);
  const n = (x: unknown, max = 1e9) =>
    typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max;
  const integer = (x: unknown, max = 10000) => n(x, max) && Number.isInteger(x);
  const cost = (x: any) =>
    x &&
    typeof x === "object" &&
    !Array.isArray(x) &&
    Object.entries(x).every(
      ([k, v]) => resources.some((r) => r.id === k) && n(v),
    );
  if (
    v?.version !== 2 ||
    !cost(v.resources) ||
    !resources.every((r) => n(v.resources[r.id])) ||
    !v.buildings ||
    !integer(v.population) ||
    v.population < 1 ||
    !integer(v.builders, 6) ||
    !n(v.elapsed) ||
    !integer(v.elapsed, 1e9) ||
    !n(v.fraction, 1) ||
    !n(v.savedAt, 1e15) ||
    !Array.isArray(v.researched) ||
    !v.researched.every((id: any) => researches.some((r) => r.id === id)) ||
    new Set(v.researched).size !== v.researched.length
  )
    throw Error("Nieprawidłowy zapis");
  const s = freshGame();
  s.resources = { ...v.resources };
  s.population = v.population;
  s.builders = v.builders;
  s.researched = [...v.researched];
  s.elapsed = v.elapsed;
  s.fraction = v.fraction;
  s.savedAt = v.savedAt;
  for (const b of buildings) {
    const z = v.buildings[b.id];
    if (
      !z ||
      !integer(z.level, 100) ||
      !z.jobs ||
      (z.level && !unlocked(s, b.id))
    )
      throw Error("Nieprawidłowy budynek");
    s.buildings[b.id].level = z.level;
    for (const r of b.recipes) {
      const j = z.jobs[r.id];
      if (
        !j ||
        !integer(j.workers) ||
        !n(j.limit, 1e6) ||
        typeof j.paused !== "boolean" ||
        !j.equipment ||
        Object.keys(j.equipment).some((t) => !toolTiers.includes(t as Tool)) ||
        Object.values(j.equipment).some((x) => !integer(x)) ||
        Object.values(j.equipment).reduce<number>(
          (sum, x) => sum + Number(x),
          0,
        ) > j.workers ||
        (j.workers && (!z.level || !has(s, r.research)))
      )
        throw Error("Nieprawidłowa praca");
      s.buildings[b.id].jobs[r.id] = {
        workers: j.workers,
        equipment: { ...j.equipment },
        limit: j.limit,
        paused: j.paused,
      };
    }
    if (workersIn(s, b.id) > maxWorkers(s, b.id))
      throw Error("Za wielu pracowników");
  }
  const task = (x: any, kind: "research" | "expedition") => {
    if (x === null) return null;
    const d = (kind === "research" ? researches : expeditions).find(
      (d) => d.id === x?.id,
    );
    if (
      !d ||
      !n(x.remaining) ||
      !n(x.duration) ||
      !x.duration ||
      x.remaining > x.duration ||
      x.duration > d.duration ||
      (kind === "research" &&
        (has(s, d.id) ||
          (d as (typeof researches)[number]).kind !== "research"))
    )
      throw Error("Nieprawidłowe zadanie");
    return { id: x.id, remaining: x.remaining, duration: x.duration };
  };
  s.research = task(v.research, "research");
  const exp = task(v.expedition, "expedition");
  if (exp) {
    if (!cost(v.expedition.cargo)) throw Error("Nieprawidłowy ekwipunek");
    s.expedition = { ...exp, cargo: { ...v.expedition.cargo } };
  }
  if (
    !Array.isArray(v.buildQueue) ||
    v.buildQueue.length > 5 ||
    new Set(v.buildQueue.map((q: any) => q.id)).size !== v.buildQueue.length
  )
    throw Error("Nieprawidłowa kolejka");
  s.buildQueue = v.buildQueue.map((q: any) => {
    if (
      !buildings.some((b) => b.id === q.id) ||
      q.level !== s.buildings[q.id].level + 1 ||
      !n(q.remaining) ||
      !n(q.duration) ||
      !q.duration ||
      q.remaining > q.duration ||
      !cost(q.cost)
    )
      throw Error("Nieprawidłowa budowa");
    return {
      id: q.id,
      level: q.level,
      remaining: q.remaining,
      duration: q.duration,
      cost: { ...q.cost },
    };
  });
  if (
    !cost(v.reserves) ||
    !cost(v.loot) ||
    !n(v.nextVisitors) ||
    !integer(v.reputation, 1e6) ||
    !n(v.marketTimer, 300) ||
    typeof v.autoEquip !== "boolean"
  )
    throw Error("Nieprawidłowe ustawienia");
  for (const key of ["events", "seenEvents"] as const) {
    if (
      !Array.isArray(v[key]) ||
      v[key].length > events.length ||
      !v[key].every((id: any) => events.some((e) => e.id === id)) ||
      new Set(v[key]).size !== v[key].length
    )
      throw Error("Nieprawidłowe wydarzenia");
    s[key] = [...v[key]];
  }
  if (
    !Array.isArray(v.orders) ||
    !v.orders.every((id: any) => orders.some((o) => o.id === id)) ||
    !v.market ||
    marketGoods.some((m) => !n(v.market[m.id], 40))
  )
    throw Error("Nieprawidłowy handel");
  s.reserves = { ...v.reserves };
  s.loot = { ...v.loot };
  s.nextVisitors = v.nextVisitors;
  s.reputation = v.reputation;
  s.orders = [...v.orders];
  s.market = { ...v.market };
  s.marketTimer = v.marketTimer;
  s.autoEquip = v.autoEquip;
  const military: MilitaryState = v.military ?? {
    militaryVersion: 1,
    units: [],
    targets: [
      { id: "old-road", intel: 0, security: 25, cleared: false, outpost: false },
      { id: "looter-camp", intel: 0, security: 0, cleared: false, outpost: false },
      { id: "hostile-outpost", intel: 0, security: 0, cleared: false, outpost: false },
    ],
    mission: null,
    reports: [],
    nextUnitId: 1,
    nextReportId: 1,
    outposts: 0,
  };
  if (
    military.militaryVersion !== 1 ||
    !Array.isArray(military.units) || military.units.length > 100 ||
    !Array.isArray(military.targets) || military.targets.length !== 3 ||
    !Array.isArray(military.reports) || military.reports.length > 30 ||
    !integer(military.nextUnitId, 1e6) || military.nextUnitId < 1 ||
    !integer(military.nextReportId, 1e9) || military.nextReportId < 1 ||
    !integer(military.outposts, 100)
  ) throw Error("Nieprawidłowy stan wojska");
  const unitIds = new Set<string>();
  for (const unit of military.units) {
    if (!unit || typeof unit.id !== "string" || !unit.id || unitIds.has(unit.id) ||
      typeof unit.name !== "string" || unit.name.length < 2 || unit.name.length > 40 ||
      !["militia", "spearmen", "archers", "scouts"].includes(unit.role) ||
      !integer(unit.people, 500) || unit.people < 1 || !integer(unit.wounded, unit.people) ||
      !integer(unit.training, 3) || !integer(unit.morale, 100) ||
      !integer(unit.weapons, unit.people) || !integer(unit.armor, unit.people) ||
      typeof unit.location !== "string" || unit.location.length > 80)
      throw Error("Nieprawidłowy oddział");
    unitIds.add(unit.id);
  }
  const targetIds = new Set(["old-road", "looter-camp", "hostile-outpost"]);
  if (military.targets.some(target => !target || !targetIds.has(target.id) ||
    !integer(target.intel, 3) || !integer(target.security, 100) ||
    typeof target.cleared !== "boolean" || typeof target.outpost !== "boolean") ||
    new Set(military.targets.map(target => target.id)).size !== 3)
    throw Error("Nieprawidłowe zagrożenia");
  if (military.mission && (!targetIds.has(military.mission.targetId) ||
    !Array.isArray(military.mission.unitIds) || !military.mission.unitIds.length ||
    !military.mission.unitIds.every(id => unitIds.has(id)) ||
    new Set(military.mission.unitIds).size !== military.mission.unitIds.length ||
    !n(military.mission.duration) || !military.mission.duration ||
    !n(military.mission.remaining) || military.mission.remaining > military.mission.duration ||
    !cost(military.mission.supplies))) throw Error("Nieprawidłowa operacja");
  for (const report of military.reports) {
    if (!report || !integer(report.id, 1e9) || typeof report.title !== "string" ||
      typeof report.text !== "string" || report.title.length > 100 || report.text.length > 1000 ||
      !n(report.createdAt, 1e9)) throw Error("Nieprawidłowy raport wojskowy");
  }
  s.military = JSON.parse(JSON.stringify(military)) as MilitaryState;
  s.log = Array.isArray(v.log)
    ? v.log
        .filter((x: any) => typeof x === "string")
        .slice(0, 40)
        .map((x: string) => x.slice(0, 500))
    : [];
  if (freeWorkers(s) < 0 || s.population > housing(s))
    throw Error("Nieprawidłowa populacja");
  return s;
}
