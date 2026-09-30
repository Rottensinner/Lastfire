<script setup lang="ts">
import { computed, ref, nextTick, watch } from "vue";
import { researches } from "../data";
import { visibleResearch, has } from "../engine";
import type { GameState } from "../types";
import { discoveryCategories, discoveryCategory, discoveryDepth, type DiscoveryCategoryId } from "../discoveryAtlas";
import PixelIcon from "./PixelIcon.vue";

const props = defineProps<{ game: GameState; selected: string }>();
const emit = defineEmits<{ select: [id: string] }>();
const activeCategory = ref<DiscoveryCategoryId | "all">("all");
const zoom = ref(1);
const viewport = ref<HTMLElement>();
const visible = computed(() => researches.filter(r => visibleResearch(props.game, r.id)));
const nodes = computed(() => {
  const ids = new Set(visible.value.filter(r => activeCategory.value === "all" || discoveryCategory(r.id) === activeCategory.value).map(r => r.id));
  // Zależności z innych dziedzin pozostają widoczne w wybranej gałęzi.
  function addParents(id: string) {
    for (const parent of researches.find(r => r.id === id)?.requires ?? []) {
      if (!ids.has(parent) && visible.value.some(r => r.id === parent)) { ids.add(parent); addParents(parent); }
    }
  }
  for (const id of [...ids]) addParents(id);
  const rows = new Map<number, number>();
  return visible.value.filter(r => ids.has(r.id)).map(research => {
    const depth = discoveryDepth(research.id);
    const row = rows.get(depth) ?? 0;
    rows.set(depth, row + 1);
    return { ...research, x: 24 + depth * 270, y: 24 + row * 116 };
  });
});
const width = computed(() => Math.max(600, ...nodes.value.map(n => n.x + 250)));
const height = computed(() => Math.max(460, ...nodes.value.map(n => n.y + 110)));
const edges = computed(() => nodes.value.flatMap(node => node.requires.flatMap(id => {
  const parent = nodes.value.find(n => n.id === id);
  if (!parent) return [];
  const x = parent.x + 220, y = parent.y + 44, end = node.x, ey = node.y + 44;
  return [{ id: `${id}-${node.id}`, d: `M ${x} ${y} C ${x + 25} ${y}, ${end - 25} ${ey}, ${end} ${ey}`, known: has(props.game, node.id) }];
})));
async function changeZoom(value: number) {
  const element = viewport.value;
  const previous = zoom.value;
  const next = Math.max(.45, Math.min(1.8, Math.round(value * 100) / 100));
  const left = element ? element.scrollLeft + element.clientWidth / 2 : 0;
  const top = element ? element.scrollTop + element.clientHeight / 2 : 0;
  zoom.value = next;
  await nextTick();
  if (element) {
    element.scrollLeft = left * next / previous - element.clientWidth / 2;
    element.scrollTop = top * next / previous - element.clientHeight / 2;
  }
}
function wheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) { event.preventDefault(); changeZoom(zoom.value + (event.deltaY < 0 ? .1 : -.1)); }
}
let drag: { x: number; y: number; left: number; top: number; pointer: number } | null = null;
function startPan(event: PointerEvent) {
  if (event.button !== 0 || (event.target as HTMLElement).closest("button") || !viewport.value) return;
  drag = { x: event.clientX, y: event.clientY, left: viewport.value.scrollLeft, top: viewport.value.scrollTop, pointer: event.pointerId };
  viewport.value.setPointerCapture(event.pointerId);
}
function pan(event: PointerEvent) {
  if (!drag || drag.pointer !== event.pointerId || !viewport.value) return;
  viewport.value.scrollLeft = drag.left + drag.x - event.clientX;
  viewport.value.scrollTop = drag.top + drag.y - event.clientY;
}
function stopPan() { drag = null; }
watch(() => props.selected, async id => {
  if (!nodes.value.some(node => node.id === id)) activeCategory.value = "all";
  await nextTick();
  const node = nodes.value.find(node => node.id === id);
  const element = viewport.value;
  if (node && element) {
    element.scrollLeft = Math.max(0, node.x * zoom.value - element.clientWidth / 2 + 110 * zoom.value);
    element.scrollTop = Math.max(0, node.y * zoom.value - element.clientHeight / 2 + 44 * zoom.value);
  }
});
function resetView() { zoom.value = 1; if (viewport.value) { viewport.value.scrollLeft = 0; viewport.value.scrollTop = 0; } }
</script>

