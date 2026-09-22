<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { buildings, resources, resourceName } from "../data";
import {
  assign,
  capacity,
  effectiveWorkers,
  equipBest,
  freeWorkers,
  has,
  jobStatus,
  maxWorkers,
  multiplier,
  removeEquipment,
  toolTiers,
  workersIn,
} from "../engine";
import {
  buildingUpgradeRequirements,
  canQueueStagedUpgrade,
  currentBuildingStage,
  developmentFor,
  nextBuildingStage,
  queueStagedUpgrade,
  stagedUpgradeCost,
} from "../buildingProgression";
import { settlementTiers } from "../progression";
import type { Recipe } from "../types";
import { useGame } from "../useGame";
import CostList from "./CostList.vue";
import PixelIcon from "./PixelIcon.vue";

const props = defineProps<{ buildingId: string }>();
const { game, notice, save } = useGame();
const section = ref<"overview" | "production" | "development">("overview");

const building = computed(() => buildings.find((item) => item.id === props.buildingId)!);
const state = computed(() => game.buildings[props.buildingId]);
const development = computed(() => developmentFor(props.buildingId));
const currentStage = computed(() => currentBuildingStage(game, props.buildingId));
const nextStage = computed(() => nextBuildingStage(game, props.buildingId));
const nextCost = computed(() => stagedUpgradeCost(game, props.buildingId));
const requirements = computed(() => buildingUpgradeRequirements(game, props.buildingId));
const visibleRecipes = computed(() => building.value.recipes.filter((recipe) => has(game, recipe.research)));

watch(
  () => props.buildingId,
  () => {
    section.value = "overview";
  },
);

