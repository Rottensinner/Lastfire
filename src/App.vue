<script setup lang="ts">
import { computed, ref } from "vue";
import {
  buildings,
  resources,
  researches,
  expeditions,
  events,
  marketGoods,
  orders,
  resourceName,
  researchName,
} from "./data";
import {
  capacity,
  housing,
  freeWorkers,
  maxWorkers,
  workersIn,
  upgradeCost,
  canPay,
  queueBuild,
  cancelBuild,
  moveBuild,
  assignBuilder,
  assign,
  equipBest,
  removeEquipment,
  startResearch,
  startExpedition,
  collectLoot,
  canAcceptEvent,
  resolveEvent,
  fulfillOrder,
  trade,
  buyPrice,
  multiplier,
  rates,
  jobStatus,
  unlocked,
  has,
  visibleResearch,
  toolTiers,
  effectiveWorkers,
} from "./engine";
import type { Resource, Recipe } from "./types";
import { useGame } from "./useGame";
import PixelIcon from "./components/PixelIcon.vue";
import CostList from "./components/CostList.vue";
import DiscoveryTree from "./components/DiscoveryTree.vue";
import SettlementProgressPanel from "./components/SettlementProgressPanel.vue";
import CivicSafetyPanel from "./components/CivicSafetyPanel.vue";
const { game, notice, save, reset, download, restore } = useGame();
const tab = ref("Osada"),
  selected = ref("gatherers"),
  discovery = ref("stonecraft"),
  settings = ref(false),
  confirmReset = ref(false),
  pack = ref(false),
  tools = ref(false),
  resourceSearch = ref("");
const tabs = ["Osada", "Odkrycia", "Wyprawy", "Handel", "Wydarzenia", "Region", "Bezpieczeństwo"];
const def = computed(() => buildings.find((b) => b.id === selected.value)!);
const current = computed(() => game.buildings[selected.value]);
const node = computed(() => researches.find((r) => r.id === discovery.value)!);
const flow = computed(() => rates(game));
const groups = [...new Set(buildings.map((b) => b.group))];
const resourceGroups = [...new Set(resources.map((r) => r.group))];
const shownResources = computed(() =>
  resources.filter(
    (r) =>
      (!r.unlock || has(game, r.unlock) || game.resources[r.id] > 0) &&
      r.name.toLowerCase().includes(resourceSearch.value.toLowerCase()),
  ),
);
const format = (n: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(n);
const clock = (n: number) => {
  const t = Math.max(0, Math.ceil(n));
  return `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${(t % 60).toString().padStart(2, "0")}`;
};
const researchProgress = computed(() =>
  game.research
    ? 100 * (1 - game.research.remaining / game.research.duration)
    : 0,
);
const nextHelp = computed(() =>
  !has(game, "stonecraft")
    ? "Zacznij od narzędzi kamiennych w Odkryciach."
    : !game.buildings.workshop.level
      ? "Zbuduj warsztat narzędzi. Przydziel wolną osobę do budowy."
      : !has(game, "logging")
        ? "W warsztacie wytwórz narzędzia. Następnie odkryj drwala lub kamieniarza."
        : !has(game, "scouting")
          ? "Zbuduj szałasy i odkryj zwiad. Wyprawy przywiozą nasiona i złoto."
          : "Rozdzielaj pracowników, ulepszaj narzędzia i odkrywaj nowe gałęzie gospodarki.",
);
function act(
  ok: boolean,
  message = "Brakuje zasobów, wolnych ludzi lub wymaganego odkrycia.",
) {
  if (!ok) notice.value = message;
}
function pickDiscovery(id: string) {
  discovery.value = id;
  tab.value = "Odkrycia";
}
function limit(id: string, e: Event) {
  const n = Number((e.target as HTMLInputElement).value);
  current.value.jobs[id].limit = Number.isFinite(n)
    ? Math.min(1e6, Math.max(0, n))
    : 0;
}
function reserve(id: Resource, e: Event) {
  const n = Number((e.target as HTMLInputElement).value);
  game.reserves[id] = Number.isFinite(n) ? Math.min(1e6, Math.max(0, n)) : 0;
}
function importFile(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) restore(input.files[0]);
  input.value = "";
}
const outputText = (r: Recipe) =>
  Object.entries(r.output)
    .map(
      ([k, v]) =>
        `${format(v * effectiveWorkers(current.value.jobs[r.id], r) * multiplier(game, def.value.id) * (game.resources.food <= 0 || game.resources.water <= 0 ? 0.25 : 1))} ${resourceName(k)}`,
    )
    .join(", ");
