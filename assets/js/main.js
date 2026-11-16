(() => {
  "use strict";

  const splash = document.getElementById("splash");
  const app = document.getElementById("app");
  const splashAudio = document.getElementById("splash-audio");
  const ambientAudio = document.getElementById("ambient-audio");
  const soundButton = document.getElementById("sound-trigger");
  const menuButton = document.getElementById("menu-trigger");
  const menu = document.getElementById("side-menu");
  const menuClose = document.getElementById("menu-close");
  const scrim = document.getElementById("menu-scrim");

  const AMBIENT_VOLUME = 0.16;
  let soundEnabled = false;
  let sequenceStarted = false;
  let splashToneFinished = false;
  let ambientPending = false;

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
    if (!ambientAudio || !soundEnabled || !splashToneFinished || ambientPending) return;
    ambientPending = true;
    try {
      ambientAudio.muted = false;
      ambientAudio.volume = AMBIENT_VOLUME;
      await ambientAudio.play();
    } catch {
      soundEnabled = false;
      updateSoundButton();
    } finally {
      ambientPending = false;
    }
  }

  async function startSoundSequence() {
    if (!soundEnabled || sequenceStarted) return;
    sequenceStarted = true;

    if (splashToneFinished) {
      await startAmbient();
      return;
    }

    if (!splashAudio) {
      splashToneFinished = true;
      await startAmbient();
      return;
    }

    splashAudio.muted = false;
    splashAudio.currentTime = 0;
    try {
      await splashAudio.play();
    } catch {
      splashToneFinished = true;
      await startAmbient();
    }
  }

  function stopSound() {
    soundEnabled = false;
    if (splashAudio) {
      splashAudio.pause();
      splashAudio.currentTime = 0;
    }
    if (ambientAudio) {
      ambientAudio.pause();
      ambientAudio.currentTime = 0;
    }
    updateSoundButton();
  }

  function enableSound() {
    if (soundEnabled) return;
    soundEnabled = true;
    updateSoundButton();
    if (sequenceStarted && splashAudio && !splashToneFinished) {
      splashAudio.play().catch(() => {
        splashToneFinished = true;
        startAmbient();
      });
      return;
    }
    if (sequenceStarted && splashToneFinished) {
      startAmbient();
      return;
    }
    startSoundSequence();
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

  if (splashAudio) {
    splashAudio.addEventListener("ended", () => {
      splashToneFinished = true;
      if (soundEnabled) startAmbient();
    });
    splashAudio.addEventListener("error", () => {
      splashToneFinished = true;
      if (soundEnabled) startAmbient();
    });
  }

  window.addEventListener("pagehide", stopSound);
  window.addEventListener("pageshow", () => {
    if (ambientAudio && ambientAudio.paused) {
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
    if (event.target === soundButton || soundEnabled || sequenceStarted) return;
    enableSound();
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