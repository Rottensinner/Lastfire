<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { resources } from "../data";
import { capacity, has, rates } from "../engine";
import type { Resource } from "../types";
import { useGame } from "../useGame";
import PixelIcon from "./PixelIcon.vue";

const { game } = useGame();
const search = ref("");
const favoritesOnly = ref(false);
const groups = [...new Set(resources.map((resource) => resource.group))];
const expanded = reactive<Record<string, boolean>>(
  Object.fromEntries(groups.map((group) => [group, true])),
);

const FAVORITES_KEY = "lastfire-resource-favorites";
const fallbackFavorites: Resource[] = ["wood", "food", "stone", "iron"];
const favorites = ref<Resource[]>(loadFavorites());

const flow = computed(() => rates(game));
const available = computed(() =>
  resources.filter(
    (resource) =>
      !resource.unlock || has(game, resource.unlock) || game.resources[resource.id] > 0,
  ),
);
const shown = computed(() =>
  available.value.filter(
    (resource) =>
      resource.name.toLowerCase().includes(search.value.toLowerCase()) &&
      (!favoritesOnly.value || favorites.value.includes(resource.id)),
  ),
);
const favoriteRows = computed(() =>
  available.value.filter(
    (resource) =>
      favorites.value.includes(resource.id) &&
      resource.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
);
const fullestStock = computed(() =>
  Math.round(
    Math.max(0, ...available.value.map((resource) => game.resources[resource.id])),
  ),
);

const format = (value: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value);

function loadFavorites(): Resource[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return fallbackFavorites;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallbackFavorites;
    return parsed.filter((id): id is Resource => resources.some((resource) => resource.id === id));
  } catch {
    return fallbackFavorites;
  }
}

function toggleFavorite(id: Resource) {
  favorites.value = favorites.value.includes(id)
    ? favorites.value.filter((item) => item !== id)
    : [...favorites.value, id];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value));
}

function reserve(id: Resource, event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  game.reserves[id] = Number.isFinite(value)
    ? Math.min(1_000_000, Math.max(0, value))
    : 0;
}
</script>

<template>
  <aside class="panel resources-panel mockup-resources">
    <div class="panel-heading resource-heading">
      <h1>ZASOBY</h1>
      <span class="muted">{{ fullestStock }} / {{ capacity(game) }}</span>
    </div>

    <div class="resource-search-row">
      <input
        v-model="search"
        class="resource-search"
        aria-label="Szukaj zasobu"
        placeholder="Szukaj zasobu..."
      />
      <button
        class="favorite-filter"
        :class="{ active: favoritesOnly }"
        :aria-pressed="favoritesOnly"
        title="Pokaż tylko ulubione"
        @click="favoritesOnly = !favoritesOnly"
      >
        ★
      </button>
    </div>

    <div class="resource-scroll">
      <section v-if="favoriteRows.length && !favoritesOnly" class="resource-group favorites-group">
        <div class="resource-group-label">▼ ★ ULUBIONE</div>
        <div
          v-for="resource in favoriteRows"
          :key="`favorite-${resource.id}`"
          class="resource-row resource-row-favorite"
        >
          <button
            class="resource-star active"
            :aria-label="`Usuń z ulubionych: ${resource.name}`"
            @click="toggleFavorite(resource.id)"
          >★</button>
          <PixelIcon :name="resource.icon" :size="24" />
          <span>{{ resource.name }}</span>
          <b>{{ format(game.resources[resource.id]) }}</b>
          <span
            class="rate"
            :class="{
              negative: flow[resource.id] < 0,
              muted: Math.abs(flow[resource.id]) < 0.001,
            }"
          >
            {{ flow[resource.id] > 0 ? "+" : "" }}{{ format(flow[resource.id]) }}/s
          </span>
        </div>
      </section>

      <section
        v-for="group in groups.filter((name) => shown.some((resource) => resource.group === name))"
        :key="group"
        class="resource-group"
      >
        <button class="resource-group-toggle" @click="expanded[group] = !expanded[group]">
          <span>{{ expanded[group] ? "▼" : "▶" }} {{ group }}</span>
        </button>

        <div v-show="expanded[group]">
          <div
            v-for="resource in shown.filter((item) => item.group === group)"
            :key="resource.id"
            class="resource-row"
            :title="`${resource.name}: ${format(game.resources[resource.id])}. Bilans ${format(flow[resource.id])} / s.`"
          >
            <button
              class="resource-star"
              :class="{ active: favorites.includes(resource.id) }"
              :aria-label="favorites.includes(resource.id) ? `Usuń z ulubionych: ${resource.name}` : `Dodaj do ulubionych: ${resource.name}`"
              @click="toggleFavorite(resource.id)"
            >
              {{ favorites.includes(resource.id) ? "★" : "☆" }}
            </button>
            <PixelIcon :name="resource.icon" :size="24" />
            <span>{{ resource.name }}</span>
            <b>{{ format(game.resources[resource.id]) }}</b>
            <span
              class="rate"
              :class="{
                negative: flow[resource.id] < 0,
                muted: Math.abs(flow[resource.id]) < 0.001,
              }"
            >
              {{ flow[resource.id] > 0 ? "+" : "" }}{{ format(flow[resource.id]) }}/s
            </span>
          </div>
        </div>
      </section>
    </div>

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
.resource-heading { align-items: baseline; }
.resource-search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 8px;
  margin: 12px 0 16px;
}
.resource-search-row .resource-search { margin: 0; }
.favorite-filter {
  min-height: 38px;
  border-color: #46543a;
  background: #111912;
  color: #8f9477;
  font-size: 18px;
}
.favorite-filter.active { border-color: #9b9f4f; color: #e3cf67; background: #2c331d; }
.resource-group-toggle,
.resource-group-label {
  width: 100%;
  min-height: 28px;
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  padding: 4px 2px;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
  color: #d7d0ae;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 1.1px;
  font-weight: bold;
  font-size: 11px;
}
.resource-group-toggle:hover:not(:disabled) { background: #1b211a; }
.favorites-group { margin-bottom: 18px; }
.resource-row {
  position: relative;
  grid-template-columns: 16px 24px minmax(0, 1fr) 48px 54px !important;
}
.resource-star {
  width: 16px;
  min-width: 16px;
  min-height: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #555c4e;
  font-size: 10px;
  opacity: 0;
}
.resource-row:hover .resource-star,
.resource-star.active { opacity: 1; }
.resource-star.active { color: #d8bd59; }
.resource-row-favorite .resource-star { opacity: 1; }
@media (max-width: 650px) {
  .resource-star { opacity: 1; }
}
</style>
