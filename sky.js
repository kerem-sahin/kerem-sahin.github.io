/* v3 · Piksel gün: sayfanın arka planı bir gün. Kaydırdıkça saat ilerler; her uygulama kendi saatinde.
   Çizimin tamamı pixel.js'te; burası sadece saati, açılış penceresini ve döngüyü yönetir. */
(() => {
  "use strict";
  const { RM, clamp, lerp, smooth } = PX;
  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d", { alpha: false });
  const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);

  // ── SAAT ADLARI (göstergede) ───────────────────────────────
  const PHASES = [
    [375, "ŞAFAK", "FIRST LIGHT"], [450, "SABAH", "MORNING"], [760, "ÖĞLE", "MIDDAY"], [900, "İKİNDİ", "AFTERNOON"],
    [1080, "GÜN BATIMI", "SUNSET"], [1190, "ALACAKARANLIK", "BLUE HOUR"], [1260, "GECE", "NIGHT"], [1470, "GECE YARISI", "AFTER MIDNIGHT"],
    [1780, "ŞAFAK", "FIRST LIGHT"], [1890, "ERTESİ SABAH", "NEXT MORNING"],
  ];
  const phaseAt = (m) => { let p = PHASES[0]; for (let i = 0; i < PHASES.length - 1; i++) if (m >= (PHASES[i][0] + PHASES[i + 1][0]) / 2) p = PHASES[i + 1]; return p; };
  const FIRST = 375, LAST = 1900;

  // ── KAYDIRMADAN SAATE ──────────────────────────────────────
  let anchors = [];
  function measureAnchors() {
    anchors = Array.from(document.querySelectorAll("[data-mins]")).map((el) => {
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      // "top": sayfanın başı; "start": uzun bölümler, üst kenarı ekranın tepesine gelince saatine varır.
      const y = el.dataset.anchor === "top" ? 0 : el.dataset.anchor === "start" ? top : top + r.height / 2 - vh / 2;
      return { y, mins: Number(el.dataset.mins) };
    }).sort((a, b) => a.y - b.y);
  }
  function minsAtScroll(sy) {
    if (!anchors.length) return FIRST;
    if (sy <= anchors[0].y) return anchors[0].mins;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (sy <= b.y) return lerp(a.mins, b.mins, smooth(0.25, 0.75, (sy - a.y) / Math.max(1, b.y - a.y)));
    }
    return anchors[anchors.length - 1].mins;
  }

  // ── TUVAL: düşük çözünürlüklü bitmap, CSS ile piksel piksel büyütülür ──
  let vw = window.innerWidth, vh = window.innerHeight, P = 3, bm = null;
  let targetMins = FIRST, curMins = FIRST;
  const pixelSize = (w) => (w < 760 ? 2 : clamp(Math.round(w / 430), 3, 5));
  function resize() {
    const nw = window.innerWidth, nh = window.innerHeight;
    // iOS araç çubuğu açılıp kapanınca küçük yükseklik değişimlerinde bitmap'i yeniden kurma.
    const small = bm && nw === vw && Math.abs(nh - vh) < 160;
    vw = nw;
    if (!small) {
      vh = nh; P = pixelSize(vw);
      canvas.width = Math.ceil(vw / P); canvas.height = Math.ceil(vh / P);
      bm = PX.Bitmap(canvas.width, canvas.height);
    }
    measureAnchors();
    measureWindow();
    targetMins = minsAtScroll(window.scrollY);
  }

  function drawScene(m, t) {
    const w = vw, h = vh, mobile = w < 760;
    const openH = h * (mobile ? 0.72 : 0.68);
    const winBottomY = h - win.bottom, winH = h - win.top - win.bottom, winCX = win.left + (w - win.left - win.right) / 2;
    const horizonY = lerp(winBottomY - winH * 0.24, openH, openAmt);
    // Avatar: açılışta pencerenin içinde; gün başlayınca damalı geçişle kaybolur.
    // Gün bitip lamba yanınca (ara sahne) bir an görünür, gece yarısından sonra lambanın altında kalır ve ertesi sabahı bekler.
    const vis = Math.max(1 - smooth(418, 446, m), smooth(1205, 1220, m) * (1 - smooth(1236, 1252, m)), smooth(1495, 1525, m));
    const ax = lerp(winCX + (w - win.left - win.right) * (mobile ? 0.18 : 0.22), w * (mobile ? 0.7 : 0.8), openAmt);
    const feet = lerp(winBottomY - winH * 0.05, h * (mobile ? 0.95 : 0.93), openAmt);
    const AV = PX.AV, avCol = ax / P;
    PX.drawWorld(bm, m, {
      hz: horizonY / P, t,
      sunL: mobile ? 0.5 : 0.56, sunR: mobile ? 0.8 : 0.88, moonX: mobile ? 0.3 : 0.62, houseX: mobile ? 0.2 : 0.4,
      av: AV ? { x: avCol, feet: feet / P, vis } : null,
      clear: AV ? [avCol - AV.w, avCol + AV.w * 1.6] : null,
    });
    bm.blit(ctx);
  }

  // ── GÖSTERGE ───────────────────────────────────────────────
  const hudEl = document.getElementById("hud");
  const docEl = document.documentElement;
  let lastHud = "";
  function updateHud(m) {
    const t = Math.round(clamp(m, FIRST, LAST)) % 1440;
    const ph = phaseAt(m);
    const txt = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")} · ${window.__ksLang === "en" ? ph[2] : ph[1]}`;
    if (txt !== lastHud) { hudEl.textContent = txt; lastHud = txt; }
  }

  // ── AÇILIŞ: gün küçük bir pencere olarak başlar, kaydırdıkça açılır ──
  const openingEl = document.getElementById("opening");
  const openStage = openingEl ? openingEl.querySelector(".opening-stage") : null;
  let win = { top: 0, right: 0, bottom: 0, left: 0 };
  let openAmt = openingEl ? 0 : 1, travel = 1, lastOpenKey = "";
  function measureWindow() {
    const w = Math.min(390, vw * 0.78);
    const availTop = 70, availBottom = vw < 760 ? 250 : 230;
    const h = Math.max(200, Math.min(440, vh * 0.5, vh - availTop - availBottom));
    const cy = availTop + (vh - availTop - availBottom) / 2;
    win = { top: cy - h / 2, bottom: vh - (cy + h / 2), left: (vw - w) / 2, right: (vw - w) / 2 };
    if (openingEl) travel = Math.max(1, openingEl.offsetHeight - window.innerHeight);
    lastOpenKey = "";
  }
  function updateOpening() {
    if (!openingEl) return;
    const p = clamp(window.scrollY / travel);
    const open = easeOutCubic(clamp(p / 0.62));
    openAmt = open;
    const key = p.toFixed(4);
    if (key === lastOpenKey) return;
    lastOpenKey = key;
    const t = win.top * (1 - open), r = win.right * (1 - open), b = win.bottom * (1 - open), l = win.left * (1 - open);
    const rad = 6 * (1 - open);
    canvas.style.clipPath = open >= 0.999 ? "none" : `inset(${t.toFixed(1)}px ${r.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round ${rad.toFixed(1)}px)`;
    if (openStage) {
      const st = openStage.style;
      st.setProperty("--win-top", t.toFixed(1) + "px");
      st.setProperty("--win-left", l.toFixed(1) + "px");
      st.setProperty("--win-w", (vw - l - r).toFixed(1) + "px");
      st.setProperty("--win-h", (vh - t - b).toFixed(1) + "px");
      st.setProperty("--win-r", rad.toFixed(1) + "px");
      st.setProperty("--frame", Math.max(0, 1 - open * 1.5).toFixed(3));
      st.setProperty("--caption", (1 - smooth(0.0, 0.22, p)).toFixed(3));
      st.setProperty("--caption-top", (win.top + (vh - win.top - win.bottom) + 22).toFixed(1) + "px");
      st.setProperty("--dawn", smooth(0.62, 0.86, p).toFixed(3));
    }
    const isOpen = open > 0.55 || window.scrollY > travel;
    if (docEl.dataset.open !== String(isOpen)) docEl.dataset.open = String(isOpen);
  }

  // ── DÖNGÜ ──────────────────────────────────────────────────
  // Kaydırırken her karede çizer; sayfa dururken saniyede 4 kare (yıldız, bulut, kuş yavaşça yaşar).
  let raf = 0, idle = 0, activeUntil = 0, lastNow = 0;
  // Ertesi sabah kâğıdı ekranı tamamen kaplayınca gökyüzü görünmez: çizme, pil harcama.
  // Kâğıt üst şeridin altına girince şerit koyu yazıya geçer.
  const sheetEl = document.querySelector(".sheet");
  let covered = false;
  function checkSheet() {
    if (!sheetEl) return;
    const r = sheetEl.getBoundingClientRect();
    covered = r.top <= 0 && r.bottom >= window.innerHeight;
    const under = r.top <= 56 && r.bottom > 56 && r.left < 200;
    if (docEl.dataset.sheet !== String(under)) docEl.dataset.sheet = String(under);
  }
  function wake(ms = 900) {
    activeUntil = Math.max(activeUntil, performance.now() + ms);
    clearTimeout(idle); idle = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    const dt = lastNow ? Math.min(1, (now - lastNow) / 1000) : 0.016;
    lastNow = now;
    const k = RM ? 1 : 1 - Math.exp(-dt / 0.16);
    curMins += (targetMins - curMins) * k;
    if (Math.abs(targetMins - curMins) < 0.05) curMins = targetMins;
    updateOpening();
    checkSheet();
    if (!covered) drawScene(curMins, now);
    updateHud(curMins);
    const settling = Math.abs(targetMins - curMins) > 0.05;
    if (settling || now < activeUntil) raf = requestAnimationFrame(tick);
    else if (!RM && !document.hidden && !covered) idle = setTimeout(() => { idle = 0; lastNow = 0; if (!raf) raf = requestAnimationFrame(tick); }, 250);
  }

  window.addEventListener("scroll", () => { targetMins = minsAtScroll(window.scrollY); wake(); }, { passive: true });
  window.addEventListener("resize", () => { resize(); wake(); }, { passive: true });
  window.addEventListener("load", () => { measureAnchors(); targetMins = minsAtScroll(window.scrollY); wake(); });
  window.addEventListener("ks:langchange", () => { lastHud = ""; wake(200); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => { measureAnchors(); targetMins = minsAtScroll(window.scrollY); wake(); }).observe(document.querySelector("main"));
  }
  PX.loadAvatar("assets/icons/avatar-full.png").then(() => wake(200));
  resize();
  curMins = targetMins;
  updateOpening();
  drawScene(curMins, 0);
  updateHud(curMins);
  wake();

  // ── UYGULAMA PENCERELERİ: her bölümün kendi küçük piksel sahnesi ──
  // Sadece ekranda görünenler canlanır (saniyede ~12 kare; piksel animasyonu için yeterli).
  const vigs = Array.from(document.querySelectorAll("canvas[data-vig]")).map((c) => ({
    c, g: c.getContext("2d"), fn: PX.VIG[c.dataset.vig], bm: PX.Bitmap(PX.VW, PX.VH), on: false,
  })).filter((v) => v.fn);
  function sizeVigs() {
    for (const v of vigs) {
      const box = v.c.parentElement.clientWidth - 20; // çerçevenin iç genişliği
      // Büyük ekranda tam sayı ölçek (pikseller eşit); dar ekranda genişliği doldur.
      const s = box >= 512 ? Math.floor(Math.min(box, 680) / PX.VW) : Math.max(1, box / PX.VW);
      v.c.style.width = PX.VW * s + "px"; v.c.style.height = PX.VH * s + "px";
    }
  }
  const paintVig = (v, t) => { v.fn(v.bm, t); v.bm.blit(v.g); };
  if (vigs.length) {
    sizeVigs();
    window.addEventListener("resize", sizeVigs, { passive: true });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const v = vigs.find((x) => x.c === e.target); if (!v) return;
      v.on = e.isIntersecting; if (v.on) paintVig(v, performance.now());
    }), { rootMargin: "120px 0px" });
    vigs.forEach((v) => { paintVig(v, 0); io.observe(v.c); });
    if (!RM) {
      const loop = () => {
        if (!document.hidden) { const t = performance.now(); for (const v of vigs) if (v.on) paintVig(v, t); }
        setTimeout(() => requestAnimationFrame(loop), 80);
      };
      loop();
    }
  }
})();
