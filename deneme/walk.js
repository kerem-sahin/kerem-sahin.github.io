/* Yürüyüş: kaydırdıkça karakter günün içinde yürür. Duraklar dünyanın içinde çizilir;
   her durağa varınca küçük bir piksel tabela belirir. Ev → kampüs → tepe → kafe → ev. */
window.WALK = (() => {
  "use strict";
  const { hex, mix, thr, clamp, smooth } = PX;
  const N = 4; // dört yol; beşinci durak yine ev
  const STOPS = ["home", "campus", "hill", "cafe"];
  const SIGN = { home: "KATMAN", campus: "NOTECOOK", hill: "SWEETSPOT", cafe: "HERE." };
  const NIGHT = [14, 18, 40];
  const dim = (c, n, k = 0.72) => mix(c, NIGHT, n * k);
  const H = (s) => hex(s);
  const P = {
    path: H("#b9a785"), pathEdge: H("#9c8a68"), pebble: H("#8a7a5c"),
    cream: H("#e9dcc2"), cream2: H("#d6c7aa"), roof: H("#a4523a"), roof2: H("#7e3a28"),
    wood: H("#6b4a34"), wood2: H("#4e3424"), knob: H("#e0b25a"), glass: H("#9fbcd0"), glass2: H("#7c9db4"), warm: H("#ffd08a"), warm2: H("#f2b660"),
    coat: H("#22365a"), coat2: H("#172743"), scarf: H("#d9a441"),
    stone: H("#d9d1c0"), stone2: H("#bdb3a0"), stone3: H("#efe8da"), win: H("#33405a"),
    leaf: H("#4f6e40"), leaf2: H("#3b5532"), trunk: H("#5a3e2a"),
    cafe: H("#5a3a26"), cafe2: H("#462c1c"), awn: H("#f3e7cf"), awn2: H("#d9573b"), ink: H("#2a1c12"), sign: H("#d8ab72"), sign2: H("#7a5236"),
  };

  function draw(bm, s) {
    // patika: karakterin yürüdüğü yol, kamerayla akar
    const y0 = s.base - 1, ox = Math.round(s.ox), n = s.n;
    const pc = dim(P.path, n), pe = dim(P.pathEdge, n), pb = dim(P.pebble, n);
    for (let x = 0; x < bm.w; x++) {
      const gx = x + ox;
      bm.put(x, y0, pe);
      for (let y = 1; y < 6; y++) bm.put(x, y0 + y, ((gx * 13 + y * 7) % 29 === 0) ? pb : pc);
      bm.put(x, y0 + 6, pe);
    }
    for (let k = 0; k <= N; k++) {
      const kind = STOPS[k % N];
      const ax = Math.round(-k * s.D - s.ox + s.charX);
      if (ax < -s.AH * 2.4 || ax > bm.w + s.AH * 2.4) continue;
      BUILD[kind](bm, ax, s);
      const near = 1 - smooth(0.06, 0.3, Math.abs(s.cam - k));
      if (near > 0.01) sign(bm, ax, s, SIGN[kind], near);
    }
  }

  // ── tabela: karakterin solunda bir direk, üstünde uygulamanın adı ──
  function sign(bm, ax, s, text, a) {
    const n = s.n, AH = s.AH, base = s.base;
    const tw = bm.textWidth(text), bw = tw + 10, bh = 13;
    const px = Math.round(ax - AH * 0.62), top = Math.round(base - AH * 1.08 - (1 - a) * 5);
    const bx = px - Math.round(bw / 2);
    const show = (x, y) => a >= 1 || a > thr(x + 3, y + 1);
    const put = (x, y, c) => { if (show(x, y)) bm.put(x, y, c); };
    const wood = dim(P.sign, n, 0.45), wood2 = dim(P.sign2, n, 0.45), ink = P.ink;
    for (let y = top + bh; y < base; y++) { put(px, y, wood2); put(px + 1, y, dim(P.sign2, n, 0.6)); }
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const edge = y === 0 || y === bh - 1 || x === 0 || x === bw - 1;
      put(bx + x, top + y, edge ? wood2 : (y === 1 ? mix(wood, [255, 240, 210], 0.25) : wood));
    }
    put(bx + 2, top + 2, wood2); put(bx + bw - 3, top + 2, wood2); // çiviler
    if (a > 0.5) bm.text(bx + 5, top + 4, text, n > 0.5 ? dim(ink, n, 0.2) : ink);
  }

  const BUILD = {
    // Ev: kapı, askıda mont (Katman), pencere; gece pencere yanar
    home(bm, ax, s) {
      const { AH, base, n } = s, W = Math.round(AH * 1.5), WH = Math.round(AH * 1.12);
      const x0 = Math.round(ax - W * 0.58), y0 = base - WH;
      bm.rect(x0, y0, W, WH, dim(P.cream, n));
      for (let y = y0 + 3; y < base; y += 6) bm.rect(x0, y, W, 1, dim(P.cream2, n));
      bm.rect(x0, base - 3, W, 3, dim(P.cream2, n, 0.8));
      const RH = Math.round(AH * 0.42);
      for (let j = 0; j < RH; j++) { const inset = Math.round((j / RH) * W * 0.42); bm.rect(x0 - 4 + inset, y0 - j - 1, W + 8 - inset * 2, 1, j % 3 ? dim(P.roof, n) : dim(P.roof2, n)); }
      const cx = x0 + Math.round(W * 0.7); bm.rect(cx, y0 - RH * 0.75, 5, RH * 0.55, dim(P.roof2, n));
      // kapı
      const dw = Math.round(AH * 0.3), dh = Math.round(AH * 0.66), dx = Math.round(ax - dw / 2), dy = base - dh;
      bm.rect(dx - 2, dy - 2, dw + 4, dh + 2, dim(P.wood2, n)); bm.rect(dx, dy, dw, dh, dim(P.wood, n));
      for (let y = dy + 3; y < base - 2; y += 9) bm.rect(dx + 2, y, dw - 4, 1, dim(P.wood2, n));
      bm.rect(dx + dw - 4, dy + Math.round(dh * 0.55), 2, 2, P.knob);
      // askıda mont
      const hx = Math.round(x0 + W * 0.12), hy = base - Math.round(AH * 0.86);
      bm.rect(hx, hy, 6, 1, dim(P.wood2, n)); bm.rect(hx + 2, hy + 1, 2, 2, dim(P.wood2, n));
      const cw = Math.round(AH * 0.16), ch = Math.round(AH * 0.38);
      for (let y = 0; y < ch; y++) { const half = Math.round(cw / 2 + y * 0.12); for (let x = -half; x <= half; x++) bm.put(hx + 3 + x, hy + 3 + y, x > 0 ? dim(P.coat2, n) : dim(P.coat, n)); }
      bm.rect(hx + 2, hy + 3, 3, Math.round(ch * 0.7), dim(P.scarf, n, 0.5));
      // pencere
      const ws = Math.round(AH * 0.3), wx = Math.round(x0 + W * 0.68), wy = y0 + Math.round(AH * 0.2);
      bm.rect(wx - 2, wy - 2, ws + 4, ws + 4, dim(P.wood2, n));
      const lit = n > 0.35;
      for (let y = 0; y < ws; y++) for (let x = 0; x < ws; x++) bm.put(wx + x, wy + y, lit ? (y < ws / 2 ? P.warm : P.warm2) : dim((x + y) % 7 === 0 ? P.glass : P.glass2, n));
      bm.rect(wx + Math.round(ws / 2), wy, 1, ws, dim(P.wood2, n)); bm.rect(wx, wy + Math.round(ws / 2), ws, 1, dim(P.wood2, n));
      if (lit) for (let y = -6; y <= ws + 8; y++) for (let x = -6; x <= ws + 6; x++) { if (x >= 0 && x < ws && y >= 0 && y < ws) continue; const d = Math.max(Math.abs(x - ws / 2) - ws / 2, Math.abs(y - ws / 2) - ws / 2); if (d > 0 && (1 - d / 7) * 0.5 > thr(wx + x, wy + y)) bm.tint(wx + x, wy + y, P.warm, 0.25); }
    },
    // Kampüs: taş cephe, sütunlar, alınlık, basamaklar
    campus(bm, ax, s) {
      const { AH, base, n } = s, W = Math.round(AH * 2.3), WH = Math.round(AH * 1.32);
      const x0 = Math.round(ax - W * 0.62), y0 = base - WH;
      bm.rect(x0, y0, W, WH, dim(P.stone, n));
      // alınlık
      const PH = Math.round(AH * 0.3);
      for (let j = 0; j < PH; j++) { const inset = Math.round((j / PH) * W * 0.48); bm.rect(x0 - 3 + inset, y0 - j - 1, W + 6 - inset * 2, 1, j ? dim(P.stone3, n) : dim(P.stone2, n)); }
      bm.rect(x0 - 4, y0 - 1, W + 8, 3, dim(P.stone2, n));
      const label = "KAMPÜS", lw = bm.textWidth(label);
      bm.text(x0 + Math.round(W / 2 - lw / 2), y0 + 4, label, dim(P.ink, n, 0.3));
      // sütunlar ve aralarda pencereler
      const cols = 6, gap = (W - 8) / (cols - 1), colW = Math.max(3, Math.round(AH * 0.07));
      for (let i = 0; i < cols; i++) {
        const cx = Math.round(x0 + 4 + i * gap - colW / 2);
        bm.rect(cx, y0 + 12, colW, WH - 18, dim(P.stone3, n)); bm.rect(cx + colW - 1, y0 + 12, 1, WH - 18, dim(P.stone2, n));
        bm.rect(cx - 1, y0 + 11, colW + 2, 2, dim(P.stone2, n));
        if (i < cols - 1) {
          const wx = Math.round(cx + colW + 3), ww = Math.round(gap - colW - 6), wy = y0 + 18, wh = Math.round(WH * 0.42);
          const lit = n > 0.4 && (i % 2 === 0);
          bm.rect(wx, wy, ww, wh, lit ? P.warm2 : dim(P.win, n, 0.4)); bm.rect(wx, wy + Math.round(wh / 2), ww, 1, dim(P.stone2, n));
        }
      }
      // basamaklar
      for (let k = 0; k < 3; k++) bm.rect(x0 - 2 - k * 3, base - 3 + k - 3, W + 4 + k * 6, 2, dim(k % 2 ? P.stone2 : P.stone3, n));
    },
    // Tepe: büyük ağaç ve bank; gün batımına bakar
    hill(bm, ax, s) {
      const { AH, base, n } = s;
      const tx = Math.round(ax - AH * 0.95), ty = base - Math.round(AH * 1.05), R = Math.round(AH * 0.42);
      bm.rect(tx - 2, ty, 5, base - ty, dim(P.trunk, n)); bm.rect(tx + 2, ty, 1, base - ty, dim(P.wood2, n));
      const blobs = [[0, 0, 1], [-0.7, 0.3, 0.75], [0.7, 0.35, 0.72], [0.2, -0.55, 0.7]];
      for (const [dx, dy, rr] of blobs) {
        const cx = tx + dx * R, cy = ty - R * 0.5 + dy * R, r = R * rr;
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) bm.put(Math.round(cx + x), Math.round(cy + y), (x + y > r * 0.4) ? dim(P.leaf2, n) : dim(P.leaf, n));
      }
      // bank
      const bw = Math.round(AH * 0.6), bx = Math.round(ax - AH * 0.48 - bw), sy = base - Math.round(AH * 0.24);
      bm.rect(bx, sy, bw, 3, dim(P.wood, n)); bm.rect(bx, sy - 9, bw, 2, dim(P.wood, n)); bm.rect(bx, sy - 5, bw, 2, dim(P.wood, n));
      for (const lx of [bx + 2, bx + bw - 4]) bm.rect(lx, sy + 3, 2, base - sy - 3, dim(P.wood2, n));
      bm.rect(bx + 1, sy - 9, 2, 12, dim(P.wood2, n)); bm.rect(bx + bw - 3, sy - 9, 2, 12, dim(P.wood2, n));
    },
    // Kafe: ahşap cephe, çizgili tente, sıcak vitrin, içeride iki kişi
    cafe(bm, ax, s) {
      const { AH, base, n, t } = s, W = Math.round(AH * 1.8), WH = Math.round(AH * 1.15);
      const x0 = Math.round(ax - W * 0.72), y0 = base - WH;
      bm.rect(x0, y0, W, WH, dim(P.cafe, n, 0.5)); bm.rect(x0, y0, W, 2, dim(P.cafe2, n, 0.5));
      const label = "KAFE", lw = bm.textWidth(label), lx = x0 + W - lw - 9; // tabela solda, kafe adı sağda kalsın
      bm.rect(lx - 3, y0 + 3, lw + 6, 9, dim(P.awn, n, 0.4)); bm.text(lx, y0 + 5, label, P.ink);
      // tente
      const ay = y0 + 15, ah = 6;
      for (let x = -3; x < W + 3; x++) for (let y = 0; y < ah; y++) bm.put(x0 + x, ay + y, (Math.floor((x + 3) / 5) % 2) ? dim(P.awn2, n, 0.5) : dim(P.awn, n, 0.5));
      for (let x = -3; x < W + 3; x += 5) bm.rect(x0 + x, ay + ah, 3, 2, (Math.floor((x + 3) / 5) % 2) ? dim(P.awn2, n, 0.5) : dim(P.awn, n, 0.5));
      // vitrin: içerisi sıcak, iki kişi
      const vx = x0 + 5, vy = ay + ah + 5, vw = Math.round(W * 0.58), vh = base - vy - 8;
      bm.rect(vx - 2, vy - 2, vw + 4, vh + 4, P.cafe2);
      for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) bm.put(vx + x, vy + y, y < vh * 0.55 ? P.warm : P.warm2);
      const sway = Math.round(Math.sin(t / 900));
      const person = (px, py, shirt) => { bm.disc(px, py, 3, P.ink); bm.rect(px - 5, py + 4, 11, 7, shirt); };
      person(vx + Math.round(vw * 0.28), vy + Math.round(vh * 0.38) + sway, H("#5f7f9a")); person(vx + Math.round(vw * 0.72), vy + Math.round(vh * 0.4), H("#c9583a"));
      bm.rect(vx + Math.round(vw * 0.4), vy + Math.round(vh * 0.68), Math.round(vw * 0.2), 2, P.cafe2);
      bm.rect(vx + Math.round(vw / 2), vy, 1, vh, P.cafe2);
      // ışık dışarı taşar
      for (let y = 0; y < 10; y++) for (let x = -4; x < vw + 4; x++) if ((1 - y / 10) * 0.6 * Math.max(0.35, n) > thr(vx + x, base - 6 + y)) bm.tint(vx + x, base - 6 + y, P.warm, 0.22);
      // kapı
      const dx = vx + vw + 6, dw = Math.round(AH * 0.26);
      bm.rect(dx, vy - 2, dw, base - vy + 2, P.cafe2); bm.rect(dx + 2, vy, dw - 4, Math.round((base - vy) * 0.45), P.warm2); bm.rect(dx + dw - 4, vy + Math.round((base - vy) * 0.6), 2, 2, P.knob);
    },
  };

  return { N, draw };
})();
