<script setup lang="ts">
import { computed, ref } from "vue";
import { resourceName } from "../data";
import { canPay } from "../engine";
import {
  canFoundSatellite,
  collectRegionalGoods,
  currentSettlementTier,
  foundSatellite,
  regionalResourceRows,
  renameSatellite,
  satelliteLimit,
  satelliteRates,
  satelliteSpecializations,
  satelliteUpgradeCost,
  upgradeSatellite,
} from "../progression";
import { useGame } from "../useGame";
import CostList from "../components/CostList.vue";
import PixelIcon from "../components/PixelIcon.vue";

const { game, notice, save } = useGame();
const selectedSpecialization = ref<(typeof satelliteSpecializations)[number]["id"]>("farming");
const renaming = ref<string | null>(null);
const renameValue = ref("");

const tier = computed(() => currentSettlementTier(game));
const regionalRows = computed(() => regionalResourceRows(game));
const rates = computed(() => satelliteRates(game));
const selectedDef = computed(() =>
  satelliteSpecializations.find((item) => item.id === selectedSpecialization.value)!,
);
const population = computed(() =>
  game.satellites.reduce((sum, settlement) => sum + settlement.population, 0),
);

const format = (value: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value);

function collect() {
  if (!collectRegionalGoods(game)) {
    notice.value = "Brak dostaw do odebrania albo magazyn jest pełny.";
    return;
  }
  save();
}

