<script setup lang="ts">
import { events, researches } from "../data";
import { canAcceptEvent, housing, resolveEvent } from "../engine";
import { useGame } from "../useGame";
import CostList from "../components/CostList.vue";
import PixelIcon from "../components/PixelIcon.vue";

const { game, notice } = useGame();

function act(ok: boolean) {
  if (!ok) notice.value = "Przygotuj miejsce lub wymagane zapasy.";
}
</script>

<template>
  <div class="events-view">
    <p class="intro">
      Przybysze i spotkania. Specjaliści przekazują stałe premie osadzie; nie zajmują stanowisk.
    </p>

    <p v-if="!game.events.length" class="empty-state">
      Przy ognisku jest spokojnie. Pierwsi wędrowcy pojawią się po 45 tikach, następni po 300 tikach od ostatniej decyzji.
    </p>

    <article
      v-for="event in events.filter((item) => game.events.includes(item.id))"
      :key="event.id"
      class="task-card"
    >
      <div class="task-heading">
        <PixelIcon
          :name="event.discovery ? researches.find((research) => research.id === event.discovery)?.icon || 'person' : 'person'"
          :size="40"
        />
        <h2>{{ event.name }}</h2>
      </div>

      <p>{{ event.description }}</p>
      <p v-if="event.people" class="positive">
        +{{ event.people }} mieszkańców · wolne miejsca: {{ housing(game) - game.population }}
      </p>
      <p v-if="event.discovery" class="positive">
        {{ researches.find((research) => research.id === event.discovery)?.description }}
      </p>

      <CostList :cost="event.cost" :stock="game.resources" />

      <div class="event-actions">
        <button
          class="primary"
          :disabled="!canAcceptEvent(game, event.id)"
          @click="act(resolveEvent(game, event.id, true))"
        >
          {{ event.people ? "Przyjmij mieszkańców" : "Skorzystaj" }}
        </button>
        <button v-if="event.id === 'visitors'" @click="resolveEvent(game, event.id, false)">
          Odmów
        </button>
      </div>

      <p v-if="!canAcceptEvent(game, event.id)" class="muted">
        Przygotuj miejsce lub wymagane zapasy. Wydarzenie poczeka.
      </p>
    </article>
  </div>
</template>
