/* Doruk: gün biter → avatar eve girer → evin penceresi büyür → odada mantar pano.
   Panoda günün yedi anı (saatli notlar); kaydırdıkça her notun üstüne o anın uygulaması polaroid olarak iğnelenir.
   Gökyüzü (sky.js) bu sahnenin durumunu window.__doruk'tan okur; pencerenin yeri window.__skyWin'den gelir. */
(() => {
  "use strict";
  const sec = document.getElementById("pano");
  if (!sec || !window.PX) return;
  const { clamp, lerp, smooth, hex, thr, Bitmap } = PX;
  const RM = PX.RM;
  const stage = sec.querySelector(".doruk-stage");
  const room = sec.querySelector(".doruk-room"), rctx = room.getContext("2d", { alpha: false });
  const frameEl = sec.querySelector(".doruk-frame"), pinsEl = sec.querySelector(".doruk-pins");
  const line1 = sec.querySelector(".doruk-line1"), line2 = sec.querySelector(".doruk-line2");
  const sky = document.getElementById("sky");

  const APPS = [
    { id: "katman", name: "Katman", hour: "07:30" },
    { id: "notecook", name: "notecook", hour: "09:10" },
    { id: "plainday", name: "plainday", hour: "12:40" },
    { id: "milyonda", name: "85 Milyonda 1", hour: "15:00" },
    { id: "fiziyoo", name: "Fiziyoo", hour: "17:00" },
    { id: "sweetspot", name: "SweetSpot", hour: "18:00" },
    { id: "here", name: "here.", hour: "19:50" },
  ];
  // Polaroidler HTML'de: çizim kendi kalitesinde, ad keskin; dokununca o uygulamanın bölümüne gider.
  const pols = APPS.map((a) => {
    const el = document.createElement("a"); el.className = "pol"; el.href = "#" + a.id;
    const c = document.createElement("canvas"); c.width = PX.VW; c.height = PX.VH; c.setAttribute("aria-hidden", "true");
    const cap = document.createElement("span"); cap.className = "pol-name"; cap.textContent = a.name;
    el.append(c, cap); pinsEl.append(el);
    return { el, g: c.getContext("2d"), bm: Bitmap(PX.VW, PX.VH), fn: PX.VIG[a.id], last: -1e9, shown: false };
  });

  let vw = 0, vh = 0, P = 3, W = 0, H = 0, mobile = false, rbm = null, L = null;
  const pixelSize = (w) => (w < 760 ? 2 : clamp(Math.round(w / 430), 3, 5));
  function resize() {
    vw = innerWidth; vh = stage.clientHeight || innerHeight; mobile = vw < 760; P = pixelSize(vw);
    W = Math.ceil(vw / P); H = Math.ceil(vh / P);
    if (!W || !H) return;
    room.width = W; room.height = H; rbm = Bitmap(W, H);
    update.lastRoom = 0; // canvas boyutu değişince silinir; bir sonraki karede yeniden çizilsin
    L = layout();
  }

  // ── Düzen: pano ortada; yedi yuva (geniş ekranda 4+3, telefonda 2 sütun) ──
  function layout() {
    // yatay telefon: ekran basık, yedisi tek sırada
    const flat = vh < 560 && vw > vh * 1.3;
    // dikey tablet: 3 sütun, daha geniş pano
    const tall = !mobile && vh > vw * 1.1;
    const cols = flat ? APPS.length : mobile ? 2 : tall ? 3 : 4, rows = Math.ceil(APPS.length / cols);
    const deskY = Math.round(H * (mobile ? 0.86 : 0.8));
    const topY = Math.round(H * (flat ? 0.3 : 0.17));
    const maxBW = Math.round(W * (flat ? 0.9 : mobile ? 0.92 : tall ? 0.84 : 0.64));
    const pad = mobile ? 7 : 9, gx = mobile ? 6 : 9, gy = mobile ? 12 : 14;
    const capH = Math.ceil((flat ? 22 : mobile ? 26 : 30) / P), padP = Math.ceil(12 / P);
    const polH = (s) => Math.round((s * PX.VH) / PX.VW) + padP + capH;
    const bhOf = (s) => pad * 2 + 8 + rows * polH(s) + (rows - 1) * gy;
    const availH = deskY - 10 - topY;
    let sw = Math.floor((maxBW - pad * 2 - gx * (cols - 1)) / cols);
    while (bhOf(sw) > availH && sw > 24) sw--;
    const bw = pad * 2 + cols * sw + (cols - 1) * gx, bh = bhOf(sw);
    const bx = Math.round(W / 2 - bw / 2), by = Math.round(topY + (availH - bh) / 2);
    const slots = APPS.map((_, i) => {
      const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, APPS.length - r * cols);
      const off = Math.round(((cols - inRow) * (sw + gx)) / 2);
      return { x: bx + pad + off + c * (sw + gx), y: by + pad + 8 + r * (polH(sw) + gy), w: sw };
    });
    return { deskY, bx, by, bw, bh, slots };
  }

  // ── Oda: gece masası, lamba, pano, notlar ──
  const C = (s) => hex(s);
  const STRIPE = C("#3a3f66"), WARM = C("#ffd08a"), STAR = C("#e9e4d6");
  const NOTE = ["#fbf3dc", "#f7e08a", "#f4c6b8", "#cfe3c6", "#fbf3dc", "#cfdcef", "#f7e08a"].map(C);
  const WALL = [C("#12142a"), C("#181b33"), C("#1f2340"), C("#272a46")];
  function drawRoom(bm, t) {
    const { w, h } = bm, { deskY, bx, by, bw, bh, slots } = L;
    bm.vgrad(0, 0, w, deskY, WALL);
    for (let x = 3; x < w; x += 9) for (let y = 0; y < deskY; y++) if (((y >> 1) & 1) && 0.18 > thr(x, y)) bm.tint(x, y, STRIPE, 0.5);

    // arka pencere (geniş ekranda): dışarıda gece, uzakta az önceki sokak lambası
    if (!mobile) {
      const wx = Math.round(w * 0.86), ww = Math.round(w * 0.11), wy = Math.round(h * 0.16), wh = Math.round(h * 0.3);
      bm.rect(wx - 2, wy - 2, ww + 4, wh + 4, C("#3b3f5c"));
      bm.vgrad(wx, wy, ww, wh, [C("#0d1230"), C("#141a40"), C("#1f2552"), C("#2b2a58")]);
      for (let i = 0; i < 14; i++) { const sx = wx + ((i * 37) % ww), sy = wy + ((i * 23) % Math.max(1, wh - 8)); if (RM || Math.sin(t / 700 + i * 2.1) > -0.7) bm.put(sx, sy, STAR); }
      bm.disc(wx + Math.round(ww * 0.68), wy + Math.round(wh * 0.2), 2, C("#f4eed8"));
      for (let x = 0; x < ww; x++) { const hh = Math.round(wh * (0.16 + 0.05 * Math.sin(x * 0.2 + 1))); bm.rect(wx + x, wy + wh - hh, 1, hh, C("#121633")); }
      const lx = wx + Math.round(ww * 0.35), ly = wy + Math.round(wh * 0.6);
      bm.rect(lx, ly, 1, wh - (ly - wy), C("#262a48")); bm.put(lx, ly, C("#ffd08a"));
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if ((1 - Math.hypot(x, y) / 3.5) * 0.7 > thr(lx + x, ly + y)) bm.tint(lx + x, ly + y, WARM, 0.35);
      bm.rect(wx + Math.round(ww / 2), wy, 1, wh, C("#3b3f5c")); bm.rect(wx, wy + Math.round(wh / 2), ww, 1, C("#3b3f5c"));
      bm.rect(wx - 3, wy + wh + 2, ww + 6, 2, C("#4a4e6e"));
    }

    // mantar pano
    bm.rect(bx - 3, by - 3, bw + 6, bh + 6, C("#4a3322")); bm.rect(bx - 3, by - 3, bw + 6, 1, C("#6a4a32"));
    bm.rect(bx, by, bw, bh, C("#8a6a48")); bm.dither(bx, by, bw, bh, C("#9b7a55"), 0.35); bm.dither(bx, by, bw, bh, C("#77593b"), 0.12);
    bm.rect(bx + 2, by + bh + 3, bw - 4, 2, C("#0d0f1c"));

    // günün anları: saatli notlar; polaroid gelince altında kalır, saat görünmeye devam eder
    slots.forEach((s, i) => {
      const nx = s.x - (mobile ? 4 : 6), ny = s.y - 9, nw = Math.round(s.w * 0.62), nh = Math.round(s.w * 0.4);
      bm.rect(nx + 1, ny + 1, nw, nh, C("#3a2818")); bm.rect(nx, ny, nw, nh, NOTE[i]);
      bm.text(nx + 3, ny + 2, APPS[i].hour, C("#2a2620"));
      for (let l = ny + 10; l < ny + nh - 2; l += 3) bm.rect(nx + 3, l, nw - 6 - ((l * 7) % 5), 1, C("#b9ad94"));
      bm.put(nx + Math.round(nw / 2), ny - 1, C("#d8452e")); bm.put(nx + Math.round(nw / 2), ny, C("#a83322"));
    });

    // masa lambasının sıcak ışığı panoya düşer
    const lhx = mobile ? Math.round(w * 0.08) : Math.round(Math.max(18, bx - 22)), lhy = mobile ? by - 6 : Math.round(h * 0.3);
    const RX = w * 0.55, RY = h * 0.42;
    for (let y = -Math.round(RY); y <= Math.round(RY); y++) for (let x = 0; x <= Math.round(w * 0.6); x++) {
      const X = lhx + x, Y = lhy + y + Math.round(x * 0.35), r = Math.hypot(x / RX, y / RY);
      if (r < 1 && (1 - r) * 0.42 > thr(X, Y)) bm.tint(X, Y, WARM, 0.12);
    }
    if (!mobile) {
      const bxL = Math.round(lhx - 12), jx = bxL - 6, jy = Math.round((lhy + deskY) / 2), arm = C("#3a3e52"), arm2 = C("#23263a");
      bm.rect(bxL - 7, deskY - 3, 15, 3, arm2); bm.rect(bxL - 6, deskY - 4, 13, 1, arm);
      for (let d = 0; d < 2; d++) { bm.line(bxL + d, deskY - 4, jx + d, jy, d ? arm2 : arm); bm.line(jx + d, jy, lhx + d, lhy, d ? arm2 : arm); }
      bm.disc(jx, jy, 2, C("#55597a"));
      const SH = 6;
      for (let i = 0; i < SH; i++) bm.rect(lhx - 4 - i, lhy - SH + i, 8 + i * 2, 1, i === 0 ? C("#e57a52") : C("#c9583a"));
      bm.rect(lhx - 4 - SH, lhy, 8 + SH * 2, 1, C("#8f3a24"));
      bm.rect(lhx - SH, lhy + 1, SH * 2 + 1, 1, C("#fff1c8"));
    }

    // masa, defter, kalem, kupa
    const top = Math.max(4, Math.round(h * 0.035));
    bm.rect(0, deskY, w, h - deskY, C("#4b3324"));
    bm.rect(0, deskY, w, top, C("#7a573d")); bm.rect(0, deskY, w, 1, C("#a07a55"));
    for (let x = 0; x < w; x += 23) bm.rect(x, deskY + 1, 1, top - 1, C("#6a4b34"));
    bm.rect(0, deskY + top, w, 1, C("#2f2017"));
    bm.dither(0, deskY + top + 1, w, Math.round((h - deskY) * 0.35), C("#3a281c"), 0.5);
    const nx = Math.round(w * (mobile ? 0.12 : 0.3)), nw = Math.round(w * (mobile ? 0.26 : 0.13));
    bm.rect(nx, deskY + 1, nw, top - 1, C("#efe6d2")); bm.rect(nx + Math.round(nw / 2), deskY + 1, 1, top - 1, C("#cbbfa8"));
    for (let y = deskY + 2; y < deskY + top - 1; y += 2) bm.rect(nx + 2, y, nw - 4, 1, C("#b9c4d6"));
    bm.line(nx + nw + 3, deskY + top - 2, nx + nw + 12, deskY + 2, C("#e5502e"));
    const mx = Math.round(w * (mobile ? 0.78 : 0.7)), mh = Math.max(7, Math.round(h * 0.045)), mw = Math.round(mh * 0.85);
    bm.rect(mx, deskY + 1 - mh, mw, mh, C("#d9cbb0")); bm.rect(mx + mw - 2, deskY + 1 - mh, 2, mh, C("#b8a98e"));
    bm.rect(mx + mw, deskY - mh + 3, 2, 1, C("#b8a98e")); bm.rect(mx + mw + 2, deskY - mh + 3, 1, 3, C("#b8a98e")); bm.rect(mx + mw, deskY - mh + 6, 2, 1, C("#b8a98e"));
    bm.rect(mx, deskY + 1 - mh, mw, 1, C("#6b4a34"));
    if (!RM) for (let i = 0; i < 3; i++) { const ph = (t / 900 + i / 3) % 1, sx = mx + 2 + i * 2 + Math.round(Math.sin(t / 400 + i) * 1.2), sy = deskY - mh - 2 - Math.round(ph * 10); if (ph < 0.85) bm.put(sx, sy, C("#8a90b0")); }
  }

  // ── Zaman çizelgesi (bölüm içindeki ilerleme p) ──
  // 0.02–0.12 avatar eve girer · 0.08–0.16 pencere yanar · 0.16–0.46 pencere büyür, odaya girilir
  // 0.46–0.52 yazı · 0.52–0.84 polaroidler iğnelenir · 0.86 son satır
  const state = { state: "before", vis: 1, glow: 0, lit: false };
  window.__doruk = state;
  let lastSkyT = "";
  function update(now) {
    if (!W || !H || innerWidth !== vw) resize();
    if (!W || !H) return;
    const r = sec.getBoundingClientRect(), span = Math.max(1, r.height - vh);
    const p = clamp(-r.top / span);
    state.state = r.top > 0 ? "before" : r.bottom <= vh ? "after" : "during";
    state.vis = 1 - smooth(0.02, 0.12, p);
    state.glow = smooth(0.08, 0.14, p) * (1 - smooth(0.16, 0.2, p));
    state.lit = p > 0.08;
    const z = state.state === "during" ? smooth(0.16, 0.46, p) : 0;

    // gökyüzü kamerası: evin penceresine doğru yaklaşır
    const SW = window.__skyWin;
    let tf = "none", wcx = vw / 2, wcy = vh / 2, hw = 0;
    if (SW && z > 0) {
      const cx = SW.x, cy = SW.y, half = SW.half;
      const S = Math.pow((Math.max(vw, vh) / 2 / half) * 1.08, z), e = smooth(0, 1, z);
      const tx = (vw / 2 - cx) * e, ty = (vh / 2 - cy) * e;
      wcx = cx + tx; wcy = cy + ty; hw = half * S;
      tf = z >= 0.999 ? "none" : `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) translate(${cx}px, ${cy}px) scale(${S.toFixed(4)}) translate(${-cx}px, ${-cy}px)`;
    }
    if (tf !== lastSkyT) { sky.style.transformOrigin = "0 0"; sky.style.transform = tf; lastSkyT = tf; }

    // oda: pencerenin içinden görünür, pencere büyüdükçe açılır
    if (state.state === "during" && z > 0.001) {
      if (now - (update.lastRoom || 0) > 60 || z < 0.999) { drawRoom(rbm, now); rbm.blit(rctx); update.lastRoom = now; }
      room.style.opacity = String(smooth(0.12, 0.3, z));
      const e = smooth(0, 1, z);
      room.style.clipPath = z >= 0.999 ? "none" : `inset(${Math.max(0, wcy - hw)}px ${Math.max(0, vw - (wcx + hw))}px ${Math.max(0, vh - (wcy + hw))}px ${Math.max(0, wcx - hw)}px)`;
      room.style.transformOrigin = `${wcx}px ${wcy}px`;
      room.style.transform = z >= 0.999 ? "none" : `scale(${lerp(1.3, 1, e).toFixed(4)})`;
      const fb = Math.max(2, hw * 0.07);
      frameEl.style.display = z < 0.999 ? "block" : "none";
      if (z < 0.999) {
        frameEl.style.left = (wcx - hw - fb) + "px"; frameEl.style.top = (wcy - hw - fb) + "px";
        frameEl.style.width = frameEl.style.height = (hw * 2 + fb * 2) + "px";
        frameEl.style.borderWidth = fb + "px";
        frameEl.style.setProperty("--cross", String(1 - smooth(0.15, 0.45, z)));
        frameEl.style.setProperty("--bar", Math.max(1, fb * 0.6) + "px");
      }
    } else if (state.state === "after") {
      // bölüm yukarı kayarken oda olduğu gibi kalır (son kare); doğrudan buraya atlandıysa bir kez çiz
      if (!update.lastRoom) { drawRoom(rbm, now); rbm.blit(rctx); update.lastRoom = now; }
      room.style.opacity = "1"; room.style.clipPath = "none"; room.style.transform = "none"; frameEl.style.display = "none";
    } else { room.style.opacity = "0"; frameEl.style.display = "none"; }

    // doruk: her notun üstüne o anın uygulaması iğnelenir
    const full = state.state === "after" || z >= 0.999;
    const k = state.state === "after" ? APPS.length : clamp((p - 0.52) / 0.32) * APPS.length;
    pols.forEach((pl, i) => {
      const a = full ? clamp(k - i) : 0, s = L.slots[i];
      if (a <= 0) { if (pl.shown) { pl.el.style.display = "none"; pl.shown = false; } return; }
      if (!pl.shown) { pl.el.style.display = "block"; pl.shown = true; }
      const ease = 1 - Math.pow(1 - a, 3);
      pl.el.style.left = s.x * P + "px"; pl.el.style.top = s.y * P + "px"; pl.el.style.width = s.w * P + "px";
      pl.el.style.opacity = String(smooth(0, 0.35, a));
      pl.el.style.transform = `translateY(${(-(1 - ease) * 36).toFixed(1)}px) scale(${(1 + (1 - ease) * 0.12).toFixed(3)})`;
      pl.el.style.setProperty("--lift", (2 + (1 - ease) * 14).toFixed(1) + "px");
      if (now - pl.last > 80 && visible) { pl.fn(pl.bm, now); pl.bm.blit(pl.g); pl.last = now; }
    });

    line1.style.opacity = String(state.state === "after" ? 1 : smooth(0.46, 0.52, p) * (state.state === "during" ? 1 : 0));
    line2.style.opacity = String(state.state === "after" ? 1 : smooth(0.86, 0.9, p) * (state.state === "during" ? 1 : 0));
  }

  // Görünürken her karede; değilken yalnızca kaydırmada (gökyüzü durumu doğru kalsın).
  let visible = false, raf = 0;
  // Döngü yalnızca sahne oynarken (during) döner; önce/sonra kaydırma olayları yeter.
  function loop(now) { raf = 0; update(now); if (visible && !document.hidden && state.state === "during") raf = requestAnimationFrame(loop); }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(sec);
  } else visible = true;
  addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  addEventListener("resize", () => { resize(); if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !raf) raf = requestAnimationFrame(loop); });
  // Sayfa doğrudan bir bağlantıyla (#d-plainday gibi) açılınca tarayıcı kaydırmayı olaysız yapabiliyor: durumu yeniden hesapla.
  addEventListener("load", () => { if (!raf) raf = requestAnimationFrame(loop); });
  addEventListener("hashchange", () => { if (!raf) raf = requestAnimationFrame(loop); });
  resize();
  update(performance.now());
})();
