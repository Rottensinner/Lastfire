import { test } from "node:test";
import assert from "node:assert/strict";
import { researches, resources } from "../src/data";
import {
  advance,
  advanceSettlement,
  canFoundSatellite,
  collectRegionalGoods,
  currentSettlementTier,
  foundSatellite,
  freshGame,
  parseSave,
  satelliteLimit,
  satelliteRates,
} from "../src/progression";

const rich = () => {
  const s = freshGame();
  s.researched = researches.map((r) => r.id);
  for (const resource of resources) s.resources[resource.id] = 100_000;
  for (const building of Object.values(s.buildings)) building.level = 10;
  s.population = 280;
  for (const resource of resources) s.resources[resource.id] = 1_000;
  return s;
};

test("nowa gra zaczyna jako Ognisko", () => {
  const s = freshGame();
  assert.equal(currentSettlementTier(s).id, "camp");
  assert.equal(s.satellites.length, 0);
  assert.equal(satelliteLimit(s), 0);
});

test("awans osady jest sekwencyjny i odblokowuje region przy małym miasteczku", () => {
  const s = rich();
  assert.equal(currentSettlementTier(s).id, "camp");
  for (let i = 0; i < 5; i++) assert.ok(advanceSettlement(s));
  assert.equal(currentSettlementTier(s).id, "small-town");
  assert.equal(satelliteLimit(s), 1);
});

test("małe miasteczko może założyć zależną wieś, która produkuje towary", () => {
  const s = rich();
  for (let i = 0; i < 5; i++) advanceSettlement(s);
  assert.ok(canFoundSatellite(s, "farming"));
  assert.ok(foundSatellite(s, "farming"));
  assert.equal(s.satellites.length, 1);
  assert.ok((satelliteRates(s).food ?? 0) > 0);
  advance(s, 100);
  assert.ok((s.regionalStock.food ?? 0) > 0);
  const before = s.resources.food;
  assert.ok(collectRegionalGoods(s));
  assert.ok(s.resources.food > before);
});

test("limit satelitów rośnie razem z rangą głównej osady", () => {
  const s = rich();
  for (let i = 0; i < 5; i++) advanceSettlement(s);
  assert.ok(foundSatellite(s, "forestry"));
  assert.equal(canFoundSatellite(s, "mining"), false);
  assert.ok(advanceSettlement(s));
  assert.equal(currentSettlementTier(s).id, "town");
  assert.equal(satelliteLimit(s), 2);
  assert.ok(canFoundSatellite(s, "mining"));
});

test("zapis zachowuje poziom osady, wsie i magazyn regionalny", () => {
  const s = rich();
  for (let i = 0; i < 5; i++) advanceSettlement(s);
  foundSatellite(s, "trade");
  advance(s, 75);
  const restored = parseSave(JSON.stringify(s));
  assert.equal(restored.settlementTier, s.settlementTier);
  assert.deepEqual(restored.satellites, s.satellites);
  assert.deepEqual(restored.regionalStock, s.regionalStock);
});
