<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { researches, researchName } from "../data";
import { visibleResearch, has } from "../engine";
import type { GameState } from "../types";
import {
  discoveryCategories,
  discoveryCategory,
  discoveriesInCategory,
  discoveryDepth,
  type DiscoveryCategoryId,
} from "../discoveryAtlas";
import PixelIcon from "./PixelIcon.vue";

const props = defineProps<{ game: GameState; selected: string }>();
const emit = defineEmits<{ select: [id: string] }>();

const activeCategory = ref<DiscoveryCategoryId>(discoveryCategory(props.selected));

watch(
  () => props.selected,
  (id) => {
    const category = discoveryCategory(id);
    if (category !== activeCategory.value) activeCategory.value = category;
  },
);

const category = computed(() =>
  discoveryCategories.find((item) => item.id === activeCategory.value)!,
);

const categoryResearches = computed(() =>
  discoveriesInCategory(activeCategory.value).filter((research) =>
    visibleResearch(props.game, research.id),
  ),
);

const levels = computed(() => {
  const grouped = new Map<number, typeof researches>();
  for (const research of categoryResearches.value) {
    const depth = discoveryDepth(research.id);
    const list = grouped.get(depth) ?? [];
    list.push(research);
    grouped.set(depth, list);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([depth, items]) => ({ depth, items }));
});

const categoryCount = (id: DiscoveryCategoryId) =>
  discoveriesInCategory(id).filter((research) => visibleResearch(props.game, research.id)).length;

function selectCategory(id: DiscoveryCategoryId) {
  activeCategory.value = id;
  const first = discoveriesInCategory(id).find((research) => visibleResearch(props.game, research.id));
  if (first) emit("select", first.id);
}
</script>

<template>
  <div class="atlas">
    <aside class="atlas-sidebar">
      <div class="atlas-title">
        <small>ATLAS ODKRYĆ</small>
        <strong>Dziedziny wiedzy</strong>
      </div>
      <button
        v-for="item in discoveryCategories"
        :key="item.id"
        class="category-button"
        :class="{ active: activeCategory === item.id }"
        @click="selectCategory(item.id)"
      >
        <PixelIcon :name="item.icon" :size="30" />
        <span>
          <b>{{ item.name }}</b>
          <small>{{ categoryCount(item.id) }} widocznych</small>
        </span>
      </button>
    </aside>

    <section class="atlas-content">
      <header class="atlas-header">
        <div>
          <small>DZIEDZINA</small>
          <h2>{{ category.name }}</h2>
          <p>{{ category.description }}</p>
        </div>
        <div class="atlas-legend">
          <span>◇ dostępne</span>
          <span class="known">✓ odkryte</span>
          <span class="special">✦ specjalne</span>
        </div>
      </header>

      <div v-if="!levels.length" class="atlas-empty">
        Dalsze odkrycia tej dziedziny są jeszcze ukryte. Rozwijaj powiązane gałęzie.
      </div>

      <div v-else class="level-list">
        <section v-for="level in levels" :key="level.depth" class="discovery-level">
          <div class="level-label">
            <small>ETAP</small>
            <strong>{{ level.depth + 1 }}</strong>
          </div>

          <div class="level-nodes">
            <button
              v-for="node in level.items"
              :key="node.id"
              class="atlas-node"
              :class="{
                selected: selected === node.id,
                known: has(game, node.id),
                researching: game.research?.id === node.id,
                special: node.kind !== 'research',
              }"
              @click="emit('select', node.id)"
            >
              <div class="node-icon">
                <PixelIcon :name="node.icon" :size="42" />
                <span>{{ has(game, node.id) ? "✓" : game.research?.id === node.id ? "…" : node.kind !== "research" ? "✦" : "◇" }}</span>
              </div>
              <div class="node-copy">
                <strong>{{ node.name }}</strong>
                <small v-if="node.requires.length">
                  Wymaga: {{ node.requires.map(researchName).join(", ") }}
                </small>
                <small v-else>Początek gałęzi</small>
              </div>
            </button>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.atlas {
  display: grid;
  grid-template-columns: 185px minmax(0, 1fr);
  min-height: 560px;
  border-top: 1px solid #342f27;
}
.atlas-sidebar {
  padding: 12px;
  border-right: 1px solid #342f27;
  background: #11110e;
}
.atlas-title {
  padding: 5px 7px 12px;
  border-bottom: 1px solid #302b23;
  margin-bottom: 8px;
}
.atlas-title small,
.atlas-header small,
.level-label small {
  display: block;
  color: #8e826e;
  font-size: 9px;
  letter-spacing: .11em;
}
.atlas-title strong { display: block; margin-top: 3px; color: #ded3bd; }
.category-button {
  width: 100%;
  display: grid;
  grid-template-columns: 34px 1fr;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  padding: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #a79c88;
  text-align: left;
  cursor: pointer;
}
.category-button:hover { background: #17150f; border-color: #342e25; }
.category-button.active { background: #241d14; border-color: #795932; color: #eadfc8; }
.category-button span { min-width: 0; }
.category-button b { display: block; font-size: 12px; }
.category-button small { display: block; margin-top: 2px; color: #6f675b; font-size: 9px; }
.atlas-content { min-width: 0; background: #15140f; }
.atlas-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  padding: 16px 18px;
  border-bottom: 1px solid #342f27;
}
.atlas-header h2 { margin: 2px 0 4px; color: #e4d9c3; font-size: 19px; }
.atlas-header p { max-width: 600px; margin: 0; color: #978d7c; font-size: 12px; line-height: 1.45; }
.atlas-legend { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; color: #867c6b; font-size: 10px; }
.atlas-legend .known { color: #9db38a; }
.atlas-legend .special { color: #cba469; }
.level-list { padding: 12px 14px 22px; }
.discovery-level {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #29251f;
}
.level-label {
  padding: 8px 5px;
  color: #7e7464;
  text-align: center;
}
.level-label strong { display: block; margin-top: 2px; font-size: 22px; color: #b28b59; }
.level-nodes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
  gap: 7px;
}
.atlas-node {
  min-width: 0;
  display: grid;
  grid-template-columns: 52px 1fr;
  align-items: center;
  gap: 9px;
  padding: 9px;
  border: 1px solid #3a342b;
  background: #11110e;
  color: #aea391;
  text-align: left;
  cursor: pointer;
}
.atlas-node:hover { border-color: #665239; background: #191710; }
.atlas-node.selected { border-color: #ad7740; background: #2a2116; box-shadow: inset 3px 0 #b77a3e; }
.atlas-node.known { border-color: #46513f; }
.atlas-node.researching { border-color: #9a7643; }
.atlas-node.special { border-style: dashed; }
.node-icon { position: relative; display: grid; place-items: center; }
.node-icon span {
  position: absolute;
  right: 0;
  bottom: -2px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1px solid #504536;
  background: #17140f;
  color: #c9a46d;
  font-size: 10px;
}
.node-copy { min-width: 0; }
.node-copy strong { display: block; color: #ddd2bc; font-size: 12px; }
.node-copy small { display: block; margin-top: 4px; color: #786f61; font-size: 9px; line-height: 1.3; }
.atlas-empty { margin: 18px; padding: 18px; border: 1px dashed #4c4437; color: #8c8272; font-size: 12px; }
@media (max-width: 820px) {
  .atlas { grid-template-columns: 1fr; }
  .atlas-sidebar {
    display: flex;
    gap: 5px;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid #342f27;
  }
  .atlas-title { display: none; }
  .category-button { min-width: 145px; }
  .atlas-header { display: block; }
  .atlas-legend { justify-content: flex-start; margin-top: 10px; }
}
</style>
