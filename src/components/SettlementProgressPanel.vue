<script setup lang="ts">
import { computed, ref } from "vue";
import { useGame } from "../useGame";
import {
  advanceSettlement,
  canAdvanceSettlement,
  canFoundSatellite,
  collectRegionalGoods,
  currentSettlementTier,
  foundSatellite,
  nextSettlementTier,
  regionalResourceRows,
  renameSatellite,
  satelliteLimit,
  satelliteRates,
  satelliteSpecializations,
  satelliteUpgradeCost,
  tierRequirementRows,
  upgradeSatellite,
} from "../progression";
import { canPay } from "../engine";
import { resourceName } from "../data";
import PixelIcon from "./PixelIcon.vue";
import CostList from "./CostList.vue";

const { game, notice, save } = useGame();
const open = ref(false);
const section = ref<"progress" | "region">("progress");
const selectedSpecialization = ref("farming");
const renaming = ref<string | null>(null);
const renameValue = ref("");

const currentTier = computed(() => currentSettlementTier(game));
const nextTier = computed(() => nextSettlementTier(game));
const requirements = computed(() => tierRequirementRows(game));
const regionUnlocked = computed(() => satelliteLimit(game) > 0);
const regionalRows = computed(() => regionalResourceRows(game));
const rates = computed(() => satelliteRates(game));
const selectedDef = computed(() =>
  satelliteSpecializations.find((x) => x.id === selectedSpecialization.value),
);

