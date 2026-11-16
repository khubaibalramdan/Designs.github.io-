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
  let fadeTimer = null;

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
    if (!audio) return;
    const startedAt = performance.now();
    const startVolume = audio.volume;
    const duration = 2000;
    if (fadeTimer) cancelAnimationFrame(fadeTimer);

    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      audio.volume = Math.max(0, startVolume + (0.2 - startVolume) * progress);
      if (progress < 1) fadeTimer = requestAnimationFrame(step);
    };
    fadeTimer = requestAnimationFrame(step);
  }

  let fadeStarted = false;

  async function startSound() {
    if (!audio) return;
    try {
      audio.volume = 1;
      await audio.play();
      soundEnabled = true;
      updateSoundButton();
      if (!fadeStarted) {
        fadeStarted = true;
        const remaining = Math.max(0, 2250 - performance.now());
        window.setTimeout(fadeToTwentyPercent, remaining);
      }
    } catch {
      soundEnabled = false;
      updateSoundButton();
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

  // Attempt autoplay with the splash; browsers may require a user gesture.
  startSound();

  // If autoplay is blocked, the first tap anywhere on the splash starts audio.
  splash.addEventListener("pointerdown", () => {
    if (!soundEnabled) startSound();
  }, { once: true });
  window.setTimeout(() => {
    if (soundEnabled && !fadeStarted) {
      fadeStarted = true;
      fadeToTwentyPercent();
    }
  }, 2250);
})();
