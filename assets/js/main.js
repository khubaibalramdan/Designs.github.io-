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
      soundState = SOUND.AMBIENT;
      updateSoundButton();
      ambientAudio.muted = false;
      ambientAudio.volume = AMBIENT_VOLUME;
      await ambientAudio.play();

      if (requestId !== playRequest || soundState === SOUND.MUTED) {
        ambientAudio.pause();
        return;
      }
    } catch {
      if (requestId === playRequest && soundState !== SOUND.MUTED) {
        soundState = SOUND.BLOCKED;
        updateSoundButton();
      }
    }
  }

  async function startSound(manualRequest = false) {
    if (isAudioActive() || (soundState === SOUND.MUTED && !manualRequest)) return;

    const requestId = ++playRequest;
    pauseAllAudio();

    if (!splashAudio || splashToneFinished) {
      await playAmbient(requestId);
      return;
    }

    try {
      soundState = SOUND.SPLASH;
      updateSoundButton();
      splashAudio.muted = false;
      await splashAudio.play();

      if (requestId !== playRequest || soundState === SOUND.MUTED) {
        splashAudio.pause();
        return;
      }
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
      startSound(true);
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
    if (soundState !== SOUND.MUTED) {
      soundState = SOUND.BLOCKED;
      updateSoundButton();
    }
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


  // The project card morphs in place into its download face.
  const projectCard = document.getElementById("abnaa-project-card");
  const backToProject = projectCard && projectCard.querySelector(".card-back");
  const downloadStatus = document.getElementById("download-status");
  const downloadProgress = document.getElementById("download-progress");
  const progressLabel = document.getElementById("progress-label");
  const progressValue = document.getElementById("progress-value");
  const progressFill = document.getElementById("progress-fill");

  function showProjectDetails() {
    if (!projectCard) return;
    projectCard.classList.remove("is-download-view", "is-transitioning");
    const face = projectCard.querySelector(".project-download-face");
    if (face) face.setAttribute("aria-hidden", "true");
    const details = projectCard.querySelector(".project-details-face");
    if (details) details.setAttribute("aria-hidden", "false");
    projectCard.setAttribute("aria-label", "أبناء الشمال — تفاصيل المشروع");
  }

  function showProjectDownloads() {
    if (!projectCard || projectCard.classList.contains("is-download-view")) return;
    projectCard.classList.add("is-transitioning");
    window.setTimeout(() => {
      projectCard.classList.add("is-download-view");
      projectCard.classList.remove("is-transitioning");
      const details = projectCard.querySelector(".project-details-face");
      const face = projectCard.querySelector(".project-download-face");
      if (details) details.setAttribute("aria-hidden", "true");
      if (face) face.setAttribute("aria-hidden", "false");
      projectCard.setAttribute("aria-label", "تنزيلات أبناء الشمال — Android وiPhone");
    }, 180);
  }

  if (projectCard) {
    projectCard.tabIndex = 0;
    projectCard.setAttribute("role", "button");
    projectCard.setAttribute("aria-label", "فتح بطاقة تنزيلات أبناء الشمال");
    projectCard.addEventListener("click", (event) => {
      if (event.target.closest(".card-back, .app-download")) return;
      if (!projectCard.classList.contains("is-download-view")) showProjectDownloads();
    });
    projectCard.addEventListener("keydown", (event) => {
      if (event.target !== projectCard) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showProjectDownloads();
      }
    });
  }

  if (backToProject) backToProject.addEventListener("click", (event) => {
    event.stopPropagation();
    showProjectDetails();
  });

  if (projectCard) {
    projectCard.addEventListener("click", (event) => {
      const button = event.target.closest(".app-download");
      if (!button) return;
      const url = button.dataset.url;
      if (!url) {
        if (downloadStatus) downloadStatus.textContent = "ملف هذا التطبيق لم يُربط بعد. لن يبدأ تنزيل غير متاح.";
        return;
      }
      startRealDownload(url, button.dataset.app);
    });
  }

  async function startRealDownload(url, appName) {
    if (!downloadProgress || !progressFill || !progressValue || !progressLabel) return;
    downloadProgress.hidden = false;
    downloadStatus.textContent = "جارٍ الاتصال بملف التطبيق…";
    progressLabel.textContent = "جارٍ التنزيل";
    progressValue.textContent = "1%";
    progressFill.style.width = "1%";
    try {
      const response = await fetch(url);
      if (!response.ok || !response.body) throw new Error("download-unavailable");
      const total = Number(response.headers.get("content-length")) || 0;
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        const percent = total > 0 ? Math.min(99, Math.max(1, Math.floor(received / total * 100))) : 1;
        progressValue.textContent = percent + "%";
        progressFill.style.width = percent + "%";
      }
      const blob = new Blob(chunks);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = appName + (url.toLowerCase().includes(".apk") ? ".apk" : ".bin");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      progressValue.textContent = "100%";
      progressFill.style.width = "100%";
      progressLabel.textContent = "اكتمل التنزيل";
      downloadStatus.textContent = "اكتمل تجهيز ملف التنزيل.";
    } catch {
      downloadStatus.textContent = "تعذر تنزيل الملف. تحقق من رابط الملف وإتاحته.";
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && projectCard && projectCard.classList.contains("is-download-view")) showProjectDetails();
  });
})();
