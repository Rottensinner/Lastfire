<script setup lang="ts">
import { computed, ref } from "vue";
import { buildings, researchName } from "../data";
import {
  assignBuilder,
  cancelBuild,
  freeWorkers,
  maxWorkers,
  moveBuild,
  unlocked,
  visibleResearch,
  workersIn,
} from "../engine";
import { useGame } from "../useGame";
import PixelIcon from "../components/PixelIcon.vue";
import SettlementStatusCard from "../components/SettlementStatusCard.vue";

const props = defineProps<{ selected: string }>();
const emit = defineEmits<{ select: [id: string] }>();

const { game } = useGame();
const category = ref<"all" | "production" | "housing" | "storage" | "services">("all");
const viewMode = ref<"grid" | "list">("grid");
const queueExpanded = ref(false);

const categories = [
  { id: "all" as const, label: "Wszystkie" },
  { id: "production" as const, label: "Produkcja" },
  { id: "housing" as const, label: "Mieszkalne" },
  { id: "storage" as const, label: "Magazyny" },
  { id: "services" as const, label: "Usługi" },
];

const discoverableBuildings = computed(() =>
  buildings.filter((building) => {
    if (unlocked(game, building.id)) return true;
    if (!building.research) return true;
    return visibleResearch(game, building.research);
  }),
);

const filteredBuildings = computed(() =>
  discoverableBuildings.value.filter((building) => {
    if (category.value === "all") return true;
    return buildingCategory(building.id) === category.value;
  }),
);

const visibleQueue = computed(() =>
  queueExpanded.value ? game.buildQueue : game.buildQueue.slice(0, 3),
);

const nextHelp = computed(() => {
  if (!game.buildings.workshop.level)
    return "Wskazówka: wybierz budynek i użyj zakładki Rozwój po prawej stronie.";
  if (!game.buildQueue.length)
    return "Wskazówka: rozbudowa budynków odblokowuje nowe miejsca pracy i zwiększa wydajność osady.";
  return "Wskazówka: większa liczba budowniczych przyspiesza pierwszy projekt w kolejce.";
});

function buildingCategory(id: string) {
  const building = buildings.find((item) => item.id === id)!;
  if (building.housing) return "housing";
  if (id === "warehouse") return "storage";
  if (building.recipes.length) return "production";
  return "services";
}

function buildingState(id: string) {
  if (!unlocked(game, id)) return "locked";
  const state = game.buildings[id];
  if (!state.level) return "unbuilt";
  const workers = workersIn(game, id);
  if (buildings.find((building) => building.id === id)?.recipes.length && workers === 0)
    return "idle";
  return "active";
}

function buildingRequirement(id: string) {
  const building = buildings.find((item) => item.id === id)!;
  return building.research ? researchName(building.research) : "Dalszy rozwój osady";
}

