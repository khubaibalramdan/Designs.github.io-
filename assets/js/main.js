(() => {
  "use strict";

  const splash = document.getElementById("splash");
  const app = document.getElementById("app");
  const audio = document.getElementById("ambient-audio");
  const soundButton = document.getElementById("sound-trigger");
  const menuButton = document.getElementById("menu-trigger");
  const menu = document.getElementById("side-menu");
  const menuClose = document.getElementById("menu-close");
  const scrim = document.getElementById("menu-scrim");

  let soundEnabled = false;
  let playPending = false;
  let fadeTimer = null;
  let fadeScheduled = false;
  const splashStartedAt = performance.now();
  const splashDuration = 2250;

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

  function fadeToTwentyPercent() {
    if (!audio || !soundEnabled) return;
    const startedAt = performance.now();
    const startVolume = audio.volume;
    const duration = 2000;
    if (fadeTimer) cancelAnimationFrame(fadeTimer);

    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      audio.volume = Math.max(0.2, startVolume + (0.2 - startVolume) * progress);
      if (progress < 1) fadeTimer = requestAnimationFrame(step);
    };
    fadeTimer = requestAnimationFrame(step);
  }

  function scheduleSplashFade(playStartedAt) {
    if (fadeScheduled) return;
    fadeScheduled = true;
    const remaining = Math.max(0, splashDuration - (playStartedAt - splashStartedAt));
    window.setTimeout(fadeToTwentyPercent, remaining);
  }

  async function startSound() {
    if (!audio || soundEnabled || playPending) return;
    playPending = true;
    try {
      audio.muted = false;
      audio.volume = 1;
      await audio.play();
      soundEnabled = true;
      updateSoundButton();
      scheduleSplashFade(performance.now());
    } catch {
      soundEnabled = false;
      updateSoundButton();
    } finally {
      playPending = false;
    }
  }
  function stopSound() {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    soundEnabled = false;
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
    else startSound();
  });

  window.addEventListener("pagehide", stopSound);
  window.addEventListener("pageshow", () => {
    if (audio && audio.paused) {
      soundEnabled = false;
      updateSoundButton();
    }
  });

  window.setTimeout(() => {
    splash.classList.add("is-hidden");
    app.classList.add("is-ready");
  }, 2250);

  updateSoundButton();

  // Attempt autoplay; browsers may block it until a trusted user gesture.
  startSound();

  // Capture the first real interaction anywhere on the page, including the splash.
  const startOnFirstInteraction = async () => {
    if (!soundEnabled) await startSound();
    if (soundEnabled) {
      document.removeEventListener("pointerdown", startOnFirstInteraction, true);
      document.removeEventListener("touchend", startOnFirstInteraction, true);
      document.removeEventListener("click", startOnFirstInteraction, true);
      document.removeEventListener("keydown", startOnFirstInteraction, true);
    }
  };
  document.addEventListener("pointerdown", startOnFirstInteraction, true);
  document.addEventListener("touchend", startOnFirstInteraction, true);
  document.addEventListener("click", startOnFirstInteraction, true);
  document.addEventListener("keydown", startOnFirstInteraction, true);
})();
