(() => {
  "use strict";
  const q = new URLSearchParams(location.search);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Splash: K♡T, the heart is the way in. Tap -> tone (2.5 s) -> page, then the ambient track fades in over 5 s.
  const splash = document.getElementById("splash");
  const enter = document.getElementById("enter");
  const tone = document.getElementById("tone");
  const ambient = document.getElementById("ambient");
  const soundBtn = document.getElementById("sound");
  const SPLASH_MS = 2500, FADE_MS = 5000, AMBIENT_VOL = 0.15;
  let muted = false, ambientStarted = false, entered = false;

  const startAmbient = () => {
    if (ambientStarted) return;
    ambientStarted = true;
    ambient.volume = 0; ambient.muted = muted;
    ambient.play().catch(() => { ambientStarted = false; });
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / FADE_MS);
      ambient.volume = AMBIENT_VOL * k;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const closeSplash = () => {
    splash.classList.add("gone");
    setTimeout(() => splash.remove(), 700);
    startAmbient();               // only after the tone has finished: never both at once
  };

  const doEnter = () => {
    if (entered) return;
    entered = true;
    splash.classList.add("is-entering");
    tone.muted = muted;
    tone.currentTime = 0;
    tone.play().catch(() => {});
    if (window.gsap && !reduce) {
      const tl = gsap.timeline();
      tl.to(enter, { scale: 1.45, duration: .16, ease: "power2.out" })
        .to(enter, { scale: 1, duration: .22, ease: "power2.in" })
        .to(enter, { scale: 1.3, duration: .14, ease: "power2.out" })
        .to(enter, { scale: 1, duration: .3, ease: "power2.inOut" })
        .to(".burst", { opacity: 1, scale: 70, duration: 1.7, ease: "power2.in" }, .1)
        .to(".splash-mark span, .splash-name", { opacity: 0, duration: .7 }, .9)
        .to(enter, { opacity: 0, duration: .5 }, 1.7);
    }
    setTimeout(closeSplash, SPLASH_MS);
  };

  enter.addEventListener("click", doEnter);
  if (q.has("ns")) { splash.remove(); }
  else if (q.has("auto")) setTimeout(doEnter, 1200);

  soundBtn.addEventListener("click", () => {
    muted = !muted;
    tone.muted = ambient.muted = muted;
    soundBtn.setAttribute("aria-pressed", String(muted));
    soundBtn.setAttribute("aria-label", muted ? "تشغيل الصوت" : "كتم الصوت");
    if (!muted && entered && !splash.isConnected) startAmbient();
  });

  // Project deck: centred card, side cards visible, swipe left/right, dots.
  const deck = new Swiper("#deck", {
    effect: "coverflow", centeredSlides: true, slidesPerView: "auto", initialSlide: 1, spaceBetween: 0,
    grabCursor: true, noSwipingSelector: "button",
    coverflowEffect: { rotate: 14, stretch: 0, depth: 110, modifier: 1, slideShadows: false },
    pagination: { el: ".swiper-pagination", clickable: true }
  });

  // Project card: details -> device (Android / iPhone) -> app (captain / customer).
  const card = document.querySelector("[data-card]");
  const label = card.querySelector("[data-platform-label]");
  const status = card.querySelector("[data-status]");
  const shine = el => { el.classList.remove("is-shining"); void el.offsetWidth; el.classList.add("is-shining"); setTimeout(() => el.classList.remove("is-shining"), 950); };
  // A quiet shine on the card in front every few seconds.
  if (!reduce) setInterval(() => { const a = document.querySelector(".swiper-slide-active .card"); if (a && !document.hidden) shine(a); }, 7000);
  deck.on("slideChangeTransitionEnd", () => { const a = document.querySelector(".swiper-slide-active .card"); if (a) shine(a); });
  const sparkle = app => {
    const box = app.querySelector(".sparks"); box.innerHTML = "";
    for (let i = 0; i < 14; i++) box.appendChild(document.createElement("i"));
    if (!window.gsap || reduce) return;
    box.querySelectorAll("i").forEach((d, i) => {
      const a = (i / 14) * Math.PI * 2, r = 62 + Math.random() * 26;
      gsap.fromTo(d, { x: 0, y: 0, opacity: 1, scale: 1 }, { x: Math.cos(a) * r, y: Math.sin(a) * r, opacity: 0, scale: .3, duration: .9, ease: "power2.out" });
    });
  };
  const setStage = (stage, platform) => {
    shine(card);
    if (platform) card.dataset.platform = platform;
    card.dataset.stage = stage;
    label.textContent = card.dataset.platform === "ios" ? "iPhone" : "Android";
    deck.update();
  };
  card.querySelector("[data-open]").addEventListener("click", e => { e.stopPropagation(); setStage("1"); });
  card.addEventListener("click", e => { if (card.dataset.stage === "0" && !e.target.closest("button")) setStage("1"); });
  card.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => setStage("2", b.dataset.pick)));
  card.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => setStage(card.dataset.stage === "2" ? "1" : "0")));

  // Progress 1..100 drawn on the app icon itself.
  const show = (app, v) => {
    app.classList.add("is-loading");
    app.style.setProperty("--p", v);
    app.querySelector("[data-num]").textContent = v;
  };
  const timers = new Map();
  card.querySelectorAll(".app").forEach(app => {
    app.querySelector("[data-get]").addEventListener("click", () => {
      if (timers.has(app)) return;
      // PREVIEW ONLY: simulated progress. Real downloads are wired in phase 3.
      let v = 1;
      timers.set(app, setInterval(() => {
        show(app, v);
        if (++v > 100) { clearInterval(timers.get(app)); timers.delete(app); app.classList.replace("is-loading", "is-done"); sparkle(app); shine(card); status.textContent = "اكتمل التنزيل"; }
      }, 40));
      status.textContent = "جارٍ التنزيل…";
    });
    app.querySelector("[data-cancel]").addEventListener("click", () => {
      clearInterval(timers.get(app)); timers.delete(app);
      app.classList.remove("is-loading", "is-done"); app.style.removeProperty("--p");
      status.textContent = "أُلغي التنزيل";
    });
  });

  if (q.get("s")) setStage(q.get("s"), q.get("pf") || "android");
  if (q.get("p")) show(card.querySelector('[data-app="captain"]'), q.get("p"));
})();
