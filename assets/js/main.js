(() => {
  "use strict";

  const splash = document.getElementById("splash");
  const app = document.getElementById("app");
  const splashAudio = document.getElementById("splash-audio");
  const audio = document.getElementById("ambient-audio");
  const soundButton = document.getElementById("sound-trigger");
  const menuButton = document.getElementById("menu-trigger");
  const menu = document.getElementById("side-menu");
  const menuClose = document.getElementById("menu-close");
  const scrim = document.getElementById("menu-scrim");

  const AMBIENT_VOLUME = 0.16;
  let soundEnabled = false;
  let playPending = false;
  let splashSequenceStarted = false;

  function closeMenu() {
    menu.classList.remove("is-open");
    menu.hidden = true;
    menu.setAttribute("aria-hidden", "true");
    menuButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    scrim.hidden = true;
  }

  function openMenu() {
    menu.hidden = false;
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    menuButton.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    scrim.hidden = false;
    menuClose.focus();
  }

  function updateSoundButton() {
    soundButton.classList.toggle("is-muted", !soundEnabled);
    soundButton.setAttribute("aria-pressed", String(soundEnabled));
    soundButton.setAttribute("aria-label", soundEnabled ? "كتم الصوت" : "تشغيل الصوت");
  }

  async function startAmbient() {
    if (!audio || !soundEnabled || playPending) return;
    playPending = true;
    try {
      audio.muted = false;
      audio.volume = AMBIENT_VOLUME;
      await audio.play();
    } catch {
      soundEnabled = false;
      updateSoundButton();
    } finally {
      playPending = false;
    }
  }

  async function startInitialAudio() {
    if (splashSequenceStarted || !audio || !soundEnabled) return;
    splashSequenceStarted = true;

    const splashIsVisible = splash && !splash.classList.contains("is-hidden");
    if (splashIsVisible && splashAudio) {
      try {
        splashAudio.currentTime = 0;
        splashAudio.muted = false;
        await splashAudio.play();
        splashAudio.addEventListener("ended", () => {
          if (soundEnabled) startAmbient();
        }, { once: true });
        return;
      } catch {
        // If the short intro tone cannot play, continue with the ambient track.
      }
    }

    await startAmbient();
  }

  function enableSound() {
    if (soundEnabled) return;
    soundEnabled = true;
    updateSoundButton();
    if (splashSequenceStarted) startAmbient();
    else startInitialAudio();
  }

  function stopSound() {
    soundEnabled = false;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (splashAudio) {
      splashAudio.pause();
      splashAudio.currentTime = 0;
    }
    updateSoundButton();
  }

  menuButton.addEventListener("click", () => {
    if (menu.classList.contains("is-open")) closeMenu();
    else openMenu();
  });
  menuClose.addEventListener("click", closeMenu);
  scrim.addEventListener("click", closeMenu);
  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("is-open")) {
      closeMenu();
      menuButton.focus();
    }
  });

  soundButton.addEventListener("click", () => {
    if (soundEnabled) stopSound();
    else enableSound();
  });

  window.addEventListener("pagehide", stopSound);
  window.addEventListener("pageshow", () => {
    if (audio && audio.paused && soundEnabled) {
      soundEnabled = false;
      updateSoundButton();
    }
  });

  window.setTimeout(() => {
    splash.classList.add("is-hidden");
    app.classList.add("is-ready");
  }, 2250);

  updateSoundButton();

  const startOnFirstInteraction = (event) => {
    if (event.target instanceof Element && event.target.closest("#sound-trigger")) return;
    if (!splashSequenceStarted && !soundEnabled) {
      soundEnabled = true;
      updateSoundButton();
      startInitialAudio();
    }
    document.removeEventListener("pointerdown", startOnFirstInteraction, true);
    document.removeEventListener("touchend", startOnFirstInteraction, true);
    document.removeEventListener("click", startOnFirstInteraction, true);
    document.removeEventListener("keydown", startOnFirstInteraction, true);
  };

  document.addEventListener("pointerdown", startOnFirstInteraction, true);
  document.addEventListener("touchend", startOnFirstInteraction, true);
  document.addEventListener("click", startOnFirstInteraction, true);
  document.addEventListener("keydown", startOnFirstInteraction, true);
})();