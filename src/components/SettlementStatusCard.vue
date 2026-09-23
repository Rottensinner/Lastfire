<script setup lang="ts">
import { computed, ref } from "vue";
import { freeWorkers, housing } from "../engine";
import { useGame } from "../useGame";
import {
  advanceSettlement,
  canAdvanceSettlement,
  currentSettlementTier,
  nextSettlementTier,
  settlementTiers,
  tierRequirementRows,
} from "../progression";
import CostList from "./CostList.vue";
import PixelIcon from "./PixelIcon.vue";

const { game, notice, save } = useGame();
const expanded = ref(false);

const current = computed(() => currentSettlementTier(game));
const next = computed(() => nextSettlementTier(game));
const requirements = computed(() => tierRequirementRows(game));
const completed = computed(() => requirements.value.filter((row) => row.met).length);
const progress = computed(() =>
  requirements.value.length ? (completed.value / requirements.value.length) * 100 : 100,
);
const tierIndex = computed(() => Math.max(0, settlementTiers.findIndex((tier) => tier.id === current.value.id)));
const tierNumber = computed(() => tierIndex.value + 1);
const tierRoman = computed(() => roman(tierNumber.value));
const settlementIcon = computed(() => (tierIndex.value <= 1 ? "fire" : "house"));
const previewRequirements = computed(() => requirements.value.slice(0, 5));

function roman(value: number) {
  const entries: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = value;
  let result = "";
  for (const [number, symbol] of entries) {
    while (remaining >= number) {
      result += symbol;
      remaining -= number;
    }
  }
  return result;
}

function promote() {
  if (!advanceSettlement(game)) {
    notice.value = "Nie spełniasz jeszcze wszystkich warunków rozwoju osady.";
    return;
  }
  save();
  notice.value = `Osada osiągnęła poziom: ${current.value.name}.`;
  expanded.value = false;
}
</script>

