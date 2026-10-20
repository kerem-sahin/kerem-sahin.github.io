// Language switch: English lives in the HTML, Turkish in each element's data-tr attribute.
const els = [...document.querySelectorAll("[data-tr]")];
els.forEach(el => { el.dataset.en = el.textContent; });
const btn = document.getElementById("lang");

function apply(lang) {
  document.documentElement.lang = lang;
  els.forEach(el => { el.textContent = el.dataset[lang]; });
  btn.textContent = lang === "en" ? "TR" : "EN";
  btn.setAttribute("aria-label", lang === "en" ? "Türkçe'ye geç" : "Switch to English");
}

let lang = "en";
try { lang = localStorage.getItem("lang") || (navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en"); } catch (e) {}
apply(lang);

btn.addEventListener("click", () => {
  lang = lang === "en" ? "tr" : "en";
  try { localStorage.setItem("lang", lang); } catch (e) {}
  apply(lang);
  window.dispatchEvent(new Event("langchange"));
});
