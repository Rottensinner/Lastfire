<script setup lang="ts">
import { computed, ref } from "vue";
import { buildings } from "../data";
import { useGame } from "../useGame";
import { unlocked } from "../engine";
import {
  buildingUpgradeRequirements,
  canQueueStagedUpgrade,
  currentBuildingStage,
  developmentFor,
  nextBuildingStage,
  queueStagedUpgrade,
  stagedUpgradeCost,
} from "../buildingProgression";
import PixelIcon from "./PixelIcon.vue";
import CostList from "./CostList.vue";

const { game, notice, save } = useGame();
const open = ref(false);
const selected = ref("gatherers");

const groups = [...new Set(buildings.map((building) => building.group))];
const building = computed(() => buildings.find((item) => item.id === selected.value)!);
const state = computed(() => game.buildings[selected.value]);
const development = computed(() => developmentFor(selected.value));
const currentStage = computed(() => currentBuildingStage(game, selected.value));
const nextStage = computed(() => nextBuildingStage(game, selected.value));
const nextCost = computed(() => stagedUpgradeCost(game, selected.value));
const requirements = computed(() => buildingUpgradeRequirements(game, selected.value));

function choose(id: string) {
  selected.value = id;
}

function upgrade() {
  if (!queueStagedUpgrade(game, selected.value)) {
    notice.value = "Nie spełniasz wymagań etapu, brakuje materiałów albo budynek jest już w kolejce.";
    return;
  }
  save();
  notice.value = `Dodano rozbudowę: ${building.value.name}, poziom ${state.value.level + 1}.`;
}
</script>

<template>
  <button class="building-progress-trigger" @click="open = !open">
    <PixelIcon name="house" :size="28" />
    <span>
      <small>ROZWÓJ BUDYNKÓW</small>
      <strong>Etapy konstrukcyjne</strong>
    </span>
    <b>{{ open ? "×" : "▲" }}</b>
  </button>

  <aside v-if="open" class="building-progress-panel" aria-label="Rozwój budynków">
    <header class="bp-header">
      <div>
        <small>INFRASTRUKTURA</small>
        <h2>Rozwój budynków</h2>
        <p>Każdy próg poziomów zmienia materiały, wymagania i charakter budynku.</p>
      </div>
      <button class="bp-close" @click="open = false">×</button>
    </header>

    <div class="bp-layout">
      <nav class="bp-buildings">
        <section v-for="group in groups" :key="group">
          <h3>{{ group }}</h3>
          <button
            v-for="item in buildings.filter((building) => building.group === group)"
            :key="item.id"
            :class="{
              active: selected === item.id,
              locked: !unlocked(game, item.id),
            }"
            @click="choose(item.id)"
          >
            <PixelIcon :name="item.icon" :size="26" />
            <span>
              <b>{{ item.name }}</b>
              <small>poziom {{ game.buildings[item.id].level }}</small>
            </span>
          </button>
        </section>
      </nav>

      <main class="bp-details">
        <div class="bp-building-title">
          <PixelIcon :name="building.icon" :size="54" />
          <div>
            <small>{{ building.group }}</small>
            <h2>{{ building.name }}</h2>
            <p>{{ building.description }}</p>
          </div>
          <span class="bp-level">{{ state.level }}</span>
        </div>

        <div v-if="currentStage" class="bp-current-stage">
          <small>OBECNY ETAP KONSTRUKCYJNY</small>
          <strong>{{ currentStage.name }}</strong>
          <p>{{ currentStage.description }}</p>
          <span>Poziomy {{ currentStage.fromLevel }}–{{ currentStage.toLevel }}</span>
        </div>

        <section v-if="development" class="bp-roadmap">
          <h3>Pełna ścieżka rozwoju</h3>
          <div class="bp-stage-track">
            <article
              v-for="stage in development.stages"
              :key="stage.fromLevel"
              :class="{
                current: state.level >= stage.fromLevel && state.level <= stage.toLevel,
                completed: state.level > stage.toLevel,
              }"
            >
              <div class="bp-stage-number">{{ stage.fromLevel }}–{{ stage.toLevel }}</div>
              <strong>{{ stage.name }}</strong>
              <small>{{ stage.requiredSettlement }}</small>
              <p>{{ stage.description }}</p>
              <div class="bp-materials">
                <span v-for="(amount, resource) in stage.baseCost" :key="resource">
                  {{ resource }} {{ amount }}
                </span>
              </div>
            </article>
          </div>
        </section>

        <section v-if="nextStage && state.level < 20" class="bp-next-upgrade">
          <div class="bp-next-heading">
            <div>
              <small>NASTĘPNA ROZBUDOWA</small>
              <h3>Poziom {{ state.level + 1 }} · {{ nextStage.name }}</h3>
            </div>
            <span>{{ nextStage.fromLevel }}–{{ nextStage.toLevel }}</span>
          </div>

          <div class="bp-requirements">
            <div v-for="row in requirements" :key="row.label" :class="{ met: row.met }">
              <span>{{ row.met ? "✓" : "◇" }}</span>
              {{ row.label }}
            </div>
          </div>

          <h4>Koszt rozbudowy</h4>
          <CostList :cost="nextCost" :stock="game.resources" />

          <button
            class="bp-upgrade"
            :disabled="!canQueueStagedUpgrade(game, selected)"
            @click="upgrade"
          >
            {{ game.buildQueue.some((task) => task.id === selected) ? "Budynek jest w kolejce" : `Rozbuduj do poziomu ${state.level + 1}` }}
          </button>
          <p class="bp-hint">Materiały są pobierane przy dodaniu do kolejki. Budowa nadal wymaga budowniczych w głównym panelu osady.</p>
        </section>

        <div v-else class="bp-max">Osiągnięto maksymalny zdefiniowany poziom tego budynku.</div>
      </main>
    </div>
  </aside>
