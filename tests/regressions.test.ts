import { test } from "node:test";
import assert from "node:assert/strict";
import { freshGame, advance, parseSave } from "../src/civic";
import { buildings, researches, resources, expeditions, events } from "../src/data";
import { productionPreview, tick, has, housing, startResearch, assign } from "../src/engine";
import { canQueueStagedUpgrade, queueStagedUpgrade } from "../src/buildingProgression";
import { advanceSettlement, nextSettlementTier } from "../src/progression";
import { formUnit, startMilitaryOperation } from "../src/military";
import type { Cost, Resource } from "../src/types";

function town() {
  const s = freshGame(1);
  s.settlementTier = "small-town";
  s.population = 40;
  s.buildings.shelter.level = 12;
  s.researched = researches.map(r => r.id);
  for (const r of resources) s.resources[r.id] = 100;
  s.services.police.level = 2;
  s.crime = 30;
  s.order = 60;
  return s;
}

test("pełna symulacja offline jest identyczna z sekundowymi tikami", () => {
  const offline = town();
  assert.ok(formUnit(offline, "scouts", 6, "Zwiad"));
  assert.ok(startMilitaryOperation(offline, "camp-scout", [offline.military.units[0].id]));
  const online = structuredClone(offline);
  advance(offline, 1200.5);
  for (let i = 0; i < 2401; i++) advance(online, .5);
  assert.deepEqual(offline, online);
  assert.deepEqual(parseSave(JSON.stringify(offline)), offline);
});

test("leczenie zbiera postęp między tikami i po wczytaniu", () => {
  const s = town();
  assert.ok(formUnit(s, "militia", 6, "Ranni"));
  s.military.units[0].wounded = 3;
  advance(s, 60);
  assert.equal(s.military.units[0].wounded, 3);
  const loaded = parseSave(JSON.stringify(s));
  advance(loaded, 60);
  assert.equal(loaded.military.units[0].wounded, 1);
  assert.equal(loaded.military.units[0].healingProgress, 0);
  loaded.military.units[0].morale = NaN;
  assert.throws(() => parseSave(JSON.stringify(loaded)));
});

test("zapowiedź produkcji respektuje rezerwy, limity i współdzielenie surowca", () => {
  const s = town();
  s.autoEquip = false;
  s.buildings.weaver.level = 1;
  s.buildings.weaver.jobs.cloth.workers = 1;
  s.buildings.weaver.jobs.rope.workers = 1;
  s.resources.flax = .35;
  s.resources.cloth = 0;
  s.resources.rope = 0;
  s.reserves.flax = .1;
  const before = structuredClone(s);
  const preview = productionPreview(s);
  assert.deepEqual(s, before);
  assert.equal(preview.amounts['weaver:rope'], 0);
  tick(s);
  for (const r of resources) assert.ok(Math.abs(s.resources[r.id] - before.resources[r.id] - preview.flow[r.id]) < 1e-8, r.id);
});

test("Osada buduje pierwsze Krosno bez liny i produkuje linę dla Studni", () => {
  const s = freshGame(1);
  s.settlementTier = "settlement";
  s.researched = ['shelters', 'stonecraft', 'logging', 'loghomes', 'sawing', 'agriculture', 'quarrying', 'waterworks'];
  Object.assign(s.resources, {wood: 100, stone: 100, food: 100, water: 100, flax: 40, planks: 50});
  assert.ok(startResearch(s, 'weaving'));
  advance(s, 45);
  assert.equal(s.resources.rope, 0);
  assert.equal(canQueueStagedUpgrade(s, 'well'), false);
  assert.ok(queueStagedUpgrade(s, 'weaver'));
  s.builders = 1;
  advance(s, 25);
  assert.equal(s.buildings.weaver.level, 1);
  s.builders = 0;
  assert.ok(assign(s, 'weaver', 'rope', 1));
  advance(s, 31);
  assert.ok(s.resources.rope >= 3);
  assert.ok(canQueueStagedUpgrade(s, 'well'));
});

test("wszystkie wdrożone progi osady są osiągalne z dostępnych źródeł", () => {
  // Sprawdza zależności, bez oceny tempa i balansu. Surowiec można zgromadzić
  // dopiero po osiągnięciu jego źródła, nigdy przez wstrzyknięcie przyszłych dóbr.
  const s = freshGame(1);
  const available = new Set<Resource>(['wood', 'stone', 'food', 'water']);
  const affordable = (cost: Cost) => Object.keys(cost).every(id => available.has(id as Resource));
  for (let pass = 0; pass < 100; pass++) {
    for (const r of researches)
      if (r.kind === 'research' && !has(s, r.id) && r.requires.every(id => has(s, id)) && affordable(r.cost)) s.researched.push(r.id);
    for (const e of expeditions)
      if (s.buildings.camp.level && has(s, e.requires) && affordable(e.cost) && affordable(e.gear ?? {})) {
        for (const id of Object.keys(e.reward)) available.add(id as Resource);
        if (e.find && !has(s, e.find)) s.researched.push(e.find);
      }
    for (const e of events)
      if (has(s, e.requires) && affordable(e.cost)) {
        for (const id of Object.keys(e.reward ?? {})) available.add(id as Resource);
        if (e.discovery && !has(s, e.discovery)) s.researched.push(e.discovery);
      }
    for (const r of resources) s.resources[r.id] = available.has(r.id) ? 1_000_000 : 0;
    for (const b of buildings) {
      if (canQueueStagedUpgrade(s, b.id)) {
        assert.ok(queueStagedUpgrade(s, b.id));
        const queued = s.buildQueue.pop()!;
        s.buildings[b.id].level = queued.level;
      }
      if (s.buildings[b.id].level)
        for (const recipe of b.recipes)
          if (has(s, recipe.research) && affordable(recipe.input) && (!recipe.minTool || available.has(recipe.minTool)))
            for (const id of Object.keys(recipe.output)) available.add(id as Resource);
    }
    const next = nextSettlementTier(s);
    if (next?.available) {
      s.population = Math.min(housing(s), next.requirements.population);
      advanceSettlement(s);
    }
  }
  assert.equal(s.settlementTier, 'large-town');
  assert.ok(available.has('rope'));
  assert.ok(available.has('tools'));
});
