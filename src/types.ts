export type Resource =
  | "wood"
  | "hardwood"
  | "noblewood"
  | "planks"
  | "hardplanks"
  | "nobleplanks"
  | "stone"
  | "bricks"
  | "clay"
  | "pottery"
  | "ironore"
  | "copperore"
  | "tinore"
  | "charcoal"
  | "coal"
  | "iron"
  | "copper"
  | "bronze"
  | "food"
  | "water"
  | "leather"
  | "flax"
  | "cloth"
  | "rope"
  | "grain"
  | "flour"
  | "herbs"
  | "medicine"
  | "stoneTools"
  | "bronzeTools"
  | "tools"
  | "packs"
  | "maps"
  | "seeds"
  | "relics"
  | "gold"
  | "knowledge";
export type Stock = Record<Resource, number>;
export type Cost = Partial<Stock>;
export type Tool = "stoneTools" | "bronzeTools" | "tools";
export interface Recipe {
  id: string;
  name: string;
  input: Cost;
  output: Cost;
  research?: string;
  tool?: boolean;
  minTool?: Tool;
}
export interface Building {
  id: string;
  name: string;
  icon: string;
  group: string;
  description: string;
  cost: Cost;
  recipes: Recipe[];
  research?: string;
  housing?: number;
  duration: number;
}
export interface Job {
  workers: number;
  equipment: Partial<Record<Tool, number>>;
  limit: number;
  paused: boolean;
}
export interface BuildingState {
  level: number;
  jobs: Record<string, Job>;
}
export interface Research {
  id: string;
  name: string;
  icon: string;
  branch: string;
  description: string;
  duration: number;
  cost: Cost;
  requires: string[];
  kind: "research" | "specialist" | "find";
  bonus?: { buildings: string[]; percent: number };
  source?: string;
}
export interface Expedition {
  id: string;
  name: string;
  description: string;
  duration: number;
  cost: Cost;
  reward: Cost;
  workers: number;
  requires: string;
  find?: string;
  gear?: Cost;
}
export interface Task {
  id: string;
  remaining: number;
  duration: number;
}
export interface BuildTask extends Task {
  level: number;
  cost: Cost;
}
export interface EventDef {
  id: string;
  name: string;
  description: string;
  requires?: string;
  after: number;
  cost: Cost;
  people?: number;
  discovery?: string;
  reward?: Cost;
}
export type MilitaryRole = "militia" | "spearmen" | "archers" | "scouts";
export type MilitaryLocation = "home" | string;
export interface MilitaryUnit {
  id: string;
  name: string;
  role: MilitaryRole;
  people: number;
  wounded: number;
  training: number;
  morale: number;
  weapons: number;
  armor: number;
  location: MilitaryLocation;
}
export interface MilitaryTargetState {
  id: string;
  intel: number;
  security: number;
  cleared: boolean;
  outpost: boolean;
}
export interface MilitaryMission {
  id: string;
  targetId: string;
  unitIds: string[];
  remaining: number;
  duration: number;
  supplies: Cost;
}
export interface MilitaryReport {
  id: number;
  title: string;
  text: string;
  createdAt: number;
}
export interface MilitaryState {
  militaryVersion: 1;
  units: MilitaryUnit[];
  targets: MilitaryTargetState[];
  mission: MilitaryMission | null;
  reports: MilitaryReport[];
  nextUnitId: number;
  nextReportId: number;
  outposts: number;
}
export interface GameState {
  version: 2;
  resources: Stock;
  buildings: Record<string, BuildingState>;
  population: number;
  researched: string[];
  research: Task | null;
  expedition: (Task & { cargo: Cost }) | null;
  loot: Cost;
  buildQueue: BuildTask[];
  builders: number;
  reserves: Cost;
  elapsed: number;
  fraction: number;
  savedAt: number;
  log: string[];
  events: string[];
  seenEvents: string[];
  nextVisitors: number;
  reputation: number;
  orders: string[];
  market: Record<string, number>;
  marketTimer: number;
  autoEquip: boolean;
  military: MilitaryState;
}
