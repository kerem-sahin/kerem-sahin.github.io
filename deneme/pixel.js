/* Piksel gün: ortak piksel motoru.
   Dünya (gökyüzü, tepeler, avatar, lamba) ve sekiz uygulamanın küçük sahneleri aynı ızgarada,
   aynı palet ve aynı damalı (Bayer) geçişlerle çizilir. Hiç görsel dosyası yok; avatar hariç. */
window.PX = (() => {
  "use strict";
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(lerp(a[i], b[i], t)));
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const thr = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16;

  // ── Palet: arayüz renksiz, renk sadece çizimlerde ve hep bu küçük kümeden.
  const C = {
    ink: hex("#1c1b19"), paper: hex("#f3eee4"), cream: hex("#fffaf0"), grey: hex("#8a857a"),
    navy: hex("#14243a"), navy2: hex("#1d3354"), navy3: hex("#2e4a73"),
    amber: hex("#f0b44c"), amber2: hex("#c98d2a"), amber3: hex("#f7cf7a"),
    coral: hex("#e5502e"), coral2: hex("#b83a1f"),
    sky: hex("#7fb4e8"), teal: hex("#a8e6cf"),
    leaf: hex("#5f7b4c"), leaf2: hex("#3f5a34"), leaf3: hex("#7f9b5c"),
    wood: hex("#8a5a3a"), wood2: hex("#5a3a26"), wood3: hex("#b07a50"),
    warm: hex("#ffd08a"), night: hex("#0b0d16"),
  };

  // ── Saat → gökyüzü (tepe → ufuk, dört durak)
  // Saat 24'ü geçince gün başa sarar (x = m mod 1440): gece yarısından ertesi sabaha kesintisiz.
  const NIGHT = ["#05071a", "#0b1029", "#151b3d", "#1f2649"];
  const SKY = [
    [0, NIGHT], [255, NIGHT], [300, ["#0d1230", "#1d2150", "#3a2f62", "#6a4a6e"]],
    [330, ["#151938", "#2d2f5e", "#6a4f86", "#d98a78"]],
    [450, ["#5b8ccc", "#8db3e2", "#efc6a4", "#fbe2bf"]],
    [760, ["#3d84d6", "#67a3e6", "#a8cbf0", "#d9eaf7"]],
    [1000, ["#4f86cf", "#7eaee4", "#c2d6ea", "#efe2c8"]],
    [1080, ["#2e3d7a", "#7a5a9a", "#e57f69", "#f6c179"]],
    [1190, ["#161c3e", "#2a2f5c", "#523f76", "#8f5d7c"]],
    [1290, ["#080b1e", "#0f1531", "#1a2146", "#283057"]],
    [1440, NIGHT],
  ].map(([m, c]) => [m, c.map(hex)]);
  function keyed(table, m){
    for (let i = 0; i < table.length - 1; i++){
      const [ma, a] = table[i], [mb, b] = table[i + 1];
      if (m <= mb){ const t = clamp((m - ma) / (mb - ma)); return Array.isArray(a[0]) ? a.map((c, k) => mix(c, b[k], t)) : a.map((v, k) => lerp(v, b[k], t)); }
    }
    return table[table.length - 1][1];
  }
  const wrap = m => ((m % 1440) + 1440) % 1440;
  const skyAt = m => keyed(SKY, wrap(m));
  const nightness = m => { const x = wrap(m); return x >= 720 ? clamp((x - 1110) / 160) : clamp((345 - x) / 75); };
  const sunArc = m => clamp((wrap(m) - 360) / (1170 - 360));
  const AMB = [
    [0, [.27, .31, .52]], [270, [.27, .31, .52]],
    [330, [.58, .56, .76]], [450, [1, .95, .9]], [760, [1, 1, 1]], [1000, [1, .96, .9]],
    [1080, [.98, .8, .68]], [1150, [.72, .6, .7]], [1210, [.44, .44, .66]], [1290, [.3, .34, .56]], [1440, [.27, .31, .52]],
  ];
  const ambAt = m => keyed(AMB, wrap(m));
  const lampOnAt = m => { const x = wrap(m); return x < 720 ? clamp((450 - x) / 80) : clamp((x - 1110) / 80); };

  // ── Bitmap: tek bir Uint8ClampedArray; her şey buna yazılır, sonra tek putImageData.
  function Bitmap(w, h){
    const d = new Uint8ClampedArray(w * h * 4);
    const bm = { w, h, d };
    bm.put = (x, y, c) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
    bm.get = (x, y) => { x = clamp(x | 0, 0, w - 1); y = clamp(y | 0, 0, h - 1); const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    bm.rect = (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) bm.put(x + i, y + j, c); };
    // a: 0..1 yoğunluk; damalı doldurur (piksel sanatında yarı saydamlık yerine)
    bm.dither = (x, y, rw, rh, c, a) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) if (a > thr(x + i, y + j)) bm.put(x + i, y + j, c); };
    // Renge doğru karıştır; dizi üretmeden (her karede binlerce kez çağrılıyor, telefonda çöp toplama kasıyordu).
    bm.tint = (x, y, c, k) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4;
      d[i] += (c[0] - d[i]) * k; d[i + 1] += (c[1] - d[i + 1]) * k; d[i + 2] += (c[2] - d[i + 2]) * k; d[i + 3] = 255; };
    bm.vgrad = (x, y, rw, rh, cols) => {
      const n = cols.length - 1;
      for (let j = 0; j < rh; j++){ const t = (j / Math.max(1, rh)) * n, i0 = Math.min(n - 1, t | 0), f = t - i0;
        for (let i = 0; i < rw; i++) bm.put(x + i, y + j, f > thr(x + i, y + j) ? cols[i0 + 1] : cols[i0]); }
    };
    bm.disc = (cx, cy, r, c) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * .6) bm.put(cx + i, cy + j, c); };
    bm.line = (x0, y0, x1, y1, c, dash = 0) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
      for (let k = 0; k <= n; k++){ if (dash && ((k / dash) | 0) % 2) continue; bm.put(Math.round(lerp(x0, x1, k / (n || 1))), Math.round(lerp(y0, y1, k / (n || 1))), c); }
    };
    bm.sprite = (x, y, rows, pal) => rows.forEach((row, j) => { for (let i = 0; i < row.length; i++){ const c = pal[row[i]]; if (c) bm.put(x + i, y + j, c); } });
    bm.text = (x, y, s, c) => {
      for (const ch of String(s)){
        const g = FONT[ch] || LETTERS[ch];
        if (!g){ x += 4; continue; }
        if (Array.isArray(g)){ if (g.length) bm.sprite(x, y, g, { x: c }); x += ch === " " ? 2 : g[0].length + 1; continue; }
        bm.sprite(x, y, g.b, { x: c });
        if (g.a) bm.sprite(x, y - 2, [g.a], { x: c });
        if (g.c) bm.sprite(x, y + 5, [g.c], { x: c });
        x += g.b[0].length + 1;
      }
      return x;
    };
    bm.textWidth = (s) => { let w = 0; for (const ch of String(s)){ const g = FONT[ch] || LETTERS[ch]; w += !g ? 4 : Array.isArray(g) ? (ch === " " ? 2 : g[0].length + 1) : g.b[0].length + 1; } return w - 1; };
    let img = null;
    bm.blit = (g) => { if (!img) img = g.createImageData(w, h); img.data.set(d); g.putImageData(img, 0, 0); };
    return bm;
  }

  // ── 3×5 piksel yazı (sadece gereken karakterler)
  const FONT = {
    "0": ["xxx", "x.x", "x.x", "x.x", "xxx"], "1": [".x.", "xx.", ".x.", ".x.", "xxx"], "2": ["xxx", "..x", "xxx", "x..", "xxx"],
    "3": ["xxx", "..x", ".xx", "..x", "xxx"], "4": ["x.x", "x.x", "xxx", "..x", "..x"], "5": ["xxx", "x..", "xxx", "..x", "xxx"],
    "6": ["xxx", "x..", "xxx", "x.x", "xxx"], "7": ["xxx", "..x", ".x.", ".x.", ".x."], "8": ["xxx", "x.x", "xxx", "x.x", "xxx"],
    "9": ["xxx", "x.x", "xxx", "..x", "xxx"], ":": [".", "x", ".", "x", "."], ".": [".", ".", ".", ".", "x"],
    "°": ["xx", "xx", "..", "..", ".."], "{": [".xx", ".x.", "x..", ".x.", ".xx"], "}": ["xx.", ".x.", "..x", ".x.", "xx."],
    ">": ["x..", ".x.", "..x", ".x.", "x.."], "±": [".x.", "xxx", ".x.", "...", "xxx"], " ": [],
  };

  // Büyük harfler (3×5, M ve N daha geniş) + Türkçe harfler: noktalar/şapka üstte, çengel altta.
  const L = {
    A: [".x.", "x.x", "xxx", "x.x", "x.x"], B: ["xx.", "x.x", "xx.", "x.x", "xx."], C: [".xx", "x..", "x..", "x..", ".xx"],
    D: ["xx.", "x.x", "x.x", "x.x", "xx."], E: ["xxx", "x..", "xx.", "x..", "xxx"], F: ["xxx", "x..", "xx.", "x..", "x.."],
    G: [".xx", "x..", "x.x", "x.x", ".xx"], H: ["x.x", "x.x", "xxx", "x.x", "x.x"], I: ["xxx", ".x.", ".x.", ".x.", "xxx"],
    J: ["..x", "..x", "..x", "x.x", ".x."], K: ["x.x", "x.x", "xx.", "x.x", "x.x"], L: ["x..", "x..", "x..", "x..", "xxx"],
    M: ["x...x", "xx.xx", "x.x.x", "x...x", "x...x"], N: ["x..x", "xx.x", "x.xx", "x..x", "x..x"], O: [".x.", "x.x", "x.x", "x.x", ".x."],
    P: ["xx.", "x.x", "xx.", "x..", "x.."], R: ["xx.", "x.x", "xx.", "x.x", "x.x"], S: [".xx", "x..", ".x.", "..x", "xx."],
    T: ["xxx", ".x.", ".x.", ".x.", ".x."], U: ["x.x", "x.x", "x.x", "x.x", "xxx"], V: ["x.x", "x.x", "x.x", "x.x", ".x."], W: ["x...x", "x...x", "x.x.x", "xx.xx", "x...x"],
    Y: ["x.x", "x.x", ".x.", ".x.", ".x."], Z: ["xxx", "..x", ".x.", "x..", "xxx"],
  };
  const LETTERS = {};
  for (const k in L) LETTERS[k] = { b: L[k] };
  Object.assign(LETTERS, {
    "Ç": { b: L.C, c: ".x." }, "Ş": { b: L.S, c: ".x." }, "Ö": { b: L.O, a: "x.x" }, "Ü": { b: L.U, a: "x.x" },
    "İ": { b: L.I, a: ".x." }, "Ğ": { b: L.G, a: "xxx" }, "-": { b: ["...", "...", "xxx", "...", "..."] }, ",": { b: ["..", "..", "..", ".x", "x."] },
  });

  // ── AVATAR: 100×320 piksel çizim 4×4 bloklara indirilir (koyu kontur korunur) → manzarayla aynı ızgara.
  let AV = null;
  function buildAvatar(img, k = 4){
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const src = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
    const w = Math.ceil(W / k), h = Math.ceil(H / k), px = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
      const all = new Map(), dark = new Map(); let tot = 0, op = 0, dk = 0;
      for (let j = y * k; j < Math.min(H, y * k + k); j++) for (let i = x * k; i < Math.min(W, x * k + k); i++){
        tot++; const o = (j * W + i) * 4; if (src[o + 3] < 128) continue; op++;
        const key = (src[o] << 16) | (src[o + 1] << 8) | src[o + 2];
        all.set(key, (all.get(key) || 0) + 1);
        if (.3 * src[o] + .59 * src[o + 1] + .11 * src[o + 2] < 45){ dk++; dark.set(key, (dark.get(key) || 0) + 1); }
      }
      if (op * 2 < tot) continue;
      const pick = mp => [...mp.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const key = dk * 3 >= op ? pick(dark) : pick(all);
      px[y * w + x] = [key >> 16 & 255, key >> 8 & 255, key & 255];
    }
    AV = { w, h, px };
    return AV;
  }
  function loadAvatar(src){
    return new Promise(res => { const im = new Image(); im.onload = () => res(buildAvatar(im)); im.onerror = () => res(null); im.src = src; });
  }

  // ── DÜNYA ───────────────────────────────────────────────
  const STARS = (() => { const R = seeded(7); return Array.from({ length: 260 }, () => [R(), R(), R()]); })();
  const CLOUDS = (() => { const R = seeded(21); return Array.from({ length: 6 }, (_, i) => ({ x: R(), y: .08 + R() * .3, s: .6 + R() * .7, v: .004 + R() * .006, seed: i * 31 + 5 })); })();
  function cloudShape(seed){
    const R = seeded(seed), puffs = [];
    const n = 4 + (R() * 3 | 0);
    for (let i = 0; i < n; i++) puffs.push([(i - n / 2) * 5 + R() * 3, -R() * 4 - (i > 0 && i < n - 1 ? 2 : 0), 3 + R() * 3.5]);
    return puffs;
  }
  const CLOUD_SHAPES = CLOUDS.map(c => cloudShape(c.seed));

  /* o: { hz: ufuk satırı, t: ms, sunL/sunR: güneşin yatay yolu (0..1),
          av: { x: orta sütun, feet: satır, vis: 0..1 } | null } */
  function drawWorld(bm, m, o){
    const { w, h } = bm, hz = Math.round(o.hz), t = o.t || 0;
    const ox = o.ox || 0, OX = Math.round(ox); // yürüyüşte kamera konumu
    const sky = skyAt(m), n = nightness(m), sa = sunArc(m);
    // gökyüzü: 3 bant, geçişler damalı
    // en sık çalışan döngü: doğrudan diziye yaz
    const D = bm.d;
    for (let y = 0; y < Math.min(hz, h); y++){
      const f0 = (y / Math.max(1, hz)) * 3, i = Math.min(2, f0 | 0), f = f0 - i, a = sky[i], b = sky[i + 1], row = (y & 3) * 4;
      let o = y * w * 4;
      for (let x = 0; x < w; x++, o += 4){ const c = f > (BAYER[row + (x & 3)] + .5) / 16 ? b : a; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255; }
    }
    // yıldızlar (bazıları yavaşça göz kırpar)
    if (n > .05) for (let k = 0; k < STARS.length; k++){
      const [sx, sy, b] = STARS[k]; const x = sx * w | 0, y = sy * hz * .85 | 0;
      if (b >= n) continue;
      const tw = RM ? 1 : (Math.sin(t / 900 + k * 1.7) > -.6 ? 1 : 0);
      if (tw) bm.put(x, y, b < .08 ? C.cream : mix(C.cream, sky[0], .35));
    }
    // güneş
    const sunX = Math.round(w * lerp(o.sunL ?? .12, o.sunR ?? .88, sa));
    const x24 = wrap(m), elev = Math.sin(Math.PI * sa), sunUp = sa > 0 && sa < 1 && x24 < 1180;
    if (sunUp){
      const sy = Math.round(hz - elev * hz * .72), core = mix(hex("#fff4cf"), hex("#ffb36b"), 1 - elev);
      const R0 = Math.max(3, Math.round(h * .03)), R1 = R0 * 2.6;
      for (let y = -R1; y <= R1; y++) for (let x = -R1; x <= R1; x++){
        const r = Math.hypot(x, y), X = sunX + x, Y = sy + y;
        if (Y >= hz) continue;
        if (r <= R0) bm.put(X, Y, core);
        else if (r <= R1 && (1 - (r - R0) / (R1 - R0)) * .5 > thr(X, Y)) bm.tint(X, Y, core, .45);
      }
    }
    // ay
    if (n > .3){
      const mx = Math.round(w * (o.moonX ?? .8)), my = Math.round(hz * .22), r = Math.max(3, Math.round(h * .02));
      for (let y = -r - 3; y <= r + 3; y++) for (let x = -r - 3; x <= r + 3; x++){
        const d = Math.hypot(x, y), d2 = Math.hypot(x - r * .5, y - r * .25);
        if (d <= r && d2 > r * .8) bm.put(mx + x, my + y, hex("#ece8d6"));
        else if (d > r && d <= r + 3 && .25 * n > thr(mx + x, my + y)) bm.tint(mx + x, my + y, hex("#ece8d6"), .25);
      }
    }
    // bulutlar: gündüz beyaz, akşam pembe, gece neredeyse görünmez
    const cloudA = x24 < 720 ? smooth(320, 420, x24) : 1 - smooth(1150, 1240, x24);
    if (cloudA > .02){
      const lit = mix(hex("#ffffff"), sky[3], .25 + .5 * (1 - elev)), shade = mix(lit, sky[1], .45);
      CLOUDS.forEach((cl, k) => {
        const s = cl.s * Math.max(1, h / 160);
        const cx = ((((cl.x + (RM ? 0 : t / 1000 * cl.v * .2) - ox * .08 / w) % 1.2) + 1.2) % 1.2 - .1) * w, cy = cl.y * hz;
        for (const [px, py, pr] of CLOUD_SHAPES[k]){
          const X = cx + px * s, Y = cy + py * s, R = pr * s;
          for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++){
            if (x * x + y * y > R * R) continue;
            const XX = Math.round(X + x), YY = Math.round(Y + y); if (YY >= hz - 2) continue;
            const under = y > R * .25;
            bm.tint(XX, YY, under ? shade : lit, cloudA);
          }
        }
      });
    }
    // kuşlar: sabah ve gün batımında
    const birdA = Math.max(1 - Math.abs(x24 - 480) / 90, 1 - Math.abs(x24 - 1080) / 80);
    if (birdA > 0 && !RM){
      const bc = mix(hex("#2a2a35"), sky[0], .2);
      for (let k = 0; k < 3; k++){
        const bx = ((t / 1000 * (.012 + k * .003) + k * .21) % 1.3 - .15) * w, by = hz * (.3 + k * .07) + Math.sin(t / 400 + k) * 1.2;
        const flap = Math.floor(t / 220 + k) % 2;
        if (birdA > thr(bx | 0, by | 0)) bm.sprite(Math.round(bx), Math.round(by), flap ? ["x...x", ".x.x.", "..x.."] : [".....", "xx.xx", "..x.."], { x: bc });
      }
    }
    // uzak tepeler + yakın çayır
    const farD = mix(hex("#8aa39a"), sky[3], .35), farN = hex("#1b2244");
    const nearD = mix(C.leaf, sky[3], .12), nearN = hex("#121733"), nearD2 = mix(C.leaf2, sky[3], .08), nearN2 = hex("#0d1128");
    const u = h / 150; // tepe yükseklikleri ekran boyuna göre
    // gündüz → gece renkleri kare başına bir kez karıştırılır (damalı geçiş "karlı TV" gibi parlıyordu)
    const farC = mix(farD, farN, n), nearC = mix(nearD, nearN, n), nearC2 = mix(nearD2, nearN2, n);
    const bladeC = mix(mix(nearC, C.leaf3, .5), nearC, n);
    for (let x = 0; x < w; x++){
      const fx = (x + ox * .25) / Math.max(1, u), fn = (x + ox * .6) / Math.max(1, u), gx = x + OX;
      const fh = hz - Math.round(u * (7 + 4 * Math.sin(fx * .045 + 1) + 3 * Math.sin(fx * .11 + 2) + 2 * Math.sin(fx * .23)));
      const nh = hz + Math.round(u * (2 + 2 * Math.sin(fn * .03 + 4) + 1.5 * Math.sin(fn * .09)));
      for (let y = Math.max(0, Math.min(fh, hz)); y < h; y++){
        let c;
        if (y < nh) c = farC;
        else {
          const deep = (y - nh) / Math.max(1, h - nh);
          // çimen dokusu: kısa dikey çizgiler; gece kaybolur (gece çayırı düz ve sakin)
          const blade = n < .6 && ((gx * 7 + (y >> 1) * 13) % 23 === 0);
          c = blade ? bladeC : (deep > thr(gx + 1, y) * 1.4 ? nearC2 : nearC);
        }
        const o = (y * w + x) * 4; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255;
      }
    }
    // ağaçlar: iki tür (yuvarlak, sivri), ufuk çizgisinde
    const R = seeded(3);
    const TL = o.L ? Math.max(w * 1.6, o.L * .6) : w, TN = Math.round(14 * TL / w);
    const wrapX = (v) => o.L ? ((Math.round(v) % TL) + TL) % TL - 20 : v;
    for (let k = 0; k < TN; k++){
      const tx = wrapX((R() * TL) - ox * .6) | 0, base = hz + 2 + (R() * 3 * u | 0), th = Math.round((5 + R() * 5) * u * .8), kind = R() > .5;
      if (tx < -20 || tx > w + 20) continue;
      if (o.clear && tx > o.clear[0] && tx < o.clear[1]) continue;
      const leaf = mix(mix(hex("#3c5a30"), sky[3], .1), [12, 16, 36], n), dark = mix(hex("#2b4426"), [7, 10, 26], n);
      for (let y = 0; y < th; y++){
        const half = kind ? Math.max(0, Math.round((1 - y / th) * th * .32)) : Math.round(Math.sin(Math.PI * (y + 1) / (th + 1)) * th * .32);
        for (let x = -half; x <= half; x++) bm.put(tx + x, base - y - 1, x > 0 ? dark : leaf);
      }
    }
    // uzakta bir ev: gece penceresi yanar
    const hxp = wrapX(w * (o.houseX ?? .62) - ox * .6), hyp = hz + Math.round(u * 2);
    const wall = mix(mix(hex("#d9cbb0"), sky[3], .2), hex("#1a1f3a"), n), roof = mix(hex("#9a4a32"), hex("#141830"), n);
    const hs = Math.max(3, Math.round(u * 3));
    bm.rect(hxp - hs, hyp - hs * 2, hs * 2 + 1, hs * 2, wall);
    for (let j = 0; j <= hs; j++) bm.rect(hxp - hs - 1 + j, hyp - hs * 2 - j, (hs + 1 - j) * 2 + 1, 1, roof);
    bm.rect(hxp - 1, hyp - hs, 2, 2, n > .3 ? C.warm : mix(wall, C.ink, .3));

    // avatar yokken de lamba direği yerinde kalabilsin
    // yürüyüşün durakları (ev, kampüs, tepe, kafe) avatarın arkasında
    if (o.props) o.props(bm, hz, u, n, sky);
    if (o.av && AV && (o.av.vis > .01 || (o.av.lampVis ?? 0) > .01)) drawAvatar(bm, m, o.av, sunX, sunUp, elev, n, t);
  }

  const OUT = [0, 0, 0];
  function drawAvatar(bm, m, av, sunX, sunUp, elev, n, t){
    const { w, h } = bm, vis = av.vis;
    const ax = Math.round(av.x - AV.w / 2), footY = Math.round(av.feet), ay = footY - AV.h;
    const cxA = ax + AV.w / 2;
    const show = (X, Y) => vis >= 1 || vis > thr(X + 2, Y + 1); // damalı belirme/kaybolma
    // Sokak lambası: direk gün boyu yerinde; ışığı akşam yanar, sabah söner.
    const lampOn = lampOnAt(m), lampVis = av.lampVis ?? vis; // avatar eve girerken lamba yerinde kalır
    const lampX = ax + AV.w + Math.round(AV.w * .3), lampTop = footY - Math.round(AV.h * 1.12);
    const hx = lampX - 5, hy = lampTop + 3;
    if (lampOn > .02 && lampVis > .02){
      const G = Math.round(AV.h * .22);
      for (let y = -G; y <= G; y++) for (let x = -G; x <= G; x++){
        const r = Math.hypot(x, y); if (r > G || r < 3) continue;
        if ((1 - r / G) * .55 * lampOn * lampVis > thr(hx + x, hy + y)) bm.tint(hx + x, hy + y, C.warm, .28);
      }
      const PW = Math.round(AV.w * .9), PH = Math.max(3, Math.round(AV.h * .06));
      for (let y = -PH; y <= PH; y++) for (let x = -PW; x <= PW; x++){
        const e = (x / PW) ** 2 + (y / PH) ** 2; if (e > 1) continue;
        if ((1 - e) * .8 * lampOn * lampVis > thr(hx + x, footY + y - 1)) bm.tint(hx + x, footY + y - 1, C.warm, .32);
      }
    }
    // kenar ışığı
    let rimSide = 0, rimCol = null, rimA = 0;
    if (sunUp && elev < .75){ rimSide = sunX >= cxA ? 1 : -1; rimCol = mix(hex("#ffd9a0"), hex("#ff9a5a"), 1 - elev); rimA = .75 * (1 - elev / .75); }
    if (lampOn * lampVis > .2){ rimSide = 1; rimCol = hex("#ffd9a0"); rimA = Math.max(rimA * (1 - lampOn), .7 * lampOn * lampVis); }
    // gölge
    const shLen = sunUp ? Math.round(AV.w * (.5 + 2.4 * (1 - elev))) : Math.round(AV.w * .45);
    const shDir = sunUp ? (sunX >= cxA ? -1 : 1) : 0, shA = sunUp ? .7 : .45 * Math.max(n, .3);
    for (let dx = -Math.round(AV.w * .42); dx <= shLen; dx++){
      const tt = clamp(dx / Math.max(1, shLen)), hh = Math.max(1, Math.round(3.2 * (1 - tt * .6)));
      for (let dy = -hh; dy <= hh; dy++){
        const X = Math.round(cxA + (shDir || 1) * dx * (shDir ? 1 : .5)), Y = footY + dy - 1;
        const fall = (1 - Math.abs(dy) / (hh + 1)) * (1 - tt * .85) * shA * vis;
        if (fall > thr(X, Y)) bm.tint(X, Y, [8, 10, 24], .42);
      }
    }
    // avatar
    const amb = ambAt(m);
    const st = av.step || 0, halfW = AV.w / 2, legTop = Math.round(AV.h * .6), armTop = Math.round(AV.h * .3);
    for (let y = 0; y < AV.h; y++) for (let x = 0; x < AV.w; x++){
      const c = AV.px[y * AV.w + x]; if (!c) continue;
      let dy = 0;
      if (st){
        if (y >= legTop && ((st === 1 && x < halfW) || (st === 3 && x >= halfW))) dy = -2;
        else if (y >= armTop && y < legTop && (x < AV.w * .22 || x > AV.w * .78)) dy = ((st === 1) === (x < halfW)) ? 1 : -1;
      }
      const X = ax + x, Y = ay + y + dy; if (!show(X, Y)) continue;
      let r = c[0] * amb[0], g = c[1] * amb[1], b = c[2] * amb[2];
      if (lampOn * lampVis > .02){
        const L = lampOn * lampVis * .95 * (.45 + .55 * (x / AV.w)) * clamp(1 - Math.hypot(X - hx, Y - hy) / (AV.h * .95));
        r += c[0] * L; g += c[1] * L * .8; b += c[2] * L * .5;
      }
      if (rimA > 0){
        const nb = AV.px[y * AV.w + x + rimSide], nb2 = AV.px[y * AV.w + x + 2 * rimSide];
        const edge = (x + rimSide < 0 || x + rimSide >= AV.w || !nb) ? 1 : (!nb2 ? .45 : 0);
        if (edge){ const a = rimA * edge; r = lerp(r, rimCol[0], a); g = lerp(g, rimCol[1], a); b = lerp(b, rimCol[2], a); }
      }
      OUT[0] = Math.min(255, Math.round(r / 6) * 6); OUT[1] = Math.min(255, Math.round(g / 6) * 6); OUT[2] = Math.min(255, Math.round(b / 6) * 6);
      bm.put(X, Y, OUT);
    }
    // lamba direği
    if (lampVis > .02){
      const pole = mix(hex("#3a3d46"), hex("#14172a"), n), poleHi = mix(hex("#5a5e6a"), hex("#262a44"), n);
      const P2 = (x, y, c) => { if (lampVis >= 1 || lampVis > thr(x + 1, y + 2)) bm.put(x, y, c); };
      for (let y = lampTop; y < footY; y++){ P2(lampX, y, poleHi); P2(lampX + 1, y, pole); }
      for (let x = -1; x <= 2; x++){ P2(lampX + x, footY - 1, pole); P2(lampX + x, footY - 2, pole); }
      for (let x = hx - 1; x <= lampX; x++) P2(x, lampTop, pole);
      for (let x = hx - 3; x <= hx + 3; x++) P2(x, lampTop + 1, pole);
      const glass = lampOn > .3 ? [255, 236, 180] : mix(hex("#8a93a6"), hex("#2a3050"), n);
      for (let y = lampTop + 2; y <= lampTop + 4; y++) for (let x = hx - 2; x <= hx + 2; x++) P2(x, y, glass);
      for (let x = hx - 2; x <= hx + 2; x++) P2(x, lampTop + 5, pole);
    }
  }

  // ── UYGULAMA SAHNELERİ (128×72) ─────────────────────────
  const VW = 128, VH = 72;
  const cyc = (t, period) => RM ? .999 : (t % period) / period;

  // Katman · 07:30 — askıda üç kat: mont açık, içinde kazak, yakada tişört.
  function katman(bm, t){
    bm.vgrad(0, 0, VW, 60, skyAt(450));
    bm.rect(0, 60, VW, 12, hex("#e9dcc4")); bm.rect(0, 60, VW, 1, hex("#dccdb0"));
    // güneş ve bulut
    bm.disc(110, 10, 4, hex("#ffd36b")); bm.dither(103, 3, 15, 15, hex("#ffe9a8"), .0);
    const cd = RM ? 0 : Math.round(Math.sin(t / 1600) * 2);
    [[100, 15, 4], [105, 13, 5], [111, 15, 4], [96, 17, 3]].forEach(([x, y, r]) => bm.disc(x + cd, y, r, C.cream));
    bm.rect(93 + cd, 18, 23, 2, hex("#e3ecf6"));
    bm.text(6, 22, "14°", C.navy); bm.text(6, 29, "5°", mix(C.navy, C.paper, .5));
    // askı borusu
    bm.rect(18, 8, 92, 2, C.wood); bm.rect(18, 8, 92, 1, C.wood3); bm.rect(18, 0, 2, 9, C.wood2); bm.rect(108, 0, 2, 9, C.wood2);
    const sx = RM ? 0 : Math.round(Math.sin(t / 1100) * .7);
    // kanca
    bm.sprite(62, 5, ["..xx.", ".x..x", "....x", "...x.", "..x.."], { x: hex("#6a6a72") });
    const X0 = 64 + sx;
    // maske: 0 boş, 1 mont, 2 kazak, 3 tişört
    const M = new Uint8Array(VW * VH);
    const set = (x, y, v) => { if (x >= 0 && x < VW && y >= 0 && y < VH) M[y * VW + x] = v; };
    for (let y = 13; y <= 56; y++){
      const half = y === 13 ? 7 : y === 14 ? 10 : 12 + (y > 30 ? 1 : 0);
      for (let x = -half; x <= half; x++) set(X0 + x, y, 1);
      // kollar
      if (y >= 15 && y <= 47){ const off = Math.floor((y - 15) / 11); for (let k = 0; k < 4; k++){ set(X0 - 13 - k - off, y, 1); set(X0 + 13 + k + off, y, 1); } }
      // açık ön: kazak görünür
      const open = y < 24 ? 6 - Math.floor((y - 13) / 4) : 4;
      for (let x = -open; x <= open; x++) set(X0 + x, y, 2);
    }
    // kazağın V yakasında tişört
    [4, 4, 3, 3, 2, 2, 1, 1, 0].forEach((hw, i) => { for (let x = -hw; x <= hw; x++) set(X0 + x, 13 + i, 3); });
    for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++){
      const v = M[y * VW + x]; if (!v) continue;
      const dx = x - X0; let c;
      if (v === 1){
        c = dx < -6 ? C.navy3 : dx > 7 ? C.navy : C.navy2;
        if (Math.abs(dx) >= 13 && (y === 46 || y === 47)) c = C.navy; // manşet
        if ((y === 40) && ((dx >= -10 && dx <= -6) || (dx >= 6 && dx <= 10))) c = C.navy; // cep
        if ((dx === -7 || dx === 7) && y < 26 && y > 13) c = C.navy; // yaka
      } else if (v === 2){
        c = (x + y) % 4 === 0 ? C.amber2 : dx > 1 ? C.amber2 : C.amber;
        if (y >= 54) c = x % 2 ? C.amber2 : C.amber;
      } else c = dx > 0 ? hex("#d9d1c2") : C.cream;
      bm.put(x, y, c);
    }
    // düğmeler ve kontur
    [28, 35, 42].forEach(y => bm.put(X0 - 6, y, C.amber3));
    for (let y = 1; y < VH - 1; y++) for (let x = 1; x < VW - 1; x++){
      if (M[y * VW + x]) continue;
      if (M[y * VW + x - 1] || M[y * VW + x + 1] || M[(y - 1) * VW + x] || M[(y + 1) * VW + x]) bm.put(x, y, hex("#0e1622"));
    }

  }

  // plainday · 12:40 — "YARIN 18:00 ANNEMİ ARA" yazılır, takvimde yarının kutusuna oturur.
  function plainday(bm, t){
    const sky = skyAt(760);
    bm.vgrad(0, 0, VW, VH, [sky[1], sky[2], sky[3], C.paper]);
    const p = cyc(t, 6400), EDGE = hex("#2b3346"), SOFT = hex("#d9d2c4");
    // balon
    const L1 = "YARIN 18:00", L2 = "ANNEMİ ARA";
    const bw = Math.max(bm.textWidth(L1), bm.textWidth(L2)) + 12, bh = 24, bx = 6, by = 18;
    bm.rect(bx + 1, by, bw - 2, bh, EDGE); bm.rect(bx, by + 1, bw, bh - 2, EDGE);
    bm.rect(bx + 1, by + 1, bw - 2, bh - 2, C.cream);
    bm.rect(bx + 1, by + bh - 3, bw - 2, 2, SOFT);
    bm.sprite(bx + 7, by + bh, ["xxxx", "xxx.", "xx..", "x..."], { x: EDGE }); bm.sprite(bx + 8, by + bh - 1, ["xx", "x."], { x: C.cream });
    // harf harf yazılır
    const all = L1 + "|" + L2, shown = Math.floor(clamp((p - .04) / .3) * all.length);
    const s1 = all.slice(0, Math.min(shown, L1.length)), s2 = shown > L1.length + 1 ? all.slice(L1.length + 1, shown) : "";
    let x = bx + 6;
    const head = s1.slice(0, 6), time = s1.slice(6);
    x = bm.text(x, by + 6, head, C.ink); bm.text(x, by + 6, time, C.coral);
    bm.text(bx + 6, by + 14, s2, C.ink);
    if (p < .36 && Math.floor(t / 260) % 2 === 0){ const cx = shown <= L1.length ? bx + 6 + bm.textWidth(s1) + 2 : bx + 6 + bm.textWidth(s2) + 2; bm.rect(cx, shown <= L1.length ? by + 6 : by + 14, 1, 5, EDGE); }
    // ok: noktalar ilerler
    const ax = bx + bw + 4, ay = by + 10;
    for (let i = 0; i < 5; i++){ const on = p > .38 && (p > .55 || (Math.floor(t / 120) - i) % 5 === 0 || i < Math.floor((p - .38) / .03)); if (on) bm.put(ax + i * 2, ay, EDGE); }
    bm.sprite(ax + 10, ay - 2, ["x..", "xx.", "xxx", "xx.", "x.."], { x: p > .4 ? EDGE : SOFT });
    // takvim
    const cx = ax + 16, cy = 10, cs = 6;
    bm.rect(cx, cy, 7 * cs + 1, 5 * cs + 8, EDGE);
    bm.rect(cx + 1, cy + 1, 7 * cs - 1, 5, C.coral);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) bm.rect(cx + 1 + c * cs, cy + 7 + r * cs, cs - 1, cs - 1, C.cream);
    bm.rect(cx + 6, cy - 2, 1, 4, EDGE); bm.rect(cx + 7 * cs - 6, cy - 2, 1, 4, EDGE);
    // bugün: ince çerçeve; yarın: dolar
    const today = [cx + 1 + 2 * cs, cy + 7 + 1 * cs], tom = [today[0] + cs, today[1]];
    bm.rect(today[0], today[1], cs - 1, 1, C.grey);
    if (p > .58){ const blink = p < .7 ? Math.floor(t / 150) % 2 === 0 : true; if (blink) bm.rect(tom[0], tom[1], cs - 1, cs - 1, C.coral); }
    if (p > .7) bm.text(cx + 1, cy + 5 * cs + 11, "18:00", EDGE);
  }


  // SweetSpot · 18:00 — gün batımında saklı bir bank; harita iğnesi onu gösterir.
  function sweetspot(bm, t){
    const sky = skyAt(1085);
    bm.vgrad(0, 0, VW, 46, sky);
    bm.disc(102, 44, 7, hex("#ffcf7a")); bm.disc(102, 44, 5, hex("#fff0c4"));
    // deniz
    for (let y = 46; y < VH; y++) for (let x = 0; x < VW; x++){ const d = (y - 46) / 26; bm.put(x, y, d > thr(x, y) * 1.3 ? hex("#2b2f5a") : mix(sky[2], hex("#3b3f70"), .55)); }
    for (let k = 0; k < 14; k++){ const y = 48 + k * 2 - (k > 6 ? 0 : 0), len = 3 + (k % 3) * 2, ph = RM ? 0 : Math.sin(t / 500 + k) * 2;
      if ((Math.floor(t / 300) + k) % 3) bm.rect(Math.round(102 - len / 2 + ph + (k % 2 ? 4 : -4) * (k / 14)), y, len, 1, hex("#ffd9a0")); }
    // tepe (yamaç sağa doğru alçalır)
    for (let x = 0; x < 86; x++){
      const top = Math.round(30 + Math.pow(x / 86, 2.2) * 18 - Math.sin(x / 9) * 1.5);
      for (let y = top; y < VH; y++){ const lit = x - (y - top) * .4 > 40; bm.put(x, y, y === top ? hex("#c9a35a") : lit && thr(x, y) > .35 ? hex("#7a7440") : (thr(x, y) > .7 ? hex("#454a2c") : hex("#565a33"))); }
    }
    // patika
    for (let k = 0; k < 18; k++){ const s = k / 17, x = Math.round(lerp(4, 44, s) + Math.sin(s * 6) * 5), y = Math.round(lerp(70, 39, s)); if (k % 2 === 0) bm.rect(x, y, 2, 1, hex("#e9d6a8")); }
    // ağaç
    bm.rect(38, 22, 2, 15, C.wood2);
    for (let y = -9; y <= 7; y++) for (let x = -10; x <= 10; x++){ const e = (x / 10) ** 2 + (y / 8.5) ** 2; if (e > 1) continue; bm.put(36 + x, 18 + y, x > 4 && y < 2 && thr(x, y) > .4 ? hex("#a06a3a") : (e > .6 && thr(x + 36, y) > .5 ? hex("#2d3a22") : hex("#3d4c2a"))); }
    // bank
    bm.rect(44, 35, 11, 1, C.wood3); bm.rect(44, 36, 11, 1, C.wood2); bm.rect(44, 32, 11, 1, C.wood2); bm.put(45, 37, C.wood2); bm.put(53, 37, C.wood2); bm.put(45, 38, C.wood2); bm.put(53, 38, C.wood2);
    // iğne
    const bob = RM ? 0 : Math.round(Math.abs(Math.sin(t / 380)) * -3);
    bm.sprite(46, 17 + bob, [".xxxxx.", "xxxxxxx", "xxx.xxx", "xx...xx", "xxx.xxx", ".xxxxx.", "..xxx..", "...x..."], { x: C.coral });
    bm.put(49, 19 + bob, C.cream); bm.put(48, 20 + bob, C.cream); bm.put(50, 20 + bob, C.cream); bm.put(49, 21 + bob, C.cream); bm.put(49, 20 + bob, C.cream);
    bm.dither(46, 37, 7, 1, hex("#2d2a1c"), .5 + bob / 8);
    // kuşlar
    [[78, 12], [86, 9]].forEach(([x, y], k) => bm.sprite(x, y + (Math.floor(t / 260 + k) % 2), Math.floor(t / 260 + k) % 2 ? ["x.x", ".x."] : ["...", "x.x"], { x: hex("#3a2a44") }));
  }

  // here. · 19:50 — yukarıdan bir kafe: masalar, insanlar, mekânın çokgen sınırı ve sen.
  function here(bm, t){
    bm.rect(0, 0, VW, VH, hex("#1b2140"));
    bm.rect(0, 66, VW, 6, hex("#232a4c")); for (let x = 2; x < VW; x += 9) bm.rect(x, 68, 4, 1, hex("#39406a"));
    // kafe zemini (sıcak ışık)
    const fx = 22, fy = 6, fw = 86, fh = 54;
    bm.rect(fx - 2, fy - 2, fw + 4, fh + 4, hex("#2a2233"));
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++){
      const plank = (y % 6 === 0) || ((x + (Math.floor(y / 6) % 2) * 9) % 18 === 0);
      bm.put(fx + x, fy + y, plank ? hex("#5c3f2e") : hex("#6e4c36"));
    }
    // tavan lambalarının ışığı
    [[44, 22], [86, 22], [64, 46]].forEach(([lx, ly]) => { for (let y = -12; y <= 12; y++) for (let x = -14; x <= 14; x++){ const e = (x / 14) ** 2 + (y / 12) ** 2; if (e < 1 && (1 - e) * .5 > thr(lx + x, ly + y)) bm.tint(lx + x, ly + y, C.warm, .22); } });
    // tezgâh
    bm.rect(fx + 4, fy + 3, 26, 5, hex("#3a2a22")); bm.rect(fx + 4, fy + 3, 26, 1, hex("#8a6a4a"));
    // masalar ve sandalyeler
    const tables = [[46, 26], [70, 20], [92, 30], [50, 46], [84, 48]];
    tables.forEach(([x, y]) => { bm.rect(x - 4, y - 1, 2, 3, hex("#3a2a22")); bm.rect(x + 3, y - 1, 2, 3, hex("#3a2a22")); bm.disc(x, y, 3, hex("#c9a46a")); bm.put(x - 1, y - 1, hex("#e3c48c")); });
    // insanlar (yukarıdan: saç + omuz)
    const person = (x, y, shirt, hair) => { bm.rect(x - 2, y + 1, 5, 2, shirt); bm.rect(x - 1, y - 1, 3, 2, hair); };
    const sway = RM ? 0 : Math.round(Math.sin(t / 900));
    person(40, 24, C.amber, hex("#2a1a12")); person(53, 27, C.sky, hex("#5a3a22"));
    person(64, 18, C.cream, hex("#1a1a1a")); person(77, 21 + sway, C.teal, hex("#3a2a1a"));
    person(98, 29, hex("#b9a3d8"), hex("#2a1a12")); person(44, 47, hex("#9fb8b4"), hex("#5a3a22"));
    // sen
    const me = [78, 47];
    const pp = cyc(t, 1800), r = 3 + pp * 11;
    for (let a = 0; a < 72; a++){ const x = Math.round(me[0] + Math.cos(a / 72 * 6.283) * r), y = Math.round(me[1] + 1 + Math.sin(a / 72 * 6.283) * r); if ((1 - pp) > thr(x, y) * .9) bm.put(x, y, C.coral); }
    person(me[0], me[1], C.coral, hex("#2a1a12"));
    // merhaba balonu
    if (Math.floor(t / 2600) % 2 === 0 || RM){ bm.rect(83, 38, 9, 6, C.cream); bm.put(84, 44, C.cream); bm.rect(85, 40, 5, 1, C.grey); bm.rect(85, 42, 3, 1, C.grey); }
    // mekânın çokgen sınırı (kesik çizgi, akıyor)
    const poly = [[19, 3], [112, 3], [112, 40], [118, 62], [19, 63]];
    const march = RM ? 0 : Math.floor(t / 140);
    poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      for (let k = 0; k <= n; k++) if (((k + march) >> 1) % 2 === 0) bm.put(Math.round(lerp(a[0], b[0], k / n)), Math.round(lerp(a[1], b[1], k / n)), C.cream); });
    // dışarıda, sınırın ötesinde yürüyenler (soluk)
    const wx = RM ? 8 : Math.floor((t / 120) % 140) - 8;
    person(wx, 68, hex("#59608a"), hex("#2a2a3a")); person(124 - Math.floor(wx * .7) % 130, 69, hex("#59608a"), hex("#2a2a3a"));
  }

  // notecook · 21:00 — masa lambası, iPad'de el yazısı, bir kupa çay.
  function notecook(bm, t){
    bm.rect(0, 0, VW, 42, hex("#1c1e30")); bm.dither(0, 0, VW, 42, hex("#232640"), .3);
    bm.rect(0, 42, VW, 30, C.wood2); bm.rect(0, 42, VW, 1, C.wood); for (let y = 46; y < VH; y += 5) bm.dither(0, y, VW, 1, hex("#4a2e1e"), .7);
    // ışık konisi
    for (let y = 22; y < VH; y++){ const k = (y - 22) / 50, x0 = Math.round(30 - k * 6), x1 = Math.round(34 + k * 82);
      for (let x = x0; x < x1; x++){ const edge = Math.min(x - x0, x1 - x) / 10; if (clamp(edge) * .45 > thr(x, y)) bm.tint(x, y, C.warm, y > 42 ? .3 : .16); } }
    // lamba
    bm.rect(8, 54, 14, 3, hex("#2a2c36")); bm.rect(9, 53, 12, 1, hex("#3a3d4a"));
    bm.line(14, 53, 20, 33, hex("#3a3d4a")); bm.line(15, 53, 21, 33, hex("#2a2c36"));
    bm.line(20, 33, 28, 22, hex("#3a3d4a")); bm.line(21, 33, 29, 22, hex("#2a2c36"));
    bm.sprite(24, 17, ["..xxxxx..", ".xxxxxxx.", "xxxxxxxxxx", "xxxxxxxxxxx"], { x: hex("#c9a35a") });
    bm.rect(27, 21, 7, 1, hex("#fff1c4"));
    // iPad (yatay)
    const ix = 40, iy = 44, iw = 60, ih = 25;
    bm.rect(ix, iy, iw, ih, hex("#121214")); bm.rect(ix + 2, iy + 2, iw - 4, ih - 4, hex("#f7f1e4"));
    for (let y = iy + 6; y < iy + ih - 3; y += 4) bm.dither(ix + 3, y, iw - 6, 1, hex("#e2d8c4"), .8);
    // el yazısı: iki satır, kalem ilerledikçe çizilir
    const p = cyc(t, 6500), lines = [[iy + 5, 44], [iy + 9, 36], [iy + 13, 40]];
    let tip = null;
    lines.forEach(([y, L], li) => {
      const start = li * .26, f = clamp((p - start) / .24), n = Math.round(L * f);
      for (let k = 0; k < n; k++){ const x = ix + 5 + k, yy = y + Math.round(Math.sin(k * .9 + li) * 1.1 + Math.sin(k * .37) * .6); if (k % 9 !== 8) bm.put(x, yy, C.ink); if (k === n - 1) tip = [x, yy]; }
    });
    // arama vurgusu: el yazısında bulunan kelime
    if (p > .82){ bm.dither(ix + 18, iy + 3, 12, 5, C.amber, .55); }
    if (tip && p < .8){ bm.line(tip[0], tip[1], tip[0] + 6, tip[1] - 9, hex("#f2f2f2")); bm.put(tip[0], tip[1], C.ink); }
    // kupa + buhar
    bm.rect(108, 52, 9, 10, hex("#e9e2d4")); bm.rect(117, 54, 2, 5, hex("#e9e2d4")); bm.rect(109, 53, 7, 1, hex("#7a4a2a")); bm.rect(108, 61, 9, 1, hex("#c9c0ae"));
    for (let k = 0; k < 3; k++){ const s = cyc(t + k * 700, 2100), y = Math.round(50 - s * 10), x = 110 + k * 2 + Math.round(Math.sin(s * 6 + k) * 1.2); if (s < .8) bm.put(x, y, mix(hex("#c9c0ae"), hex("#1c1e30"), s)); }
  }

  // 85 Milyonda 1 · 22:30 — gece şehri; pencereler yanıp söner, biri sensin.
  function milyonda(bm, t){
    bm.vgrad(0, 0, VW, VH, skyAt(1350));
    const R = seeded(12); for (let k = 0; k < 40; k++){ const x = R() * VW | 0, y = R() * 30 | 0; if ((Math.floor(t / 900) + k) % 7) bm.put(x, y, mix(C.cream, C.night, .3)); }
    bm.disc(112, 10, 3, hex("#ece8d6")); bm.disc(114, 9, 3, skyAt(1350)[0]);
    bm.text(4, 4, "85 000 000", mix(C.cream, C.night, .25));
    const RB = seeded(44); let x = 0, wi = 0, me = null;
    while (x < VW){
      const bw = 9 + (RB() * 9 | 0), top = 22 + (RB() * 30 | 0), col = RB() > .5 ? hex("#151a33") : hex("#1b2140");
      bm.rect(x, top, bw - 1, VH - top, col);
      for (let y = top + 3; y < VH - 2; y += 4) for (let xx = x + 2; xx < x + bw - 3; xx += 3){
        wi++;
        const isMe = wi === 57;
        const h = Math.sin(wi * 12.9898 + Math.floor((RM ? 0 : t) / 1100 + wi * .13) * 78.233) * 43758.5453;
        const on = (h - Math.floor(h)) > .55;
        const c = isMe ? C.coral : on ? ((wi % 9 === 0) ? hex("#bcd3ff") : C.warm) : hex("#262c52");
        bm.rect(xx, y, 1, 2, c);
        if (isMe) me = [xx, y];
      }
      x += bw;
    }
    if (me){ const b = RM ? 0 : Math.round(Math.abs(Math.sin(t / 400)) * -2); bm.sprite(me[0] - 2, me[1] - 9 + b, ["xxxxx", ".xxx.", "..x.."], { x: C.coral }); bm.text(me[0] - 1, me[1] - 16 + b, "1", C.cream); }
  }

  // Fiziyoo · 23:40 — klinikte duruş panosu: önünde biri duruyor, tripoddaki telefon fotoğraflıyor,
  // omuz ve leğen çizgisi ile şakul çiziliyor; ölçüm hata payıyla okunuyor.
  function fiziyoo(bm, t){
    bm.rect(0, 0, VW, 58, hex("#161a26")); bm.dither(0, 0, VW, 58, hex("#1b2030"), .3);
    bm.rect(0, 58, VW, 14, hex("#222738")); bm.rect(0, 58, VW, 1, hex("#323850"));
    // tavan lambası ışığı panoya düşer
    for (let y = 0; y < 58; y++){ const k = y / 58, x0 = Math.round(62 - 10 - k * 18), x1 = Math.round(88 + 10 + k * 18);
      for (let x = x0; x < x1; x++){ const e = Math.min(x - x0, x1 - x) / 8; if (clamp(e) * .35 > thr(x, y)) bm.tint(x, y, hex("#e8f0ec"), .12); } }
    // duruş panosu (ızgaralı)
    const gx = 50, gy = 5, gw = 50, gh = 52;
    bm.rect(gx - 1, gy - 1, gw + 2, gh + 2, hex("#3a4258"));
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) bm.put(gx + x, gy + y, (x % 5 === 0 || y % 5 === 0) ? hex("#a9b8b3") : hex("#d3ddd8"));
    const cx = gx + 25;
    // şakul: üstte ip, ucunda ağırlık
    for (let y = gy; y < gy + gh; y++) if ((y >> 1) % 2 === 0) bm.put(cx, y, C.amber);
    bm.rect(cx - 1, gy + 1, 3, 2, C.amber2);
    // kişi (önden): ten, tişört, şort; sağ omuz 1 piksel aşağıda
    const skin = hex("#d9a07a"), skin2 = hex("#b9805c"), shirt = hex("#5f7f9a"), shirt2 = hex("#4b6680"), shorts = hex("#2e3a4f"), hair = hex("#2a1a12");
    const top = 10;
    const HEAD = [2, 3, 3, 3, 3, 3, 2];
    HEAD.forEach((hw, i) => { for (let x = -hw; x <= hw; x++) bm.put(cx + x, top + i, i < 2 ? hair : (x > 1 ? skin2 : skin)); });
    bm.put(cx - 3, top + 2, hair); bm.put(cx + 3, top + 2, hair);
    bm.rect(cx - 1, top + 7, 3, 2, skin2);
    for (let y = 0; y < 16; y++){ // gövde
      const hw = y < 2 ? 8 : Math.round(lerp(8, 6, y / 15)), Y = top + 9 + y;
      for (let x = -hw; x <= hw; x++) bm.put(cx + x, Y + (y === 0 && x > 4 ? 1 : 0), x > 2 ? shirt2 : shirt);
    }
    for (let y = 0; y < 15; y++){ // kollar (gövdeden 1 piksel boşlukla)
      const Y = top + 10 + y, ax = 10 - (y > 9 ? 1 : 0), col = y < 6 ? shirt : skin, col2 = y < 6 ? shirt2 : skin2;
      bm.put(cx - ax, Y, col); bm.put(cx - ax - 1, Y, col); bm.put(cx + ax, Y + 1, col2); bm.put(cx + ax + 1, Y + 1, col2);
    }
    for (let y = 0; y < 5; y++) for (let x = -6; x <= 6; x++) if (!(y > 2 && x === 0)) bm.put(cx + x, top + 25 + y, shorts);
    for (let y = 0; y < 17; y++){ // bacaklar
      const Y = top + 30 + y;
      for (let k = 1; k <= 3; k++){ bm.put(cx - k - 1, Y, skin); bm.put(cx + k + 1, Y, skin2); }
    }
    bm.rect(cx - 6, top + 47, 4, 1, hex("#1a1a20")); bm.rect(cx + 3, top + 47, 4, 1, hex("#1a1a20"));
    // ölçüm çizgileri ve eklemler
    const s0 = [cx - 9, top + 9], s1 = [cx + 9, top + 10], h0 = [cx - 6, top + 25], h1 = [cx + 6, top + 26];
    bm.line(s0[0] - 4, s0[1], s1[0] + 4, s1[1] + 1, C.coral); bm.line(h0[0] - 4, h0[1], h1[0] + 4, h1[1] + 1, C.coral);
    [s0, s1, h0, h1, [cx - 3, top + 38], [cx + 3, top + 38]].forEach(([x, y]) => bm.rect(x - 1, y - 1, 2, 2, C.amber));
    // okuma etiketi: omuz çizgisine bağlı
    bm.line(s1[0] + 5, s1[1] + 1, 108, 13, hex("#8a93a6"));
    bm.rect(104, 6, 22, 15, hex("#0f2a2e")); bm.rect(104, 6, 22, 1, C.teal);
    bm.text(106, 9, "4.3°", C.amber); bm.text(106, 15, "±1.2", hex("#8fb6b0"));
    // tripod ve telefon; ara ara flaş
    bm.line(22, 40, 14, 58, hex("#3a3d4a")); bm.line(22, 40, 30, 58, hex("#3a3d4a")); bm.line(22, 40, 22, 58, hex("#2a2c36"));
    bm.rect(17, 22, 11, 18, hex("#0b0c10")); bm.rect(18, 23, 9, 16, hex("#12333a"));
    bm.rect(21, 27, 3, 2, hex("#9fb8b4")); bm.rect(20, 29, 5, 5, hex("#7f9a96")); bm.rect(19, 30, 7, 1, C.coral);
    const flash = !RM && (t % 3200) < 140;
    bm.put(26, 24, flash ? C.cream : hex("#3a3d4a"));
    if (flash) bm.dither(0, 0, VW, VH, C.cream, .12);
  }


  // PlainParse · 00:45 — terminal: cümle yazılır, renklere ayrılır, üç alana dağılır, testler geçer.
  function plainparse(bm, t){
    bm.rect(0, 0, VW, VH, C.night);
    const R = seeded(9); for (let k = 0; k < 18; k++) bm.put(R() * VW | 0, R() * VH | 0, hex("#2a2f45"));
    const wx = 4, wy = 4, ww = 120, wh = 64;
    bm.rect(wx - 1, wy - 1, ww + 2, wh + 2, hex("#23283c"));
    bm.rect(wx, wy, ww, wh, hex("#0f1220")); bm.rect(wx, wy, ww, 6, hex("#23283c"));
    [C.coral, C.amber, C.grey].forEach((c, i) => bm.rect(wx + 3 + i * 4, wy + 2, 2, 2, c));
    const p = cyc(t, 8000), DIM = hex("#c9c4b8"), KEY = hex("#7c8399");
    const x0 = wx + 4, y0 = wy + 12;
    bm.text(x0, y0, ">", C.paper);
    const words = [["CUMA", C.sky], ["FİZYOLOJİ", C.amber], ["ÖDEVİ", C.amber], ["18:00", C.coral]];
    const full = words.map(w => w[0]).join(" ");
    const shown = Math.floor(clamp((p - .03) / .25) * full.length), colored = p > .32;
    let x = x0 + 6, used = 0;
    for (const [w, c] of words){
      if (used >= shown) break;
      const part = w.slice(0, Math.max(0, shown - used));
      x = bm.text(x, y0, part, colored ? c : DIM) + 2; used += w.length + 1;
    }
    if (p < .3 && Math.floor(t / 300) % 2 === 0) bm.rect(x - 1, y0, 2, 5, C.paper);
    // çıktı
    const rows = [[.4, "TITLE", "FİZYOLOJİ ÖDEVİ", C.amber], [.48, "DAY", "CUMA", C.sky], [.56, "MINUTE", "1080", C.coral]];
    rows.forEach(([at, k, v, c], i) => {
      if (p <= at) return; const y = y0 + 12 + i * 9;
      bm.text(x0 + 6, y, k, KEY); bm.text(x0 + 36, y, v, c);
    });
    if (p > .66){ const y = y0 + 41; bm.text(x0, y, ">", C.paper); const xe = bm.text(x0 + 6, y, "150 TEST", hex("#8ac926")); bm.sprite(xe + 2, y, ["....x", "...x.", "x.x..", ".x..."], { x: hex("#8ac926") }); }
  }

  const VIG = { katman, plainday, sweetspot, here, notecook, milyonda, fiziyoo, plainparse };

  return { RM, clamp, lerp, smooth, hex, mix, thr, Bitmap, skyAt, nightness, sunArc, lampOnAt, loadAvatar, drawWorld, VIG, VW, VH, get AV(){ return AV; }, setAV(v){ AV = v; } };
})();
