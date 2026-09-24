<script setup lang="ts">
import { computed, ref } from "vue";
import { has, freeWorkers, collectLoot } from "../engine";
import { useGame } from "../useGame";
import {
  availableOperations,
  buildOutpost,
  disbandUnit,
  equipUnit,
  formUnit,
  militaryStrength,
  militaryTargets,
  operationName,
  relocateUnit,
  startMilitaryOperation,
  trainUnit,
  unitRoleName,
} from "../military";
import type { MilitaryRole } from "../types";
import CostList from "../components/CostList.vue";
import PixelIcon from "../components/PixelIcon.vue";

const { game, notice, save } = useGame();
const people = ref(4);
const unitName = ref("");
const operationId = ref("road-patrol");
const selectedUnits = ref<string[]>([]);
const operations = computed(() => availableOperations(game));
const free = computed(() => freeWorkers(game));
const activeMission = computed(() => game.military.mission);
const isDeployed = (id: string) => activeMission.value?.unitIds.includes(id) ?? false;
const operation = computed(() => operations.value.find(item => item.id === operationId.value) ?? operations.value[0]);
const selectedStrength = computed(() => selectedUnits.value.reduce((sum, id) => {
  const unit = game.military.units.find(item => item.id === id);
  return sum + (unit ? militaryStrength(game, unit) : 0);
}, 0));
const supplyEstimate = computed(() => {
  if (!operation.value) return {};
  const count = selectedUnits.value.reduce((sum, id) => {
    const unit = game.military.units.find(item => item.id === id);
    return sum + (unit ? unit.people - unit.wounded : 0);
  }, 0);
  const time = operation.value.duration / 120;
  const supplies: Record<string, number> = { food: Math.ceil(count * time * 0.7), water: Math.ceil(count * time * 0.45) };
  if (operation.value.kind === "raid" || operation.value.kind === "assault") supplies.medicine = Math.max(1, Math.ceil(count * 0.04));
  return supplies;
});
const estimatedRisk = computed(() => {
  if (!operation.value) return "—";
  const intel = game.military.targets.find(target => target.id === operation.value.targetId)?.intel ?? 0;
  const threat = operation.value.threat * (operation.value.kind === "raid" || operation.value.kind === "assault" ? 1 - intel * 0.14 : 1);
  if (!selectedStrength.value) return "Wybierz oddział";
  const ratio = selectedStrength.value / Math.max(1, threat);
  return ratio >= 1.15 ? "Niskie" : ratio >= 0.8 ? "Umiarkowane" : "Wysokie";
});

