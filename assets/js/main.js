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
  let soundEnabled = true;
  let splashStarted = false;
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

  async function attemptAutomaticSound() {
    if (!soundEnabled || splashStarted) return;

    const splashIsVisible = splash && !splash.classList.contains("is-hidden");
    if (!splashIsVisible || !splashAudio) {
      splashToneFinished = true;
      await startAmbient();
      return;
    }

    splashAudio.muted = false;
    splashAudio.currentTime = 0;
    try {
      await splashAudio.play();
      splashStarted = true;
    } catch {
      // Browser autoplay policy blocked playback; retry on the first user gesture.
      splashStarted = false;
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
    splashStarted = false;
    updateSoundButton();
  }

  function enableSound() {
    if (soundEnabled) return;
    soundEnabled = true;
    updateSoundButton();
    if (splashStarted) return;
    if (splashToneFinished) startAmbient();
    else attemptAutomaticSound();
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
      splashStarted = false;
      splashToneFinished = true;
      if (soundEnabled) startAmbient();
    });
    splashAudio.addEventListener("error", () => {
      splashStarted = false;
      splashToneFinished = true;
      if (soundEnabled) startAmbient();
    });
  }

  window.addEventListener("pagehide", stopSound);
  window.addEventListener("pageshow", () => {
    if (ambientAudio && ambientAudio.paused && splashToneFinished) {
      soundEnabled = false;
      updateSoundButton();
    }
  });

  window.setTimeout(() => {
    splash.classList.add("is-hidden");
    app.classList.add("is-ready");
    if (!splashStarted && !splashToneFinished && soundEnabled) {
      splashToneFinished = true;
      startAmbient();
    }
  }, 2250);

  updateSoundButton();

  // Attempt playback immediately. If Chrome blocks autoplay, retry on the first real interaction.
  attemptAutomaticSound();

  const retryAfterGesture = (event) => {
    if (event.target instanceof Element && event.target.closest("#sound-trigger")) return;
    if (!soundEnabled || splashStarted || splashToneFinished) return;
    attemptAutomaticSound();
    document.removeEventListener("pointerdown", retryAfterGesture, true);
    document.removeEventListener("touchend", retryAfterGesture, true);
    document.removeEventListener("click", retryAfterGesture, true);
    document.removeEventListener("keydown", retryAfterGesture, true);
  };

  document.addEventListener("pointerdown", retryAfterGesture, true);
  document.addEventListener("touchend", retryAfterGesture, true);
  document.addEventListener("click", retryAfterGesture, true);
  document.addEventListener("keydown", retryAfterGesture, true);
})();