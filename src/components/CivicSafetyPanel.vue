<script setup lang="ts">
import { computed, ref } from "vue";
import { useGame } from "../useGame";
import {
  civicEventTemplate,
  civicServiceUnlocked,
  civicServices,
  civicSummary,
  eventChoiceAvailable,
  investInService,
  resolveCivicEvent,
  serviceMaintenanceCost,
  serviceUpgradeCost,
  type CivicEventChoice,
  type CivicEventInstance,
} from "../civic";
import { canPay } from "../engine";
import { currentSettlementTier } from "../progression";
import CostList from "./CostList.vue";
import PixelIcon from "./PixelIcon.vue";

const { game, notice, save } = useGame();
const open = ref(false);
const tab = ref<"status" | "services" | "events" | "gangs">("status");

const summary = computed(() => civicSummary(game));
const tier = computed(() => currentSettlementTier(game));
const activeServices = computed(() =>
  civicServices.filter((service) => civicServiceUnlocked(game, service.id)),
);
const urgentEvents = computed(() =>
  [...game.civicEvents].sort((a, b) => a.expiresAt - b.expiresAt),
);
const strongestGangs = computed(() =>
  [...game.gangs].sort((a, b) => b.power + b.influence - (a.power + a.influence)),
);

const format = (n: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(n);

const secondsLeft = (event: CivicEventInstance) =>
  Math.max(0, Math.ceil(event.expiresAt - game.elapsed));

function invest(id: (typeof civicServices)[number]["id"]) {
  if (!investInService(game, id)) {
    notice.value = "Nie można teraz rozbudować tej służby — sprawdź poziom osady i zasoby.";
    return;
  }
  save();
}

function resolve(event: CivicEventInstance, choice: CivicEventChoice) {
  if (!resolveCivicEvent(game, event.id, choice.id)) {
    notice.value = choice.unavailableReason || "Brakuje zasobów lub wymaganej siły służb.";
    return;
  }
  save();
}

function meterClass(value: number, reversed = false) {
  const danger = reversed ? value >= 65 : value <= 35;
  const warning = reversed ? value >= 35 : value <= 60;
  return { danger, warning, good: !danger && !warning };
}
</script>

<template>
  <button class="civic-trigger" @click="open = !open">
    <span class="shield">◇</span>
    <span>
      <small>PORZĄDEK PUBLICZNY</small>
      <strong>{{ Math.round(game.order) }}% porządku</strong>
    </span>
    <span v-if="game.civicEvents.length" class="event-badge">{{ game.civicEvents.length }}</span>
    <span class="chevron">{{ open ? "×" : "▲" }}</span>
  </button>

  <aside v-if="open" class="civic-panel" aria-label="Porządek publiczny i bezpieczeństwo">
    <header>
      <div>
        <small>{{ tier.name.toUpperCase() }}</small>
        <h2>PORZĄDEK I BEZPIECZEŃSTWO</h2>
        <p>
          Wraz ze wzrostem osady rośnie anonimowość, wartość majątku i skala problemów.
          Inwestuj w służby, zanim przestępczość utrwali się w postaci gangów.
        </p>
      </div>
      <button class="close" aria-label="Zamknij" @click="open = false">×</button>
    </header>

    <nav class="civic-tabs">
      <button :class="{ active: tab === 'status' }" @click="tab = 'status'">Stan</button>
      <button :class="{ active: tab === 'services' }" @click="tab = 'services'">Służby</button>
      <button :class="{ active: tab === 'events' }" @click="tab = 'events'">
        Zdarzenia <span v-if="game.civicEvents.length">{{ game.civicEvents.length }}</span>
      </button>
      <button :class="{ active: tab === 'gangs' }" @click="tab = 'gangs'">
        Gangi <span v-if="game.gangs.length">{{ game.gangs.length }}</span>
      </button>
    </nav>

    <section v-if="tab === 'status'" class="content">
      <div class="metric-grid">
        <article>
          <span>Porządek</span>
          <b :class="meterClass(game.order)">{{ format(game.order) }}%</b>
          <progress :value="game.order" max="100" />
        </article>
        <article>
          <span>Przestępczość</span>
          <b :class="meterClass(game.crime, true)">{{ format(game.crime) }}%</b>
          <progress :value="game.crime" max="100" />
        </article>
        <article>
          <span>Ryzyko pożaru</span>
          <b :class="meterClass(game.fireRisk, true)">{{ format(game.fireRisk) }}%</b>
          <progress :value="game.fireRisk" max="100" />
        </article>
        <article>
          <span>Zaufanie publiczne</span>
          <b :class="meterClass(game.publicTrust)">{{ format(game.publicTrust) }}%</b>
          <progress :value="game.publicTrust" max="100" />
        </article>
      </div>

      <div class="strength-grid">
        <div><small>SIŁA SŁUŻB</small><strong>{{ format(summary.enforcement) }}</strong></div>
        <div><small>OCHRONA P.POŻ.</small><strong>{{ format(summary.fireProtection) }}</strong></div>
        <div><small>SIŁA GANGÓW</small><strong>{{ format(summary.gangPower) }}</strong></div>
      </div>

      <div class="explanation">
        <h3>Co napędza problemy?</h3>
        <p>
          Większa populacja, bogactwo miasta, wolna siła robocza i istniejące gangi zwiększają presję
          przestępczą. Straż, policja i śledczy ją ograniczają. Warsztaty, huty i gęstsza zabudowa zwiększają
          ryzyko pożaru, które ogranicza straż pożarna.
        </p>
      </div>

      <button class="jump" @click="tab = 'services'">Przejdź do inwestycji w służby</button>
    </section>

    <section v-else-if="tab === 'services'" class="content">
      <p v-if="!activeServices.length" class="locked">
        Pierwsze służby porządkowe odblokują się po osiągnięciu poziomu Wieś.
      </p>

      <article v-for="service in activeServices" :key="service.id" class="service-card">
        <div class="service-heading">
          <PixelIcon :name="service.icon" :size="34" />
          <div>
            <h3>{{ service.name }}</h3>
            <span>Poziom {{ game.services[service.id].level }} / {{ service.maxLevel }}</span>
          </div>
          <span
            v-if="game.services[service.id].level"
            class="funding"
            :class="{ off: !game.services[service.id].funded }"
          >
            {{ game.services[service.id].funded ? "finansowana" : "niedofinansowana" }}
          </span>
        </div>
        <p>{{ service.description }}</p>

        <div class="service-effects">
          <span v-if="service.crimeSuppression">Przestępczość −{{ service.crimeSuppression }} / poz.</span>
          <span v-if="service.order">Porządek +{{ service.order }} / poz.</span>
          <span v-if="service.fireSuppression">P.poż. +{{ service.fireSuppression }} / poz.</span>
        </div>

        <template v-if="game.services[service.id].level">
          <small class="label">UTRZYMANIE CO 10 MINUT</small>
          <CostList :cost="serviceMaintenanceCost(game, service.id)" :stock="game.resources" />
        </template>

        <template v-if="game.services[service.id].level < service.maxLevel">
          <small class="label">INWESTYCJA W KOLEJNY POZIOM</small>
          <CostList :cost="serviceUpgradeCost(game, service.id)" :stock="game.resources" />
          <button
            class="primary-action"
            :disabled="!canPay(game, serviceUpgradeCost(game, service.id))"
            @click="invest(service.id)"
          >
            {{ game.services[service.id].level ? "Rozbuduj służbę" : "Utwórz służbę" }}
          </button>
        </template>
        <div v-else class="maxed">Osiągnięto maksymalny poziom.</div>
      </article>

      <div class="maintenance-note">
        Jeśli zabraknie środków na utrzymanie, służba pozostaje istniejąca, ale działa tylko z 40% skuteczności,
        a porządek i zaufanie zaczynają spadać.
      </div>
    </section>

    <section v-else-if="tab === 'events'" class="content">
      <p v-if="!urgentEvents.length" class="locked">
        Brak nierozwiązanych zdarzeń. System generuje je z aktualnej sytuacji osady, a nie z jednej sztywnej kolejki.
      </p>

      <article
        v-for="event in urgentEvents"
        :key="event.id"
        class="event-card"
        :class="civicEventTemplate(event.templateId).severity"
      >
        <div class="event-heading">
          <div>
            <small>{{ civicEventTemplate(event.templateId).severity.toUpperCase() }}</small>
            <h3>{{ civicEventTemplate(event.templateId).name }}</h3>
          </div>
          <strong>{{ secondsLeft(event) }} s</strong>
        </div>
        <p>{{ civicEventTemplate(event.templateId).description(game, event) }}</p>

        <div class="choice-list">
          <div
            v-for="choice in civicEventTemplate(event.templateId).choices"
            :key="choice.id"
            class="choice"
          >
            <div>
              <strong>{{ choice.label }}</strong>
              <p>{{ choice.description }}</p>
              <CostList v-if="choice.cost" :cost="choice.cost" :stock="game.resources" />
              <small
                v-if="!eventChoiceAvailable(game, event, choice) && choice.unavailableReason"
                class="unavailable"
              >{{ choice.unavailableReason }}</small>
            </div>
            <button
              :disabled="!eventChoiceAvailable(game, event, choice)"
              @click="resolve(event, choice)"
            >
              Wybierz
            </button>
          </div>
        </div>
        <small class="deadline">
          Brak decyzji przed upływem czasu automatycznie uruchomi negatywne konsekwencje.
        </small>
      </article>
    </section>

    <section v-else class="content">
      <p v-if="!strongestGangs.length" class="locked">
        Brak zorganizowanych gangów. Przy wysokiej przestępczości mogą powstać od poziomu Małe miasteczko.
      </p>

      <article v-for="gang in strongestGangs" :key="gang.id" class="gang-card">
        <div class="gang-heading">
          <div>
            <small>GRUPA PRZESTĘPCZA</small>
            <h3>{{ gang.name }}</h3>
          </div>
          <span>od dnia {{ 1 + Math.floor(gang.createdAt / 600) }}</span>
        </div>
        <div class="gang-stats">
          <span>Siła <b>{{ format(gang.power) }}</b></span>
          <span>Wpływy <b>{{ format(gang.influence) }}</b></span>
          <span>Rozpoznanie <b>{{ format(gang.heat) }}</b></span>
        </div>
        <p>
          Gang rośnie szybciej przy wysokiej przestępczości i słabych służbach. Silna policja oraz śledczy stopniowo
          ograniczają jego potencjał, a wydarzenia dają możliwość przeprowadzenia konkretnych operacji.
        </p>
      </article>
    </section>
  </aside>
</template>

<style scoped>
.civic-trigger {
  position: fixed;
  left: 18px;
  bottom: 54px;
  z-index: 80;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  min-width: 235px;
  padding: 10px 12px;
  border: 1px solid #4e5d57;
  background: #111615;
  color: #d9dfd8;
  box-shadow: 0 8px 28px #000a;
  cursor: pointer;
  text-align: left;
}
.civic-trigger small,.civic-panel small { display:block; color:#85938d; letter-spacing:.08em; font-size:10px; }
.civic-trigger strong { display:block; margin-top:2px; }
.shield { color:#8da49a; font-size:20px; }
.chevron { color:#788781; }
.event-badge { min-width:22px; height:22px; display:grid; place-items:center; border-radius:50%; background:#6f332f; color:#f5ded8; font-size:11px; }
.civic-panel {
  position: fixed;
  left: 18px;
  bottom: 104px;
  z-index: 79;
  width: min(500px, calc(100vw - 36px));
  max-height: calc(100vh - 140px);
  overflow: auto;
  border: 1px solid #46544f;
  background: #0f1312;
  color: #d8ded9;
  box-shadow: 0 18px 50px #000d;
}
.civic-panel header { display:flex; justify-content:space-between; gap:18px; padding:18px; border-bottom:1px solid #2e3935; background:#151b19; }
h2,h3,p { margin-top:0; }
.civic-panel header h2 { margin:3px 0 5px; font-size:20px; }
.civic-panel header p { margin-bottom:0; color:#9ca8a2; font-size:12px; line-height:1.45; }
.close { width:32px; height:32px; border:1px solid #3c4844; background:transparent; color:#c9d1cc; cursor:pointer; }
.civic-tabs { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid #2e3935; }
.civic-tabs button { padding:10px 5px; border:0; border-right:1px solid #2e3935; background:#111715; color:#85918b; cursor:pointer; font-size:12px; }
.civic-tabs button.active { color:#e0e5e1; background:#1b2421; }
.civic-tabs span { margin-left:3px; color:#d19b71; }
.content { padding:15px; }
.metric-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.metric-grid article { padding:10px; border:1px solid #33403b; background:#151a18; }
.metric-grid article span { display:block; color:#97a39d; font-size:11px; }
.metric-grid article b { display:block; margin:4px 0; font-size:18px; }
.metric-grid progress { width:100%; height:7px; }
.good { color:#98b58f; }.warning { color:#d2ad68; }.danger { color:#d0786f; }
.strength-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin-top:9px; }
.strength-grid > div { padding:9px; border:1px solid #33403b; background:#111715; }
.strength-grid strong { display:block; margin-top:3px; font-size:16px; }
.explanation,.maintenance-note,.locked { margin-top:12px; padding:11px; border:1px solid #33403b; background:#141917; color:#99a49f; font-size:12px; line-height:1.5; }
.explanation h3 { color:#d5ddd8; margin-bottom:5px; }
.jump,.primary-action,.choice button { border:1px solid #4b665b; background:#1f342c; color:#e1e9e4; padding:9px 11px; cursor:pointer; }
.jump { width:100%; margin-top:10px; }
button:disabled { opacity:.38; cursor:not-allowed; }
.service-card,.event-card,.gang-card { margin-bottom:10px; padding:12px; border:1px solid #33403b; background:#151a18; }
.service-heading { display:grid; grid-template-columns:auto 1fr auto; gap:9px; align-items:center; }
.service-heading h3 { margin:0 0 2px; }.service-heading span { color:#8d9993; font-size:11px; }
.service-card > p,.event-card > p,.gang-card > p { color:#a4aea9; font-size:12px; line-height:1.45; }
.funding { padding:4px 6px; border:1px solid #41614f; color:#91b49c !important; }.funding.off { border-color:#6f493f; color:#cf8a78 !important; }
.service-effects { display:flex; flex-wrap:wrap; gap:5px; margin:8px 0; }
.service-effects span { padding:4px 6px; background:#0f1312; color:#a9b8b0; font-size:10px; }
.label { margin-top:9px; }.primary-action { width:100%; margin-top:7px; }.maxed { margin-top:8px; color:#87958e; font-size:11px; }
.event-card.medium { border-color:#5b513c; }.event-card.high { border-color:#6d4539; }.event-card.critical { border-color:#813d39; box-shadow:inset 3px 0 #813d39; }
.event-heading,.gang-heading { display:flex; justify-content:space-between; gap:12px; align-items:start; }
.event-heading h3,.gang-heading h3 { margin:2px 0 0; }.event-heading > strong { color:#d9957d; font-size:12px; }
.choice-list { display:grid; gap:7px; margin-top:10px; }.choice { display:grid; grid-template-columns:1fr auto; gap:10px; padding:9px; background:#0f1312; border:1px solid #2e3834; }
.choice strong { font-size:12px; }.choice p { margin:3px 0 5px; color:#8f9b95; font-size:11px; line-height:1.35; }.choice button { align-self:center; }
.unavailable { color:#c17d6b !important; }.deadline { margin-top:9px; color:#9e766b !important; }
.gang-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin:9px 0; }.gang-stats span { padding:7px; background:#0f1312; color:#8f9b95; font-size:10px; }.gang-stats b { display:block; margin-top:3px; color:#d9dfdb; font-size:13px; }
@media (max-width:700px) {
  .civic-trigger { left:8px; bottom:96px; min-width:205px; }
  .civic-panel { left:8px; bottom:144px; width:calc(100vw - 16px); max-height:calc(100vh - 160px); }
  .civic-tabs { grid-template-columns:1fr 1fr; }
  .metric-grid,.strength-grid { grid-template-columns:1fr 1fr; }
}
</style>
