import { reactive, ref, onMounted, onUnmounted } from "vue";
import {
  freshGame,
  parseSave,
  advance,
  MAX_OFFLINE,
  log,
} from "./progression";
const KEY = "ostatnie-ognisko-v2";
export function useGame() {
  const notice = ref("");
  let initial = freshGame();
  try {
    const raw =
      localStorage.getItem(KEY) ?? localStorage.getItem("ostatnie-ognisko-v1");
    if (raw) {
      initial = parseSave(raw);
      const away = Math.min(
        MAX_OFFLINE,
        Math.max(0, (Date.now() - initial.savedAt) / 1000),
      );
      advance(initial, away);
      if (away > 30)
        notice.value = `Witaj z powrotem. Osada pracowała przez ${Math.floor(away / 60)} min (limit 8 godzin).`;
    }
  } catch {
    notice.value = "Nie udało się odczytać zapisu. Rozpoczęto nową osadę.";
  }
  const game = reactive(initial);
  let last = Date.now();
  let timer: ReturnType<typeof setInterval>;
  let saves = 0;
  function save() {
    try {
      game.savedAt = Date.now();
      localStorage.setItem(KEY, JSON.stringify(game));
      return true;
    } catch {
      notice.value =
        "Nie można zapisać gry w tej przeglądarce. Pobierz zapis w ustawieniach.";
      return false;
    }
  }
  function sync() {
    const now = Date.now();
    advance(game, Math.max(0, (now - last) / 1000));
    last = now;
    if (++saves % 15 === 0) save();
  }
  function hide() {
    sync();
    save();
  }
  onMounted(() => {
    timer = setInterval(sync, 1000);
    window.addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", hide);
  });
  onUnmounted(() => {
    clearInterval(timer);
    save();
    window.removeEventListener("pagehide", hide);
    document.removeEventListener("visibilitychange", hide);
  });
  function reset() {
    Object.assign(game, freshGame());
    last = Date.now();
    save();
    notice.value = "Nowe ognisko zapłonęło.";
  }
  function download() {
    save();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(game, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "ostatnie-ognisko-zapis.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function restore(file: File) {
    try {
      if (file.size > 1000000) throw new Error("Plik jest zbyt duży.");
      const parsed = parseSave(await file.text());
      advance(parsed, Math.max(0, (Date.now() - parsed.savedAt) / 1000));
      Object.assign(game, parsed);
      last = Date.now();
      save();
      notice.value = "Wczytano osadę.";
      log(game, "Wczytano zapis z pliku.");
    } catch {
      notice.value =
        "Nieprawidłowy plik zapisu. Twoja osada pozostała bez zmian.";
    }
  }
  return { game, notice, save, reset, download, restore };
}
