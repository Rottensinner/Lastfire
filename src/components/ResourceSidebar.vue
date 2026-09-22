<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { resources } from "../data";
import { capacity, has, rates } from "../engine";
import type { Resource } from "../types";
import { useGame } from "../useGame";
import PixelIcon from "./PixelIcon.vue";

const { game } = useGame();
const search = ref("");
const groups = [...new Set(resources.map((resource) => resource.group))];
const expanded = reactive<Record<string, boolean>>(
  Object.fromEntries(groups.map((group) => [group, true])),
);

const flow = computed(() => rates(game));
const shown = computed(() =>
  resources.filter(
    (resource) =>
      (!resource.unlock || has(game, resource.unlock) || game.resources[resource.id] > 0) &&
      resource.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
);
const remainingFood = computed(() =>
  flow.value.food < 0
    ? clock(game.resources.food / -flow.value.food)
    : "bilans dodatni",
);

const format = (value: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value);

function clock(value: number) {
  const seconds = Math.max(0, Math.ceil(value));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function reserve(id: Resource, event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  game.reserves[id] = Number.isFinite(value)
    ? Math.min(1_000_000, Math.max(0, value))
    : 0;
}
</script>

<template>
  <aside class="panel resources-panel">
    <div class="panel-heading">
      <h1>ZASOBY</h1>
      <span class="muted">/ {{ capacity(game) }}</span>
    </div>

    <input
      v-model="search"
      class="resource-search"
      aria-label="Szukaj zasobu"
      placeholder="Szukaj zasobu…"
    />

    <div class="resource-scroll">
      <section
        v-for="group in groups.filter((name) => shown.some((resource) => resource.group === name))"
        :key="group"
        class="resource-group"
      >
        <button class="resource-group-toggle" @click="expanded[group] = !expanded[group]">
          <span>{{ expanded[group] ? "▾" : "▸" }} {{ group }}</span>
          <small>{{ shown.filter((resource) => resource.group === group).length }}</small>
        </button>

        <div v-show="expanded[group]">
          <div
            v-for="resource in shown.filter((item) => item.group === group)"
            :key="resource.id"
            class="resource-row"
            :title="`${resource.name}: ${format(game.resources[resource.id])}. Bilans szacunkowy ${format(flow[resource.id])} / tik.`"
          >
            <PixelIcon :name="resource.icon" :size="26" />
            <span>{{ resource.name }}</span>
            <b>{{ format(game.resources[resource.id]) }}</b>
            <span
              class="rate"
              :class="{
                negative: flow[resource.id] < 0,
                muted: Math.abs(flow[resource.id]) < 0.001,
              }"
            >
              {{ flow[resource.id] > 0 ? "+" : "" }}{{ format(flow[resource.id]) }}
            </span>
          </div>
        </div>
      </section>
    </div>

    <div class="resource-footer"><span>1 TIK = 1 SEKUNDA</span></div>
    <p class="stock-hint">
      Jedzenie: {{ remainingFood }}<br />
      Zużycie/os.: 0,012 jedzenia i 0,01 wody / tik.
    </p>

    <details v-if="has(game, 'storage')" class="reserves">
      <summary>Rezerwy produkcyjne</summary>
      <p>
        Chronią przed zużyciem w recepturach. Budowa, badania i potrzeby ludzi mogą je wykorzystać.
      </p>
      <label
        v-for="resource in shown.filter((item) => !['gold', 'knowledge'].includes(item.id))"
        :key="resource.id"
      >
        {{ resource.name }}
        <input
          type="number"
          min="0"
          :value="game.reserves[resource.id] || 0"
          :aria-label="`Rezerwa: ${resource.name}`"
          @change="reserve(resource.id, $event)"
        />
      </label>
    </details>
  </aside>
</template>

<style scoped>
.resource-group-toggle {
  width: 100%;
  min-height: 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  padding: 4px 2px;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
  color: #bcbda9;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-weight: bold;
  font-size: 11px;
}
.resource-group-toggle:hover:not(:disabled) { background: #1b211a; }
.resource-group-toggle small { color: #737b67; font-size: 9px; }
</style>
