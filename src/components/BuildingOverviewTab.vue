<script setup lang="ts">
import { computed } from "vue";
import { buildings, resources, resourceName } from "../data";
import {
  capacity,
  effectiveWorkers,
  has,
  jobStatus,
  maxWorkers,
  multiplier,
  workersIn,
} from "../engine";
import { currentBuildingStage } from "../buildingProgression";
import type { Recipe, Resource } from "../types";
import { useGame } from "../useGame";
import PixelIcon from "./PixelIcon.vue";

const props = defineProps<{ buildingId: string }>();
const emit = defineEmits<{
  production: [];
  development: [];
}>();

const { game } = useGame();
const building = computed(() => buildings.find((item) => item.id === props.buildingId)!);
const state = computed(() => game.buildings[props.buildingId]);
const stage = computed(() => currentBuildingStage(game, props.buildingId));
const visibleRecipes = computed(() => building.value.recipes.filter((recipe) => has(game, recipe.research)));
const primaryRecipe = computed(() => visibleRecipes.value[0]);
const allPaused = computed(() =>
  visibleRecipes.value.length > 0 && visibleRecipes.value.every((recipe) => state.value.jobs[recipe.id]?.paused),
);

const format = (value: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value);

function scaledAmount(recipe: Recipe, amount: number) {
  const job = state.value.jobs[recipe.id];
  if (!job) return 0;
  const starvation = game.resources.food <= 0 || game.resources.water <= 0 ? 0.25 : 1;
  return amount * effectiveWorkers(job, recipe) * multiplier(game, building.value.id) * starvation;
}

const inputRows = computed(() => {
  const recipe = primaryRecipe.value;
  if (!recipe) return [];
  return Object.entries(recipe.input).map(([id, amount]) => ({
    id: id as Resource,
    amount: scaledAmount(recipe, amount),
  }));
});

const outputRows = computed(() => {
  const recipe = primaryRecipe.value;
  if (!recipe) return [];
  return Object.entries(recipe.output).map(([id, amount]) => ({
    id: id as Resource,
    amount: scaledAmount(recipe, amount),
  }));
});

const primaryOutput = computed(() => outputRows.value[0]);
const status = computed(() => {
  if (!state.value.level) return "Do wybudowania";
  if (!visibleRecipes.value.length) return "Działa";
  if (allPaused.value) return "Wstrzymany";
  if (visibleRecipes.value.some((recipe) => jobStatus(game, building.value.id, recipe) === "Pracuje"))
    return "Działa";
  return jobStatus(game, building.value.id, visibleRecipes.value[0]);
});

const productionSummary = computed(() => {
  if (!primaryOutput.value) return "—";
  return `+${format(primaryOutput.value.amount)} ${resourceName(primaryOutput.value.id)} / s`;
});

const consumptionSummary = computed(() => {
  if (!inputRows.value.length) return "Brak";
  return inputRows.value
    .map((row) => `${format(row.amount)} ${resourceName(row.id)} / s`)
    .join(", ");
});

function iconFor(id: Resource) {
  return resources.find((resource) => resource.id === id)?.icon ?? building.value.icon;
}

function togglePause() {
  if (!visibleRecipes.value.length) return;
  const pause = !allPaused.value;
  for (const recipe of visibleRecipes.value) {
    state.value.jobs[recipe.id].paused = pause;
  }
}
</script>

