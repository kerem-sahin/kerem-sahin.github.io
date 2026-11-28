/* İki deneme (harf, baskı) için ortak veri ve yardımcılar. */
const APPS = {
  katman: {
    name: "KATMAN", plat: "iOS", status: "APP STORE",
    why: "kapıdan çıkmadan aynı soru: bugün ne giysem?",
    say: "Her sabah tek karar: bugün ne giyeceğin.",
    stack: "SwiftUI · WidgetKit · Swift Charts · Open-Meteo",
    link: ["App Store'dan indir ↗", "https://apps.apple.com/tr/app/katman-bug%C3%BCn-ne-giysem/id6835842857"],
    rep: ["ne", "giysem"], shots: ["katman-1.jpg", "katman-2.jpg"]
  },
  notecook: {
    name: "NOTECOOK", plat: "iPadOS", status: "APP STORE",
    why: "ipad'de not alıyorum. not uygulamaları ise hep aynı, sıkıcı.",
    say: "iPad ve Apple Pencil için el yazısı defteri.",
    stack: "SwiftUI · PencilKit · Vision · SwiftData + CloudKit",
    link: ["App Store'dan indir ↗", "https://apps.apple.com/tr/app/notecook/id6811676558"],
    rep: ["not", "al"], shots: ["notecook-light.jpg"]
  },
  plainday: {
    name: "PLAINDAY", plat: "iOS", status: "APP STORE",
    why: "telaşın ortasında akla gelen iş, hemen yazılmazsa unutuluyor.",
    say: "Düz bir cümle yaz, görev olsun.",
    stack: "SwiftUI · SwiftData · AlarmKit · WidgetKit · App Intents",
    link: ["App Store'dan indir ↗", "https://apps.apple.com/tr/app/plainday/id6823780735"],
    rep: ["yaz", "unutma"], shots: ["plainday-tr-1.jpg", "plainday-tr-dark.jpg"],
    extra: ["Cümle motoru açık kaynak ↗", "https://github.com/kerem-sahin/plainparse"]
  },
  milyonda: {
    name: "85 MİLYONDA 1", plat: "Web", status: "WEB",
    why: "bir hayat simülasyonu oynuyorum ve neredeyse her seferinde çok uzak bir ülkede doğuyorum.",
    say: "Türkiye'nin gerçek istatistiklerine dayanan bir hayat simülasyonu.",
    stack: "Next.js · TypeScript · TÜİK verisi",
    link: ["Bir hayat yaşa ↗", "https://85milyondabir.com.tr"],
    rep: ["yeniden", "doğ"], shots: ["85-card-1.jpg", "85-card-2.jpg"]
  },
  fiziyoo: {
    name: "FİZİYOO", plat: "iOS", status: "YAPIMDA",
    why: "babam fizyoterapist, küçüklüğümden beri yanında çalışıyorum.",
    say: "Fizyoterapistler için klinik uygulaması.",
    stack: "SwiftUI · SwiftData + CloudKit · Vision · Swift Charts",
    link: ["Yapım aşamasında", null],
    rep: ["dik", "dur"], drawing: "posture"
  },
  sweetspot: {
    name: "SWEETSPOT", plat: "iOS", status: "APP STORE",
    why: "şehrin gürültüsünden kaçıp sakin, manzaralı bir yer bulduk. bir dahaki sefere de bulabilmek için işaretlemek istedim.",
    say: "Sakin, az bilinen yerlerin haritası.",
    stack: "SwiftUI · MapKit · Firebase · Cloud Functions",
    link: ["App Store'dan indir ↗", "https://apps.apple.com/tr/app/sweetspot-sakl%C4%B1-yerler/id6824031187"],
    rep: ["saklı", "yer"], shots: ["sweetspot-map.jpg", "sweetspot-feed.jpg"]
  },
  here: {
    name: "HERE.", plat: "iOS", status: "APP STORE",
    why: "her gün aynı kafedeyiz ama yan masayla hiç konuşmuyoruz.",
    say: "Aynı mekândaki insanları anında gör ve tanış.",
    stack: "React · Capacitor · Firebase",
    link: ["App Store'dan indir ↗", "https://apps.apple.com/tr/app/here/id6767262061"],
    rep: ["selam", "ver"], shots: ["here-venues.jpg", "here-chat.jpg"]
  }
};

const POSTURE = `
<svg class="posture" viewBox="0 0 400 300" role="img" aria-label="Postür analizi illüstrasyonu">
  <g class="ln"><circle cx="200" cy="52" r="20"/>
    <path d="M200 72 L200 92 M152 98 L248 92 M152 98 L138 170 M248 92 L262 166 M200 92 L198 168 M172 172 L226 166 M172 172 L168 280 M226 166 L232 280"/></g>
  <g class="lvl"><path d="M90 95 H310 M90 169 H310"/></g>
  <g class="pts"><circle cx="152" cy="98" r="5"/><circle cx="248" cy="92" r="5"/><circle cx="172" cy="172" r="5"/><circle cx="226" cy="166" r="5"/></g>
  <text x="314" y="90">4.3° ± 1.2°</text><text x="314" y="164">3.8° ± 1.5°</text>
  <text x="90" y="292" class="cap">ÖRNEK ÖLÇÜM · İLLÜSTRASYON</text>
</svg>`;

