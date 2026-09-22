<script setup lang="ts">
import { computed, ref } from "vue";
import { expeditions } from "../data";
import {
  canPay,
  collectLoot,
  freeWorkers,
  has,
  startExpedition,
} from "../engine";
import { useGame } from "../useGame";
import CostList from "../components/CostList.vue";
import PixelIcon from "../components/PixelIcon.vue";

const { game, notice } = useGame();
const pack = ref(false);
const tools = ref(false);
const routes = computed(() => expeditions.filter((expedition) => has(game, expedition.requires)));

function clock(value: number) {
  const seconds = Math.max(0, Math.ceil(value));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function send(id: string) {
  if (!startExpedition(game, id, pack.value, tools.value)) {
    notice.value = "Brakuje obozu, wolnych ludzi, zapasów lub wybranego wyposażenia.";
  }
}
</script>

<template>
  <div class="expeditions-view">
    <p v-if="!has(game, 'scouting')" class="empty-state">
      Odkryj zwiad w Atlasie Odkryć i zbuduj obóz zwiadowców.
    </p>

    <template v-else>
      <div class="gear-options">
        <label><input v-model="pack" type="checkbox" /> Plecak (+25% łupów)</label>
        <label><input v-model="tools" type="checkbox" /> Kamienne narzędzia (+15% łupów)</label>
        <p>Wyposażenie jest zabierane z magazynu i wraca po wyprawie.</p>
      </div>

      <section v-if="Object.keys(game.loot).length" class="task-card loot">
        <h2>Łupy i zwrócone materiały</h2>
        <CostList :cost="game.loot" />
        <button class="primary" @click="collectLoot(game)">
          Odbierz tyle, ile zmieści magazyn
        </button>
        <p>Nadwyżki pozostają tutaj bez limitu czasu.</p>
      </section>

      <article v-for="expedition in routes" :key="expedition.id" class="task-card">
        <div class="task-heading">
          <PixelIcon name="tent" :size="40" />
          <div>
            <h2>{{ expedition.name }}</h2>
            <span class="muted">{{ expedition.workers }} zwiadowców · bazowo {{ clock(expedition.duration) }}</span>
          </div>
        </div>

        <p>{{ expedition.description }}</p>
        <h3>Zapasy zużywane przy wyjściu</h3>
        <CostList :cost="expedition.cost" :stock="game.resources" />

        <template v-if="expedition.gear">
          <h3>Wymagane wyposażenie (wraca)</h3>
          <CostList :cost="expedition.gear" :stock="game.resources" />
        </template>

        <h3>Gwarantowane łupy przed premiami</h3>
        <CostList :cost="expedition.reward" />

        <template v-if="game.expedition?.id === expedition.id">
          <progress
            :value="game.expedition.duration - game.expedition.remaining"
            :max="game.expedition.duration"
          />
          <p class="positive">Powrót za {{ clock(game.expedition.remaining) }}</p>
        </template>

        <button
          v-else
          class="primary"
          :disabled="
            !!game.expedition ||
            !game.buildings.camp.level ||
            freeWorkers(game) < expedition.workers ||
            !canPay(game, expedition.cost)
          "
          @click="send(expedition.id)"
        >
          Wyślij zwiadowców
        </button>
      </article>
    </template>
  </div>
</template>
