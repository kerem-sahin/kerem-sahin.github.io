/* Harfin içinden geç.
   Her afişin sonunda sıradakinin adı, sıradaki afişin renginde yazılı durur.
   Kaydırdıkça kamera o adın bir harfine (ya da bir noktaya) dalar; ekran o renge boyanır,
   yeni afiş o renkte açılır. Her kapıda başka bir harf seçilir. */

const C = { yellow: "#FFE600", blue: "#2341B5", cream: "#F1E4C6", ink: "#111114", red: "#D8323C", electric: "#1F33D6", paper: "#E9E7DF" };

// at: dalınacak karakterin sırası · mode: mid (gövde ortası), low (gövdenin altı), top (en üst parça: İ'nin noktası, ünlemin çubuğu), bottom (en alt parça: nokta)
const CHAIN = [
  { app: "katman",    theme: "t-yellow",   bg: C.yellow },
  { app: "notecook",  theme: "t-blue",     bg: C.blue,     at: 2, mode: "mid" },    // NO[T]ECOOK
  { app: "plainday",  theme: "t-cream",    bg: C.cream,    at: 7, mode: "low" },    // PLAINDA[Y]
  { app: "milyonda",  theme: "t-ink",      bg: C.ink,      at: 4, mode: "top" },    // 85 M[İ]'nin noktası
  { app: "fiziyoo",   theme: "t-red",      bg: C.red,      at: 2, mode: "mid" },    // Fİ[Z]İYOO
  { app: "sweetspot", theme: "t-electric", bg: C.electric, at: 6, mode: "low" },    // SWEETS[P]OT
  { app: "here",      theme: "t-paper",    bg: C.paper,    at: 4, mode: "bottom" }, // HERE[.]
  { door: "BANA YAZ!", bg: C.ink,                          at: 8, mode: "top" }     // ünlemin çubuğu
];

function posterHTML(a, theme, no) {
  let cols = "";
  for (let c = 0; c < 8; c++) cols += `<span class="rep-col${c >= 4 ? " wide" : ""}">${Array(5).fill(`<i>${a.rep[c % 2]}</i>`).join("")}</span>`;
  const art = a.drawing
    ? `<div class="ht ht-draw">${POSTURE}</div>`
    : `<button class="ht" type="button" data-shots="${a.shots.join(",")}" ${a.invert ? 'data-invert="1"' : ""} aria-label="${a.name}: gerçek ekranı göster">
         <canvas aria-hidden="true"></canvas>
         <span class="ht-real">${a.shots.map(s => `<img src="assets/${s}" alt="" loading="lazy">`).join("")}</span>
       </button>`;
  const link = a.link[1]
    ? `<a class="btn" href="${a.link[1]}" target="_blank" rel="noopener">${a.link[0]}</a>`
    : `<span class="btn static">${a.link[0]}</span>`;
  const extra = a.extra ? `<a class="sub-link" href="${a.extra[1]}" target="_blank" rel="noopener">${a.extra[0]}</a>` : "";
  return `
  <section class="poster ${theme}">
    <h2 class="fit p-title" data-cap="30"><span>${a.name}</span></h2>
    <div class="p-grid">
      <figure class="p-art">
        ${art}
        <div class="sticker">${STAR}<span>${a.status}</span></div>
        ${a.drawing ? "" : '<figcaption class="hint">dokun: gerçek ekran</figcaption>'}
      </figure>
      <div class="p-text">
        <p class="tag">[neden]</p>
        <p class="p-why reveal">${a.why}</p>
        <p class="p-say reveal">${a.say}</p>
        <p class="p-stack">${a.stack}</p>
        <p class="p-cta">${link}${extra}</p>
      </div>
    </div>
    <div class="rep" aria-hidden="true">${cols}</div>
    <div class="meta-row foot"><span>No.${String(no).padStart(2, "0")}</span><span>${a.name}</span><span lang="en">${a.plat}</span><span class="hide-s">2026</span><span class="hide-s">Kerem Şahin</span></div>
  </section>`;
}
function doorHTML(name, from, to, label, at, mode) {
  return `
  <section class="dive door" style="--from:${from}; --to:${to}" aria-label="Sıradaki: ${name}">
    <div class="stage">
      <p class="door-label"><span>${label}</span><span>kaydır ↓</span></p>
      <div class="fit door-text zoomer" data-cap="42" data-at="${at}" data-mode="${mode}"><span>${name}</span></div>
      <div class="fill"></div>
    </div>
  </section>`;
}