const STAR = '<svg class="star" viewBox="-50 -50 100 100" aria-hidden="true"><polygon points="0,-50 9,-21 35,-35 21,-9 50,0 21,9 35,35 9,21 0,50 -9,21 -35,35 -21,9 -50,0 -21,-9 -35,-35 -9,-21"/></svg>';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));          // p'nin [a,b] aralığındaki ilerlemesi
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Yazıyı kutuya sığdır. data-cap = ekran yüksekliğinin %'si, data-capw = kutu genişliğinin %'si.
   Sınır aşılırsa harfler yana esnetilir. */
function fitAll(root = document) {
  root.querySelectorAll(".fit").forEach(el => {
    if (!el.offsetParent) return;
    const inner = el.firstElementChild;
    inner.style.setProperty("--sx", 1);
    el.style.fontSize = "100px";
    const w = inner.getBoundingClientRect().width;
    if (!w) return;
    const fs = 100 * el.clientWidth / w;
    const host = el.closest("[data-cap],[data-capw]") || el;
    let max = Infinity;
    if (host.dataset.cap) max = innerHeight * host.dataset.cap / 100 / 0.8;
    if (host.dataset.capw) max = Math.min(max, el.clientWidth * host.dataset.capw / 100 / 0.8);
    if (fs > max) {
      el.style.fontSize = max + "px";
      inner.style.setProperty("--sx", Math.min(1.8, el.clientWidth / inner.getBoundingClientRect().width));
    } else el.style.fontSize = fs + "px";
  });
}

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function coverRect(iw, ih, w, h) {
  const s = Math.max(w / iw, h / ih);
  return [(w - iw * s) / 2, (h - ih * s) / 2, iw * s, ih * s];
}
const hexRGB = h => { h = h.trim().replace("#", ""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };

/* Görselleri yan yana W×H tuvale çiz, parlaklık dizisi döndür (0 = beyaz, 1 = siyah mürekkep). */
async function inkMap(shots, W, H, gap) {
  const imgs = await Promise.all(shots.map(s => loadImg("assets/" + s)));
  const n = imgs.length, pw = (W - gap * (n + 1)) / n;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  imgs.forEach((im, k) => {
    const x0 = gap + k * (pw + gap), y0 = gap, w0 = pw, h0 = H - 2 * gap;
    x.save(); x.beginPath(); x.rect(x0, y0, w0, h0); x.clip();
    const [dx, , w, h] = coverRect(im.width, im.height, w0, h0);
    x.drawImage(im, x0 + dx, y0, w, h);
    x.restore();
  });
  const d = x.getImageData(0, 0, W, H).data, out = new Float32Array(W * H);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const l = (0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]) / 255;
    out[i] = 1 - clamp((l - 0.5) * 1.25 + 0.5);
  }
  return out;
}

/* İnce 45° raster: okunur kalır, baskı gibi görünür. */
function paintAM(cv, ink, W, H, dot, paper, cssW) {
  const D = hexRGB(dot), P = hexRGB(paper);
  const per = (cssW < 500 ? 3 : 3.6) * (W / cssW), k = 2 * Math.PI / per / Math.SQRT2;
  const cosT = new Float32Array(W + H + 2);
  for (let i = 0; i < cosT.length; i++) cosT[i] = Math.cos(i * k);
  const ctx = cv.getContext("2d"), img = ctx.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, p = i * 4, t = ink[i];
    let a = 0;
    if (t > 0.03) a = clamp((t - (0.5 + 0.25 * (cosT[x + y] + cosT[x - y + H]))) * 7 + 0.5);
    d[p] = P[0] + (D[0] - P[0]) * a; d[p + 1] = P[1] + (D[1] - P[1]) * a; d[p + 2] = P[2] + (D[2] - P[2]) * a; d[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/* Görününce bulanıktan nete */
function revealOnView(sel) {
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0.2 });
  document.querySelectorAll(sel).forEach(el => io.observe(el));
}

/* Hızlı kaydırınca dev başlıklar boyuna uzar, durunca yerine oturur. */
function scrollStretch(sel) {
  if (reduceMotion) return;
  let last = scrollY, v = 0, cur = 1;
  const els = () => document.querySelectorAll(sel);
  (function tick() {
    const y = scrollY; v = v * 0.8 + (y - last) * 0.2; last = y;
    const target = 1 + clamp(Math.abs(v) * 0.006, 0, 0.32);
    cur += (target - cur) * 0.18;
    if (Math.abs(cur - 1) > 0.002 || Math.abs(v) > 0.1) els().forEach(e => e.style.setProperty("--sy", cur.toFixed(3)));
    requestAnimationFrame(tick);
  })();
}

/* Kaydırma döngüsü: tek rAF, tüm bölümler */
function onScrollFrame(fn) {
  let t = false;
  const run = () => { t = false; fn(); };
  addEventListener("scroll", () => { if (!t) { t = true; requestAnimationFrame(run); } }, { passive: true });
  addEventListener("resize", () => requestAnimationFrame(run));
  run();
}
const sectionProgress = el => {
  const r = el.getBoundingClientRect();
  return clamp(-r.top / Math.max(1, r.height - innerHeight));
};