<template>
  <section class="settlement-status-card settlement-overview-card">
    <div class="settlement-overview-current">
      <div class="settlement-art">
        <PixelIcon :name="settlementIcon" :size="74" />
      </div>

      <div class="settlement-current-copy">
        <h1>{{ current.name.toUpperCase() }}</h1>
        <p class="tier-line">Poziom osady: <strong>{{ tierRoman }}</strong></p>

        <div class="settlement-core-stats">
          <div>
            <PixelIcon name="person" :size="20" />
            <span>Ludność</span>
            <b>{{ game.population }} / {{ housing(game) }}</b>
          </div>
          <div>
            <PixelIcon name="person" :size="20" />
            <span>Wolni</span>
            <b>{{ freeWorkers(game) }}</b>
          </div>
          <div>
            <span class="stat-symbol">⌂</span>
            <span>Mieszkania</span>
            <b>{{ housing(game) }}</b>
          </div>
        </div>
      </div>
    </div>

    <div v-if="next" class="settlement-overview-next">
      <small>NASTĘPNY ETAP</small>
      <h2>{{ next.name.toUpperCase() }}</h2>

      <div class="settlement-requirement-preview">
        <div
          v-for="row in previewRequirements"
          :key="row.label"
          :class="{ met: row.met }"
        >
          <span>{{ row.met ? "✓" : "○" }}</span>
          <span>{{ row.label }}</span>
        </div>
      </div>

      <div class="settlement-progress-footer">
        <progress :value="progress" max="100" />
        <span>{{ completed }} / {{ requirements.length }} wymagań</span>
        <button
          class="settlement-status-toggle"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? "Zwiń" : "Szczegóły" }}
        </button>
      </div>
    </div>

    <div v-if="expanded && next" class="settlement-status-details">
      <div class="settlement-next-description">
        <small>CEL ROZWOJU</small>
        <h3>{{ next.name }}</h3>
        <p>{{ next.shortDescription }}</p>
      </div>

      <div class="settlement-requirements">
        <div
          v-for="row in requirements"
          :key="row.label"
          class="settlement-requirement"
          :class="{ met: row.met }"
        >
          <span>{{ row.met ? "✓" : "◇" }} {{ row.label }}</span>
          <b>{{ row.current }} / {{ row.required }}</b>
        </div>
      </div>

      <template v-if="Object.keys(next.cost).length">
        <h4>Koszt ustanowienia nowego poziomu</h4>
        <CostList :cost="next.cost" :stock="game.resources" />
      </template>

      <button
        class="settlement-promote"
        :disabled="!canAdvanceSettlement(game)"
        @click="promote"
      >
        Rozwiń osadę do: {{ next.name }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.settlement-status-card {
  padding: 18px;
  border: 1px solid #667044;
  background: #111a14;
}
.settlement-overview-card {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, .9fr);
  gap: 0;
}
.settlement-overview-current {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding-right: 22px;
}
.settlement-art {
  min-height: 104px;
  display: grid;
  place-items: center;
}
.settlement-current-copy h1 {
  margin: 0 0 8px;
  color: #f0e7c8;
  font-size: 21px;
  letter-spacing: 1px;
}
.tier-line {
  margin: 0 0 15px;
  color: #b7a969;
  font-size: 12px;
}
.tier-line strong { color: #d8ca78; }
.settlement-core-stats { display: grid; gap: 7px; }
.settlement-core-stats > div {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: 8px;
  align-items: center;
  color: #abae98;
  font-size: 12px;
}
.settlement-core-stats b { color: #e2ddc3; font-weight: 500; }
.stat-symbol { color: #9acb63; font-size: 16px; text-align: center; }
.settlement-overview-next {
  padding-left: 22px;
  border-left: 1px solid #465139;
}
.settlement-overview-next > small,
.settlement-next-description small {
  display: block;
  color: #8f947b;
  font-size: 9px;
  letter-spacing: .12em;
}
.settlement-overview-next h2 {
  margin: 4px 0 12px;
  color: #f0e5bf;
  font-size: 16px;
}
.settlement-requirement-preview { display: grid; gap: 5px; min-height: 82px; }
.settlement-requirement-preview > div {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 5px;
  color: #b5a88e;
  font-size: 11px;
}
.settlement-requirement-preview > div.met { color: #a9c985; }
.settlement-progress-footer {
  display: grid;
  grid-template-columns: minmax(80px, 1fr) auto auto;
  gap: 9px;
  align-items: center;
  margin-top: 12px;
}
.settlement-progress-footer progress { width: 100%; height: 8px; }
.settlement-progress-footer > span { color: #9da187; font-size: 9px; white-space: nowrap; }
.settlement-status-toggle,
.settlement-promote {
  border-color: #737846;
  background: #29321e;
  color: #e1d9b1;
}
.settlement-status-toggle { min-height: 32px; padding: 6px 10px; }
.settlement-status-details {
  grid-column: 1 / -1;
  margin-top: 17px;
  padding-top: 16px;
  border-top: 1px solid #3b4433;
}
.settlement-next-description h3 { margin: 3px 0 4px; color: #e2d8bc; font-size: 14px; }
.settlement-next-description p { margin: 0; color: #9a9882; font-size: 11px; line-height: 1.45; }
.settlement-requirements { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; margin: 12px 0; }
.settlement-requirement {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 9px;
  border: 1px solid #42382d;
  color: #b08c78;
  font-size: 10px;
}
.settlement-requirement.met { color: #99b18b; border-color: #3d4938; }
.settlement-requirement b { font-weight: 500; text-align: right; }
.settlement-status-details h4 { margin: 13px 0 7px; color: #bcb49d; font-size: 11px; }
.settlement-promote { width: 100%; margin-top: 10px; padding: 9px; }
@media (max-width: 900px) {
  .settlement-overview-card { grid-template-columns: 1fr; }
  .settlement-overview-current { padding-right: 0; }
  .settlement-overview-next { margin-top: 16px; padding: 16px 0 0; border-left: 0; border-top: 1px solid #465139; }
}
@media (max-width: 600px) {
  .settlement-overview-current { grid-template-columns: 64px 1fr; }
  .settlement-art { min-height: 72px; }
  .settlement-requirements { grid-template-columns: 1fr; }
  .settlement-progress-footer { grid-template-columns: 1fr auto; }
  .settlement-progress-footer progress { grid-column: 1 / -1; }
}
</style>
