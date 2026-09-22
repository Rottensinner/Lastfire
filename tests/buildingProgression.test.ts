import { test } from "node:test";
import assert from "node:assert/strict";
import { resources, researches, buildings } from "../src/data";
import { freshGame } from "../src/progression";
import {
  buildingUpgradeRequirements,
  canQueueStagedUpgrade,
  queueStagedUpgrade,
  stageForLevel,
  stagedUpgradeCost,
  validateBuildingDevelopments,
} from "../src/buildingProgression";
import { discoveryCategories, validateDiscoveryAtlas } from "../src/discoveryAtlas";

test("każdy budynek ma pełne progi 1-3, 4-7, 8-11, 12-15 i 16-20", () => {
  const validation = validateBuildingDevelopments();
  assert.deepEqual(validation.missing, []);
  assert.deepEqual(validation.malformed, []);
  for (const building of buildings) {
    assert.equal(stageForLevel(building.id, 1)?.fromLevel, 1, building.id);
    assert.equal(stageForLevel(building.id, 20)?.toLevel, 20, building.id);
  }
});

test("późne poziomy tartaku wymagają przetworzonych materiałów", () => {
  const s = freshGame();
  s.settlementTier = "town";
  s.researched = researches.map((research) => research.id);
  s.buildings.sawmill.level = 11;
  const cost = stagedUpgradeCost(s, "sawmill");
  assert.ok((cost.hardplanks ?? 0) > 0);
  assert.ok((cost.bricks ?? 0) > 0);
  assert.ok((cost.iron ?? 0) > 0);
  assert.ok((cost.tools ?? 0) > 0);
  assert.equal(cost.wood ?? 0, 0);
});

test("poziom osady blokuje zbyt zaawansowaną rozbudowę", () => {
  const s = freshGame();
  s.researched = researches.map((research) => research.id);
  s.buildings.sawmill.level = 11;
  for (const resource of resources) s.resources[resource.id] = 10_000;
  s.settlementTier = "large-village";
  assert.equal(canQueueStagedUpgrade(s, "sawmill"), false);
  const rows = buildingUpgradeRequirements(s, "sawmill");
  assert.equal(rows[0].met, false);
  s.settlementTier = "town";
  assert.equal(canQueueStagedUpgrade(s, "sawmill"), true);
});

test("nowy koszt trafia do istniejącej kolejki budowy", () => {
  const s = freshGame();
  s.researched = researches.map((research) => research.id);
  s.settlementTier = "town";
  s.buildings.sawmill.level = 11;
  for (const resource of resources) s.resources[resource.id] = 10_000;
  const expected = stagedUpgradeCost(s, "sawmill");
  assert.ok(queueStagedUpgrade(s, "sawmill"));
  assert.equal(s.buildQueue.length, 1);
  assert.equal(s.buildQueue[0].level, 12);
  assert.deepEqual(s.buildQueue[0].cost, expected);
});

test("atlas obejmuje wszystkie odkrycia i ma osobne dziedziny", () => {
  assert.deepEqual(validateDiscoveryAtlas(), []);
  assert.ok(discoveryCategories.length >= 8);
  assert.ok(discoveryCategories.some((category) => category.id === "metallurgy"));
  assert.ok(discoveryCategories.some((category) => category.id === "special"));
});