function clock(value: number) {
  const seconds = Math.max(0, Math.ceil(value));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
</script>

<template>
  <div class="settlement-view mockup-settlement-view">
    <SettlementStatusCard />

    <section class="settlement-card buildings-card">
      <div class="settlement-section-heading">
        <h2>BUDYNKI</h2>
        <div class="building-view-switcher" aria-label="Tryb wyświetlania budynków">
          <button
            :class="{ active: viewMode === 'grid' }"
            title="Siatka"
            @click="viewMode = 'grid'"
          >▦</button>
          <button
            :class="{ active: viewMode === 'list' }"
            title="Lista"
            @click="viewMode = 'list'"
          >☷</button>
        </div>
      </div>

      <div class="building-category-tabs" role="tablist" aria-label="Kategorie budynków">
        <button
          v-for="item in categories"
          :key="item.id"
          :class="{ active: category === item.id }"
          @click="category = item.id"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-if="viewMode === 'grid'" class="mockup-building-grid">
        <button
          v-for="building in filteredBuildings"
          :key="building.id"
          class="mockup-building-tile"
          :class="[
            buildingState(building.id),
            { selected: props.selected === building.id },
          ]"
          :aria-label="`${building.name}, poziom ${game.buildings[building.id].level}`"
          @click="emit('select', building.id)"
        >
          <PixelIcon :name="building.icon" :size="48" />
          <strong>{{ building.name }}</strong>

          <template v-if="buildingState(building.id) !== 'locked'">
            <small>Poziom {{ game.buildings[building.id].level }}</small>
            <span class="mockup-building-workers">
              <PixelIcon name="person" :size="17" />
              {{ workersIn(game, building.id) }} / {{ maxWorkers(game, building.id) }}
            </span>
          </template>

          <template v-else>
            <span class="locked-symbol">🔒</span>
            <small>Wymaga:</small>
            <span class="locked-requirement">{{ buildingRequirement(building.id) }}</span>
          </template>
        </button>
      </div>

      <div v-else class="building-list-view">
        <button
          v-for="building in filteredBuildings"
          :key="building.id"
          class="building-list-row"
          :class="[
            buildingState(building.id),
            { selected: props.selected === building.id },
          ]"
          @click="emit('select', building.id)"
        >
          <PixelIcon :name="building.icon" :size="34" />
          <span class="building-list-name">
            <strong>{{ building.name }}</strong>
            <small v-if="buildingState(building.id) === 'locked'">
              Wymaga: {{ buildingRequirement(building.id) }}
            </small>
            <small v-else>Poziom {{ game.buildings[building.id].level }}</small>
          </span>
          <span v-if="buildingState(building.id) !== 'locked'" class="building-list-workers">
            {{ workersIn(game, building.id) }} / {{ maxWorkers(game, building.id) }} prac.
          </span>
          <span class="building-list-status">{{
            buildingState(building.id) === 'active'
              ? 'Działa'
              : buildingState(building.id) === 'idle'
                ? 'Brak pracowników'
                : buildingState(building.id) === 'unbuilt'
                  ? 'Do budowy'
                  : 'Zablokowany'
          }}</span>
        </button>
      </div>
    </section>

    <section class="settlement-card construction-card">
      <div class="construction-heading">
        <h2>BUDOWA</h2>

        <div class="builder-inline-control">
          <PixelIcon name="person" :size="22" />
          <span>Budowniczowie:</span>
          <b>{{ game.builders }}</b>
          <button
            :disabled="!game.builders"
            aria-label="Odejmij budowniczego"
            @click="assignBuilder(game, -1)"
          >−</button>
          <button
            :disabled="!freeWorkers(game) || game.builders >= 6"
            aria-label="Dodaj budowniczego"
            @click="assignBuilder(game, 1)"
          >+</button>
        </div>

        <button
          v-if="game.buildQueue.length > 3"
          class="queue-toggle"
          @click="queueExpanded = !queueExpanded"
        >
          {{ queueExpanded ? "Pokaż mniej" : `Pokaż kolejkę (${game.buildQueue.length})` }}
        </button>
      </div>

      <div v-if="!game.buildQueue.length" class="construction-empty">
        <span>Brak aktywnych projektów.</span>
        <small>Wybierz budynek i przejdź do zakładki „Rozwój” w panelu po prawej.</small>
      </div>

      <div v-else class="mockup-queue-list">
        <div
          v-for="(task, index) in visibleQueue"
          :key="`${task.id}-${task.level}`"
          class="mockup-queue-row"
        >
          <span class="queue-number">{{ index + 1 }}.</span>
          <strong>
            {{ buildings.find((building) => building.id === task.id)?.name }} → poziom {{ task.level }}
          </strong>
          <progress :value="task.duration - task.remaining" :max="task.duration" />
          <span class="queue-time">
            {{ index === 0 && game.builders ? clock(task.remaining) : index === 0 ? "Brak budowniczych" : "Oczekuje..." }}
          </span>
          <div class="queue-actions">
            <button
              :disabled="index === 0"
              title="Przesuń wcześniej"
              @click="moveBuild(game, index)"
            >↑</button>
            <button title="Anuluj i zwróć materiały" @click="cancelBuild(game, index)">×</button>
          </div>
        </div>
      </div>

      <p class="settlement-tip">ⓘ {{ nextHelp }}</p>
    </section>
  </div>
</template>

