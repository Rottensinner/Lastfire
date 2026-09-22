<script setup lang="ts">
import { computed } from "vue";
import { buildings, researches, researchName } from "../data";
import { canPay, has, startResearch, visibleResearch } from "../engine";
import { useGame } from "../useGame";
import CostList from "./CostList.vue";
import PixelIcon from "./PixelIcon.vue";

const props = defineProps<{ discoveryId: string }>();
const emit = defineEmits<{
  select: [id: string];
  navigate: [tab: string];
}>();

const { game, notice } = useGame();
const node = computed(() => researches.find((research) => research.id === props.discoveryId)!);
const researchProgress = computed(() =>
  game.research
    ? 100 * (1 - game.research.remaining / game.research.duration)
    : 0,
);
const unlocks = computed(() => [
  ...buildings
    .filter((building) => building.research === node.value.id)
    .map((building) => `Budynek: ${building.name}`),
  ...buildings.flatMap((building) =>
    building.recipes
      .filter((recipe) => recipe.research === node.value.id)
      .map((recipe) => `${building.name}: ${recipe.name}`),
  ),
]);

function clock(value: number) {
  const seconds = Math.max(0, Math.ceil(value));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function start() {
  if (!startResearch(game, node.value.id)) {
    notice.value = "Nie możesz jeszcze rozpocząć tego badania.";
  }
}
</script>

<template>
  <div class="discovery-details">
    <div class="panel-heading discovery-detail-heading">
      <div>
        <small>ODKRYCIE</small>
        <h1>{{ node.name.toUpperCase() }}</h1>
      </div>
      <span class="small-tag">
        {{
          node.kind === "research"
            ? "Badanie"
            : node.kind === "specialist"
              ? "Specjalista"
              : "Znalezisko"
        }}
      </span>
    </div>

    <div class="discovery-portrait">
      <PixelIcon :name="node.icon" :size="96" />
    </div>

    <p class="detail-description">{{ node.description }}</p>

    <template v-if="unlocks.length">
      <h2 class="section-title">Odblokowuje</h2>
      <ul class="unlock-list">
        <li v-for="item in unlocks" :key="item">{{ item }}</li>
      </ul>
    </template>

    <section v-if="node.requires.length" class="requirements">
      <h2 class="section-title">Wymagania</h2>
      <button
        v-for="id in node.requires"
        :key="id"
        class="requirement"
        :class="{ positive: has(game, id) }"
        @click="emit('select', id)"
      >
        {{ has(game, id) ? "✓" : "◇" }} {{ researchName(id) }}
      </button>
    </section>

    <div v-if="has(game, node.id)" class="known-badge">
      ✓ Odkryto — efekt jest aktywny
    </div>

    <template v-else-if="node.kind === 'research'">
      <CostList :cost="node.cost" :stock="game.resources" />
      <p class="muted detail-time">Czas: {{ clock(node.duration) }} · jedno badanie naraz</p>

      <template v-if="game.research?.id === node.id">
        <progress :value="researchProgress" max="100" />
        <p class="positive detail-time">Pozostało {{ clock(game.research.remaining) }}</p>
      </template>

      <button
        v-else
        class="primary full"
        :disabled="!!game.research || !visibleResearch(game, node.id) || !canPay(game, node.cost)"
        @click="start"
      >
        Rozpocznij badanie
      </button>
    </template>

    <div v-else class="discovery-source">
      <h2>Jak zdobyć?</h2>
      <p>{{ node.source }}</p>
      <button
        class="primary full"
        @click="emit('navigate', node.kind === 'specialist' ? 'Wydarzenia' : 'Wyprawy')"
      >
        {{ node.kind === "specialist" ? "Sprawdź wydarzenia" : "Przejdź do wypraw" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.discovery-detail-heading small {
  display: block;
  margin-bottom: 2px;
  color: #838772;
  font-size: 9px;
  letter-spacing: .12em;
}
.discovery-detail-heading { align-items: flex-start; }
.discovery-detail-heading .small-tag { margin-top: 2px; }
.detail-time { margin: 8px 0; font-size: 10px; }
</style>
