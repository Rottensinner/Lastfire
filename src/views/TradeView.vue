<script setup lang="ts">
import { marketGoods, orders, resources, resourceName } from "../data";
import {
  buyPrice,
  canPay,
  capacity,
  fulfillOrder,
  has,
  trade,
} from "../engine";
import { useGame } from "../useGame";
import CostList from "../components/CostList.vue";
import PixelIcon from "../components/PixelIcon.vue";

const { game, notice } = useGame();

const format = (value: number) =>
  new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value);

function clock(value: number) {
  const seconds = Math.max(0, Math.ceil(value));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function act(ok: boolean) {
  if (!ok) notice.value = "Nie można teraz wykonać tej transakcji.";
}
</script>

<template>
  <div class="trade-view">
    <p v-if="!has(game, 'trade')" class="empty-state">
      Odkryj handel. Pierwsze monety i nasiona przyniosą wyprawy.
    </p>

    <template v-else>
      <div class="market-summary">
        <span>Złoto <b>{{ format(game.resources.gold) }}</b></span>
        <span>Reputacja <b>{{ game.reputation }}</b></span>
        <span>Dostawa {{ clock(game.marketTimer) }}</span>
      </div>

      <p class="intro">
        Handel po 5 sztuk. Oferty i zamówienia odnawiają się co 300 tików.
        {{ has(game, "merchant") ? "Zaufany kupiec: −15% cen zakupu." : "" }}
      </p>

      <div
        v-for="item in marketGoods.filter((market) => has(game, market.unlock))"
        :key="item.id"
        class="market-row"
      >
        <PixelIcon :name="resources.find((resource) => resource.id === item.id)!.icon" />
        <div>
          <strong>{{ resourceName(item.id) }}</strong>
          <small>Zapas kupca: {{ game.market[item.id] }}</small>
        </div>
        <button
          :disabled="
            game.resources.gold < buyPrice(game, item.id) * 5 ||
            game.market[item.id] < 5 ||
            game.resources[item.id] + 5 > capacity(game)
          "
          @click="act(trade(game, item.id, 'buy', 5))"
        >
          Kup 5<br /><small>{{ format(buyPrice(game, item.id) * 5) }} złota</small>
        </button>
        <button
          :disabled="game.resources[item.id] < 5"
          @click="act(trade(game, item.id, 'sell', 5))"
        >
          Sprzedaj 5<br /><small>{{ format(item.sell * 5) }} złota</small>
        </button>
      </div>

      <h2 class="section-title orders-title">Zamówienia kupieckie</h2>
      <article
        v-for="order in orders.filter((item) => has(game, item.requires))"
        :key="order.id"
        class="task-card"
      >
        <h2>{{ order.name }}</h2>
        <CostList :cost="order.cost" :stock="game.resources" />
        <p class="positive">{{ order.gold }} złota · +1 reputacji</p>
        <button
          class="primary"
          :disabled="game.orders.includes(order.id) || !canPay(game, order.cost)"
          @click="act(fulfillOrder(game, order.id))"
        >
          {{ game.orders.includes(order.id) ? "Wykonano do następnej dostawy" : "Dostarcz towary" }}
        </button>
      </article>
    </template>
  </div>
</template>