<style scoped>
.mockup-settlement-view { display: grid; gap: 14px; }
.settlement-card {
  padding: 16px;
  border: 1px solid #59653e;
  background: #111a14;
}
.settlement-section-heading,
.construction-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #3e4a34;
}
.settlement-section-heading h2,
.construction-heading h2 {
  margin: 0;
  color: #efe6c7;
  font-size: 17px;
  letter-spacing: .7px;
}
.building-view-switcher { display: flex; gap: 5px; margin-left: auto; }
.building-view-switcher button {
  width: 37px;
  min-height: 34px;
  padding: 0;
  background: #101812;
  border-color: #435239;
  color: #8e967d;
}
.building-view-switcher button.active { background: #354224; border-color: #a2a754; color: #f0dd75; }
.building-category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 12px 0 14px;
}
.building-category-tabs button {
  min-height: 34px;
  padding: 6px 14px;
  border-color: #3d4a34;
  background: #121a14;
  color: #b0b39d;
}
.building-category-tabs button.active { border-color: #98a04d; background: #2e3a20; color: #f1e4ae; }
.mockup-building-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 10px;
}
.mockup-building-tile {
  position: relative;
  min-height: 146px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 12px 8px 10px;
  border: 2px solid #4f5f43;
  background: #101813;
  color: #e4ddc1;
  text-align: center;
}
.mockup-building-tile strong { font-size: 12px; font-weight: 500; }
.mockup-building-tile small { color: #9fa38d; font-size: 10px; }
.mockup-building-workers {
  min-height: 20px;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #d2cdb1;
  font-size: 10px;
}
.mockup-building-tile.active { border-color: #68b75e; box-shadow: inset 0 0 0 1px #68b75e22; }
.mockup-building-tile.idle { border-color: #c4a84c; }
.mockup-building-tile.unbuilt { border-style: dashed; border-color: #697057; }
.mockup-building-tile.selected { border-color: #e0c957; box-shadow: 0 0 0 1px #e0c95755; background: #182117; }
.mockup-building-tile.locked { border-color: #39433a; color: #686f64; opacity: .68; }
.mockup-building-tile.locked .pixel-icon { filter: grayscale(1); opacity: .35; }
.locked-symbol { position: absolute; top: 8px; right: 9px; opacity: .7; }
.locked-requirement { max-width: 100%; color: #777e72; font-size: 9px; line-height: 1.25; }
.building-list-view { display: grid; }
.building-list-row {
  display: grid;
  grid-template-columns: 42px minmax(160px, 1fr) 110px 120px;
  gap: 10px;
  align-items: center;
  min-height: 58px;
  padding: 8px 10px;
  border: 0;
  border-bottom: 1px solid #354034;
  border-radius: 0;
  background: transparent;
  color: #ddd7bd;
  text-align: left;
}
.building-list-row:hover { background: #182119; }
.building-list-row.selected { background: #29351f; box-shadow: inset 3px 0 #d0bd55; }
.building-list-row.locked { color: #6f776d; }
.building-list-name { display: grid; gap: 2px; }
.building-list-name strong { font-size: 11px; }
.building-list-name small,
.building-list-workers,
.building-list-status { color: #979d89; font-size: 10px; }
.building-list-row.active .building-list-status { color: #83c578; }
.building-list-row.idle .building-list-status { color: #cbae59; }
.construction-heading { min-height: 43px; }
.builder-inline-control {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  color: #bfc0a9;
  font-size: 11px;
}
.builder-inline-control b { min-width: 18px; text-align: center; color: #f1e6c1; }
.builder-inline-control button,
.queue-actions button {
  width: 32px;
  min-height: 30px;
  padding: 0;
}
.queue-toggle { min-height: 32px; margin-left: 8px; }
.construction-empty {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 0;
  color: #9b9e89;
  font-size: 11px;
}
.construction-empty small { color: #777b69; text-align: right; }
.mockup-queue-list { display: grid; gap: 7px; padding: 13px 0 4px; }
.mockup-queue-row {
  display: grid;
  grid-template-columns: 20px minmax(150px, .9fr) minmax(140px, 1fr) 76px auto;
  gap: 9px;
  align-items: center;
  min-height: 32px;
  color: #dcd5b8;
  font-size: 10px;
}
.mockup-queue-row strong { font-weight: 500; }
.mockup-queue-row progress { width: 100%; height: 12px; }
.queue-number,
.queue-time { color: #aaa994; }
.queue-time { text-align: right; }
.queue-actions { display: flex; gap: 4px; }
.settlement-tip {
  margin: 14px 0 0;
  padding-top: 11px;
  border-top: 1px solid #333d31;
  color: #838a78;
  font-size: 9px;
}
@media (max-width: 900px) {
  .mockup-building-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
  .building-list-row { grid-template-columns: 42px minmax(0, 1fr) 100px; }
  .building-list-workers { display: none; }
  .mockup-queue-row { grid-template-columns: 20px minmax(120px, 1fr) 90px auto; }
  .mockup-queue-row progress { grid-column: 2 / 4; grid-row: 2; }
  .queue-time { grid-column: 3; }
}
@media (max-width: 650px) {
  .construction-heading { flex-wrap: wrap; }
  .builder-inline-control { margin-left: 0; }
  .queue-toggle { margin-left: auto; }
  .construction-empty { flex-direction: column; }
  .construction-empty small { text-align: left; }
  .building-list-row { grid-template-columns: 38px minmax(0, 1fr) 95px; }
}
</style>