function notify(action: () => boolean, message: string) {
  if (!action()) notice.value = message;
  else { notice.value = ""; save(); }
}
function create(roleId: MilitaryRole) {
  notify(() => formUnit(game, roleId, people.value, unitName.value), "Brakuje wolnych mieszkańców albo wielkość oddziału jest nieprawidłowa.");
  if (!notice.value) { unitName.value = ""; }
}
function equip(id: string, what: "weapons" | "armor") {
  notify(() => equipUnit(game, id, what), "Brakuje surowców lub oddział jest w operacji.");
}
function launch() {
  if (!operation.value) return;
  notify(() => startMilitaryOperation(game, operation.value.id, selectedUnits.value), "Wybierz dostępny oddział; sprawdź zapasy, rozpoznanie i wymagania misji.");
}
function build(targetId: string) {
  notify(() => buildOutpost(game, targetId), "Posterunek wymaga odkrycia umocnień i zabezpieczonego terenu.");
}
function move(id: string, location: string) {
  notify(() => relocateUnit(game, id, location), "Nie można przenieść oddziału podczas operacji lub bez posterunku.");
}
function clock(value: number) {
  const seconds = Math.max(0, Math.ceil(value));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
function targetLabel(id: string) { return militaryTargets.find(target => target.id === id)?.name ?? id; }
function intelText(intel: number) { return ["Nieznane", "Ślady i przybliżona liczebność", "Uzbrojenie i umocnienia", "Dokładne rozpoznanie"][intel] ?? "Nieznane"; }
</script>

<template>
  <div class="military-view">
    <header class="military-intro">
      <div><small>OBRONA I OPERACJE</small><h2>Wojsko</h2><p>Mieszkańcy przydzieleni do oddziałów nie pracują w produkcji. Sprzęt i zapasy pochodzą z gospodarki osady.</p></div>
      <div class="military-metrics"><span>Wolni mieszkańcy <b>{{ free }}</b></span><span>Oddziały <b>{{ game.military.units.length }}</b></span><span>Posterunki <b>{{ game.military.outposts }}</b></span></div>
    </header>

    <section v-if="activeMission" class="military-card active-operation">
      <div class="military-card-title"><div><small>OPERACJA W TOKU</small><h3>{{ operationName(activeMission.id) }}</h3></div><b>{{ clock(activeMission.remaining) }}</b></div>
      <p>Rejon: {{ targetLabel(activeMission.targetId) }} · Zaopatrzenie zostało odjęte z magazynu przy wysłaniu.</p>
      <progress :value="activeMission.duration - activeMission.remaining" :max="activeMission.duration" />
      <div class="supply-row">Przydzielone zapasy <CostList :cost="activeMission.supplies" /></div>
    </section>

    <section class="military-columns">
      <div class="military-card">
        <div class="military-card-title"><div><small>GARNIZON I ODDZIAŁY</small><h3>Twoi ludzie</h3></div></div>
        <p v-if="!game.military.units.length" class="military-empty">Nie ma jeszcze oddziałów. Odkryj „Milicję osadniczą”, aby przydzielić mieszkańców do służby.</p>
        <article v-for="unit in game.military.units" :key="unit.id" class="unit-card">
          <div class="unit-heading"><PixelIcon name="person" :size="34"/><div><strong>{{ unit.name }}</strong><small>{{ unitRoleName(unit.role) }} · {{ unit.people }} osób · {{ unit.training }}/3 wyszkolenie</small></div><label class="unit-select" v-if="!activeMission"><input v-model="selectedUnits" type="checkbox" :value="unit.id" :disabled="unit.wounded >= unit.people"/> Operacja</label></div>
          <div class="unit-stats"><span>Siła <b>{{ militaryStrength(game, unit).toFixed(1) }}</b></span><span>Morale <b>{{ Math.round(unit.morale) }}%</b></span><span>Ranni <b>{{ unit.wounded }}</b></span><span>Broń <b>{{ unit.weapons }}/{{ unit.people }}</b></span><span>Ochrona <b>{{ unit.armor }}/{{ unit.people }}</b></span></div>
          <div class="unit-actions">
            <button :disabled="!!activeMission" @click="equip(unit.id, 'weapons')">Uzbrój</button>
            <button :disabled="!!activeMission" @click="equip(unit.id, 'armor')">Wyposaż w ochronę</button>
            <button :disabled="!!activeMission || unit.training >= 3" @click="notify(() => trainUnit(game, unit.id), 'Brakuje żywności lub wiedzy.')">Szkolenie</button>
            <select :value="unit.location" :disabled="!!activeMission" aria-label="Garnizon oddziału" @change="move(unit.id, ($event.target as HTMLSelectElement).value)">
              <option value="home">Garnizon główny</option>
              <option v-for="target in game.military.targets.filter(t => t.outpost)" :key="target.id" :value="target.id">Posterunek: {{ targetLabel(target.id) }}</option>
              <option v-for="satellite in game.satellites" :key="satellite.id" :value="satellite.id">Garnizon: {{ satellite.name }}</option>
            </select>
            <button class="danger-button" :disabled="!!activeMission || unit.wounded > 0" title="Ranni muszą najpierw wyzdrowieć" @click="notify(() => disbandUnit(game, unit.id), 'Ranni muszą najpierw wyzdrowieć.')">Rozwiąż</button>
          </div>
        </article>
        <div v-if="has(game, 'militia')" class="form-unit">
          <h4>Utwórz oddział</h4>
          <div class="form-row"><input v-model="unitName" maxlength="40" placeholder="Nazwa oddziału (opcjonalnie)"/><label>Osoby <input v-model.number="people" type="number" min="2" max="40"/></label></div>
          <div class="role-buttons">
            <button @click="create('militia')">Milicja</button>
            <button :disabled="!has(game, 'spears')" @click="create('spearmen')">Włócznicy</button>
            <button :disabled="!has(game, 'bows')" @click="create('archers')">Łucznicy</button>
            <button @click="create('scouts')">Zwiadowcy</button>
          </div>
        </div>
      </div>

      <div class="military-card">
        <div class="military-card-title"><div><small>MAPA OPERACYJNA</small><h3>Znane rejony</h3></div></div>
        <article v-for="target in militaryTargets" :key="target.id" class="target-card">
          <div class="target-heading"><div><strong>{{ target.name }}</strong><small>{{ target.description }}</small></div><span :class="{ secure: (game.military.targets.find(t => t.id === target.id)?.security ?? 0) >= 60 }">Bezpieczeństwo {{ game.military.targets.find(t => t.id === target.id)?.security ?? 0 }}%</span></div>
          <p>Rozpoznanie: {{ intelText(game.military.targets.find(t => t.id === target.id)?.intel ?? 0) }}<template v-if="game.military.targets.find(t => t.id === target.id)?.cleared"> · Teren zabezpieczony</template></p>
          <button v-if="has(game, 'fortifications') && !game.military.targets.find(t => t.id === target.id)?.outpost" :disabled="target.id !== 'old-road' && !game.military.targets.find(t => t.id === target.id)?.cleared" @click="build(target.id)">Zbuduj posterunek</button>
          <span v-else-if="game.military.targets.find(t => t.id === target.id)?.outpost" class="outpost-tag">Posterunek działa</span>
        </article>

        <div class="operation-planner">
          <small>PRZYGOTUJ OPERACJĘ</small>
          <select v-model="operationId" :disabled="!!activeMission" aria-label="Rodzaj operacji">
            <option v-for="item in operations" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <template v-if="operation">
            <p>{{ operation.description }}</p>
            <div class="operation-estimate"><span>Rejon <b>{{ targetLabel(operation.targetId) }}</b></span><span>Szacowana siła <b>{{ selectedStrength.toFixed(1) }}</b></span><span>Ryzyko <b>{{ estimatedRisk }}</b></span><span>Czas <b>{{ clock(operation.duration) }}</b></span></div>
            <div class="operation-supplies"><small>Wymagane zapasy</small><CostList :cost="supplyEstimate" :stock="game.resources"/></div>
            <p class="intel-note">Szacunek zagrożenia jest orientacyjny. Rozpoznanie celu obniża ryzyko ataku.</p>
            <button class="launch-button" :disabled="!!activeMission || !selectedUnits.length" @click="launch">Wyślij wybrane oddziały</button>
          </template>
          <p v-else class="military-empty">Odkryj kolejne technologie wojskowe, aby odblokować operacje.</p>
        </div>
      </div>
    </section>

    <section v-if="game.military.reports.length" class="military-card reports-card">
      <div class="military-card-title"><div><small>OSTATNIE DZIAŁANIA</small><h3>Raporty</h3></div></div>
      <article v-for="report in game.military.reports.slice(0, 8)" :key="report.id" class="report-row"><b>{{ report.title }}</b><p>{{ report.text }}</p></article>
    </section>
  </div>
</template>

<style scoped>
.military-view{display:grid;gap:14px;color:#e4dfc8}.military-intro{display:flex;justify-content:space-between;gap:18px;padding:4px 0 14px;border-bottom:1px solid #354238}.military-intro small,.military-card-title small,.operation-planner>small{color:#96a17c;font-size:9px;letter-spacing:.13em}.military-intro h2{margin:3px 0 5px}.military-intro p,.target-card p,.operation-planner p{color:#9da793;font-size:11px}.military-metrics{display:flex;gap:8px}.military-metrics span{display:grid;align-content:center;padding:7px 10px;border:1px solid #3d4938;background:#101812;color:#99a18c;font-size:9px}.military-metrics b{color:#e1ddc3;font-size:16px}.military-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,.9fr);gap:12px;align-items:start}.military-card{min-width:0;padding:14px;border:1px solid #3d4c3a;background:linear-gradient(180deg,#121c15,#0e1711)}.military-card-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.military-card-title h3{margin:2px 0 0;color:#e3ddc2}.military-empty{padding:12px;background:#0c140f;color:#939d89;font-size:11px}.unit-card,.target-card{display:grid;gap:9px;margin-top:8px;padding:11px;border:1px solid #303e31;background:#0c1510}.unit-heading{display:flex;align-items:center;gap:9px}.unit-heading>div{display:grid;gap:3px;min-width:0;flex:1}.unit-heading strong,.target-heading strong{color:#e7e1c8;font-size:12px}.unit-heading small,.target-heading small{display:block;color:#97a18e;font-size:9px}.unit-select{display:flex;gap:5px;align-items:center;color:#afb89f;font-size:9px}.unit-stats{display:flex;flex-wrap:wrap;gap:5px}.unit-stats span,.operation-estimate span{padding:5px 7px;background:#141e16;color:#909b86;font-size:9px}.unit-stats b,.operation-estimate b{color:#d9d9bd}.unit-actions,.role-buttons{display:flex;flex-wrap:wrap;gap:5px}.unit-actions button,.role-buttons button,.target-card button{min-height:30px;padding:5px 8px;font-size:9px}.unit-actions select,.operation-planner select,.form-unit input,.form-row label{min-height:30px;padding:5px;background:#09110c;border:1px solid #3c4b3a;color:#dedac3;font-size:10px}.danger-button{color:#dc9a82}.form-unit{display:grid;gap:8px;margin-top:13px;padding-top:11px;border-top:1px solid #2f3b30}.form-unit h4{margin:0;color:#d7d5b8;font-size:11px}.form-row{display:flex;gap:7px}.form-row>input{flex:1;min-width:80px}.form-row label{display:flex;align-items:center;gap:5px}.form-row label input{width:48px;padding:2px}.target-heading{display:flex;justify-content:space-between;gap:8px}.target-heading>span{white-space:nowrap;color:#c6ad66;font-size:9px}.target-heading>span.secure{color:#83bd73}.outpost-tag{color:#96c37a;font-size:9px}.operation-planner{display:grid;gap:9px;margin-top:14px;padding-top:13px;border-top:1px solid #344035}.operation-estimate{display:flex;flex-wrap:wrap;gap:5px}.intel-note{font-size:9px!important}.launch-button{min-height:40px;border-color:#788347;background:#313d24;color:#f1e6ba}.active-operation{border-color:#778048}.active-operation progress{width:100%;height:12px}.active-operation>p{color:#99a18b;font-size:10px}.supply-row{display:flex;align-items:center;gap:10px;margin-top:8px;color:#9fa68f;font-size:9px}.supply-row :deep(.cost-list){display:flex;gap:8px}.report-row{padding:8px 0;border-top:1px solid #2e392f}.report-row b{color:#d8d3b8;font-size:10px}.report-row p{margin-top:3px;color:#929b88;font-size:9px}
@media(max-width:900px){.military-columns{grid-template-columns:1fr}.military-intro{flex-direction:column}.military-metrics{flex-wrap:wrap}}
</style>