const format = (n: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(n);

const settlementName = (id: string) => settlementTiers.find((tier) => tier.id === id)?.name ?? id;

function outputText(recipe: Recipe) {
  const job = state.value.jobs[recipe.id];
  return Object.entries(recipe.output)
    .map(([resource, amount]) => {
      const starvation = game.resources.food <= 0 || game.resources.water <= 0 ? 0.25 : 1;
      const value = amount * effectiveWorkers(job, recipe) * multiplier(game, building.value.id) * starvation;
      return `${format(value)} ${resourceName(resource)}`;
    })
    .join(", ");
}

function setLimit(recipeId: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  state.value.jobs[recipeId].limit = Number.isFinite(value)
    ? Math.min(1_000_000, Math.max(0, value))
    : 0;
}

function upgrade() {
  if (!queueStagedUpgrade(game, props.buildingId)) {
    notice.value = "Nie spełniasz wymagań etapu, brakuje materiałów albo budynek jest już w kolejce.";
    return;
  }
  save();
  notice.value = `Dodano rozbudowę: ${building.value.name}, poziom ${state.value.level + 1}.`;
}
</script>

<template>
  <div class="building-inspector">
    <header class="building-inspector-header">
      <div class="building-inspector-title">
        <PixelIcon :name="building.icon" :size="66" />
        <div>
          <small>{{ building.group }}</small>
          <h1>{{ building.name }}</h1>
          <p>{{ building.description }}</p>
        </div>
      </div>
      <div class="building-level-badge">
        <small>POZIOM</small>
        <strong>{{ state.level }}</strong>
      </div>
    </header>

    <nav class="building-inspector-tabs" aria-label="Szczegóły budynku">
      <button :class="{ active: section === 'overview' }" @click="section = 'overview'">Przegląd</button>
      <button
        :class="{ active: section === 'production' }"
        :disabled="!visibleRecipes.length"
        @click="section = 'production'"
      >
        Produkcja
      </button>
      <button :class="{ active: section === 'development' }" @click="section = 'development'">Rozwój</button>
    </nav>

    <section v-if="section === 'overview'" class="inspector-section">
      <div class="building-stage-card">
        <small>ETAP KONSTRUKCYJNY</small>
        <strong>{{ currentStage?.name ?? "Brak" }}</strong>
        <p>{{ currentStage?.description }}</p>
        <span v-if="currentStage">Poziomy {{ currentStage.fromLevel }}–{{ currentStage.toLevel }}</span>
      </div>

      <div class="building-metrics">
        <div>
          <small>STAN</small>
          <strong>{{ state.level ? "Aktywny" : "Do wybudowania" }}</strong>
        </div>
        <div>
          <small>PRACOWNICY</small>
          <strong>{{ workersIn(game, building.id) }} / {{ maxWorkers(game, building.id) }}</strong>
        </div>
        <div>
          <small>PREMIA</small>
          <strong>+{{ Math.round((multiplier(game, building.id) - 1) * 100) }}%</strong>
        </div>
      </div>

      <div v-if="state.level && !visibleRecipes.length" class="building-passive-card">
        <template v-if="building.housing">
          <small>MIESZKANIA</small>
          <strong>{{ state.level * building.housing }} miejsc</strong>
          <p>Każdy poziom zwiększa pojemność mieszkalną tego typu zabudowy.</p>
        </template>
        <template v-else-if="building.id === 'warehouse'">
          <small>MAGAZYNOWANIE</small>
          <strong>{{ capacity(game) }} jednostek / zasób</strong>
          <p>Rozbudowa zwiększa globalny limit magazynowania.</p>
        </template>
        <template v-else-if="building.id === 'fire'">
          <small>WSPÓLNOTA</small>
          <strong>+{{ Math.max(0, state.level - 1) * 5 }}%</strong>
          <p>Palenisko wzmacnia organizację pracy i staje się centrum rosnącej osady.</p>
        </template>
        <template v-else>
          <small>FUNKCJA</small>
          <strong>Budynek pomocniczy</strong>
          <p>Jego główne efekty są związane z innymi systemami gry.</p>
        </template>
      </div>

      <div class="building-overview-actions">
        <button v-if="visibleRecipes.length" @click="section = 'production'">Zarządzaj produkcją</button>
        <button class="primary" @click="section = 'development'">Pokaż rozwój budynku</button>
      </div>
    </section>

    <section v-else-if="section === 'production'" class="inspector-section production-section">
      <div v-if="state.level" class="production-summary">
        <span>Stanowiska <b>{{ workersIn(game, building.id) }} / {{ maxWorkers(game, building.id) }}</b></span>
        <span>Premia <b>+{{ Math.round((multiplier(game, building.id) - 1) * 100) }}%</b></span>
      </div>

      <label v-if="state.level && visibleRecipes.length" class="auto-equip inspector-auto-equip">
        <input v-model="game.autoEquip" type="checkbox" /> Automatycznie przydzielaj najlepsze narzędzia
      </label>

      <div v-if="!state.level" class="inspector-empty">
        Najpierw wybuduj ten budynek w zakładce Rozwój.
      </div>

      <article v-for="recipe in state.level ? visibleRecipes : []" :key="recipe.id" class="inspector-job-card">
        <div class="job-title">
          <PixelIcon
            :name="resources.find((item) => item.id === Object.keys(recipe.output)[0])?.icon || building.icon"
            :size="30"
          />
          <div>
            <h2>{{ recipe.name }}</h2>
            <small :class="{ positive: jobStatus(game, building.id, recipe) === 'Pracuje' }">
              {{ jobStatus(game, building.id, recipe) }}
            </small>
          </div>
          <button
            class="job-pause"
            :aria-label="`Wstrzymaj lub wznów: ${recipe.name}`"
            @click="state.jobs[recipe.id].paused = !state.jobs[recipe.id].paused"
          >
            {{ state.jobs[recipe.id].paused ? "▶" : "Ⅱ" }}
          </button>
        </div>

        <div class="inspector-job-controls">
          <div>
            <small>PRACOWNICY</small>
            <div class="stepper">
              <button
                :disabled="!state.jobs[recipe.id].workers"
                @click="assign(game, building.id, recipe.id, -1)"
              >−</button>
              <b>{{ state.jobs[recipe.id].workers }}</b>
              <button
                :disabled="!freeWorkers(game) || workersIn(game, building.id) >= maxWorkers(game, building.id)"
                @click="assign(game, building.id, recipe.id, 1)"
              >+</button>
            </div>
          </div>
          <div class="inspector-output">
            <small>PRODUKCJA</small>
            <strong>{{ jobStatus(game, building.id, recipe) === "Pracuje" ? outputText(recipe) : "0" }} / tik</strong>
          </div>
        </div>

        <details>
          <summary>Receptura, wyposażenie i limit</summary>
          <p class="muted">Baza / pracownik / tik</p>
          <CostList v-if="Object.keys(recipe.input).length" :cost="recipe.input" />
          <p v-else class="muted">Nie zużywa surowców.</p>
          <CostList :cost="recipe.output" />

          <template v-if="recipe.tool">
            <p v-if="recipe.minTool" class="muted">Minimum: {{ resourceName(recipe.minTool) }}.</p>
            <div v-for="tool in toolTiers" :key="tool" class="equipment-line">
              <span>{{ resourceName(tool) }}</span>
              <b>{{ state.jobs[recipe.id].equipment[tool] || 0 }}</b>
            </div>
            <div class="equipment-actions">
              <button @click="equipBest(game, building.id, recipe.id)">Wyposaż najlepszymi</button>
              <button
                @click="
                  removeEquipment(game, building.id, recipe.id);
                  game.autoEquip = false;
                "
              >
                Zdejmij
              </button>
            </div>
          </template>

          <label class="limit-label">
            Limit zapasu (0 = brak)
            <input
              type="number"
              min="0"
              :value="state.jobs[recipe.id].limit"
              @change="setLimit(recipe.id, $event)"
            />
          </label>
        </details>
      </article>
    </section>

    <section v-else class="inspector-section development-section">
      <div v-if="development" class="development-roadmap">
        <article
          v-for="stage in development.stages"
          :key="stage.fromLevel"
          :class="{
            current: state.level >= stage.fromLevel && state.level <= stage.toLevel,
            completed: state.level > stage.toLevel,
          }"
        >
          <span class="stage-range">{{ stage.fromLevel }}–{{ stage.toLevel }}</span>
          <PixelIcon :name="building.icon" :size="30" />
          <strong>{{ stage.name }}</strong>
          <small>{{ settlementName(stage.requiredSettlement) }}</small>
        </article>
      </div>

      <div v-if="nextStage && state.level < 20" class="next-development-card">
        <div class="next-development-heading">
          <div>
            <small>NASTĘPNA ROZBUDOWA</small>
            <h2>Poziom {{ state.level + 1 }} · {{ nextStage.name }}</h2>
          </div>
          <span>{{ nextStage.fromLevel }}–{{ nextStage.toLevel }}</span>
        </div>
        <p>{{ nextStage.description }}</p>

        <div class="development-requirements">
          <div v-for="row in requirements" :key="row.label" :class="{ met: row.met }">
            <span>{{ row.met ? "✓" : "◇" }}</span>
            {{ row.label }}
          </div>
        </div>

        <h3>Koszt rozbudowy</h3>
        <CostList :cost="nextCost" :stock="game.resources" />
        <button
          class="development-action"
          :disabled="!canQueueStagedUpgrade(game, building.id)"
          @click="upgrade"
        >
          {{ game.buildQueue.some((task) => task.id === building.id) ? "Budynek jest w kolejce" : `Dodaj poziom ${state.level + 1} do kolejki` }}
        </button>
        <p class="muted development-hint">
          Materiały są pobierane przy dodaniu do kolejki. Realizacja wymaga budowniczych w widoku Osada.
        </p>
      </div>

      <div v-else class="inspector-empty">Osiągnięto maksymalny zdefiniowany poziom tego budynku.</div>
    </section>
  </div>