let html = "";
CHAIN.forEach((c, i) => {
  if (c.app) html += posterHTML(APPS[c.app], c.theme, i + 1);
  const next = CHAIN[i + 1];
  if (!next) return;
  const name = next.app ? APPS[next.app].name : next.door;
  const label = next.app ? `sıradaki · No.${String(i + 2).padStart(2, "0")}` : "son durak";
  html += doorHTML(name, c.bg, next.bg, label, next.at, next.mode);
});
document.getElementById("chain").innerHTML = html;

/* ---- Raster görseller ---- */
async function drawHT(btn) {
  const cv = btn.querySelector("canvas"), r = btn.getBoundingClientRect();
  if (!r.width) return;
  const dpr = Math.min(devicePixelRatio || 1, 2), W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  cv.width = W; cv.height = H;
  const cs = getComputedStyle(btn);
  const ink = await inkMap(btn.dataset.shots.split(","), W, H, Math.round(14 * dpr));
  if (btn.dataset.invert) for (let i = 0; i < ink.length; i++) ink[i] = 1 - ink[i];
  paintAM(cv, ink, W, H, cs.getPropertyValue("--dot"), cs.getPropertyValue("--paper"), r.width);
}
document.addEventListener("click", e => { const b = e.target.closest("button.ht"); if (b) b.classList.toggle("show-real"); });

/* ---- Dalış ölçüsü ---- */
const dives = [...document.querySelectorAll(".dive")].map(sec => ({
  sec, stage: sec.querySelector(".stage"), z: sec.querySelector(".zoom, .zoomer"),
  fill: sec.querySelector(".fill"), label: sec.querySelector(".door-label"),
  cover: sec.classList.contains("cover-dive")
}));

// Hedef karakteri tuvale çizip mürekkebin nerede olduğuna bakar; dalış noktasını ve o parçanın enini/boyunu bulur.
function aimLetter(el) {
  const at = +el.dataset.at || 0, mode = el.dataset.mode || "mid";
  const tn = el.firstElementChild.firstChild, ch = tn.data[at];
  const fs = parseFloat(el.style.fontSize);
  const rng = document.createRange(); rng.setStart(tn, at); rng.setEnd(tn, at + 1);
  const lr = rng.getBoundingClientRect(), er = el.getBoundingClientRect();

  const pad = Math.ceil(fs * 0.1), W = Math.ceil(fs * 1.2), H = Math.ceil(fs * 1.5), base = Math.round(fs * 1.15);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.font = `400 ${fs}px "League Gothic"`;
  try { x.fontStretch = "semi-condensed"; } catch (_) {}
  const m = x.measureText(ch);
  x.fillText(ch, pad, base);
  const d = x.getImageData(0, 0, W, H).data;
  const on = (i, j) => i >= 0 && j >= 0 && i < W && j < H && d[(j * W + i) * 4 + 3] > 127;
  const rowHas = j => { for (let i = 0; i < W; i++) if (on(i, j)) return true; return false; };

  const capH = m.actualBoundingBoxAscent || fs * 0.7;
  let row;
  if (mode === "top" || mode === "bottom") {
    const dir = mode === "top" ? 1 : -1;
    let r0 = mode === "top" ? 0 : H - 1;
    while (r0 >= 0 && r0 < H && !rowHas(r0)) r0 += dir;
    let r1 = r0;
    while (r1 >= 0 && r1 < H && rowHas(r1)) r1 += dir;
    row = Math.round((r0 + r1) / 2);
  } else row = Math.round(base - capH * (mode === "low" ? 0.22 : 0.5));

  let best = [0, 0], a = -1;
  for (let i = 0; i <= W; i++) {
    const o = i < W && on(i, row);
    if (o && a < 0) a = i;
    if (!o && a >= 0) { if (i - a > best[1] - best[0]) best = [a, i]; a = -1; }
  }
  const cx = Math.round((best[0] + best[1]) / 2);
  let t0 = row, t1 = row;
  while (on(cx, t0 - 1)) t0--;
  while (on(cx, t1 + 1)) t1++;

  const ratio = lr.width / (m.width || 1);
  const asc = m.fontBoundingBoxAscent || fs * 0.8;
  return {
    tx: lr.left - er.left + (cx - pad) * ratio,
    ty: lr.top - er.top + asc - (base - (t0 + t1) / 2),
    span: Math.max(3, (best[1] - best[0]) * ratio),
    tall: Math.max(3, t1 - t0 + 1)
  };
}

