(() => {
  "use strict";
  const q = new URLSearchParams(location.search);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Splash: K♡T opens by itself: soft tone (1.5 s, low, faded out) -> page, then the ambient track fades in.
  // Browsers allow sound only after a touch, so in a plain browser tab the splash may run silent.
  const splash = document.getElementById("splash");
  const enter = document.getElementById("enter");
  const tone = document.getElementById("tone");
  const ambient = document.getElementById("ambient");
  const soundBtn = document.getElementById("sound");
  const SPLASH_MS = 1500, FADE_MS = 4000, AMBIENT_VOL = 0.12, TONE_VOL = 0.18;
  let muted = false, ambientStarted = false, entered = false;

  const startAmbient = () => {
    if (ambientStarted) return;
    ambientStarted = true;
    ambient.preload = "auto";
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

  // The tone fades to silence by the end of the splash, so it never plays over the ambient track.
  const fadeTone = () => {
    const v0 = tone.volume, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 350);
      tone.volume = v0 * (1 - k);
      if (k < 1) requestAnimationFrame(step); else tone.pause();
    };
    requestAnimationFrame(step);
  };

  const closeSplash = () => {
    fadeTone();
    splash.classList.add("gone");
    setTimeout(() => splash.remove(), 500);
    setTimeout(startAmbient, 400);
  };

  const doEnter = () => {
    if (entered) return;
    entered = true;
    splash.classList.add("is-entering");
    tone.muted = muted;
    tone.volume = TONE_VOL;
    tone.currentTime = 0;
    tone.play().catch(() => {});
    setTimeout(closeSplash, SPLASH_MS);
  };

  enter.addEventListener("click", doEnter);
  if (q.has("ns")) { splash.remove(); entered = true; }
  else doEnter();
  // Without a touch the browser may refuse the ambient track: start it on the first touch instead.
  document.addEventListener("pointerdown", () => { if (entered && !muted && !splash.isConnected) startAmbient(); }, { once: true, capture: true });

  soundBtn.addEventListener("click", () => {
    muted = !muted;
    tone.muted = ambient.muted = muted;
    soundBtn.setAttribute("aria-pressed", String(muted));
    soundBtn.setAttribute("aria-label", muted ? "تشغيل الصوت" : "كتم الصوت");
    soundBtn.querySelector("[data-sound-label]").textContent = muted ? "مكتوم" : "الصوت";
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
    effect: "coverflow", centeredSlides: true, slidesPerView: "auto", initialSlide: 0, spaceBetween: 0,
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
  const sparkle = el => {
    const box = el.querySelector(".sparks"); if (!box) return; box.innerHTML = "";
    if (reduce) return;
    for (let i = 0; i < 14; i++) {
      const d = document.createElement("i"), a = (i / 14) * Math.PI * 2, r = 62 + Math.random() * 26;
      d.style.setProperty("--x", `${Math.cos(a) * r}px`); d.style.setProperty("--y", `${Math.sin(a) * r}px`);
      box.appendChild(d);
    }
    setTimeout(() => { box.innerHTML = ""; }, 1000);
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

  // ---- Downloads: real progress 0 -> 100 inside the page ----
  // The APK files sit in Cloudflare R2 (copied there from this repo's GitHub Releases by .github/workflows/sync-r2.yml).
  // latest.json lists the newest file of each app: { "captain": { "file": "...apk", "size": 123 }, ... }.
  // The page reads the file itself, so the ring shows the real progress; when it is done the
  // «تثبيت / تحديث» button saves it and the phone opens its installer.
  const R2 = "https://pub-REPLACE_ME.r2.dev";
  const R2_READY = !/REPLACE_ME/.test(R2);
  const REPO = "khubaibalramdan/Designs.github.io-";
  let manifest = null;
  const getManifest = () => manifest || (manifest = fetch(`${R2}/latest.json?t=${Date.now()}`, { cache: "no-store" })
    .then(r => r.ok ? r.json() : Promise.reject(new Error("no-manifest")))
    .catch(e => { manifest = null; throw e; }));

  // Old route, kept only as a safety net if R2 cannot be reached: the phone downloads from GitHub Releases itself.
  const gh = path => fetch(`https://api.github.com/repos/${REPO}/releases/${path}`, { headers: { Accept: "application/vnd.github+json" } }).then(r => r.ok ? r.json() : null);
  const ver = x => { const m = /(\d+)\.apk$/i.exec(x.name); return m ? +m[1] : -1; };
  const LEGACY = {
    captain: () => gh("latest").then(r => r && (r.assets || []).find(x => /^abnaa-captain-.*\.apk$/i.test(x.name))),
    rider:   () => gh("latest").then(r => r && (r.assets || []).find(x => /^abnaa-rider-.*\.apk$/i.test(x.name))),
    mytouch: () => gh("tags/my-touch").then(r => r && (r.assets || []).filter(x => /^my-touch-.*\.apk$/i.test(x.name)).sort((p, q) => ver(q) - ver(p))[0]),
    rafeeq:  () => gh("tags/rafeeq").then(r => r && (r.assets || []).find(x => /^rafeeq-darb-.*\.apk$/i.test(x.name)))
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const jobs = new Map();   // element -> { ctrl, url, name }
  const parts = el => ({
    num: el.querySelector("[data-num]"),
    inst: el.querySelector("[data-install]"),
    label: el.querySelector("[data-get-label]"),
    status: el.matches(".app") ? status : el.querySelector("[data-dl-status]")
  });
  const btnSvg = el => el.querySelector(".gold-btn[data-get] svg");
  const DL_ICON = (document.querySelector(".gold-btn[data-get] svg") || {}).outerHTML || "";
  const BOX_ICON = (document.querySelector("[data-install] svg") || {}).outerHTML || "";
  const swapIcon = (el, html) => { const sv = btnSvg(el); if (sv && html) sv.outerHTML = html; };
  const say = (el, t) => { const st = parts(el).status; if (st) st.textContent = t; };
  const setPct = (el, v) => { el.style.setProperty("--p", v); parts(el).num.textContent = v; };
  const clear = el => {
    const j = jobs.get(el); if (j && j.url) URL.revokeObjectURL(j.url);
    jobs.delete(el);
    el.classList.remove("is-loading", "is-done"); el.style.removeProperty("--p");
    const p = parts(el); if (p.inst) p.inst.hidden = true; if (p.label) { p.label.textContent = "تنزيل التطبيق"; swapIcon(el, DL_ICON); }
  };
  const done = (el, url, name) => {
    jobs.set(el, { url, name });
    setPct(el, 100);
    el.classList.replace("is-loading", "is-done");
    const p = parts(el);
    if (p.inst) p.inst.hidden = false;
    if (p.label) { p.label.textContent = "تثبيت / تحديث"; swapIcon(el, BOX_ICON); }
    sparkle(el); shine(el.closest(".card")); Sfx.done();
    say(el, "اكتمل التنزيل. اضغط «تثبيت / تحديث»");
  };
  const install = el => {
    const j = jobs.get(el); if (!j || !j.url) return;
    Sfx.tap();
    const a = document.createElement("a");
    a.href = j.url; a.download = j.name; document.body.appendChild(a); a.click(); a.remove();
    say(el, "اضغط «فتح» بإشعار الجوال لتثبيت التطبيق");
  };
  const legacy = async (el, key) => {
    const asset = await LEGACY[key]().catch(() => null);
    clear(el);
    if (!asset) { say(el, "ملف التطبيق غير متوفر حالياً، جرّب بعد قليل"); return; }
    const f = document.createElement("iframe");
    f.hidden = true; f.setAttribute("aria-hidden", "true"); f.src = asset.browser_download_url;
    document.body.appendChild(f); setTimeout(() => f.remove(), 120000);
    say(el, "بدأ التنزيل بإشعار الجوال. افتح الملف منه لتثبيته");
  };

  const download = async el => {
    const key = el.dataset.dl;
    const ctrl = new AbortController();
    jobs.set(el, { ctrl });
    el.classList.remove("is-done"); el.classList.add("is-loading"); setPct(el, 0);
    shine(el.closest(".card")); Sfx.tap();
    say(el, "جارٍ التنزيل…");
    if (!R2_READY) return legacy(el, key);
    try {
      const m = (await getManifest())[key];
      if (!m || !m.file) throw new Error("no-file");
      const r = await fetch(`${R2}/${encodeURIComponent(m.file)}`, { signal: ctrl.signal, cache: "no-store" });
      if (!r.ok || !r.body) throw new Error("http-" + r.status);
      const total = +r.headers.get("Content-Length") || m.size || 0;
      const reader = r.body.getReader(), chunks = []; let got = 0, shown = -1;
      for (;;) {
        const { done: end, value } = await reader.read();
        if (end) break;
        chunks.push(value); got += value.length;
        const v = total ? Math.min(99, Math.floor(got * 100 / total)) : 0;
        if (v !== shown) { shown = v; setPct(el, v); }
      }
      if (total && got < total) throw new Error("short");
      done(el, URL.createObjectURL(new Blob(chunks, { type: "application/vnd.android.package-archive" })), m.file);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      legacy(el, key);           // R2 not reachable: the phone downloads it the old way, the page never breaks
    }
  };

  document.querySelectorAll("[data-dl]").forEach(el => {
    const key = el.dataset.dl;
    el.querySelector("[data-get]").addEventListener("click", () => {
      if (el.classList.contains("is-done")) return install(el);
      if (jobs.has(el)) return;
      if (key === "captain" || key === "rider") {
        if (card.dataset.platform === "ios") { Sfx.tap(); const w = window.open(`./${key}/`, "_blank", "noopener"); if (!w) location.href = `./${key}/`; return; }
      } else if (isIOS) { Sfx.tap(); say(el, "التطبيق متوفر لأندرويد فقط"); return; }
      if (q.has("demo")) { // screenshots and videos only
        el.classList.add("is-loading"); let v = 0; say(el, "جارٍ التنزيل…");
        const t = setInterval(() => { setPct(el, v); if (++v > 99) { clearInterval(t); done(el, "", "demo.apk"); } }, 40);
        jobs.set(el, { ctrl: { abort: () => clearInterval(t) } }); return;
      }
      download(el);
    });
    const inst = el.querySelector("[data-install]");
    if (inst) inst.addEventListener("click", () => install(el));
    el.querySelector("[data-cancel]").addEventListener("click", e => {
      e.stopPropagation();
      const j = jobs.get(el); if (j && j.ctrl) j.ctrl.abort();
      clear(el); Sfx.back(); say(el, "أُلغي التنزيل");
    });
  });

  // QR: one for the page, one per project. Scanning a project code opens the page straight on its downloads.
  const sheet = document.getElementById("qr-sheet");
  const QR_TEXT = {
    home:  ["الصفحة الرئيسية", "صوّر الرمز لفتح الصفحة"],
    abnaa: ["أبناء الشمال", "صوّر الرمز لفتح تنزيل تطبيقات أبناء الشمال مباشرة"],
    cashier: ["الكاشير الذكي", "صوّر الرمز لفتح كرت الكاشير الذكي مباشرة"],
    mytouch: ["My-touch", "صوّر الرمز لفتح تنزيل My-touch مباشرة"],
    rafeeq:  ["رفيق دربك للكابتن", "صوّر الرمز لفتح تنزيل رفيق دربك مباشرة"],
    rvoice:  ["رفيق", "صوّر الرمز لفتح كرت رفيق مباشرة"]
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

  // «شو فائدته؟»: short explanation of each app, opened from the ⓘ button on its card.
  const infoSheet = document.getElementById("info-sheet");
  const INFO = {
    abnaa: ["أبناء الشمال", [
      "تطبيقين: واحد للكابتن وواحد للعميل، بدل قروبات الواتساب",
      "العميل بيطلب مقعد لعمّان أو إربد أو الرمثا، وبيختار الطريق وعدد المقاعد",
      "الكابتن بتوصله الطلبات حسب وجهته، وبيقبل أو بيرفض بكبسة",
      "عداد للرحلة وسجل رحلات للكابتن",
      "متوفر لأندرويد وآيفون"]],
    mytouch: ["My-touch", [
      "بيقبل طلبات جيني عنك تلقائياً وبسرعة",
      "إنت بتحدد أقل سعر وأقصى مسافة، وهو بيقبل بس الطلبات المناسبة",
      "تجربة مجانية 3 أيام، وبعدها دفعة وحدة 5 دنانير مدى الحياة",
      "لأندرويد فقط"]],
    rafeeq: ["رفيق دربك للكابتن", [
      "عداد أجرة بالـGPS بيحسب المسافة والوقت",
      "حاسبة للكابتن، ومالية لحساب الدخل والمصاريف، وسجل رحلات",
      "أوقات الصلاة واتجاه القبلة",
      "تجربة مجانية 3 أيام، وبعدها دفعة وحدة 5 دنانير مدى الحياة",
      "لأندرويد فقط"]],
    rvoice: ["رفيق", [
      "مساعد صوتي للكابتن، بيصحى لما تحكي «يا رفيق»",
      "بيرن، بيفتح التطبيقات، وبيقرأ رسائل الواتساب وبيرد عليها",
      "إيدك على الستيرنغ وعيونك على الطريق",
      "قريباً · لأندرويد"]],
    cashier: ["الكاشير الذكي", [
      "نظام كاش ومخزون للسوبر ماركت والمحلات",
      "قريباً"]]
  };
  let infoFocus = null;
  const openInfo = key => {
    infoFocus = document.activeElement;
    infoSheet.querySelector("[data-info-title]").textContent = INFO[key][0];
    const ul = infoSheet.querySelector("[data-info-list]");
    ul.replaceChildren(...INFO[key][1].map(t => { const li = document.createElement("li"); li.textContent = t; return li; }));
    infoSheet.hidden = false; Sfx.tap();
    infoSheet.querySelector("[data-info-close]").focus();
  };
  const closeInfo = () => { if (infoSheet.hidden) return; infoSheet.hidden = true; Sfx.back(); if (infoFocus) infoFocus.focus(); };
  document.querySelectorAll("[data-info]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openInfo(b.dataset.info); }));
  infoSheet.querySelector("[data-info-close]").addEventListener("click", closeInfo);
  infoSheet.addEventListener("click", e => { if (e.target === infoSheet) closeInfo(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeInfo(); });

  // Deep link from a project QR: ?p=abnaa -> centre that card and open its downloads for this phone.
  if (q.get("p") === "abnaa") {
    const ua = navigator.userAgent;
    const pf = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : null;
    deck.slideTo([...deck.slides].findIndex(sl => sl.contains(card)), 0);
    if (pf) setStage("2", pf, true); else setStage("1", null, true);
  }
  // ?p=mytouch -> centre the My-touch card (link used in the WhatsApp ad).
  if (q.get("p") === "mytouch") {
    const mc = document.querySelector(".card.mytouch");
    if (mc) deck.slideTo([...deck.slides].findIndex(sl => sl.contains(mc)), 0);
  }
  // ?p=rafeeq -> centre the Rafeeq Darbak card (link inside the app's update notice).
  if (q.get("p") === "rafeeq") {
    const rc = document.querySelector(".card.rafeeq");
    if (rc) deck.slideTo([...deck.slides].findIndex(sl => sl.contains(rc)), 0);
  }
  // ?p=rvoice -> centre the Rafeeq voice-assistant card.
  if (q.get("p") === "rvoice") {
    const vc = document.querySelector(".card.rvoice");
    if (vc) deck.slideTo([...deck.slides].findIndex(sl => sl.contains(vc)), 0);
  }
  // ?p=cashier -> centre the Smart Cashier card.
  if (q.get("p") === "cashier") {
    const cc = document.querySelector(".card.cashier");
    if (cc) deck.slideTo([...deck.slides].findIndex(sl => sl.contains(cc)), 0);
  }


  // Install the page as an app (PWA). Android Chrome: one tap. iPhone Safari and in-app browsers: short steps.
  const installBtn = document.getElementById("install");
  const instSheet = document.getElementById("install-sheet");
  const ua = navigator.userAgent;
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
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

  if (q.get("s")) setStage(q.get("s"), q.get("pf") || "android", true);
  if (q.get("pct")) { const a = card.querySelector('[data-app="captain"]'); a.classList.add("is-loading"); setPct(a, q.get("pct")); }
})();