function found() {
  if (!foundSatellite(game, selectedSpecialization.value)) {
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
</script>

<template>
  <div class="region-view">
    <header class="region-header">
      <div>
        <small>REGION {{ tier.name.toUpperCase() }}</small>
        <h2>Sieć zależnych osad</h2>
        <p>
          Specjalizuj wsie, rozwijaj ich produkcję i odbieraj dostawy do głównej osady.
        </p>
      </div>
      <div class="region-capacity">
        <small>OSADY</small>
        <strong>{{ game.satellites.length }} / {{ satelliteLimit(game) }}</strong>
      </div>
    </header>

    <div class="region-metrics">
      <article>
        <small>ZALEŻNE OSADY</small>
        <b>{{ game.satellites.length }}</b>
      </article>
      <article>
        <small>LUDNOŚĆ REGIONU</small>
        <b>{{ population }}</b>
      </article>
      <article>
        <small>WOLNE MIEJSCA W SIECI</small>
        <b>{{ Math.max(0, satelliteLimit(game) - game.satellites.length) }}</b>
      </article>
    </div>

    <section class="region-card deliveries-card">
      <div class="region-section-heading">
        <div>
          <small>DOSTAWY REGIONALNE</small>
          <h3>Magazyn tranzytowy</h3>
        </div>
        <button :disabled="!regionalRows.length" @click="collect">Odbierz towary</button>
      </div>

      <p v-if="!regionalRows.length" class="muted">
        Zależne osady dopiero gromadzą towary.
      </p>
      <div v-else class="regional-grid">
        <span v-for="row in regionalRows" :key="row.id">
          {{ row.name }} <b>{{ format(row.amount) }}</b>
        </span>
      </div>

      <div v-if="Object.keys(rates).length" class="regional-rates">
        <small>PRODUKCJA REGIONALNA / TIK</small>
        <span v-for="(amount, id) in rates" :key="id">
          {{ resourceName(id) }} +{{ format(amount || 0) }}
        </span>
      </div>
    </section>

    <section v-if="game.satellites.length" class="region-settlements">
      <h3 class="section-title">Osady zależne</h3>
      <div class="satellite-grid">
        <article v-for="satellite in game.satellites" :key="satellite.id" class="region-card satellite-card-v2">
          <div class="satellite-title-v2">
            <PixelIcon
              :name="satelliteSpecializations.find((item) => item.id === satellite.specialization)?.icon || 'house'"
              :size="38"
            />
            <div>
              <template v-if="renaming === satellite.id">
                <div class="rename-line">
                  <input
                    v-model="renameValue"
                    maxlength="40"
                    @keyup.enter="confirmRename(satellite.id)"
                  />
                  <button @click="confirmRename(satellite.id)">✓</button>
                </div>
              </template>
              <template v-else>
                <h3>{{ satellite.name }}</h3>
                <button class="rename-link" @click="startRename(satellite.id, satellite.name)">
                  zmień nazwę
                </button>
              </template>
              <small>{{ satelliteSpecializations.find((item) => item.id === satellite.specialization)?.name }}</small>
            </div>
            <span>Lv. {{ satellite.level }}</span>
          </div>

          <p>{{ satelliteSpecializations.find((item) => item.id === satellite.specialization)?.description }}</p>

          <div class="satellite-stats-v2">
            <span>Ludność <b>{{ satellite.population }}</b></span>
            <span>Lojalność <b>{{ satellite.loyalty }}%</b></span>
            <span>Bezpieczeństwo <b>{{ satellite.security }}%</b></span>
          </div>

          <details>
            <summary>Rozbudowa osady</summary>
            <CostList :cost="satelliteUpgradeCost(satellite)" :stock="game.resources" />
            <button
              class="region-upgrade"
              :disabled="satellite.level >= 5 || !canPay(game, satelliteUpgradeCost(satellite))"
              @click="upgrade(satellite.id)"
            >
              {{ satellite.level >= 5 ? "Maksymalny poziom" : `Rozbuduj do poziomu ${satellite.level + 1}` }}
            </button>
          </details>
        </article>
      </div>
    </section>

    <section
      v-if="game.satellites.length < satelliteLimit(game)"
      class="region-card founding-card-v2"
    >
      <div class="region-section-heading">
        <div>
          <small>EKSPANSJA</small>
          <h3>Załóż nową osadę</h3>
        </div>
      </div>
      <p>Nowa wieś zacznie zasilać gospodarkę regionu zgodnie ze swoją specjalizacją.</p>

      <div class="specialization-grid-v2">
        <button
          v-for="definition in satelliteSpecializations"
          :key="definition.id"
          :class="{ active: selectedSpecialization === definition.id }"
          @click="selectedSpecialization = definition.id"
        >
          <PixelIcon :name="definition.icon" :size="30" />
          <span>
            <b>{{ definition.name }}</b>
            <small>{{ definition.description }}</small>
          </span>
        </button>
      </div>

      <div class="founding-summary">
        <div>
          <small>WYBRANO</small>
          <h3>{{ selectedDef.name }}</h3>
          <p>{{ selectedDef.description }}</p>
        </div>
        <CostList :cost="selectedDef.foundingCost" :stock="game.resources" />
      </div>

      <button
        class="region-found"
        :disabled="!canFoundSatellite(game, selectedDef.id)"
        @click="found"
      >
        Załóż {{ selectedDef.name.toLowerCase() }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.region-view { display: grid; gap: 14px; }
.region-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  padding: 3px 0 15px;
  border-bottom: 1px solid var(--line);
}
.region-header small,
.region-card small,
.region-metrics small,
.region-capacity small {
  display: block;
  color: #83907d;
  font-size: 9px;
  letter-spacing: .11em;
}
.region-header h2 { margin: 3px 0 5px; }
.region-header p,.region-card > p,.founding-summary p { margin: 0; color: #9eaa9a; font-size: 11px; }
.region-capacity { min-width: 86px; padding: 9px; border: 1px solid #46523f; text-align: center; }
.region-capacity strong { display: block; margin-top: 4px; color: #d9d7a6; font-size: 22px; }
.region-metrics { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
.region-metrics article { padding: 11px; border: 1px solid #394638; background: #131b15; }
.region-metrics b { display: block; margin-top: 4px; color: #d8ddc1; font-size: 18px; }
.region-card { padding: 13px; border: 1px solid #3b493b; background: #141c16; }
.region-section-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.region-section-heading h3 { margin: 2px 0 0; color: #d8d9be; }
.regional-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); gap: 5px; margin-top: 10px; }
.regional-grid span,.regional-rates span { padding: 6px 8px; background: #101611; font-size: 10px; }
.regional-grid b { float: right; }
.regional-rates { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.regional-rates > small { width: 100%; }
.satellite-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 9px; }
.satellite-title-v2 { display: grid; grid-template-columns: auto 1fr auto; gap: 9px; align-items: center; }
.satellite-title-v2 h3 { margin: 0; color: #dedac2; }
.satellite-title-v2 > span { padding: 4px 6px; border: 1px solid #58603d; color: #c5b96b; font-size: 9px; }
.rename-link { min-height: 0; padding: 0; border: 0; background: transparent; color: #849078; font-size: 8px; }
.rename-line { display: flex; gap: 4px; }
.rename-line input { min-width: 0; width: 100%; padding: 5px; background: #0f1510; color: #e3e0c8; border: 1px solid #4a5742; }
.satellite-stats-v2 { display: grid; grid-template-columns: repeat(3,1fr); gap: 5px; margin: 10px 0; }
.satellite-stats-v2 span { padding: 6px; background: #101611; color: #858f81; font-size: 9px; }
.satellite-stats-v2 b { display: block; margin-top: 2px; color: #d2d6bb; }
.satellite-card-v2 details { margin-top: 8px; }
.satellite-card-v2 summary { cursor: pointer; color: #aeb7a0; font-size: 10px; }
.region-upgrade,.region-found { width: 100%; margin-top: 8px; border-color: #697247; background: #303a25; }
.specialization-grid-v2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 7px; margin: 10px 0; }
.specialization-grid-v2 button { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; padding: 9px; text-align: left; background: #101611; }
.specialization-grid-v2 button.active { border-color: #8b8c4d; background: #293020; }
.specialization-grid-v2 b { display: block; font-size: 10px; }
.specialization-grid-v2 small { margin-top: 2px; letter-spacing: 0; line-height: 1.3; }
.founding-summary { display: grid; grid-template-columns: 1fr minmax(220px,.8fr); gap: 14px; align-items: start; margin-top: 12px; }
.founding-summary h3 { margin: 3px 0 5px; }
@media (max-width: 700px) {
  .region-header { flex-direction: column; }
  .region-metrics { grid-template-columns: 1fr; }
  .specialization-grid-v2,.founding-summary { grid-template-columns: 1fr; }
}
</style>
