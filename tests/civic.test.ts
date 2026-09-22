import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  civicEventTemplate,
  civicPressure,
  civicServiceUnlocked,
  eventChoiceAvailable,
  freshGame,
  generateCivicEvent,
  investInService,
  parseSave,
  resolveCivicEvent,
  serviceUpgradeCost,
} from "../src/civic";
import { canPay } from "../src/engine";
import { resources } from "../src/data";

function richTown() {
  const s = freshGame(1);
  s.settlementTier = "small-town";
  s.population = 80;
  s.buildings.shelter.level = 30;
  s.researched.push("trade");
  for (const resource of resources) s.resources[resource.id] = 10_000;
  return s;
}

test("służby odblokowują się wraz ze skalą osady i wymagają inwestycji", () => {
  const s = freshGame();
  assert.equal(civicServiceUnlocked(s, "watch"), false);
  s.settlementTier = "village";
  assert.equal(civicServiceUnlocked(s, "watch"), true);
  assert.equal(civicServiceUnlocked(s, "police"), false);
  assert.ok(canPay(s, serviceUpgradeCost(s, "watch")) === false);
  s.resources.wood = 500;
  s.resources.stone = 500;
  s.resources.food = 500;
  s.resources.stoneTools = 10;
  assert.ok(investInService(s, "watch"));
  assert.equal(s.services.watch.level, 1);
});

test("policja obniża presję przestępczą", () => {
  const s = richTown();
  const before = civicPressure(s).crimePerMinute;
  assert.ok(investInService(s, "police"));
  assert.ok(investInService(s, "police"));
  const after = civicPressure(s).crimePerMinute;
  assert.ok(after < before);
});

test("brak pieniędzy na utrzymanie obniża skuteczność służb", () => {
  const s = richTown();
  assert.ok(investInService(s, "police"));
  s.resources.gold = 0;
  s.resources.food = 0;
  s.nextCivicMaintenance = s.elapsed + 1;
  advance(s, 2);
  assert.equal(s.services.police.funded, false);
});

test("wysoka przestępczość może wygenerować powstanie gangu", () => {
  const s = richTown();
  s.crime = 31;
  s.order = 90;
  s.fireRisk = 0;
  s.nextCivicEventId = 2;
  assert.ok(generateCivicEvent(s));
  const event = s.civicEvents[0];
  assert.equal(event.templateId, "gang-formation");
  assert.ok(resolveCivicEvent(s, event.id, "ignore"));
  assert.equal(s.gangs.length, 1);
  assert.ok(s.gangs[0].power >= 20);
});

test("silne służby umożliwiają prewencyjne rozbicie tworzącej się grupy", () => {
  const s = richTown();
  s.services.watch.level = 3;
  s.services.police.level = 2;
  s.crime = 31;
  s.order = 90;
  s.fireRisk = 0;
  s.nextCivicEventId = 2;
  generateCivicEvent(s);
  const event = s.civicEvents[0];
  assert.equal(event.templateId, "gang-formation");
  const template = civicEventTemplate(event.templateId);
  const prevent = template.choices.find((choice) => choice.id === "prevent")!;
  assert.ok(eventChoiceAvailable(s, event, prevent));
  assert.ok(resolveCivicEvent(s, event.id, "prevent"));
  assert.equal(s.gangs.length, 0);
  assert.ok(s.crime < 31);
});

test("nierozwiązany event wygasa i uruchamia konsekwencje", () => {
  const s = richTown();
  s.crime = 15;
  s.order = 90;
  s.fireRisk = 0;
  s.nextCivicEventId = 4;
  assert.ok(generateCivicEvent(s));
  const event = s.civicEvents[0];
  const crime = s.crime;
  event.expiresAt = s.elapsed + 1;
  advance(s, 2);
  assert.equal(s.civicEvents.length, 0);
  assert.ok(s.crime > crime);
});

test("stan miejski zapisuje się razem z dotychczasową osadą", () => {
  const s = richTown();
  s.services.watch.level = 2;
  s.services.police.level = 1;
  s.crime = 37;
  s.order = 58;
  s.nextCivicEventId = 2;
  generateCivicEvent(s);
  const restored = parseSave(JSON.stringify(s));
  assert.deepEqual(restored, s);
});