const remainingFood = computed(() =>
  flow.value.food < 0
    ? clock(game.resources.food / -flow.value.food)
    : "bilans dodatni",
);
const nodeUnlocks = computed(() => [
  ...buildings
    .filter((b) => b.research === node.value.id)
    .map((b) => "Budynek: " + b.name),
  ...buildings.flatMap((b) =>
    b.recipes
      .filter((r) => r.research === node.value.id)
      .map((r) => b.name + ": " + r.name),
  ),
]);
const visibleRoutes = computed(() =>
  expeditions.filter((e) => has(game, e.requires)),
);
</script>
<template>
  <div class="game-shell">
    <a class="skip-link" href="#main-content">Przejdź do widoku gry</a>
    <header class="topbar">
      <a class="brand" href="#" @click.prevent="tab = 'Osada'"
        ><PixelIcon name="fire" :size="42" /><span
          >OSTATNIE OGNISKO<small>OD OBOZOWISKA DO MIASTA</small></span
        ></a
      >
      <nav aria-label="Główna nawigacja">
        <button
          v-for="t in tabs"
          :key="t"
          :class="{ active: tab === t }"
          :aria-current="tab === t ? 'page' : undefined"
          @click="tab = t"
        >
          {{ t
          }}<span
            v-if="t === 'Wydarzenia' && game.events.length"
            class="event-count"
            >{{ game.events.length }}</span
          >
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
      <span>{{ notice }}</span
      ><button aria-label="Zamknij komunikat" @click="notice = ''">×</button>
    </div>
    <div class="layout" :class="{ 'wide-view': !['Osada', 'Odkrycia'].includes(tab) }">
      <aside class="panel resources-panel">
        <div class="panel-heading">
          <h1>ZASOBY</h1>
          <span class="muted">/ {{ capacity(game) }}</span>
        </div>
        <input
          v-model="resourceSearch"
          class="resource-search"
          aria-label="Szukaj zasobu"
          placeholder="Szukaj zasobu…"
        />
        <div class="resource-scroll">
          <section
            v-for="group in resourceGroups.filter((g) =>
              shownResources.some((r) => r.group === g),
            )"
            :key="group"
            class="resource-group"
          >
            <h2 class="section-title">{{ group }}</h2>
            <div
              v-for="r in shownResources.filter((r) => r.group === group)"
              :key="r.id"
              class="resource-row"
              :title="`${r.name}: ${format(game.resources[r.id])}. Bilans szacunkowy ${format(flow[r.id])} / tik.`"
            >
              <PixelIcon :name="r.icon" :size="26" /><span>{{ r.name }}</span
              ><b>{{ format(game.resources[r.id]) }}</b
              ><span
                class="rate"
                :class="{
                  negative: flow[r.id] < 0,
                  muted: Math.abs(flow[r.id]) < 0.001,
                }"
                >{{ flow[r.id] > 0 ? "+" : "" }}{{ format(flow[r.id]) }}</span
              >
            </div>
          </section>
        </div>
        <div class="resource-footer"><span>1 TIK = 1 SEKUNDA</span></div>
        <p class="stock-hint">
          Jedzenie: {{ remainingFood }}<br />Zużycie/os.: 0,012 jedzenia i 0,01
          wody / tik.
        </p>
        <details v-if="has(game, 'storage')" class="reserves">
          <summary>Rezerwy produkcyjne</summary>
          <p>
            Chronią przed zużyciem w recepturach. Budowa, badania i potrzeby
            ludzi mogą je wykorzystać.
          </p>
          <label
            v-for="r in shownResources.filter(
              (r) => !['gold', 'knowledge'].includes(r.id),
            )"
            :key="r.id"
            >{{ r.name
            }}<input
              type="number"
              min="0"
              :value="game.reserves[r.id] || 0"
              :aria-label="`Rezerwa: ${r.name}`"
              @change="reserve(r.id, $event)"
          /></label>
        </details>
      </aside>
      <main class="panel main-panel" id="main-content" tabindex="-1">
        <div class="panel-heading main-heading">
          <h1>{{ tab.toUpperCase() }}</h1>
          <div class="population">
            <PixelIcon name="person" :size="24" /><span
              >{{ game.population }} / {{ housing(game) }}</span
            ><span class="positive">Wolni: {{ freeWorkers(game) }}</span>
          </div>
        </div>
        <div
          v-if="game.resources.food <= 0 || game.resources.water <= 0"
          class="warning"
        >
          Brak jedzenia lub wody: produkcja i budowa pracują na 25%. Zbieracze
          mogą odbudować zapasy.
        </div>
        <template v-if="tab === 'Osada'"
          ><p class="guide">{{ nextHelp }}</p>
          <section
            v-for="group in groups.filter((g) =>
              buildings.some((b) => b.group === g && unlocked(game, b.id)),
            )"
            :key="group"
            class="building-group"
          >
            <h2 class="section-title">{{ group }}</h2>
            <div class="building-grid">
              <button
                v-for="b in buildings.filter(
                  (b) => b.group === group && unlocked(game, b.id),
                )"
                :key="b.id"
                class="building-tile"
                :class="{
                  selected: selected === b.id,
                  unbuilt: !game.buildings[b.id].level,
                }"
                :aria-label="`${b.name}, poziom ${game.buildings[b.id].level}`"
                :title="b.name"
                @click="selected = b.id"
              >
                <PixelIcon :name="b.icon" :size="48" /><span
                  class="tile-level"
                  >{{ game.buildings[b.id].level || "+" }}</span
                ><span class="tile-label">{{ b.name }}</span
                ><span v-if="workersIn(game, b.id)" class="tile-workers">{{
                  workersIn(game, b.id)
                }}</span>
              </button>
            </div>
          </section>
          <section class="construction">
            <div class="subheading">
              <h2>Budowniczowie</h2>
              <div class="stepper">
                <button
                  :disabled="!game.builders"
                  aria-label="Odejmij budowniczego"
                  @click="assignBuilder(game, -1)"
                >
                  −</button
                ><b>{{ game.builders }}</b
                ><button
                  :disabled="!freeWorkers(game) || game.builders >= 6"
                  aria-label="Dodaj budowniczego"
                  @click="assignBuilder(game, 1)"
                >
                  +
                </button>
              </div>
            </div>
            <p v-if="!game.buildQueue.length" class="muted">
              Wybierz budynek, dodaj budowę do kolejki i przydziel ludzi.
            </p>
            <div
              v-for="(q, i) in game.buildQueue"
              :key="q.id"
              class="queue-item"
            >
              <div>
                <strong
                  >{{ buildings.find((b) => b.id === q.id)?.name }} ·
                  {{ q.level }}</strong
                ><small
                  >{{
                    i === 0
                      ? game.builders
                        ? "W budowie"
                        : "Czeka na budowniczych"
                      : "W kolejce"
                  }}
                  · {{ Math.ceil(q.remaining) }} pracy</small
                ><progress
                  :value="q.duration - q.remaining"
                  :max="q.duration"
                />
              </div>
              <button
                :disabled="i === 0"
                title="Przesuń wcześniej"
                @click="moveBuild(game, i)"
              >
                ↑</button
              ><button
                title="Anuluj i zwróć materiały"
                @click="cancelBuild(game, i)"
              >
                ×
              </button>
            </div>
          </section>
          <div class="activity-grid">
            <button class="activity-card" @click="tab = 'Odkrycia'">
              <div class="activity-title">
                <PixelIcon name="book" />
                <h2>ODKRYCIA</h2>
              </div>
              <strong>{{
                game.research
                  ? researchName(game.research.id)
                  : "Nowe możliwości"
              }}</strong
              ><progress
                v-if="game.research"
                :value="researchProgress"
                max="100"
              />
              <p>
                {{
                  game.research
                    ? clock(game.research.remaining)
                    : `${game.researched.length} odkrytych technologii i premii`
                }}
              </p></button
            ><button class="activity-card" @click="tab = 'Wydarzenia'">
              <div class="activity-title">
                <PixelIcon name="person" />
                <h2>PRZYBYSZE</h2>
              </div>
              <strong>{{
                game.events.length
                  ? "Ktoś czeka przy ognisku"
                  : "Nasłuchujemy we mgle"
              }}</strong>
              <p>
                Mieszkańcy dołączają wyłącznie w wydarzeniach. Decyzje nie
                wygasają.
              </p>
            </button>
          </div>
          <section class="journal">
            <h2 class="section-title">Kronika</h2>
            <p v-for="(entry, i) in game.log.slice(0, 5)" :key="i">
              <span>›</span>{{ entry }}
            </p>
          </section></template
        >
        <template v-else-if="tab === 'Odkrycia'"
          ><DiscoveryTree
            :game="game"
            :selected="discovery"
            @select="pickDiscovery"
        /></template>
        <template v-else-if="tab === 'Wydarzenia'"
          ><p class="intro">
            Przybysze i spotkania. Specjaliści przekazują stałe premie osadzie;
            nie zajmują stanowisk.
          </p>
          <p v-if="!game.events.length" class="empty-state">
            Przy ognisku jest spokojnie. Pierwsi wędrowcy pojawią się po 45
            tikach, następni po 300 tikach od ostatniej decyzji.
          </p>
          <article
            v-for="e in events.filter((e) => game.events.includes(e.id))"
            :key="e.id"
            class="task-card"
          >
            <div class="task-heading">
              <PixelIcon
                :name="
                  e.discovery
                    ? researches.find((r) => r.id === e.discovery)?.icon ||
                      'person'
                    : 'person'
                "
                :size="40"
              />
              <h2>{{ e.name }}</h2>
            </div>
            <p>{{ e.description }}</p>
            <p v-if="e.people" class="positive">
              +{{ e.people }} mieszkańców · wolne miejsca:
              {{ housing(game) - game.population }}
            </p>
            <p v-if="e.discovery" class="positive">
              {{ researches.find((r) => r.id === e.discovery)?.description }}
            </p>
            <CostList :cost="e.cost" :stock="game.resources" />
            <div class="event-actions">
              <button
                class="primary"
                :disabled="!canAcceptEvent(game, e.id)"
                @click="act(resolveEvent(game, e.id, true))"
              >
                {{ e.people ? "Przyjmij mieszkańców" : "Skorzystaj" }}</button
              ><button
                v-if="e.id === 'visitors'"
                @click="resolveEvent(game, e.id, false)"
              >
                Odmów
              </button>
            </div>
            <p v-if="!canAcceptEvent(game, e.id)" class="muted">
              Przygotuj miejsce lub wymagane zapasy. Wydarzenie poczeka.
            </p>
          </article></template
        >
        <template v-else-if="tab === 'Wyprawy'"
          ><p v-if="!has(game, 'scouting')" class="empty-state">
            Odkryj zwiad w drzewku i zbuduj obóz zwiadowców.
          </p>
          <template v-else
            ><div class="gear-options">
              <label
                ><input v-model="pack" type="checkbox" /> Plecak (+25%
                łupów)</label
              ><label
                ><input v-model="tools" type="checkbox" /> Kamienne narzędzia
                (+15% łupów)</label
              >
              <p>Wyposażenie jest zabierane z magazynu i wraca po wyprawie.</p>
            </div>
            <section
              v-if="Object.keys(game.loot).length"
              class="task-card loot"
            >
              <h2>Łupy i zwrócone materiały</h2>
              <CostList :cost="game.loot" /><button
                class="primary"
                @click="collectLoot(game)"
              >
                Odbierz tyle, ile zmieści magazyn
              </button>
              <p>Nadwyżki pozostają tutaj bez limitu czasu.</p>
            </section>
            <article v-for="e in visibleRoutes" :key="e.id" class="task-card">
              <div class="task-heading">
                <PixelIcon name="tent" :size="40" />
                <div>
                  <h2>{{ e.name }}</h2>
                  <span class="muted"
                    >{{ e.workers }} zwiadowców · bazowo
                    {{ clock(e.duration) }}</span
                  >
                </div>
              </div>
              <p>{{ e.description }}</p>
              <h3>Zapasy zużywane przy wyjściu</h3>
              <CostList :cost="e.cost" :stock="game.resources" /><template
                v-if="e.gear"
                ><h3>Wymagane wyposażenie (wraca)</h3>
                <CostList :cost="e.gear" :stock="game.resources"
              /></template>
              <h3>Gwarantowane łupy przed premiami</h3>
              <CostList :cost="e.reward" /><template
                v-if="game.expedition?.id === e.id"
                ><progress
                  :value="game.expedition.duration - game.expedition.remaining"
                  :max="game.expedition.duration"
                />
                <p class="positive">
                  Powrót za {{ clock(game.expedition.remaining) }}
                </p></template
              ><button
                v-else
                class="primary"
                :disabled="
                  !!game.expedition ||
                  !game.buildings.camp.level ||
                  freeWorkers(game) < e.workers ||
                  !canPay(game, e.cost)
                "
                @click="
                  act(
                    startExpedition(game, e.id, pack, tools),
                    'Brakuje obozu, wolnych ludzi, zapasów lub wybranego wyposażenia.',
                  )
                "
              >
                Wyślij zwiadowców
              </button>
            </article></template
          ></template
        >
        <template v-else-if="tab === 'Handel'"
          ><p v-if="!has(game, 'trade')" class="empty-state">
            Odkryj handel. Pierwsze monety i nasiona przyniosą wyprawy.
          </p>
          <template v-else
            ><div class="market-summary">
              <span
                >Złoto <b>{{ format(game.resources.gold) }}</b></span
              ><span
                >Reputacja <b>{{ game.reputation }}</b></span
              ><span>Dostawa {{ clock(game.marketTimer) }}</span>
            </div>
            <p class="intro">
              Handel po 5 sztuk. Oferty i zamówienia odnawiają się co 300 tików.
              {{
                has(game, "merchant") ? "Zaufany kupiec: −15% cen zakupu." : ""
              }}
            </p>
            <div
              v-for="m in marketGoods.filter((m) => has(game, m.unlock))"
              :key="m.id"
              class="market-row"
            >
              <PixelIcon :name="resources.find((r) => r.id === m.id)!.icon" />
              <div>
                <strong>{{ resourceName(m.id) }}</strong
                ><small>Zapas kupca: {{ game.market[m.id] }}</small>
              </div>
              <button
                :disabled="
                  game.resources.gold < buyPrice(game, m.id) * 5 ||
                  game.market[m.id] < 5 ||
                  game.resources[m.id] + 5 > capacity(game)
                "
                @click="act(trade(game, m.id, 'buy', 5))"
              >
                Kup 5<br /><small
                  >{{ format(buyPrice(game, m.id) * 5) }} złota</small
                ></button
              ><button
                :disabled="game.resources[m.id] < 5"
                @click="act(trade(game, m.id, 'sell', 5))"
              >
                Sprzedaj 5<br /><small>{{ format(m.sell * 5) }} złota</small>
              </button>
            </div>
            <h2 class="section-title orders-title">Zamówienia kupieckie</h2>
            <article
              v-for="o in orders.filter((o) => has(game, o.requires))"
              :key="o.id"
              class="task-card"
            >
              <h2>{{ o.name }}</h2>
              <CostList :cost="o.cost" :stock="game.resources" />
              <p class="positive">{{ o.gold }} złota · +1 reputacji</p>
              <button
                class="primary"
                :disabled="game.orders.includes(o.id) || !canPay(game, o.cost)"
                @click="act(fulfillOrder(game, o.id))"
              >
                {{
                  game.orders.includes(o.id)
                    ? "Wykonano do następnej dostawy"
                    : "Dostarcz towary"
                }}
              </button>
            </article></template
          ></template
        >
      <div v-show="tab === 'Region'"><SettlementProgressPanel embedded /></div>
        <div v-show="tab === 'Bezpieczeństwo'"><CivicSafetyPanel embedded /></div>
      </main>
      <aside v-show="['Osada', 'Odkrycia'].includes(tab)" class="panel detail-panel" aria-label="Szczegóły wyboru">
        <template v-if="tab === 'Odkrycia'"
          ><div class="panel-heading">
            <h1>{{ node.name.toUpperCase() }}</h1>
          </div>
          <div class="discovery-portrait">
            <PixelIcon :name="node.icon" :size="96" /><span class="small-tag">{{
              node.kind === "research"
                ? "Badanie"
                : node.kind === "specialist"
                  ? "Stała premia"
                  : "Znalezisko"
            }}</span>
          </div>
          <p class="detail-description">{{ node.description }}</p>
          <template v-if="nodeUnlocks.length"
            ><h2 class="section-title">Odblokowuje</h2>
            <ul class="unlock-list">
              <li v-for="item in nodeUnlocks" :key="item">{{ item }}</li>
            </ul></template
          >
          <section v-if="node.requires.length" class="requirements">
            <h2 class="section-title">Wymagania</h2>
            <button
              v-for="id in node.requires"
              :key="id"
              class="requirement"
              :class="{ positive: has(game, id) }"
              @click="pickDiscovery(id)"
            >
              {{ has(game, id) ? "✓" : "◇" }} {{ researchName(id) }}
            </button>
          </section>
          <template v-if="has(game, node.id)"
            ><div class="known-badge">
              ✓ Odkryto — efekt jest aktywny
            </div></template
          ><template v-else-if="node.kind === 'research'"
            ><CostList :cost="node.cost" :stock="game.resources" />
            <p class="muted">
              Czas: {{ clock(node.duration) }} · jedno badanie naraz
            </p>
            <template v-if="game.research?.id === node.id"
              ><progress :value="researchProgress" max="100" />
              <p class="positive">
                Pozostało {{ clock(game.research.remaining) }}
              </p></template
            ><button
              v-else
              class="primary full"
              :disabled="
                !!game.research ||
                !visibleResearch(game, node.id) ||
                !canPay(game, node.cost)
              "
              @click="act(startResearch(game, node.id))"
            >
              Rozpocznij badanie
            </button></template
          >
          <div v-else class="discovery-source">
            <h2>Jak zdobyć?</h2>
            <p>{{ node.source }}</p>
            <button
              class="primary full"
              @click="
                tab = node.kind === 'specialist' ? 'Wydarzenia' : 'Wyprawy'
              "
            >
              {{
                node.kind === "specialist"
                  ? "Sprawdź wydarzenia"
                  : "Przejdź do wypraw"
              }}
            </button>
          </div></template
        >
        <template v-else
          ><div class="panel-heading">
            <h1>{{ def.name.toUpperCase() }}</h1>
          </div>
          <div class="building-summary">
            <PixelIcon :name="def.icon" :size="72" />
            <div>
              <h2>
                {{
                  current.level ? "Poziom " + current.level : "Do wybudowania"
                }}
              </h2>
              <p>{{ def.description }}</p>
            </div>
          </div>
          <template v-if="current.level && def.recipes.length"
            ><div class="workforce-total">
              <span
                >Stanowiska {{ workersIn(game, def.id) }} /
                {{ maxWorkers(game, def.id) }}</span
              ><span class="positive"
                >Premie +{{
                  Math.round((multiplier(game, def.id) - 1) * 100)
                }}%</span
              >
            </div>
            <label class="auto-equip"
              ><input v-model="game.autoEquip" type="checkbox" /> Automatycznie
              przydzielaj najlepsze narzędzia</label
            >
            <section
              v-for="r in def.recipes.filter((r) => has(game, r.research))"
              :key="r.id"
              class="job-card"
            >
              <div class="job-title">
                <PixelIcon
                  :name="
                    resources.find((x) => x.id === Object.keys(r.output)[0])!
                      .icon
                  "
                  :size="28"
                />
                <h2>{{ r.name }}</h2>
                <button
                  class="job-pause"
                  :aria-label="`Wstrzymaj lub wznów: ${r.name}`"
                  @click="
                    current.jobs[r.id].paused = !current.jobs[r.id].paused
                  "
                >
                  {{ current.jobs[r.id].paused ? "▶" : "Ⅱ" }}
                </button>
              </div>
              <div class="job-controls">
                <span
                  :class="{
                    positive: jobStatus(game, def.id, r) === 'Pracuje',
                  }"
                  >{{ jobStatus(game, def.id, r) }}</span
                >
                <div class="stepper">
                  <button
                    :disabled="!current.jobs[r.id].workers"
                    :aria-label="`Odejmij: ${r.name}`"
                    @click="assign(game, def.id, r.id, -1)"
                  >
                    −</button
                  ><b>{{ current.jobs[r.id].workers }}</b
                  ><button
                    :disabled="
                      !freeWorkers(game) ||
                      workersIn(game, def.id) >= maxWorkers(game, def.id)
                    "
                    :aria-label="`Dodaj: ${r.name}`"
                    @click="assign(game, def.id, r.id, 1)"
                  >
                    +
                  </button>
                </div>
              </div>
              <p class="job-output">
                {{
                  jobStatus(game, def.id, r) === "Pracuje" ? outputText(r) : "0"
                }}
                / tik
              </p>
              <details>
                <summary>Receptura, wyposażenie i limit</summary>
                <p class="muted">Baza / pracownik / tik</p>
                <CostList v-if="Object.keys(r.input).length" :cost="r.input" />
                <p v-else class="muted">Nie zużywa surowców.</p>
                <CostList :cost="r.output" /><template v-if="r.tool"
                  ><p v-if="r.minTool" class="muted">
                    Minimum: {{ resourceName(r.minTool) }}.
                  </p>
                  <div v-for="t in toolTiers" :key="t" class="equipment-line">
                    <span>{{ resourceName(t) }}</span
                    ><b>{{ current.jobs[r.id].equipment[t] || 0 }}</b>
                  </div>
                  <div class="equipment-actions">
                    <button @click="equipBest(game, def.id, r.id)">
                      Wyposaż najlepszymi</button
                    ><button
                      @click="
                        removeEquipment(game, def.id, r.id);
                        game.autoEquip = false;
                      "
                    >
                      Zdejmij
                    </button>
                  </div></template
                ><label class="limit-label"
                  >Limit zapasu (0 = brak)<input
                    type="number"
                    min="0"
                    :value="current.jobs[r.id].limit"
                    @change="limit(r.id, $event)"
                /></label>
              </details></section
          ></template>
          <div v-else-if="current.level" class="passive-info">
            <p>
              {{
                def.housing
                  ? `Ten budynek zapewnia ${current.level * def.housing} miejsc.`
                  : def.id === "warehouse"
                    ? `Pojemność: ${capacity(game)} każdego surowca.`
                    : def.id === "fire"
                      ? `Premia paleniska: +${(current.level - 1) * 5}%.`
                      : "Wyprawy dostępne w górnym menu."
              }}
            </p>
          </div>
          <section class="upgrade-section">
            <h2>
              {{
                current.level
                  ? `Rozbudowa do poziomu ${current.level + 1}`
                  : "Budowa"
              }}
            </h2>
            <CostList
              :cost="upgradeCost(game, def.id)"
              :stock="game.resources"
            /><button
              class="primary full"
              :disabled="
                !canPay(game, upgradeCost(game, def.id)) ||
                game.buildQueue.some((q) => q.id === def.id) ||
                game.buildQueue.length >= 5 ||
                current.level >= 20
              "
              @click="
                act(queueBuild(game, def.id));
                tab = 'Osada';
              "
            >
              {{
                game.buildQueue.some((q) => q.id === def.id)
                  ? "W kolejce budowy"
                  : "Dodaj do kolejki"
              }}
            </button>
            <p class="muted">
              Materiały zostają pobrane teraz. Przydziel budowniczych w panelu
              osady.
            </p>
          </section></template
        >
      </aside>
    </div>
    <footer class="bottom-bar">
      <span
        >◆ Dzień {{ 1 + Math.floor(game.elapsed / 600) }} · tik
        {{ game.elapsed }}</span
      ><span>Zapis automatyczny · offline do 8 h</span
      ><button class="text-button" @click="settings = true">
        Zapis i zasady
      </button>
    </footer>
  </div>
  <div v-if="settings" class="modal-backdrop" @click.self="settings = false">
    <section
      class="settings panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div class="panel-heading">
        <h1 id="settings-title">TWOJA OSADA</h1>
        <button aria-label="Zamknij ustawienia" @click="settings = false">
          ×
        </button>
      </div>
      <p>
        Gra zapisuje się w tej przeglądarce co 15 sekund. Używaj jednej karty
        gry. Kopia JSON pozwala przenieść osadę.
      </p>
      <button class="primary" @click="save() && (notice = 'Zapisano osadę.')">
        Zapisz teraz</button
      ><button @click="download">Pobierz zapis JSON</button
      ><label class="file-button"
        >Wczytaj zapis<input
          type="file"
          accept=".json,application/json"
          @change="importFile"
      /></label>
      <details open>
        <summary>Zasady gospodarki</summary>
        <p>
          1 tik = 1 sekunda. Ułamki zasobów są zachowywane. Narzędzia: kamienne
          ×1,5, brązowe ×2, żelazne ×3. Każdy komplet wyposaża jednego
          pracownika. Narzędzia nie zużywają się.
        </p>
        <p>
          Specjaliści dają stałe premie. Populacja rośnie tylko przez
          zaakceptowane wydarzenia. Brak jedzenia lub wody zmniejsza produkcję i
          budowę do 25%; mieszkańcy nie umierają. Pauza zadania nie zwalnia
          ludzi.
        </p>
        <p>
          Offline naliczamy do 8 godzin tym samym silnikiem. Łupy i wydarzenia
          czekają na decyzję. Cena sprzedaży jest niższa od ceny zakupu.
        </p>
      </details>
      <button v-if="!confirmReset" class="danger" @click="confirmReset = true">
        Rozpocznij od nowa
      </button>
      <div v-else>
        <p>Usunąć obecną osadę? Najpierw możesz pobrać zapis.</p>
        <button
          class="danger"
          @click="
            reset();
            selected = 'gatherers';
            discovery = 'stonecraft';
            tab = 'Osada';
            settings = false;
            confirmReset = false;
          "
        >
          Tak, nowa osada</button
        ><button @click="confirmReset = false">Anuluj</button>
      </div>
    </section>
  </div>
</template>
