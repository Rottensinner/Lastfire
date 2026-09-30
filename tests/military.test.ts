import { test } from "node:test";
import assert from "node:assert/strict";
import { freshGame, advance, parseSave } from "../src/civic";
import { researches, resources } from "../src/data";
import { formUnit, startMilitaryOperation, trainUnit, equipUnit, availableOperations, homeGarrison } from "../src/military";

function preparedGame() {
  const game = freshGame(1);
  game.researched = researches.map((research) => research.id);
  game.population = 24;
  game.buildings.shelter.level = 8;
  for (const resource of resources) game.resources[resource.id] = 10_000;
  return game;
}

test("oddziały rezerwują mieszkańców i nie pozwalają dublować przydziału", () => {
  const game = preparedGame();
  const before = game.population;
  assert.ok(formUnit(game, "spearmen", 8, "Warta traktu"));
  assert.equal(game.population, before);
  assert.equal(game.military.units[0].people, 8);
  assert.equal(formUnit(game, "archers", 50), false);
  assert.ok(game.military.units.length === 1);
});

test("wyposażenie, szkolenie i operacja rozstrzygają się oraz zapisują", () => {
  const game = preparedGame();
  assert.ok(formUnit(game, "scouts", 6, "Sokoły"));
  const unit = game.military.units[0];
  assert.ok(equipUnit(game, unit.id, "weapons"));
  assert.ok(equipUnit(game, unit.id, "armor"));
  assert.ok(trainUnit(game, unit.id));
  assert.ok(homeGarrison(game) > 0);
  assert.ok(startMilitaryOperation(game, "camp-scout", [unit.id]));
  assert.equal(homeGarrison(game), 0);
  assert.ok(game.military.mission);
  const loaded = parseSave(JSON.stringify(game));
  assert.equal(loaded.military.mission?.id, "camp-scout");
  assert.equal(availableOperations(loaded).some((item) => item.id === "camp-raid"), false);
  advance(loaded, 151);
  assert.equal(loaded.military.mission, null);
  assert.equal(loaded.military.targets.find((target) => target.id === "looter-camp")?.intel, 2);
  assert.equal(availableOperations(loaded).some((item) => item.id === "camp-raid"), true);
  assert.ok(loaded.military.reports.length > 0);
});

test("porażka operacji zabiera część populacji i odsyła rannych do leczenia", () => {
  const game = preparedGame();
  assert.ok(formUnit(game, "militia", 8, "Straż przednia"));
  const before = game.population;
  game.military.targets.find((target) => target.id === "hostile-outpost")!.intel = 2;
  const unit = game.military.units[0];
  assert.ok(startMilitaryOperation(game, "outpost-assault", [unit.id]));
  const duration = game.military.mission!.duration;
  advance(game, duration);
  assert.equal(game.military.mission, null);
  assert.ok(game.population < before);
  assert.ok(unit.wounded > 0);
  assert.match(game.military.reports[0].text, /Polegli:/);
});
