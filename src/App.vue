<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { freeWorkers, has, housing } from "./engine";
import { civicServiceUnlocked } from "./civic";
import { satelliteLimit } from "./progression";
import { useGame } from "./useGame";
import PixelIcon from "./components/PixelIcon.vue";
import ResourceSidebar from "./components/ResourceSidebar.vue";
import DiscoveryTree from "./components/DiscoveryTree.vue";
import DiscoveryDetails from "./components/DiscoveryDetails.vue";
import BuildingInspector from "./components/BuildingInspector.vue";
import SettlementProgressPanel from "./components/SettlementProgressPanel.vue";
import CivicSafetyPanel from "./components/CivicSafetyPanel.vue";
import SettingsModal from "./components/SettingsModal.vue";
import SettlementView from "./views/SettlementView.vue";
import EventsView from "./views/EventsView.vue";
import ExpeditionsView from "./views/ExpeditionsView.vue";
import TradeView from "./views/TradeView.vue";

const { game, notice } = useGame();
const tab = ref("Osada");
const selected = ref("gatherers");
const discovery = ref("stonecraft");
const settings = ref(false);

const tabs = computed(() => {
  const result = ["Osada", "Odkrycia"];

  if (has(game, "scouting")) result.push("Wyprawy");
  if (has(game, "trade") || game.resources.gold > 0) result.push("Handel");

  result.push("Wydarzenia");

  if (satelliteLimit(game) > 0) result.push("Region");
  if (civicServiceUnlocked(game, "watch")) result.push("Bezpieczeństwo");

  return result;
});

const hasContextPanel = computed(() => ["Osada", "Odkrycia"].includes(tab.value));

watch(
  tabs,
  (available) => {
    if (!available.includes(tab.value)) tab.value = "Osada";
  },
  { deep: true },
);

function navigate(target: string) {
  if (tabs.value.includes(target)) tab.value = target;
}

function pickDiscovery(id: string) {
  discovery.value = id;
  tab.value = "Odkrycia";
}

function resetUi() {
  selected.value = "gatherers";
  discovery.value = "stonecraft";
  tab.value = "Osada";
}
</script>

<template>
  <div class="game-shell app-shell">
    <a class="skip-link" href="#main-content">Przejdź do widoku gry</a>

    <header class="topbar app-topbar">
      <a class="brand" href="#" @click.prevent="tab = 'Osada'">
        <PixelIcon name="fire" :size="42" />
        <span>
          OSTATNIE OGNISKO
          <small>OD OBOZOWISKA DO MIASTA</small>
        </span>
      </a>

      <nav aria-label="Główna nawigacja">
        <button
          v-for="item in tabs"
          :key="item"
          :class="{ active: tab === item }"
          :aria-current="tab === item ? 'page' : undefined"
          @click="tab = item"
        >
          {{ item }}
          <span
            v-if="item === 'Wydarzenia' && game.events.length"
            class="event-count"
          >
            {{ game.events.length }}
          </span>
        </button>
      </nav>

      <button
        class="gear"
        aria-label="Ustawienia i zapis"
        @click="settings = true"
      >
        ⚙
      </button>
    </header>

    <div v-if="notice" class="notice" role="status">
      <span>{{ notice }}</span>
      <button aria-label="Zamknij komunikat" @click="notice = ''">×</button>
    </div>

    <div class="layout app-layout" :class="{ 'wide-view': !hasContextPanel }">
      <ResourceSidebar />

      <main class="panel main-panel app-main-panel" id="main-content" tabindex="-1">
        <div class="panel-heading main-heading app-main-heading">
          <div>
            <small class="view-eyebrow">WIDOK</small>
            <h1>{{ tab.toUpperCase() }}</h1>
          </div>
          <div class="population">
            <PixelIcon name="person" :size="24" />
            <span>{{ game.population }} / {{ housing(game) }}</span>
            <span class="positive">Wolni: {{ freeWorkers(game) }}</span>
          </div>
        </div>

        <div
          v-if="game.resources.food <= 0 || game.resources.water <= 0"
          class="warning"
        >
          Brak jedzenia lub wody: produkcja i budowa pracują na 25%. Zbieracze mogą odbudować zapasy.
        </div>

        <SettlementView
          v-if="tab === 'Osada'"
          :selected="selected"
          @select="selected = $event"
          @navigate="navigate"
        />

        <DiscoveryTree
          v-else-if="tab === 'Odkrycia'"
          :game="game"
          :selected="discovery"
          @select="pickDiscovery"
        />

        <ExpeditionsView v-else-if="tab === 'Wyprawy'" />
        <TradeView v-else-if="tab === 'Handel'" />
        <EventsView v-else-if="tab === 'Wydarzenia'" />

        <div v-else-if="tab === 'Region'" class="embedded-system-view">
          <SettlementProgressPanel embedded />
        </div>

        <div v-else-if="tab === 'Bezpieczeństwo'" class="embedded-system-view">
          <CivicSafetyPanel embedded />
        </div>
      </main>

      <aside
        v-if="hasContextPanel"
        class="panel detail-panel app-context-panel"
        aria-label="Szczegóły wyboru"
      >
        <DiscoveryDetails
          v-if="tab === 'Odkrycia'"
          :discovery-id="discovery"
          @select="pickDiscovery"
          @navigate="navigate"
        />
        <BuildingInspector v-else :building-id="selected" />
      </aside>
    </div>

    <footer class="bottom-bar">
      <span>◆ Dzień {{ 1 + Math.floor(game.elapsed / 600) }} · tik {{ game.elapsed }}</span>
      <span>Zapis automatyczny · offline do 8 h</span>
      <button class="text-button" @click="settings = true">Zapis i zasady</button>
    </footer>
  </div>

  <SettingsModal
    :open="settings"
    @close="settings = false"
    @reset-ui="resetUi"
  />
</template>

<style scoped>
.view-eyebrow {
  display: block;
  margin-bottom: 2px;
  color: #828875;
  font-size: 9px;
  letter-spacing: .13em;
}
.app-main-heading { align-items: flex-end; }
.embedded-system-view { min-height: 520px; }
@media (max-width: 950px) {
  .app-main-heading { align-items: center; }
}
</style>
