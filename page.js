/* Language switch (TR in the HTML, EN in data-en) and the plainday try-it box. */
(() => {
  "use strict";
  const docEl = document.documentElement;
  const btn = document.getElementById("lang");
  let lang = "tr";
  try { const s = localStorage.getItem("ks_lang"); if (s === "tr" || s === "en") lang = s; } catch (_) {}

  function apply(next) {
    lang = next === "en" ? "en" : "tr";
    window.__ksLang = lang;
    docEl.lang = lang;
    document.querySelectorAll("[data-tr][data-en]").forEach((el) => { el.textContent = el.getAttribute("data-" + lang); });
    document.querySelectorAll("[data-alt-tr][data-alt-en]").forEach((el) => { el.alt = el.getAttribute("data-alt-" + lang); });
    document.querySelectorAll("[data-aria-tr][data-aria-en]").forEach((el) => { el.setAttribute("aria-label", el.getAttribute("data-aria-" + lang)); });
    document.querySelectorAll("[data-ph-tr]").forEach((el) => { el.placeholder = el.getAttribute("data-ph-" + lang); });
    document.querySelectorAll("[data-src-tr][data-src-en]").forEach((el) => { const v = el.getAttribute("data-src-" + lang); if (el.getAttribute("src") !== v) el.setAttribute("src", v); });
    document.title = "Kerem Şahin";
    const desc = lang === "tr" ? "Üniversite öğrencisi. Okulun yanında iOS uygulamaları ve web projeleri yapıyor." : "University student. Builds iOS apps and web projects alongside school.";
    document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
    // Deneme kutusuna kullanıcı yazmadıysa örnek cümle de dile göre değişsin.
    const pd = document.getElementById("pd-input");
    if (pd && !pd.dataset.touched) pd.value = lang === "tr" ? "Cuma fizyoloji ödevi 18:00" : "Friday physiology homework 6pm";
    btn.textContent = lang === "tr" ? "EN" : "TR";
    btn.setAttribute("aria-label", lang === "tr" ? "Switch to English" : "Türkçe'ye geç");
    try { localStorage.setItem("ks_lang", lang); } catch (_) {}
    window.dispatchEvent(new CustomEvent("ks:langchange", { detail: { lang } }));
    runParser();
  }
  btn.addEventListener("click", () => apply(lang === "tr" ? "en" : "tr"));

  // ── plainday try-it (a small in-page imitation of the app's parser, from v2) ──
  // Ordered highest priority first (recurring > weekday > relative day)
  const DAY_RULES = [
    { pat: "her\\s+sabah", tr: "Her sabah", en: "Every morning" },
    { pat: "every\\s+morning", tr: "Her sabah", en: "Every morning" },
    { pat: "her\\s+akşam", tr: "Her akşam", en: "Every evening" },
    { pat: "every\\s+evening", tr: "Her akşam", en: "Every evening" },
    // "hafta içi her gün" → hafta içi; bu yüzden hafta içi/sonu "her gün"den önce gelir.
    { pat: "hafta\\s+içi", tr: "Hafta içi", en: "Weekdays" },
    { pat: "(?:every\\s+)?weekdays?", tr: "Hafta içi", en: "Weekdays" },
    { pat: "hafta\\s+sonu", tr: "Hafta sonu", en: "Weekends" },
    { pat: "(?:every\\s+)?weekends?", tr: "Hafta sonu", en: "Weekends" },
    { pat: "her\\s+gün", tr: "Her gün", en: "Daily" },
    { pat: "every\\s+day|daily", tr: "Her gün", en: "Daily" },
    { pat: "(her|every)\\s+pazartesi|pazartesi", tr: "Pazartesi", en: "Monday", rec: true },
    { pat: "(her|every)\\s+salı|salı", tr: "Salı", en: "Tuesday", rec: true },
    { pat: "(her|every)\\s+[çc]arşamba|[çc]arşamba", tr: "Çarşamba", en: "Wednesday", rec: true },
    { pat: "(her|every)\\s+perşembe|perşembe", tr: "Perşembe", en: "Thursday", rec: true },
    { pat: "(her|every)\\s+cuma|cuma", tr: "Cuma", en: "Friday", rec: true },
    { pat: "(her|every)\\s+cumartesi|cumartesi", tr: "Cumartesi", en: "Saturday", rec: true },
    { pat: "(her|every)\\s+pazar|pazar", tr: "Pazar", en: "Sunday", rec: true },
    { pat: "(every|her)\\s+(?:monday|mon)|monday", tr: "Pazartesi", en: "Monday", rec: true },
    { pat: "(every|her)\\s+(?:tuesday|tues?)|tuesday", tr: "Salı", en: "Tuesday", rec: true },
    { pat: "(every|her)\\s+(?:wednesday|wed)|wednesday", tr: "Çarşamba", en: "Wednesday", rec: true },
    { pat: "(every|her)\\s+(?:thursday|thur?s?)|thursday", tr: "Perşembe", en: "Thursday", rec: true },
    { pat: "(every|her)\\s+(?:friday|fri)|friday", tr: "Cuma", en: "Friday", rec: true },
    { pat: "(every|her)\\s+(?:saturday|sat)|saturday", tr: "Cumartesi", en: "Saturday", rec: true },
    { pat: "(every|her)\\s+(?:sunday|sun)|sunday", tr: "Pazar", en: "Sunday", rec: true },
    { pat: "yarın", tr: "Yarın", en: "Tomorrow" },
    { pat: "tomorrow", tr: "Yarın", en: "Tomorrow" },
    { pat: "bugün", tr: "Bugün", en: "Today" },
    { pat: "today", tr: "Bugün", en: "Today" },
  ];

  // Küçük harf: metinde Türkçe harf varsa I→ı, yoksa I→i (FRIDAY → friday). Uzunluk değişmez, indeksler tutar.
  function low(str) {
    const tr = /[çğışöüÇĞŞÖÜİ]/.test(str);
    return str.replace(/İ/g, "i").replace(/I/g, tr ? "ı" : "i").toLowerCase();
  }

  function wbRegex(pattern) {
    return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`, "u");
  }

  function stripSpan(orig, idx, len) {
    return orig.slice(0, idx) + " " + orig.slice(idx + len);
  }

  function capitalizeTitle(str, lang) {
    const clean = str.replace(/\s+/g, " ").trim();
    if (!clean) return "";
    const first = clean.charAt(0);
    const upper = lang === "tr" ? first.toLocaleUpperCase("tr-TR") : first.toUpperCase();
    return upper + clean.slice(1);
  }

  function parsePlainSentence(raw, lang) {
    const text = (raw || "").trim();
    if (!text) {
      return {
        title: "—",
        meta: lang === "tr" ? "Örnek: yarın annemi ara 18:00" : "Example: tomorrow call mom 6pm",
      };
    }

    let rest = text;
    let dayLabel = "";
    let timeLabel = "";
    let hasAlarm = false;

    for (const rule of DAY_RULES) {
      const re = wbRegex(rule.pat);
      let m = re.exec(low(rest));
      while (m) {
        if (!dayLabel) {
          if (rule.rec && m[1]) {
            dayLabel =
              lang === "tr"
                ? `Her ${rule.tr.toLocaleLowerCase("tr-TR")}`
                : `Every ${rule.en}`;
          } else {
            dayLabel = rule[lang];
          }
        }
        rest = stripSpan(rest, m.index, m[0].length);
        m = re.exec(low(rest));
      }
    }

    // 1) 12-hour am/pm (supports "at 6:30pm", "6pm", "6.30pm") BEFORE 24h match
    const ampmRe = /(?<![\p{L}\p{N}_])(?:(?:at|saat)\s+)?(1[0-2]|0?[1-9])(?:[:.]([0-5]\d))?\s*(am|pm)(?![\p{L}\p{N}_])/u;
    const ampmMatch = ampmRe.exec(low(rest));
    if (ampmMatch) {
      let h = Number(ampmMatch[1]);
      const mins = ampmMatch[2] || "00";
      const meridiem = ampmMatch[3];
      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      timeLabel = `${String(h).padStart(2, "0")}:${mins}`;
      rest = stripSpan(rest, ampmMatch.index, ampmMatch[0].length);
    } else {
      // 2) 24-hour hh:mm or hh.mm (supports optional "at "/"saat " prefix and "'de/'da" suffix)
      const hhmmRe = /(?<![\p{L}\p{N}_])(?:(?:at|saat)\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s*['’]?(?:da|de|ta|te))?(?![\p{L}\p{N}_])/u;
      const hhmmMatch = hhmmRe.exec(low(rest));
      if (hhmmMatch) {
        timeLabel = `${hhmmMatch[1].padStart(2, "0")}:${hhmmMatch[2]}`;
        rest = stripSpan(rest, hhmmMatch.index, hhmmMatch[0].length);
      } else {
        // 3) Spoken Turkish hour: requires keyword (saat/sabah/öğlen/akşam/gece) OR apostrophe/attached suffix (7'de, 7de)
        const trKeywordHourRe = /(?<![\p{L}\p{N}_])(saat|sabah|öğlen|akşam|gece)\s+(2[0-3]|1?\d)(?:['’]?(?:da|de|ta|te))?(?![\p{L}\p{N}_])/u;
        const trSuffixHourRe = /(?<![\p{L}\p{N}_])(2[0-3]|1?\d)(?:['’](?:da|de|ta|te)|(?:da|de|ta|te))(?![\p{L}\p{N}_])/u;
        const trKwMatch = trKeywordHourRe.exec(low(rest));
        if (trKwMatch) {
          let h = Number(trKwMatch[2]);
          if ((trKwMatch[1] === "akşam" || trKwMatch[1] === "gece") && h >= 1 && h <= 11) {
            h += 12;
          }
          timeLabel = `${String(h).padStart(2, "0")}:00`;
          rest = stripSpan(rest, trKwMatch.index, trKwMatch[0].length);
        } else {
          const trSufMatch = trSuffixHourRe.exec(low(rest));
          if (trSufMatch) {
            timeLabel = `${trSufMatch[1].padStart(2, "0")}:00`;
            rest = stripSpan(rest, trSufMatch.index, trSufMatch[0].length);
          }
        }
      }
    }

    const alarmRe = wbRegex("alarm(?:ı|da|la)?|hatırlatıcı(?:yı)?|hatırlat|uyar(?:ı|ısı)?|bildirim|remind(?:er)?|alert|notify");
    let alarmMatch = alarmRe.exec(low(rest));
    while (alarmMatch) {
      hasAlarm = true;
      rest = stripSpan(rest, alarmMatch.index, alarmMatch[0].length);
      alarmMatch = alarmRe.exec(low(rest));
    }

    const cleanedTitle = capitalizeTitle(rest.replace(/^[\s\-–·,]+|[\s\-–·,]+$/g, ""), lang);
    const title = cleanedTitle || (lang === "tr" ? "Yeni görev" : "New task");

    const parts = [];
    parts.push(dayLabel || (lang === "tr" ? "Bugün" : "Today"));
    if (timeLabel) parts.push(timeLabel);
    if (hasAlarm) parts.push(lang === "tr" ? "Alarm" : "Reminder");

    return {
      title,
      meta: parts.join(" · "),
      tokens: {
        day: dayLabel || (lang === "tr" ? "Bugün" : "Today"),
        time: timeLabel,
        alarm: hasAlarm,
      },
    };
  }

  const input = document.getElementById("pd-input");
  const outTitle = document.getElementById("pd-title");
  const outMeta = document.getElementById("pd-meta");
  function runParser() {
    if (!input) return;
    const r = parsePlainSentence(input.value, lang);
    outTitle.textContent = r.title;
    outMeta.textContent = r.meta;
  }
  if (input) {
    input.addEventListener("input", () => { input.dataset.touched = "1"; runParser(); });
    document.querySelectorAll("[data-try]").forEach((b) => b.addEventListener("click", () => {
      input.value = b.textContent;
      runParser();
    }));
  }

  // Çizimdeki "Ayrıntı ve ekranlar" bağlantısı ya da #d-… adresi: o uygulamanın kapalı bloğunu aç.
  const openDetail = (hash) => { const d = hash && hash.startsWith("#d-") ? document.querySelector(hash + " details") : null; if (d) d.open = true; };
  document.addEventListener("click", (e) => { const a = e.target.closest('a[href^="#d-"]'); if (a) openDetail(a.getAttribute("href")); });
  openDetail(location.hash);

  // Panels rise in as they enter.
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.15 }) : null;
  document.querySelectorAll(".rise").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));

  apply(lang);
})();