<template>
  <section class="building-overview-tab">
    <div class="overview-block information-block">
      <div class="overview-section-title">
        <h2>INFORMACJE</h2>
      </div>
      <p>{{ building.description }}</p>

      <div class="overview-stat-list">
        <div>
          <span class="overview-stat-icon">♟</span>
          <span>Pracownicy</span>
          <b>{{ workersIn(game, building.id) }} / {{ maxWorkers(game, building.id) }}</b>
        </div>
        <div>
          <span class="overview-stat-icon">⚒</span>
          <span>Produktywność</span>
          <b>{{ productionSummary }}</b>
        </div>
        <div>
          <span class="overview-stat-icon">✚</span>
          <span>Premia</span>
          <b>+{{ Math.round((multiplier(game, building.id) - 1) * 100) }}%</b>
        </div>
        <div>
          <span class="overview-stat-icon">▣</span>
          <span>Zużycie</span>
          <b>{{ consumptionSummary }}</b>
        </div>
      </div>
    </div>

    <div v-if="state.level && primaryRecipe" class="overview-block production-flow-block">
      <div class="overview-section-title">
        <h2>PRODUKCJA</h2>
      </div>

      <div class="production-flow">
        <div class="flow-column">
          <div v-if="!inputRows.length" class="flow-resource muted-flow">Bez surowców</div>
          <div v-for="row in inputRows" :key="row.id" class="flow-resource">
            <PixelIcon :name="iconFor(row.id)" :size="30" />
            <span>
              <strong>{{ resourceName(row.id) }}</strong>
              <small class="negative">-{{ format(row.amount) }} / s</small>
            </span>
          </div>
        </div>

        <div class="flow-arrow">→</div>

        <div class="flow-column output-column">
          <div v-for="row in outputRows" :key="row.id" class="flow-resource">
            <PixelIcon :name="iconFor(row.id)" :size="34" />
            <span>
              <strong>{{ resourceName(row.id) }}</strong>
              <small class="positive">+{{ format(row.amount) }} / s</small>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="primaryOutput" class="overview-block stock-block">
      <div class="overview-section-title"><h2>MAGAZYN</h2></div>
      <div class="stock-row">
        <PixelIcon :name="iconFor(primaryOutput.id)" :size="28" />
        <span>{{ resourceName(primaryOutput.id) }}</span>
        <b>{{ format(game.resources[primaryOutput.id]) }} / {{ capacity(game) }}</b>
      </div>
      <progress :value="game.resources[primaryOutput.id]" :max="capacity(game)" />
    </div>

    <div v-else-if="state.level" class="overview-block passive-overview-block">
      <div class="overview-section-title"><h2>FUNKCJA</h2></div>
      <template v-if="building.housing">
        <strong>{{ state.level * building.housing }} miejsc mieszkalnych</strong>
        <p>Każdy poziom zwiększa pojemność mieszkalną osady.</p>
      </template>
      <template v-else-if="building.id === 'warehouse'">
        <strong>{{ capacity(game) }} jednostek / zasób</strong>
        <p>Magazyn zwiększa globalny limit przechowywania.</p>
      </template>
      <template v-else>
        <strong>{{ stage?.name ?? "Budynek pomocniczy" }}</strong>
        <p>{{ stage?.description ?? "Efekt tego budynku jest powiązany z innymi systemami osady." }}</p>
      </template>
    </div>

    <div class="overview-block status-block">
      <div class="overview-section-title"><h2>STATUS</h2></div>
      <div class="building-live-status" :class="{ good: status === 'Działa', warning: status !== 'Działa' }">
        <span class="live-dot"></span>
        <strong>{{ status }}</strong>
      </div>
      <p v-if="status === 'Działa'">Produkcja przebiega normalnie.</p>
      <p v-else>{{ status }} — sprawdź pracowników, surowce lub stan produkcji.</p>
    </div>

    <div class="overview-actions">
      <button v-if="visibleRecipes.length" @click="emit('production')">Zarządzaj pracownikami</button>
      <button v-if="visibleRecipes.length" @click="togglePause">
        {{ allPaused ? "Wznów" : "Wstrzymaj" }}
      </button>
      <button v-else class="primary" @click="emit('development')">Rozwój budynku</button>
    </div>
  </section>
</template>

<style scoped>
.building-overview-tab { display: grid; }
.overview-block { padding: 15px 0; border-bottom: 1px solid #3c4635; }
.overview-block:first-child { padding-top: 5px; }
.overview-section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.overview-section-title h2 { margin: 0; color: #e9dfbf; font-size: 12px; letter-spacing: 1px; }
.overview-section-title::after { content: ""; flex: 1; height: 1px; background: #3d4836; }
.information-block > p,
.status-block > p,
.passive-overview-block > p { color: #aaa994; font-size: 11px; line-height: 1.55; }
.overview-stat-list { display: grid; gap: 9px; margin-top: 16px; }
.overview-stat-list > div { display: grid; grid-template-columns: 22px minmax(105px, 1fr) auto; gap: 8px; align-items: center; color: #c1bea6; font-size: 11px; }
.overview-stat-list b { color: #eee5c8; font-weight: 500; text-align: right; }
.overview-stat-icon { color: #d4a85b; text-align: center; }
.production-flow { display: grid; grid-template-columns: 1fr 34px 1fr; gap: 8px; align-items: center; }
.flow-column { display: grid; gap: 8px; }
.flow-resource { display: flex; align-items: center; gap: 8px; min-width: 0; }
.flow-resource span { min-width: 0; }
.flow-resource strong,
.flow-resource small { display: block; }
.flow-resource strong { color: #ded7bc; font-size: 11px; }
.flow-resource small { margin-top: 3px; font-size: 10px; }
.flow-arrow { color: #8fc861; font-size: 28px; text-align: center; }
.muted-flow { color: #777d70; font-size: 10px; }
.stock-row { display: grid; grid-template-columns: 32px 1fr auto; gap: 8px; align-items: center; color: #c9c5ad; font-size: 11px; }
.stock-row b { color: #e8e0c5; font-weight: 500; }
.stock-block progress { width: 100%; height: 8px; margin-top: 9px; }
.passive-overview-block strong { display: block; margin-bottom: 5px; color: #e2d8bb; }
.building-live-status { display: flex; align-items: center; gap: 9px; color: #c9c3a8; }
.building-live-status.good { color: #a8d978; }
.building-live-status.warning { color: #d4ac61; }
.live-dot { width: 12px; height: 12px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.overview-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; padding-top: 15px; }
.overview-actions button:only-child { grid-column: 1 / -1; }
@media (max-width: 1100px) {
  .overview-stat-list > div { grid-template-columns: 20px 1fr; }
  .overview-stat-list b { grid-column: 2; text-align: left; }
  .production-flow { grid-template-columns: 1fr; }
  .flow-arrow { transform: rotate(90deg); }
}
</style>