</template>

<style scoped>
.building-inspector { min-width: 0; }
.building-inspector-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding-bottom: 13px;
  border-bottom: 1px solid #414633;
}
.building-inspector-title { display: grid; grid-template-columns: 70px 1fr; gap: 11px; align-items: center; }
.building-inspector-title small,
.building-level-badge small,
.building-stage-card small,
.building-metrics small,
.building-passive-card small,
.inspector-job-controls small,
.next-development-heading small {
  display: block;
  color: #888b73;
  font-size: 9px;
  letter-spacing: .1em;
}
.building-inspector-title h1 { margin: 2px 0 4px; font-size: 20px; }
.building-inspector-title p { margin: 0; color: #9b9b86; font-size: 11px; line-height: 1.45; }
.building-level-badge {
  min-width: 58px;
  padding: 7px 9px;
  border: 1px solid #61633e;
  background: #171b13;
  text-align: center;
}
.building-level-badge strong { display: block; margin-top: 2px; color: #d9c46f; font-size: 23px; }
.building-inspector-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 12px 0;
  border: 1px solid #404534;
}
.building-inspector-tabs button {
  min-height: 34px;
  border: 0;
  border-right: 1px solid #404534;
  border-radius: 0;
  background: #151a14;
  color: #9b9d88;
  font-size: 11px;
}
.building-inspector-tabs button:last-child { border-right: 0; }
.building-inspector-tabs button.active { background: #323922; color: #e9ddaa; box-shadow: inset 0 -2px #969d4f; }
.inspector-section { min-width: 0; }
.building-stage-card,
.building-passive-card,
.next-development-card {
  padding: 11px;
  border: 1px solid #444433;
  background: #171b14;
}
.building-stage-card strong,
.building-passive-card strong { display: block; margin: 3px 0; color: #e1d7b9; }
.building-stage-card p,
.building-passive-card p,
.next-development-card > p { margin: 0; color: #979985; font-size: 11px; line-height: 1.45; }
.building-stage-card > span { color: #b6a661; font-size: 10px; }
.building-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 8px 0; }
.building-metrics > div { padding: 8px; border: 1px solid #373d2f; background: #121712; }
.building-metrics strong { display: block; margin-top: 3px; color: #d9d4ba; font-size: 12px; }
.building-overview-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 10px; }
.production-summary { display: flex; justify-content: space-between; gap: 10px; padding: 8px 10px; border: 1px solid #3b4131; background: #151a14; font-size: 10px; }
.production-summary b { color: #cdd8a6; }
.inspector-auto-equip { display: block; margin: 9px 0; font-size: 10px; }
.inspector-job-card { margin-top: 8px; padding: 10px; border: 1px solid #3d4333; background: #151a14; }
.inspector-job-card .job-title { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; }
.inspector-job-card .job-title h2 { margin: 0; font-size: 13px; }
.inspector-job-card .job-title small { color: #8e917d; font-size: 9px; }
.inspector-job-controls { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: end; margin: 10px 0; }
.inspector-job-controls .stepper { margin-top: 4px; }
.inspector-output { text-align: right; }
.inspector-output strong { display: block; margin-top: 4px; color: #a8d785; font-size: 10px; }
.inspector-job-card details { margin-top: 8px; border-top: 1px solid #34392d; padding-top: 7px; }
.inspector-job-card summary { color: #aaa88f; font-size: 10px; cursor: pointer; }
.development-roadmap { display: grid; grid-template-columns: repeat(5, minmax(95px, 1fr)); gap: 5px; overflow-x: auto; padding-bottom: 7px; }
.development-roadmap article {
  position: relative;
  min-width: 95px;
  padding: 8px;
  border: 1px solid #34392e;
  background: #111510;
  opacity: .58;
  text-align: center;
}
.development-roadmap article.current { border-color: #8d8248; background: #262a18; opacity: 1; }
.development-roadmap article.completed { border-color: #44513d; opacity: .82; }
.stage-range { display: block; margin-bottom: 5px; color: #a68b55; font-size: 9px; }
.development-roadmap strong { display: block; margin-top: 4px; color: #d7d1b7; font-size: 9px; }
.development-roadmap small { display: block; margin-top: 3px; color: #777b69; font-size: 8px; }
.next-development-card { margin-top: 9px; }
.next-development-heading { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.next-development-heading h2 { margin: 3px 0 5px; font-size: 13px; }
.next-development-heading > span { padding: 3px 6px; border: 1px solid #555334; color: #bca85f; font-size: 9px; }
.development-requirements { display: grid; gap: 4px; margin: 10px 0; }
.development-requirements div { padding: 6px 8px; border: 1px solid #43342d; color: #bd927d; font-size: 9px; }
.development-requirements div.met { border-color: #3b4b38; color: #9dbb8d; }
.next-development-card h3 { margin: 11px 0 5px; font-size: 10px; }
.development-action { width: 100%; margin-top: 9px; border-color: #77773e; background: #34391f; color: #e6dba4; }
.development-hint { margin-top: 7px; font-size: 9px; }
.inspector-empty { padding: 14px; border: 1px dashed #464a37; color: #8b8e79; font-size: 10px; }
@media (max-width: 1050px) {
  .building-inspector-title { grid-template-columns: 54px 1fr; }
  .building-inspector-title .pixel-icon { width: 54px; height: 54px; }
  .building-level-badge { min-width: 48px; }
  .building-metrics { grid-template-columns: 1fr; }
}
</style>
