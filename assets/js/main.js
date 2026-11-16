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
  const SOUND = Object.freeze({
    STARTING: "starting",
    SPLASH: "splash",
    AMBIENT: "ambient",
    BLOCKED: "blocked",
    MUTED: "muted"
  });

  let soundState = SOUND.STARTING;
  let splashToneFinished = false;
  let playRequest = 0;

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

  function isAudioActive() {
    return soundState === SOUND.SPLASH || soundState === SOUND.AMBIENT;
  }

  function updateSoundButton() {
    soundButton.classList.toggle("is-muted", !isAudioActive());
    soundButton.setAttribute("aria-pressed", String(isAudioActive()));
    soundButton.setAttribute("aria-label", isAudioActive() ? "كتم الصوت" : "تشغيل الصوت");
  }

  function pauseAllAudio() {
    if (splashAudio) {
      splashAudio.pause();
      splashAudio.currentTime = 0;
    }
    if (ambientAudio) {
      ambientAudio.pause();
      ambientAudio.currentTime = 0;
    }
  }

  async function playAmbient(requestId) {
    if (requestId !== playRequest || soundState === SOUND.MUTED) return;
    splashToneFinished = true;

    if (!ambientAudio) {
      soundState = SOUND.BLOCKED;
      updateSoundButton();
      return;
    }

    try {
      ambientAudio.muted = false;
      ambientAudio.volume = AMBIENT_VOLUME;
      await ambientAudio.play();

      if (requestId !== playRequest || soundState === SOUND.MUTED) {
        ambientAudio.pause();
        return;
      }

      soundState = SOUND.AMBIENT;
      updateSoundButton();
    } catch {
      if (requestId === playRequest && soundState !== SOUND.MUTED) {
        soundState = SOUND.BLOCKED;
        updateSoundButton();
      }
    }
  }

  async function startSound() {
    if (isAudioActive() || soundState === SOUND.MUTED) return;

    const requestId = ++playRequest;
    pauseAllAudio();

    const splashVisible = splash && !splash.classList.contains("is-hidden");
    if (!splashVisible || !splashAudio || splashToneFinished) {
      await playAmbient(requestId);
      return;
    }

    try {
      splashAudio.muted = false;
      await splashAudio.play();

      if (requestId !== playRequest || soundState === SOUND.MUTED) {
        splashAudio.pause();
        return;
      }

      soundState = SOUND.SPLASH;
      updateSoundButton();
    } catch {
      if (requestId === playRequest && soundState !== SOUND.MUTED) {
        soundState = SOUND.BLOCKED;
        updateSoundButton();
      }
    }
  }

  function muteSound() {
    ++playRequest;
    soundState = SOUND.MUTED;
    pauseAllAudio();
    updateSoundButton();
  }

  function toggleSound() {
    if (isAudioActive()) {
      muteSound();
      return;
    }

    if (soundState === SOUND.MUTED || soundState === SOUND.BLOCKED) {
      soundState = SOUND.BLOCKED;
      startSound();
    }
  }

  function retryBlockedPlayback(event) {
    if (event.target instanceof Element && event.target.closest("#sound-trigger")) return;
    if (soundState !== SOUND.BLOCKED) return;
    startSound();
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

  soundButton.addEventListener("click", toggleSound);

  if (splashAudio) {
    splashAudio.addEventListener("ended", () => {
      if (soundState !== SOUND.SPLASH) return;
      const requestId = playRequest;
      splashToneFinished = true;
      playAmbient(requestId);
    });

    splashAudio.addEventListener("error", () => {
      if (soundState !== SOUND.SPLASH && soundState !== SOUND.STARTING && soundState !== SOUND.BLOCKED) return;
      if (soundState === SOUND.MUTED) return;
      const requestId = playRequest;
      playAmbient(requestId);
    });
  }

  window.addEventListener("pagehide", () => {
    ++playRequest;
    pauseAllAudio();
  });

  window.setTimeout(() => {
    splash.classList.add("is-hidden");
    app.classList.add("is-ready");
  }, 2250);

  updateSoundButton();

  // One automatic attempt per page load. If blocked, retry on genuine user interaction.
  startSound();
  document.addEventListener("pointerdown", retryBlockedPlayback, true);
  document.addEventListener("keydown", retryBlockedPlayback, true);
})();