</template>

<style>
/* Stary, liniowy przycisk rozbudowy zostaje zastąpiony systemem etapów. */
.detail-panel .upgrade-section { display: none !important; }
</style>

<style scoped>
.building-progress-trigger {
  position: fixed;
  left: 18px;
  bottom: 54px;
  z-index: 82;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 9px;
  min-width: 225px;
  padding: 9px 11px;
  border: 1px solid #62533d;
  background: #15140f;
  color: #e1d6bf;
  box-shadow: 0 8px 28px #000a;
  text-align: left;
  cursor: pointer;
}
.building-progress-trigger small,
.bp-header small,
.bp-building-title small,
.bp-current-stage small,
.bp-next-heading small {
  display: block;
  color: #8e826e;
  font-size: 9px;
  letter-spacing: .1em;
}
.building-progress-trigger strong { display: block; margin-top: 2px; font-size: 12px; }
.building-progress-trigger > b { color: #8d806c; }
.building-progress-panel {
  position: fixed;
  left: 18px;
  bottom: 104px;
  z-index: 81;
  width: min(900px, calc(100vw - 36px));
  max-height: calc(100vh - 140px);
  overflow: hidden;
  border: 1px solid #65563f;
  background: #11110e;
  color: #ddd2bd;
  box-shadow: 0 18px 52px #000e;
}
.bp-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 15px 17px;
  border-bottom: 1px solid #342f27;
  background: #181711;
}
.bp-header h2 { margin: 2px 0 4px; font-size: 20px; }
.bp-header p { margin: 0; color: #978d7b; font-size: 11px; }
.bp-close { width: 32px; height: 32px; border: 1px solid #40382d; background: transparent; color: #cfc4ae; cursor: pointer; }
.bp-layout { display: grid; grid-template-columns: 215px minmax(0, 1fr); max-height: calc(100vh - 220px); }
.bp-buildings { overflow: auto; padding: 10px; border-right: 1px solid #342f27; background: #0f0f0c; }
.bp-buildings section + section { margin-top: 11px; }
.bp-buildings h3 { margin: 0 0 5px; color: #716858; font-size: 9px; text-transform: uppercase; letter-spacing: .08em; }
.bp-buildings button {
  width: 100%;
  display: grid;
  grid-template-columns: 30px 1fr;
  align-items: center;
  gap: 7px;
  padding: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: #a69a86;
  text-align: left;
  cursor: pointer;
}
.bp-buildings button:hover { background: #17150f; }
.bp-buildings button.active { border-color: #775a38; background: #241d14; color: #e5dac3; }
.bp-buildings button.locked { opacity: .45; }
.bp-buildings b { display: block; font-size: 10px; }
.bp-buildings small { display: block; color: #6d6558; font-size: 8px; }
.bp-details { overflow: auto; padding: 15px; }
.bp-building-title { display: grid; grid-template-columns: 62px 1fr auto; gap: 12px; align-items: center; }
.bp-building-title h2 { margin: 2px 0 3px; font-size: 20px; }
.bp-building-title p { margin: 0; color: #948a78; font-size: 11px; }
.bp-level { display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid #765b37; color: #d0a15f; font-size: 19px; }
.bp-current-stage { margin-top: 13px; padding: 11px; border: 1px solid #4b402f; background: #19160f; }
.bp-current-stage strong { display: block; margin-top: 3px; color: #ebddc3; }
.bp-current-stage p { margin: 4px 0; color: #9d927f; font-size: 11px; }
.bp-current-stage > span { color: #b78b54; font-size: 10px; }
.bp-roadmap { margin-top: 14px; }
.bp-roadmap h3 { margin: 0 0 8px; font-size: 12px; color: #c7b99f; }
.bp-stage-track { display: grid; grid-template-columns: repeat(5, minmax(125px, 1fr)); gap: 6px; overflow-x: auto; padding-bottom: 5px; }
.bp-stage-track article { min-width: 125px; padding: 9px; border: 1px solid #312d26; background: #12110e; opacity: .62; }
.bp-stage-track article.current { border-color: #87633b; background: #211a12; opacity: 1; }
.bp-stage-track article.completed { border-color: #384435; opacity: .85; }
.bp-stage-track strong { display: block; margin: 4px 0 2px; font-size: 10px; color: #d6cab3; }
.bp-stage-track small { color: #796f60; font-size: 8px; }
.bp-stage-track p { min-height: 44px; margin: 5px 0; color: #807665; font-size: 8px; line-height: 1.35; }
.bp-stage-number { color: #c09358; font-size: 12px; font-weight: 700; }
.bp-materials { display: flex; flex-wrap: wrap; gap: 3px; }
.bp-materials span { padding: 2px 4px; background: #0d0d0a; color: #817666; font-size: 7px; }
.bp-next-upgrade { margin-top: 14px; padding: 12px; border: 1px solid #4d402e; background: #17150f; }
.bp-next-heading { display: flex; justify-content: space-between; gap: 12px; }
.bp-next-heading h3 { margin: 2px 0 0; font-size: 14px; }
.bp-next-heading > span { color: #bb8b51; font-size: 11px; }
.bp-requirements { display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0; }
.bp-requirements div { padding: 4px 6px; border: 1px solid #533c32; color: #b47e6d; font-size: 9px; }
.bp-requirements div.met { border-color: #374434; color: #91aa84; }
.bp-next-upgrade h4 { margin: 10px 0 5px; font-size: 10px; color: #8f8575; text-transform: uppercase; letter-spacing: .08em; }
.bp-upgrade { width: 100%; margin-top: 10px; padding: 9px; border: 1px solid #755534; background: #332719; color: #eadbc0; cursor: pointer; }
.bp-upgrade:disabled { opacity: .38; cursor: not-allowed; }
.bp-hint { margin: 7px 0 0; color: #776e60; font-size: 9px; }
.bp-max { margin-top: 14px; padding: 12px; border: 1px dashed #4b4337; color: #8d8271; font-size: 11px; }
@media (max-width: 800px) {
  .building-progress-trigger { left: 8px; bottom: 48px; min-width: 190px; }
  .building-progress-panel { left: 8px; bottom: 96px; width: calc(100vw - 16px); max-height: calc(100vh - 112px); }
  .bp-layout { grid-template-columns: 1fr; max-height: calc(100vh - 190px); }
  .bp-buildings { display: flex; gap: 4px; overflow-x: auto; border-right: 0; border-bottom: 1px solid #342f27; }
  .bp-buildings section { display: flex; gap: 3px; margin: 0 !important; }
  .bp-buildings h3 { display: none; }
  .bp-buildings button { min-width: 135px; }
}
</style>
