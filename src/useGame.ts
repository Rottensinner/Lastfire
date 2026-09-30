import { reactive, ref, onMounted, onUnmounted, type Ref } from "vue";
import {
  freshGame,
  parseSave,
  advance,
  log,
  type CivicGameState,
} from "./civic";
import { MAX_OFFLINE } from "./progression";

const KEY = "ostatnie-ognisko-v2";

type GameController = {
  game: CivicGameState;
  notice: Ref<string>;
  save: () => boolean;
  reset: () => void;
  download: () => void;
  restore: (file: File) => Promise<void>;
  recoveryAvailable: Ref<boolean>;
  saveBlocked: Ref<boolean>;
  downloadRecovery: () => void;
};

let shared: GameController | null = null;

export function useGame(): GameController {
  if (shared) return shared;

  const notice = ref("");
  let initial = freshGame();
  let raw: string | null = null;
  const recoveryAvailable = ref(false);
  const saveBlocked = ref(false);
  try {
    raw =
      localStorage.getItem(KEY) ?? localStorage.getItem("ostatnie-ognisko-v1");
    if (raw !== null) {
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
    initial = freshGame();
    recoveryAvailable.value = raw !== null;
    saveBlocked.value = true;
    if (raw !== null) {
      try { localStorage.setItem(`${KEY}-recovery`, raw); } catch { /* Oryginał pozostaje pod dotychczasowym kluczem. */ }
    }
    notice.value = "Nie udało się odczytać zapisu. Automatyczny zapis jest wstrzymany. Pobierz oryginał w ustawieniach, a następnie wczytaj zapis lub rozpocznij od nowa.";
  }

  const game = reactive(initial) as CivicGameState;
  let last = Date.now();
  let timer: ReturnType<typeof setInterval>;
  let saves = 0;

  function save() {
    if (saveBlocked.value) return false;
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
    recoveryAvailable.value = false;
    saveBlocked.value = false;
    Object.assign(game, freshGame());
    last = Date.now();
    save();
    notice.value = "Nowe ognisko zapłonęło.";
  }

  function downloadText(text: string, filename: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function download() {
    save();
    downloadText(JSON.stringify(game, null, 2), "ostatnie-ognisko-zapis.json");
  }

  function downloadRecovery() {
    if (raw !== null) downloadText(raw, "ostatnie-ognisko-zapis-do-odzyskania.json");
  }

  async function restore(file: File) {
    try {
      if (file.size > 1000000) throw new Error("Plik jest zbyt duży.");
      const parsed = parseSave(await file.text());
      advance(parsed, Math.max(0, (Date.now() - parsed.savedAt) / 1000));
      recoveryAvailable.value = false;
      saveBlocked.value = false;
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

  shared = { game, notice, save, reset, download, restore, recoveryAvailable, saveBlocked, downloadRecovery };
  return shared;
}

