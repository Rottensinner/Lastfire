<script setup lang="ts">
import { ref } from "vue";
import { useGame } from "../useGame";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  close: [];
  resetUi: [];
}>();

const { notice, save, reset, download, restore } = useGame();
const confirmReset = ref(false);

function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0]) restore(input.files[0]);
  input.value = "";
}

function saveNow() {
  if (save()) notice.value = "Zapisano osadę.";
}

function resetGame() {
  reset();
  confirmReset.value = false;
  emit("resetUi");
  emit("close");
}
</script>

<template>
  <div v-if="props.open" class="modal-backdrop" @click.self="emit('close')">
    <section
      class="settings panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div class="panel-heading">
        <h1 id="settings-title">TWOJA OSADA</h1>
        <button aria-label="Zamknij ustawienia" @click="emit('close')">×</button>
      </div>

      <p>
        Gra zapisuje się w tej przeglądarce co 15 sekund. Używaj jednej karty gry. Kopia JSON pozwala przenieść osadę.
      </p>

      <button class="primary" @click="saveNow">Zapisz teraz</button>
      <button @click="download">Pobierz zapis JSON</button>
      <label class="file-button">
        Wczytaj zapis
        <input type="file" accept=".json,application/json" @change="importFile" />
      </label>

      <details open>
        <summary>Zasady gospodarki</summary>
        <p>
          1 tik = 1 sekunda. Ułamki zasobów są zachowywane. Narzędzia: kamienne ×1,5, brązowe ×2, żelazne ×3. Każdy komplet wyposaża jednego pracownika. Narzędzia nie zużywają się.
        </p>
        <p>
          Specjaliści dają stałe premie. Populacja rośnie tylko przez zaakceptowane wydarzenia. Brak jedzenia lub wody zmniejsza produkcję i budowę do 25%; mieszkańcy nie umierają. Pauza zadania nie zwalnia ludzi.
        </p>
        <p>
          Offline naliczamy do 8 godzin tym samym silnikiem. Łupy i wydarzenia czekają na decyzję. Cena sprzedaży jest niższa od ceny zakupu.
        </p>
      </details>

      <button v-if="!confirmReset" class="danger" @click="confirmReset = true">
        Rozpocznij od nowa
      </button>
      <div v-else class="reset-confirm">
        <p>Usunąć obecną osadę? Najpierw możesz pobrać zapis.</p>
        <button class="danger" @click="resetGame">Tak, nowa osada</button>
        <button @click="confirmReset = false">Anuluj</button>
      </div>
    </section>
  </div>
</template>
