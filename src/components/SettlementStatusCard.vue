<script setup lang="ts">
import { computed, ref } from "vue";
import { useGame } from "../useGame";
import {
  advanceSettlement,
  canAdvanceSettlement,
  currentSettlementTier,
  nextSettlementTier,
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
  <section class="settlement-status-card">
    <div class="settlement-status-main">
      <div class="settlement-status-icon">
        <PixelIcon name="fire" :size="36" />
      </div>
      <div class="settlement-status-copy">
        <small>POZIOM OSADY</small>
        <div class="settlement-status-title">
          <h2>{{ current.name }}</h2>
          <span>ETAP {{ Math.max(1, ['camp','small-settlement','settlement','village','large-village','small-town','town','large-town','city','large-city','metropolis'].indexOf(current.id) + 1) }}</span>
        </div>
        <p>{{ current.shortDescription }}</p>
      </div>
      <button
        v-if="next"
        class="settlement-status-toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{ expanded ? "Zwiń" : "Szczegóły" }}
      </button>
    </div>

    <template v-if="next">
      <div class="settlement-next-row">
        <div>
          <small>NASTĘPNY ETAP</small>
          <strong>{{ next.name }}</strong>
        </div>
        <div class="settlement-progress-copy">
          {{ completed }} / {{ requirements.length }} wymagań
        </div>
      </div>
      <progress :value="progress" max="100" />
    </template>

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
  margin: 10px 0 20px;
  padding: 13px;
  border: 1px solid #4d4a31;
  background: linear-gradient(135deg, #1d2418, #141711 68%);
  box-shadow: inset 3px 0 #8e934c33;
}
.settlement-status-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
}
.settlement-status-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border: 1px solid #504b31;
  background: #11150f;
}
.settlement-status-copy small,
.settlement-next-row small,
.settlement-next-description small {
  display: block;
  color: #8c8b6f;
  font-size: 9px;
  letter-spacing: .11em;
}
.settlement-status-title {
  display: flex;
  align-items: baseline;
  gap: 9px;
  margin: 2px 0 3px;
}
.settlement-status-title h2 { margin: 0; color: #e8dfc4; font-size: 18px; }
.settlement-status-title span {
  padding: 2px 5px;
  border: 1px solid #5e6038;
  color: #b9b66b;
  font-size: 9px;
}
.settlement-status-copy p,
.settlement-next-description p {
  margin: 0;
  color: #9a9882;
  font-size: 11px;
  line-height: 1.45;
}
.settlement-status-toggle,
.settlement-promote {
  border-color: #6b6c3d;
  background: #2b321d;
  color: #e1d9b1;
}
.settlement-status-toggle { padding: 7px 10px; min-height: 32px; }
.settlement-next-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: end;
  margin-top: 12px;
}
.settlement-next-row strong { display: block; margin-top: 2px; color: #cfc99c; }
.settlement-progress-copy { color: #989979; font-size: 10px; }
.settlement-status-card progress { width: 100%; height: 7px; margin-top: 7px; }
.settlement-status-details {
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px solid #363725;
}
.settlement-next-description h3 { margin: 3px 0 4px; color: #e2d8bc; font-size: 14px; }
.settlement-requirements { display: grid; gap: 5px; margin: 12px 0; }
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
@media (max-width: 650px) {
  .settlement-status-main { grid-template-columns: auto 1fr; }
  .settlement-status-toggle { grid-column: 1 / -1; width: 100%; }
}
</style>