function measure() {
  dives.forEach(d => {
    d.z.style.transform = "none";
    const sr = d.stage.getBoundingClientRect(), zr = d.z.getBoundingClientRect();
    d.w = sr.width; d.h = sr.height;
    d.ox = zr.left - sr.left; d.oy = zr.top - sr.top;
    if (d.cover) {
      const star = [...d.z.querySelectorAll(".aim")].find(s => s.getBoundingClientRect().width > 0);
      const r = star.getBoundingClientRect();
      d.tx = r.left + r.width / 2 - zr.left; d.ty = r.top + r.height / 2 - zr.top;
      d.smax = 1.15 * Math.hypot(d.w, d.h) / (0.456 * r.width);   // yıldızın iç çemberi ekranı kaplasın
    } else {
      const t = aimLetter(d.z);
      d.tx = t.tx; d.ty = t.ty;
      d.smax = 1.3 * Math.max(d.w / t.span, d.h / t.tall);
    }
  });
}

const fades = document.querySelectorAll(".cover-dive .fade-out");
const avatar = document.querySelector(".cover-dive .cover-avatar");
function frame() {
  if (!dives[0].smax) return;
  const vh = innerHeight;
  dives.forEach(d => {
    const p = sectionProgress(d.sec);
    const q = reduceMotion ? (p > .5 ? 1 : 0) : seg(p, .1, .9);
    const s = Math.exp(Math.log(d.smax) * easeIn(q));
    const m = easeInOut(seg(p, .1, .55));
    const dx = (d.w / 2 - (d.ox + d.tx)) * m, dy = (d.h / 2 - (d.oy + d.ty)) * m;
    d.z.style.transformOrigin = `${d.tx}px ${d.ty}px`;
    d.z.style.transform = p <= 0 ? "none" : `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
    d.fill.style.opacity = seg(p, .8, .92).toFixed(3);
    if (d.label) d.label.style.opacity = (1 - seg(p, .06, .2)).toFixed(3);
    if (d.cover) {
      const f = 1 - seg(p, 0, .22);
      fades.forEach(e => e.style.opacity = f.toFixed(3));
      avatar.style.transform = `translateY(${(easeIn(seg(p, 0, .45)) * vh * .7).toFixed(1)}px)`;
    }
  });
  if (!reduceMotion) document.querySelectorAll(".spin").forEach(s => s.style.transform = `rotate(${scrollY * 0.12}deg)`);
}

revealOnView(".reveal, .rep, .p-title, .p-art, .contact-reveal");
scrollStretch(".p-title > span");

function layout() { fitAll(); measure(); frame(); }
let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { layout(); document.querySelectorAll("button.ht").forEach(b => drawHT(b).catch(() => {})); }, 150); });
document.fonts.ready.then(() => {
  layout();
  document.documentElement.classList.add("ready");
  document.querySelectorAll("button.ht").forEach(b => drawHT(b).catch(() => {}));
  onScrollFrame(frame);
});
fitAll();
