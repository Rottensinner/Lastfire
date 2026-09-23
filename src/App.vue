<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { has } from "./engine";
import { civicServiceUnlocked } from "./civic";
import { currentSettlementTier, satelliteLimit } from "./progression";
import { useGame } from "./useGame";
import PixelIcon from "./components/PixelIcon.vue";
import ResourceSidebar from "./components/ResourceSidebar.vue";
import DiscoveryTree from "./components/DiscoveryTree.vue";
import DiscoveryDetails from "./components/DiscoveryDetails.vue";
import BuildingInspector from "./components/BuildingInspector.vue";
import CivicSafetyPanel from "./components/CivicSafetyPanel.vue";
import SettingsModal from "./components/SettingsModal.vue";
import SettlementView from "./views/SettlementView.vue";
import EventsView from "./views/EventsView.vue";
import ExpeditionsView from "./views/ExpeditionsView.vue";
import TradeView from "./views/TradeView.vue";
import RegionView from "./views/RegionView.vue";

const { game, notice } = useGame();
const tab = ref("Osada");
const selected = ref("gatherers");
const discovery = ref("stonecraft");
const settings = ref(false);

const settlementTier = computed(() => currentSettlementTier(game));
const day = computed(() => 1 + Math.floor(game.elapsed / 600));

const tabs = computed(() => {
  const result = ["Osada", "Odkrycia"];

  if (satelliteLimit(game) > 0) result.push("Region");
  if (game.population >= 12) result.push("Ludność");
  if (civicServiceUnlocked(game, "watch")) result.push("Bezpieczeństwo");
  if (has(game, "scouting")) result.push("Wyprawy");
  if (has(game, "trade") || game.resources.gold > 0) result.push("Handel");

  result.push("Wydarzenia");
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
  <div class="game-shell app-shell mockup-shell">
    <a class="skip-link" href="#main-content">Przejdź do widoku gry</a>

    <header class="topbar app-topbar mockup-topbar">
      <a class="brand mockup-brand" href="#" @click.prevent="tab = 'Osada'">
        <PixelIcon name="fire" :size="42" />
        <span>
          OSTATNIE OGNISKO
          <small>{{ settlementTier.name }} · Dzień {{ day }}</small>
        </span>
      </a>

      <nav class="mockup-nav" aria-label="Główna nawigacja">
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

      <div class="topbar-actions">
        <button
          class="gear"
          aria-label="Ustawienia i zapis"
          title="Ustawienia i zapis"
          @click="settings = true"
        >
          ⚙
        </button>
        <button
          class="help-button"
          aria-label="Pomoc"
          title="Podstawowe zasady znajdziesz w ustawieniach"
          @click="settings = true"
        >
          ?
        </button>
      </div>
    </header>

    <div v-if="notice" class="notice" role="status">
      <span>{{ notice }}</span>
      <button aria-label="Zamknij komunikat" @click="notice = ''">×</button>
    </div>

    <div class="layout app-layout" :class="{ 'wide-view': !hasContextPanel }">
      <ResourceSidebar />

      <main
        id="main-content"
        class="panel main-panel app-main-panel"
        :class="{ 'settlement-workspace': tab === 'Osada' }"
        tabindex="-1"
      >
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
        />

        <template v-else>
          <div class="workspace-heading">
            <small>WIDOK</small>
            <h1>{{ tab.toUpperCase() }}</h1>
          </div>

          <DiscoveryTree
            v-if="tab === 'Odkrycia'"
            :game="game"
            :selected="discovery"
            @select="pickDiscovery"
          />

          <ExpeditionsView v-else-if="tab === 'Wyprawy'" />
          <TradeView v-else-if="tab === 'Handel'" />
          <EventsView v-else-if="tab === 'Wydarzenia'" />
          <RegionView v-else-if="tab === 'Region'" />

          <div v-else-if="tab === 'Bezpieczeństwo'" class="embedded-system-view">
            <CivicSafetyPanel embedded />
          </div>

          <div v-else-if="tab === 'Ludność'" class="empty-state population-placeholder">
            Widok ludności odblokowano, ale szczegółowe role społeczne, potrzeby i demografia zostaną dodane w kolejnym module.
          </div>
        </template>
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

    <footer class="bottom-bar mockup-footer">
      <span>◆ Dzień {{ day }}</span>
      <span>Autozapis ✓</span>
      <span>Offline do 8 h</span>
    </footer>
  </div>

  <SettingsModal
    :open="settings"
    @close="settings = false"
    @reset-ui="resetUi"
  />
</template>

<style scoped>
.workspace-heading {
  padding-bottom: 14px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--line);
}
.workspace-heading small {
  display: block;
  margin-bottom: 2px;
  color: #828875;
  font-size: 9px;
  letter-spacing: .13em;
}
.workspace-heading h1 { margin: 0; }
.embedded-system-view { min-height: 520px; }
.population-placeholder { margin-top: 0; }
</style>
