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
      const k = Math.max(0, Math.min(1, (now - t0) / FADE_MS));
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
  if (q.has("ns")) { splash.remove(); entered = true; }
  else if (q.has("auto")) setTimeout(doEnter, 1200);

  soundBtn.addEventListener("click", () => {
    muted = !muted;
    tone.muted = ambient.muted = muted;
    soundBtn.setAttribute("aria-pressed", String(muted));
    soundBtn.setAttribute("aria-label", muted ? "تشغيل الصوت" : "كتم الصوت");
    if (!muted && entered && !splash.isConnected) startAmbient();
  });


  // Interface sounds, made in code, tuned to the ambient track (D major): soft bells with a short echo.
  const Sfx = (() => {
    let ctx = null, out = null;
    const init = () => {
      if (ctx) return ctx.state === "suspended" ? ctx.resume().then(() => ctx) : Promise.resolve(ctx);
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return Promise.resolve(null);
      ctx = new AC();
      out = ctx.createGain(); out.gain.value = 1;
      const echo = ctx.createDelay(); echo.delayTime.value = .19;
      const fb = ctx.createGain(); fb.gain.value = .26;
      const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2600;
      const wet = ctx.createGain(); wet.gain.value = .35;
      out.connect(ctx.destination); out.connect(echo); echo.connect(tone); tone.connect(fb); fb.connect(echo); tone.connect(wet); wet.connect(ctx.destination);
      return Promise.resolve(ctx);
    };
    const bell = (freq, at, gain, len) => {
      [[1, 1], [2.01, .22], [3.02, .06]].forEach(([m, g]) => {
        const o = ctx.createOscillator(), v = ctx.createGain();
        o.type = "sine"; o.frequency.value = freq * m;
        v.gain.setValueAtTime(0, at);
        v.gain.linearRampToValueAtTime(gain * g, at + .008);
        v.gain.exponentialRampToValueAtTime(.0001, at + len / m);
        o.connect(v); v.connect(out); o.start(at); o.stop(at + len + .05);
      });
    };
    const air = (at, gain) => {
      const n = ctx.sampleRate * .4, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = b;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(500, at); bp.frequency.exponentialRampToValueAtTime(2600, at + .32);
      const v = ctx.createGain(); v.gain.setValueAtTime(0, at); v.gain.linearRampToValueAtTime(gain, at + .12); v.gain.exponentialRampToValueAtTime(.0001, at + .4);
      src.connect(bp); bp.connect(v); v.connect(out); src.start(at);
    };
    const play = fn => { if (muted || !entered) return; init().then(c => { if (c) fn(c.currentTime + .01); }); };
    return {
      tap:   () => play(t => bell(1174.66, t, .035, .45)),                     // D6
      back:  () => play(t => bell(880, t, .03, .45)),                         // A5
      swipe: () => play(t => { air(t, .02); bell(1479.98, t + .1, .016, .6); }), // airy + F#6
      done:  () => play(t => [587.33, 739.99, 880, 1174.66].forEach((f, i) => bell(f, t + i * .09, .028, .8)))
    };
  })();

  // Project deck: centred card, side cards visible, swipe left/right, dots.
  const deck = new Swiper("#deck", {
    effect: "coverflow", centeredSlides: true, slidesPerView: "auto", initialSlide: 1, spaceBetween: 0,
    grabCursor: true, noSwipingSelector: "button", speed: 380, threshold: 6, resistanceRatio: .6,
    coverflowEffect: { rotate: 0, stretch: 0, depth: 90, modifier: 1, slideShadows: false },
    pagination: { el: ".swiper-pagination", clickable: true }
  });

  // Project card: details -> device (Android / iPhone) -> app (captain / customer).
  const card = document.querySelector("[data-card]");
  const label = card.querySelector("[data-platform-label]");
  const status = card.querySelector("[data-status]");
  const shine = el => { el.classList.remove("is-shining"); void el.offsetWidth; el.classList.add("is-shining"); setTimeout(() => el.classList.remove("is-shining"), 950); };
  // A quiet shine on the card in front every few seconds.
  if (!reduce) setInterval(() => { const a = document.querySelector(".swiper-slide-active .card"); if (a && !document.hidden) shine(a); }, 7000);
  deck.on("slideChange", () => Sfx.swipe());
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
  const setStage = (stage, platform, quiet) => {
    shine(card);
    if (!quiet) (stage < card.dataset.stage ? Sfx.back : Sfx.tap)();
    if (platform) card.dataset.platform = platform;
    card.dataset.stage = stage;
    label.textContent = card.dataset.platform === "ios" ? "iPhone" : "Android";
    status.textContent = card.dataset.platform === "ios"
      ? "اضغط على التطبيق ليفتح، ثم أضِفه للشاشة الرئيسية من زر المشاركة في Safari"
      : "اضغط على أيقونة التطبيق ليبدأ التنزيل";
    deck.update();
  };
  // The phone decides: Android goes straight to the Android apps (APK), iPhone to the iPhone apps.
  // Only an unknown device (a computer) gets the Android / iPhone choice.
  const myPhone = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios" : /Android/i.test(navigator.userAgent) ? "android" : null;
  const openCard = () => myPhone ? setStage("2", myPhone) : setStage("1");
  card.querySelector("[data-open]").addEventListener("click", e => { e.stopPropagation(); openCard(); });
  card.addEventListener("click", e => { if (card.dataset.stage === "0" && !e.target.closest("button")) openCard(); });
  card.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => setStage("2", b.dataset.pick)));
  card.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => setStage(card.dataset.stage === "2" && !myPhone ? "1" : "0")));

  // Progress 1..100 drawn on the app icon itself.
  const show = (app, v) => {
    app.classList.add("is-loading");
    app.style.setProperty("--p", v);
    app.querySelector("[data-num]").textContent = v;
  };
  // Real downloads. Android: the newest release of this repository (published from Project-one main,
  // rider + captain only). iPhone: the web apps in ./rider/ and ./captain/.
  const REPO = "khubaibalramdan/Designs.github.io-";
  let release = null;
  const latest = () => release || (release = fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } })
    .then(r => r.ok ? r.json() : Promise.reject(new Error("no-release")))
    .catch(e => { release = null; throw e; }));
  const assetFor = (rel, who) => (rel.assets || []).find(x => new RegExp(`^abnaa-${who}-.*\\.apk$`, "i").test(x.name));

  const jobs = new Map();
  const finish = app => { show(app, 100); app.classList.replace("is-loading", "is-done"); sparkle(app); shine(card); Sfx.done(); };
  const reset = app => { app.classList.remove("is-loading", "is-done"); app.style.removeProperty("--p"); };

  const download = async (app, who) => {
    jobs.set(app, { abort() {} });
    Sfx.tap();
    status.textContent = "جارٍ تجهيز التنزيل…";
    let asset;
    try { asset = assetFor(await latest(), who); } catch (e) { asset = null; }
    if (!asset) { jobs.delete(app); reset(app); status.textContent = "ملف التطبيق غير متوفر حالياً، جرّب بعد قليل"; return; }
    // A hidden frame fetches the file (GitHub's file server lets the phone download it, not the page read it),
    // so the page itself never moves to another screen.
    const f = document.createElement("iframe");
    f.hidden = true; f.setAttribute("aria-hidden", "true"); f.src = asset.browser_download_url;
    document.body.appendChild(f); setTimeout(() => f.remove(), 120000);
    // Estimated counter: the phone downloads the file itself, so the page cannot read the real progress.
    // It runs 1 -> 99 over the time the file should take at this phone's connection speed, then the gold check.
    const mbps = (navigator.connection && navigator.connection.downlink) || 12;      // the phone's own estimate
    const bytesPerSec = Math.max(150e3, mbps * 1e6 / 8 * 0.7);
    const total = Math.min(240, Math.max(8, (asset.size || 65e6) / bytesPerSec)) * 1000;
    const t0 = performance.now();
    shine(card); show(app, 1); app.classList.add("phone-dl");
    status.textContent = "جارٍ التنزيل… النسبة تقريبية، والنسبة الدقيقة بإشعار الجوال";
    const tick = () => {
      if (!jobs.has(app)) return;
      const k = Math.min(1, (performance.now() - t0) / total);
      const eased = 1 - Math.pow(1 - k, 1.6);
      show(app, Math.max(1, Math.min(99, Math.round(eased * 99))));
      if (k < 1) { requestAnimationFrame(tick); return; }
      jobs.delete(app); finish(app);
      status.textContent = "خلص التنزيل تقريباً. افتح الملف من الإشعارات لتثبيته";
      setTimeout(() => { reset(app); app.classList.remove("phone-dl"); }, 4000);
    };
    jobs.set(app, { abort() { jobs.delete(app); } });
    requestAnimationFrame(tick);
  };

  card.querySelectorAll(".app").forEach(app => {
    const who = app.dataset.app;
    app.querySelector("[data-get]").addEventListener("click", () => {
      if (jobs.has(app)) return;
      if (card.dataset.platform === "ios") { Sfx.tap(); const w = window.open(`./${who}/`, "_blank", "noopener"); if (!w) location.href = `./${who}/`; return; }
      if (q.has("demo")) { // screenshots and videos only
        let v = 1; const t = setInterval(() => { show(app, v); if (++v > 100) { clearInterval(t); jobs.delete(app); finish(app); status.textContent = "اكتمل التنزيل"; } }, 40);
        jobs.set(app, { abort: () => clearInterval(t) }); Sfx.tap(); status.textContent = "جارٍ التنزيل…"; return;
      }
      download(app, who);
    });
    app.querySelector("[data-cancel]").addEventListener("click", () => {
      const j = jobs.get(app); if (j) j.abort(); jobs.delete(app);
      reset(app); Sfx.back();
      status.textContent = "أُلغي التنزيل";
    });
  });


  // QR: one for the page, one per project. Scanning a project code opens the page straight on its downloads.
  const sheet = document.getElementById("qr-sheet");
  const QR_TEXT = {
    home:  ["الصفحة الرئيسية", "صوّر الرمز لفتح الصفحة"],
    abnaa: ["أبناء الشمال", "صوّر الرمز لفتح تنزيل تطبيقات أبناء الشمال مباشرة"]
  };
  let lastFocus = null;
  const openQR = key => {
    lastFocus = document.activeElement;
    sheet.querySelectorAll("[data-qr-code]").forEach(el => { el.hidden = el.dataset.qrCode !== key; });
    sheet.querySelector("[data-qr-title]").textContent = QR_TEXT[key][0];
    sheet.querySelector("[data-qr-note]").textContent = QR_TEXT[key][1];
    sheet.hidden = false; Sfx.tap();
    sheet.querySelector("[data-qr-close]").focus();
  };
  const closeQR = () => { if (sheet.hidden) return; sheet.hidden = true; Sfx.back(); if (lastFocus) lastFocus.focus(); };
  document.querySelectorAll("[data-qr]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openQR(b.dataset.qr); }));
  sheet.querySelector("[data-qr-close]").addEventListener("click", closeQR);
  sheet.addEventListener("click", e => { if (e.target === sheet) closeQR(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeQR(); });

  // Deep link from a project QR: ?p=abnaa -> centre that card and open its downloads for this phone.
  if (q.get("p") === "abnaa") {
    const ua = navigator.userAgent;
    const pf = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : null;
    deck.slideTo([...deck.slides].findIndex(sl => sl.contains(card)), 0);
    if (pf) setStage("2", pf, true); else setStage("1", null, true);
  }


  // Install the page as an app (PWA). Android Chrome: one tap. iPhone Safari and in-app browsers: short steps.
  const installBtn = document.getElementById("install");
  const instSheet = document.getElementById("install-sheet");
  const ua = navigator.userAgent;
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/i.test(ua);
  let deferred = null;
  const showSteps = steps => {
    instSheet.querySelector("[data-install-steps]").innerHTML = steps.map(t => `<li>${t}</li>`).join("");
    instSheet.hidden = false; Sfx.tap();
  };
  if (!standalone) {
    if (isIOS || inApp) installBtn.hidden = false;
    window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; installBtn.hidden = false; });
  }
  window.addEventListener("appinstalled", () => { installBtn.hidden = true; deferred = null; });
  installBtn.addEventListener("click", async () => {
    if (deferred) { Sfx.tap(); deferred.prompt(); const r = await deferred.userChoice; deferred = null; if (r.outcome === "accepted") installBtn.hidden = true; return; }
    if (inApp) return showSteps(["افتح القائمة <b>⋮</b> أو <b>…</b> فوق", isIOS ? "اختر <b>الفتح في Safari</b>" : "اختر <b>الفتح في Chrome</b>", "اضغط زر <b>تثبيت</b> من جديد"]);
    if (isIOS) return showSteps(["اضغط زر <b>المشاركة</b> ⬆ تحت الشاشة", "اختر <b>إضافة إلى الشاشة الرئيسية</b>", "اضغط <b>إضافة</b>"]);
    showSteps(["افتح قائمة المتصفح <b>⋮</b>", "اختر <b>تثبيت التطبيق</b> أو <b>إضافة إلى الشاشة الرئيسية</b>"]);
  });
  const closeInst = () => { if (!instSheet.hidden) { instSheet.hidden = true; Sfx.back(); } };
  instSheet.querySelector("[data-install-close]").addEventListener("click", closeInst);
  instSheet.addEventListener("click", e => { if (e.target === instSheet) closeInst(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeInst(); });

  if ("serviceWorker" in navigator && window.isSecureContext && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

  // Installed on Android the phone allows sound without a tap: the splash then plays by itself.
  if (standalone && !q.has("ns")) {
    const allowed = navigator.getAutoplayPolicy ? Promise.resolve(navigator.getAutoplayPolicy("mediaelement") === "allowed")
      : (tone.volume = 0, tone.play().then(() => { tone.pause(); tone.currentTime = 0; return true; }, () => false));
    allowed.then(ok => { tone.volume = 1; if (ok) setTimeout(doEnter, 700); });
  }

  if (q.get("s")) setStage(q.get("s"), q.get("pf") || "android", true);
  if (q.get("pct")) show(card.querySelector('[data-app="captain"]'), q.get("pct"));
})();