const format = (n: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(n);

function promote() {
  if (!advanceSettlement(game)) {
    notice.value = "Nie spełniasz jeszcze wszystkich warunków rozwoju osady.";
    return;
  }
  save();
}

function found() {
  const id = selectedSpecialization.value as (typeof satelliteSpecializations)[number]["id"];
  if (!foundSatellite(game, id)) {
    notice.value = "Brakuje zasobów albo osiągnięto limit zależnych osad.";
    return;
  }
  save();
}

function upgrade(id: string) {
  if (!upgradeSatellite(game, id)) {
    notice.value = "Nie można teraz rozbudować tej osady.";
    return;
  }
  save();
}

function startRename(id: string, name: string) {
  renaming.value = id;
  renameValue.value = name;
}

function confirmRename(id: string) {
  if (!renameSatellite(game, id, renameValue.value)) {
    notice.value = "Nazwa osady musi mieć co najmniej 2 znaki.";
    return;
  }
  renaming.value = null;
  save();
}

function collect() {
  if (!collectRegionalGoods(game)) {
    notice.value = "Brak dostaw do odebrania albo magazyn jest pełny.";
    return;
  }
  save();
}
</script>

<template>
  <button class="progress-trigger" @click="open = !open">
    <span class="flame">◆</span>
    <span>
      <small>ROZWÓJ OSADY</small>
      <strong>{{ currentTier.name }}</strong>
    </span>
    <span class="chevron">{{ open ? "×" : "▲" }}</span>
  </button>

  <aside v-if="open" class="progress-panel" aria-label="Rozwój osady i regionu">
    <header>
      <div>
        <small>OBECNY POZIOM</small>
        <h2>{{ currentTier.name }}</h2>
        <p>{{ currentTier.shortDescription }}</p>
      </div>
      <button class="close" aria-label="Zamknij" @click="open = false">×</button>
    </header>

    <nav class="panel-tabs">
      <button :class="{ active: section === 'progress' }" @click="section = 'progress'">
        Rozwój
      </button>
      <button
        :class="{ active: section === 'region' }"
        :disabled="!regionUnlocked"
        @click="section = 'region'"
      >
        Region
        <span v-if="regionUnlocked">{{ game.satellites.length }}/{{ satelliteLimit(game) }}</span>
      </button>
    </nav>

    <section v-if="section === 'progress'" class="content">
      <template v-if="nextTier">
        <div class="next-tier">
          <small>NASTĘPNY ETAP</small>
          <h3>{{ nextTier.name }}</h3>
          <p>{{ nextTier.shortDescription }}</p>
        </div>

        <div v-if="!nextTier.available" class="locked-future">
          Ten etap jest już przewidziany w progresji, ale jego mechaniki miejskie zostaną dodane w kolejnym module.
        </div>

        <div class="requirements-list">
          <div
            v-for="row in requirements"
            :key="row.label"
            class="requirement-row"
            :class="{ met: row.met }"
          >
            <span>{{ row.met ? "✓" : "◇" }} {{ row.label }}</span>
            <b>{{ row.current }} / {{ row.required }}</b>
          </div>
        </div>

        <template v-if="Object.keys(nextTier.cost).length">
          <h4>Koszt ustanowienia nowego poziomu</h4>
          <CostList :cost="nextTier.cost" :stock="game.resources" />
        </template>

        <button
          class="primary-action"
          :disabled="!canAdvanceSettlement(game)"
          @click="promote"
        >
          Awansuj do: {{ nextTier.name }}
        </button>
      </template>
      <div v-else class="locked-future">
        Osiągnięto najwyższy zdefiniowany poziom rozwoju.
      </div>

      <div class="tier-roadmap">
        <h4>Droga rozwoju</h4>
        <div class="roadmap-scroll">
          <span
            v-for="tier in ['Ognisko','Mała osada','Osada','Wieś','Duża wieś','Małe miasteczko','Miasteczko','Duże miasteczko','Miasto','Duże miasto','Metropolia']"
            :key="tier"
            :class="{ current: tier === currentTier.name }"
          >{{ tier }}</span>
        </div>
      </div>
    </section>

    <section v-else class="content region-content">
      <div class="region-summary">
        <div>
          <small>SIEĆ OSAD</small>
          <strong>{{ game.satellites.length }} / {{ satelliteLimit(game) }}</strong>
        </div>
        <div>
          <small>ŁĄCZNA LUDNOŚĆ WSI</small>
          <strong>{{ game.satellites.reduce((sum, s) => sum + s.population, 0) }}</strong>
        </div>
      </div>

      <div class="regional-deliveries">
        <div class="section-head">
          <div>
            <small>DOSTAWY REGIONALNE</small>
            <h3>Magazyn tranzytowy</h3>
          </div>
          <button :disabled="!regionalRows.length" @click="collect">Odbierz</button>
        </div>
        <p v-if="!regionalRows.length" class="muted-text">Zależne osady dopiero gromadzą towary.</p>
        <div v-else class="regional-grid">
          <span v-for="row in regionalRows" :key="row.id">
            {{ row.name }} <b>{{ format(row.amount) }}</b>
          </span>
        </div>
        <div v-if="Object.keys(rates).length" class="regional-rates">
          <small>Produkcja regionalna / tik</small>
          <span v-for="(amount, id) in rates" :key="id">
            {{ resourceName(id) }} +{{ format(amount || 0) }}
          </span>
        </div>
      </div>

      <article v-for="satellite in game.satellites" :key="satellite.id" class="satellite-card">
        <div class="satellite-heading">
          <PixelIcon
            :name="satelliteSpecializations.find((x) => x.id === satellite.specialization)?.icon || 'house'"
            :size="36"
          />
          <div>
            <template v-if="renaming === satellite.id">
              <input
                v-model="renameValue"
                maxlength="40"
                @keyup.enter="confirmRename(satellite.id)"
              />
              <button @click="confirmRename(satellite.id)">✓</button>
            </template>
            <template v-else>
              <h3>{{ satellite.name }}</h3>
              <button class="rename" @click="startRename(satellite.id, satellite.name)">zmień nazwę</button>
            </template>
            <small>{{ satelliteSpecializations.find((x) => x.id === satellite.specialization)?.name }}</small>
          </div>
          <span class="level-badge">II.{{ satellite.level }}</span>
        </div>
        <p>{{ satelliteSpecializations.find((x) => x.id === satellite.specialization)?.description }}</p>
        <div class="satellite-stats">
          <span>Ludność <b>{{ satellite.population }}</b></span>
          <span>Lojalność <b>{{ satellite.loyalty }}%</b></span>
          <span>Bezpieczeństwo <b>{{ satellite.security }}%</b></span>
        </div>
        <details>
          <summary>Rozbudowa osady</summary>
          <CostList :cost="satelliteUpgradeCost(satellite)" :stock="game.resources" />
          <button
            :disabled="satellite.level >= 5 || !canPay(game, satelliteUpgradeCost(satellite))"
            @click="upgrade(satellite.id)"
          >
            {{ satellite.level >= 5 ? "Maksymalny poziom" : `Rozbuduj do poziomu ${satellite.level + 1}` }}
          </button>
        </details>
      </article>

      <div v-if="game.satellites.length < satelliteLimit(game)" class="founding-card">
        <small>NOWA ZALEŻNA OSADA</small>
        <h3>Załóż wieś satelicką</h3>
        <p>
          Wybierz specjalizację. Wieś będzie pasywnie produkować towary do magazynu regionalnego.
        </p>
        <div class="specialization-grid">
          <button
            v-for="def in satelliteSpecializations"
            :key="def.id"
            :class="{ active: selectedSpecialization === def.id }"
            @click="selectedSpecialization = def.id"
          >
            <PixelIcon :name="def.icon" :size="28" />
            <span>{{ def.name }}</span>
          </button>
        </div>
        <template v-if="selectedDef">
          <p>{{ selectedDef.description }}</p>
          <CostList :cost="selectedDef.foundingCost" :stock="game.resources" />
          <button
            class="primary-action"
            :disabled="!canFoundSatellite(game, selectedDef.id)"
            @click="found"
          >
            Załóż {{ selectedDef.name.toLowerCase() }}
          </button>
        </template>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.progress-trigger {
  position: fixed;
  right: 18px;
  bottom: 54px;
  z-index: 80;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-width: 220px;
  padding: 10px 12px;
  border: 1px solid #6f5a35;
  background: #171611;
  color: #e6dcc5;
  box-shadow: 0 8px 28px #000a;
  cursor: pointer;
  text-align: left;
}
.progress-trigger small,
.progress-panel small {
  display: block;
  color: #9b8f77;
  letter-spacing: .08em;
  font-size: 10px;
}
.progress-trigger strong { display: block; margin-top: 2px; }
.flame { color: #d18b3d; }
.chevron { color: #8d816d; }
.progress-panel {
  position: fixed;
  right: 18px;
  bottom: 104px;
  z-index: 79;
  width: min(460px, calc(100vw - 36px));
  max-height: calc(100vh - 140px);
  overflow: auto;
  border: 1px solid #69583d;
  background: #11110e;
  color: #ddd2bd;
  box-shadow: 0 18px 50px #000d;
}
.progress-panel header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 18px;
  border-bottom: 1px solid #342f27;
  background: #181711;
}
h2,h3,h4,p { margin-top: 0; }
.progress-panel header h2 { margin: 3px 0 5px; font-size: 22px; }
.progress-panel header p { margin-bottom: 0; color: #aaa08e; font-size: 13px; line-height: 1.45; }
.close {
  width: 32px;
  height: 32px;
  border: 1px solid #40392e;
  background: transparent;
  color: #c9bea9;
  cursor: pointer;
}
.panel-tabs { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #342f27; }
.panel-tabs button {
  padding: 11px;
  border: 0;
  border-right: 1px solid #342f27;
  background: #14130f;
  color: #8f8677;
  cursor: pointer;
}
.panel-tabs button.active { color: #e6dcc5; background: #211d16; }
.panel-tabs button:disabled { opacity: .35; cursor: not-allowed; }
.panel-tabs span { margin-left: 5px; color: #c99a57; }
.content { padding: 16px; }
.next-tier { padding: 14px; border: 1px solid #3b3428; background: #181711; }
.next-tier h3 { margin: 2px 0 5px; }
.next-tier p { margin-bottom: 0; color: #aca18e; font-size: 13px; }
.requirements-list { display: grid; gap: 6px; margin: 14px 0; }
.requirement-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid #3c3028;
  color: #b68e78;
  font-size: 12px;
}
.requirement-row.met { color: #9eb58d; border-color: #344032; }
.requirement-row b { color: inherit; font-weight: 500; text-align: right; }
.primary-action,
.founding-card button,
.satellite-card details button,
.regional-deliveries button {
  border: 1px solid #705634;
  background: #332719;
  color: #eadbc0;
  padding: 9px 12px;
  cursor: pointer;
}
.primary-action { width: 100%; margin-top: 10px; }
button:disabled { opacity: .38; cursor: not-allowed; }
.locked-future { margin: 12px 0; padding: 10px; border: 1px dashed #554a39; color: #9a8e7d; font-size: 12px; }
.tier-roadmap { margin-top: 18px; }
.roadmap-scroll { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.roadmap-scroll span { white-space: nowrap; padding: 5px 7px; border: 1px solid #393228; color: #756c5d; font-size: 10px; }
.roadmap-scroll span.current { color: #e6dcc5; border-color: #8a6639; background: #2a2117; }
.region-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.region-summary > div { padding: 10px; border: 1px solid #393228; background: #171611; }
.region-summary strong { display: block; margin-top: 4px; font-size: 18px; }
.regional-deliveries,.founding-card,.satellite-card { margin-top: 12px; padding: 12px; border: 1px solid #393228; background: #171611; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.section-head h3 { margin: 2px 0 0; }
.regional-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 8px; }
.regional-grid span,.regional-rates span { padding: 5px 7px; background: #11110e; font-size: 12px; }
.regional-grid b { float: right; }
.regional-rates { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.regional-rates small { width: 100%; }
.satellite-heading { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; }
.satellite-heading h3 { display: inline; margin: 0 6px 0 0; }
.rename { padding: 0; border: 0; background: none; color: #84745f; font-size: 10px; cursor: pointer; }
.satellite-heading input { width: 160px; background: #0f0f0d; color: #ddd2bd; border: 1px solid #514633; padding: 5px; }
.level-badge { border: 1px solid #5c4930; padding: 4px 7px; color: #c99a57; font-size: 11px; }
.satellite-card > p,.founding-card > p { color: #a79d8b; font-size: 12px; line-height: 1.4; }
.satellite-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 5px; margin: 10px 0; }
.satellite-stats span { padding: 7px; background: #11110e; font-size: 10px; }
.satellite-stats b { display: block; margin-top: 3px; font-size: 12px; }
.specialization-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 10px 0; }
.specialization-grid button { display: flex; align-items: center; gap: 8px; background: #11110e; border-color: #393228; }
.specialization-grid button.active { border-color: #8a6639; background: #2b2117; }
.muted-text { color: #807665; font-size: 12px; }
@media (max-width: 700px) {
  .progress-trigger { right: 8px; bottom: 48px; min-width: 190px; }
  .progress-panel { right: 8px; bottom: 96px; width: calc(100vw - 16px); max-height: calc(100vh - 112px); }
}
</style>
