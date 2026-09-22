<script setup lang="ts">
import { computed } from "vue";
import { buildings, researchName } from "../data";
import {
  assignBuilder,
  cancelBuild,
  freeWorkers,
  has,
  moveBuild,
  unlocked,
  workersIn,
} from "../engine";
import { useGame } from "../useGame";
import PixelIcon from "../components/PixelIcon.vue";
import SettlementStatusCard from "../components/SettlementStatusCard.vue";

const props = defineProps<{ selected: string }>();
const emit = defineEmits<{
  select: [id: string];
  navigate: [tab: string];
}>();

const { game } = useGame();
const groups = [...new Set(buildings.map((building) => building.group))];

const researchProgress = computed(() =>
  game.research
    ? 100 * (1 - game.research.remaining / game.research.duration)
    : 0,
);

const nextHelp = computed(() =>
  !has(game, "stonecraft")
    ? "Zacznij od narzędzi kamiennych w Odkryciach."
    : !game.buildings.workshop.level
      ? "Zbuduj warsztat narzędzi. Przydziel wolną osobę do budowy."
      : !has(game, "logging")
        ? "W warsztacie wytwórz narzędzia. Następnie odkryj drwala lub kamieniarza."
        : !has(game, "scouting")
          ? "Zbuduj szałasy i odkryj zwiad. Wyprawy przywiozą nasiona i złoto."
          : "Rozdzielaj pracowników, ulepszaj narzędzia i rozwijaj kolejne gałęzie gospodarki.",
);

function clock(value: number) {
  const seconds = Math.max(0, Math.ceil(value));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function buildingState(id: string) {
  const state = game.buildings[id];
  if (!state.level) return "unbuilt";
  const workers = workersIn(game, id);
  if (buildings.find((building) => building.id === id)?.recipes.length && workers === 0)
    return "idle";
  return "active";
}
</script>

<template>
  <div class="settlement-view">
    <SettlementStatusCard />

    <p class="guide">{{ nextHelp }}</p>

    <section
      v-for="group in groups.filter((name) =>
        buildings.some((building) => building.group === name && unlocked(game, building.id)),
      )"
      :key="group"
      class="building-group"
    >
      <h2 class="section-title">{{ group }}</h2>
      <div class="building-grid">
        <button
          v-for="building in buildings.filter(
            (item) => item.group === group && unlocked(game, item.id),
          )"
          :key="building.id"
          class="building-tile"
          :class="[
            buildingState(building.id),
            { selected: props.selected === building.id },
          ]"
          :aria-label="`${building.name}, poziom ${game.buildings[building.id].level}`"
          :title="building.name"
          @click="emit('select', building.id)"
        >
          <PixelIcon :name="building.icon" :size="48" />
          <span class="tile-level">{{ game.buildings[building.id].level || "+" }}</span>
          <span class="tile-label">{{ building.name }}</span>
          <span v-if="workersIn(game, building.id)" class="tile-workers">
            {{ workersIn(game, building.id) }}
          </span>
          <span class="building-state-dot" :title="buildingState(building.id)"></span>
        </button>
      </div>
    </section>

    <section class="construction compact-construction">
      <div class="subheading">
        <div>
          <small class="eyebrow">BUDOWA</small>
          <h2>Budowniczowie</h2>
        </div>
        <div class="stepper">
          <button
            :disabled="!game.builders"
            aria-label="Odejmij budowniczego"
            @click="assignBuilder(game, -1)"
          >−</button>
          <b>{{ game.builders }}</b>
          <button
            :disabled="!freeWorkers(game) || game.builders >= 6"
            aria-label="Dodaj budowniczego"
            @click="assignBuilder(game, 1)"
          >+</button>
        </div>
      </div>

      <div v-if="!game.buildQueue.length" class="construction-empty">
        <span>Brak aktywnych projektów.</span>
        <small>Wybierz budynek, a następnie zakładkę „Rozwój” w panelu po prawej.</small>
      </div>

      <div
        v-for="(task, index) in game.buildQueue"
        :key="`${task.id}-${task.level}`"
        class="queue-item"
      >
        <div>
          <strong>
            {{ buildings.find((building) => building.id === task.id)?.name }} · poziom {{ task.level }}
          </strong>
          <small>
            {{
              index === 0
                ? game.builders
                  ? "W budowie"
                  : "Czeka na budowniczych"
                : "W kolejce"
            }}
            · {{ Math.ceil(task.remaining) }} pracy
          </small>
          <progress :value="task.duration - task.remaining" :max="task.duration" />
        </div>
        <button
          :disabled="index === 0"
          title="Przesuń wcześniej"
          @click="moveBuild(game, index)"
        >↑</button>
        <button title="Anuluj i zwróć materiały" @click="cancelBuild(game, index)">×</button>
      </div>
    </section>

    <div class="activity-grid">
      <button class="activity-card" @click="emit('navigate', 'Odkrycia')">
        <div class="activity-title">
          <PixelIcon name="book" />
          <h2>ODKRYCIA</h2>
        </div>
        <strong>{{ game.research ? researchName(game.research.id) : "Nowe możliwości" }}</strong>
        <progress v-if="game.research" :value="researchProgress" max="100" />
        <p>
          {{
            game.research
              ? clock(game.research.remaining)
              : `${game.researched.length} odkrytych technologii i premii`
          }}
        </p>
      </button>

      <button class="activity-card" @click="emit('navigate', 'Wydarzenia')">
        <div class="activity-title">
          <PixelIcon name="person" />
          <h2>PRZYBYSZE</h2>
        </div>
        <strong>{{ game.events.length ? "Ktoś czeka przy ognisku" : "Nasłuchujemy we mgle" }}</strong>
        <p>Mieszkańcy dołączają wyłącznie w wydarzeniach. Decyzje nie wygasają.</p>
      </button>
    </div>

    <section class="journal">
      <h2 class="section-title">Kronika</h2>
      <p v-for="(entry, index) in game.log.slice(0, 5)" :key="index">
        <span>›</span>{{ entry }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.eyebrow { display: block; color: #858b70; font-size: 9px; letter-spacing: .12em; }
.compact-construction { margin-top: 24px; }
.construction-empty {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  color: #9b9e89;
  font-size: 11px;
}
.construction-empty small { color: #777b69; text-align: right; }
.building-tile { position: relative; }
.building-state-dot {
  position: absolute;
  left: 6px;
  top: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #67705c;
  box-shadow: 0 0 0 1px #111;
}
.building-tile.active .building-state-dot { background: #93c16f; }
.building-tile.idle .building-state-dot { background: #c9a45e; }
.building-tile.unbuilt .building-state-dot { background: #66665e; }
@media (max-width: 650px) {
  .construction-empty { flex-direction: column; }
  .construction-empty small { text-align: left; }
}
</style>