<template>
  <div class="discovery-atlas">
    <nav class="tree-categories" aria-label="Dziedzina odkryć">
      <button :aria-pressed="activeCategory === 'all'" @click="activeCategory = 'all'">Całe drzewo</button>
      <button v-for="category in discoveryCategories" :key="category.id" :aria-pressed="activeCategory === category.id" @click="activeCategory = category.id">{{ category.name }}</button>
    </nav>
    <div class="tree-tools">
      <span>Przeciągnij tło, aby przesunąć. Ctrl + kółko zmienia skalę.</span>
      <button aria-label="Oddal drzewo" :disabled="zoom <= .45" @click="changeZoom(zoom - .1)">−</button>
      <output aria-label="Skala drzewa">{{ Math.round(zoom * 100) }}%</output>
      <button aria-label="Przybliż drzewo" :disabled="zoom >= 1.8" @click="changeZoom(zoom + .1)">+</button>
      <button @click="resetView">Reset widoku</button>
    </div>
    <div ref="viewport" class="tree-viewport" tabindex="0" aria-label="Drzewo odkryć, przewijaj strzałkami" @wheel="wheel" @pointerdown="startPan" @pointermove="pan" @pointerup="stopPan" @pointercancel="stopPan" @lostpointercapture="stopPan">
      <p v-if="!nodes.length" class="tree-empty">Ta dziedzina nie ma jeszcze widocznych odkryć. Rozwijaj powiązane gałęzie.</p>
      <div v-else class="tree-space" :style="{ width: `${width * zoom}px`, height: `${height * zoom}px` }">
        <div class="tree-canvas" :style="{ width: `${width}px`, height: `${height}px`, transform: `scale(${zoom})` }">
          <svg :width="width" :height="height" aria-hidden="true">
            <path v-for="edge in edges" :key="edge.id" :d="edge.d" :class="{ known: edge.known }" />
          </svg>
          <button v-for="node in nodes" :key="node.id" class="tree-node" :class="{ selected: selected === node.id, known: has(game, node.id), researching: game.research?.id === node.id, special: node.kind !== 'research' }" :style="{ left: `${node.x}px`, top: `${node.y}px` }" :aria-pressed="selected === node.id" @click="emit('select', node.id)">
            <PixelIcon :name="node.icon" :size="36" />
            <span><strong>{{ node.name }}</strong><small>{{ has(game, node.id) ? '✓ Odkryto' : game.research?.id === node.id ? 'Badanie w toku' : node.kind === 'research' ? 'Dostępne badanie' : 'Znalezisko lub wydarzenie' }}</small></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discovery-atlas { min-width: 0; background: #15140f; color: #ddd0b8; }
.tree-categories { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px; border-bottom: 1px solid #3a342b; }
.tree-categories button[aria-pressed="true"] { border-color: #ad7740; background: #302419; }
.tree-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 10px 12px; }
.tree-tools span { flex: 1; font-size: 12px; color: #aaa08e; }
.tree-tools output { min-width: 45px; text-align: center; }
.tree-viewport { height: min(65vh, 720px); min-height: 360px; overflow: auto; cursor: grab; overscroll-behavior: contain; border-top: 1px solid #3a342b; }
.tree-viewport:active { cursor: grabbing; }
.tree-space { position: relative; }
.tree-canvas { position: absolute; top: 0; left: 0; transform-origin: top left; }
.tree-canvas svg { position: absolute; inset: 0; pointer-events: none; }
.tree-canvas path { fill: none; stroke: #786342; stroke-width: 2; }
.tree-canvas path.known { stroke: #769066; }
.tree-node { position: absolute; width: 220px; min-height: 88px; display: flex; gap: 10px; align-items: center; text-align: left; padding: 12px; background: #181610; border: 1px solid #66543a; color: #ddd0b8; cursor: pointer; }
.tree-node span { min-width: 0; }
.tree-node strong, .tree-node small { display: block; }
.tree-node small { margin-top: 5px; font-size: 11px; color: #b0a38e; }
.tree-node.known { border-color: #70855f; }
.tree-node.selected { outline: 2px solid #d7ad65; outline-offset: 2px; }
.tree-node.researching { background: #342718; }
.tree-node.special { border-style: dashed; }
.tree-empty { padding: 30px; }
</style>
