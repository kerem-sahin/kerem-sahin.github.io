// Scroll motion: Lenis for smooth scrolling, GSAP ScrollTrigger for everything that moves.
// If the libraries fail to load, the page stays fully readable and static.
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Progress bar and the current poster's name in the nav. These are information, so they run even with reduced motion. */
  const bar = document.getElementById("progress"), now = document.getElementById("now");
  const NAMES = { here: "here.", notecook: "notecook", plainday: "plainday", sweetspot: "SweetSpot", fiziyoo: "Fiziyoo", plainparse: "PlainParse" };
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: s => gsap.set(bar, { scaleX: s.progress }) });
  Object.entries(NAMES).forEach(([id, name]) => ScrollTrigger.create({
    trigger: "#" + id, start: "top 50%", end: "bottom 50%",
    onToggle: s => { if (s.isActive) now.textContent = name; else if (now.textContent === name) now.textContent = ""; }
  }));

  if (reduce) return;

  /* Smooth scrolling, driven by GSAP's ticker so both stay in step. */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
      e.preventDefault(); lenis.scrollTo(a.getAttribute("href"));
    }));
  }

  /* Split a heading into letters (screen readers keep the whole word through aria-label). */
  // Letters sit inside a no-wrap span per word, so a word never breaks across lines.
  function splitChars(el) {
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement("span");
          w.className = "wd"; w.setAttribute("aria-hidden", "true");
          [...part].forEach(c => {
            const s = document.createElement("span");
            s.className = "ch"; s.textContent = c;
            w.append(s);
          });
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
    });
    walk(el);
    return el.querySelectorAll(".ch");
  }
  const splitWords = el => {
    el.innerHTML = el.textContent.split(/(\s+)/).map(w => /\s/.test(w) || !w ? w : `<span class="word">${w}</span>`).join("");
    return el.querySelectorAll(".word");
  };
  const replay = { toggleActions: "play none none reverse" };

  /* Intro: the name sets itself letter by letter, then Kerem walks up into frame. */
  const introChars = splitChars(document.querySelector(".intro h1"));
  gsap.timeline({ defaults: { ease: "power4.out" } })
    .from(introChars, { yPercent: 110, rotate: 8, opacity: 0, duration: 1.1, stagger: 0.045 })
    .from(".intro .lead", { y: 24, opacity: 0, duration: 0.8 }, "-=0.7")
    .from(".counts li", { y: 16, opacity: 0, scale: 0.9, duration: 0.6, stagger: 0.08 }, "-=0.5")
    .from(".cue", { opacity: 0, duration: 0.6 }, "-=0.3")
    .from(".kid", { yPercent: 30, opacity: 0, duration: 1.3, ease: "expo.out" }, 0.25);
  gsap.to(".cue", { y: 6, repeat: -1, yoyo: true, duration: 0.9, ease: "sine.inOut", delay: 2 });
  const leaveIntro = { trigger: ".intro", start: "top top", end: "bottom top", scrub: true };
  gsap.to(".intro-copy", { yPercent: -30, opacity: 0.2, ease: "none", scrollTrigger: leaveIntro });
  gsap.to(".kid", { y: 140, ease: "none", scrollTrigger: leaveIntro });

  /* Every poster: icon pops, title sets letter by letter, the copy follows. */
  document.querySelectorAll(".poster").forEach(sec => {
    const chars = splitChars(sec.querySelector("h2"));
    const icon = sec.querySelector(".icon");
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: "top 65%", ...replay } });
    if (icon) tl.from(icon, { scale: 0, rotate: -25, duration: 0.6, ease: "back.out(2)" });
    tl.from(chars, { yPercent: 100, opacity: 0, rotate: 6, duration: 0.8, stagger: 0.035, ease: "power4.out" }, icon ? "<0.1" : 0)
      .from(sec.querySelectorAll(".copy > :not(h2):not(.icon)"), { y: 26, opacity: 0, duration: 0.7, stagger: 0.07, ease: "power3.out" }, "<0.25");
  });

  /* Screenshots drift at different speeds, so the posters feel layered. */
  const drift = sel => document.querySelectorAll(sel).forEach((img, i) => gsap.fromTo(img,
    { y: 90 + i * 50 }, { y: -(50 + i * 40), ease: "none", scrollTrigger: { trigger: img.closest("section"), start: "top bottom", end: "bottom top", scrub: true } }));
  drift(".p-here .shots img");
  drift(".p-sweet .shots img");

  /* here.: the three phones start stacked and fan out. */
  const fan = { trigger: "#here", start: "top 85%", end: "center center", scrub: 1 };
  gsap.from(".p-here .shots img:nth-child(1)", { xPercent: 70, rotate: 0, scrollTrigger: fan });
  gsap.from(".p-here .shots img:nth-child(3)", { xPercent: -70, rotate: 0, scrollTrigger: fan });

  /* notecook: the screenshots drop in like stickers, the tag slaps on. */
  gsap.from(".p-note .shots img", { y: -180, rotate: i => (i ? 14 : -12), opacity: 0, duration: 1, ease: "bounce.out", stagger: 0.15,
    scrollTrigger: { trigger: "#notecook", start: "top 60%", ...replay } });
  gsap.from(".p-note .tag", { scale: 2.2, rotate: -30, duration: 0.5, ease: "back.out(3)", delay: 0.6,
    scrollTrigger: { trigger: "#notecook", start: "top 60%", ...replay } });

  /* plainday: the timeline line draws down, then each sentence lands as a task. */
  gsap.fromTo(".blocks", { "--line": 0 }, { "--line": 1, ease: "none", scrollTrigger: { trigger: ".blocks", start: "top 85%", end: "bottom 60%", scrub: true } });
  gsap.from(".blocks > div", { scale: 0.5, y: 30, opacity: 0, duration: 0.6, stagger: 0.12, ease: "back.out(1.8)",
    scrollTrigger: { trigger: ".blocks", start: "top 75%", ...replay } });

  /* SweetSpot: the sun rises behind the horizon as you scroll. */
  gsap.fromTo(".sun", { y: 260 }, { y: -300, ease: "none", scrollTrigger: { trigger: "#sweetspot", start: "top bottom", end: "bottom top", scrub: true } });

  /* Fiziyoo: a scan sweeps down the frame, landmarks appear, the skeleton draws,
     then the tilt measurements arrive with their error bands. */
  const fizi = { trigger: "#fiziyoo", start: "top 55%", ...replay };
  gsap.fromTo(".pose-scan", { attr: { y: -70 } }, { attr: { y: 450 }, ease: "none",
    scrollTrigger: { trigger: "#fiziyoo", start: "top 80%", end: "bottom 30%", scrub: true } });
  const bones = gsap.utils.toArray(".pose-bones line");
  bones.forEach(l => { const n = Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value); l.style.strokeDasharray = n; l.style.strokeDashoffset = n; });
  gsap.timeline({ scrollTrigger: fizi })
    .from(".pose-head, .pose-plumb", { opacity: 0, duration: 0.5 })
    .from(".pose-joints circle", { scale: 0, transformOrigin: "50% 50%", duration: 0.4, stagger: 0.05, ease: "back.out(3)" }, "<0.1")
    .to(bones, { strokeDashoffset: 0, duration: 0.5, stagger: 0.04, ease: "power2.out" }, "-=0.4")
    .from(".pose-ref", { opacity: 0, duration: 0.4 })
    .from(".pose-band", { scale: 0.2, opacity: 0, transformOrigin: "50% 50%", duration: 0.7, stagger: 0.2, ease: "power3.out" }, "<")
    .from(".pose-label", { opacity: 0, x: 12, duration: 0.5, stagger: 0.2 }, "<0.3")
    .from(".pose-note", { opacity: 0, duration: 0.4 });

  /* PlainParse: the code arrives line by line. */
  const code = document.querySelector(".code");
  code.innerHTML = code.innerHTML.split("\n").map(l => `<span class="cl" style="display:block">${l || " "}</span>`).join("");
  gsap.from(".code .cl", { x: -24, opacity: 0, duration: 0.5, stagger: 0.14, ease: "power2.out",
    scrollTrigger: { trigger: ".code", start: "top 75%", ...replay } });

  /* How I work: heading and chips slide in, then words light up as you read down. */
  gsap.from(".how h2", { y: 32, opacity: 0, duration: 0.8, ease: "power3.out",
    scrollTrigger: { trigger: ".how", start: "top 75%", ...replay } });
  gsap.from(".how-chips li", { scale: 0.85, y: 14, opacity: 0, duration: 0.5, stagger: 0.05, ease: "back.out(1.8)",
    scrollTrigger: { trigger: ".how-chips", start: "top 80%", ...replay } });
  gsap.from(".contact", { y: 20, opacity: 0, duration: 0.7, ease: "power3.out",
    scrollTrigger: { trigger: ".contact", start: "top 85%", ...replay } });


  let howTween;
  function buildHow() {
    if (howTween) { howTween.scrollTrigger.kill(); howTween.kill(); }
    const words = splitWords(document.querySelector(".how p"));
    howTween = gsap.fromTo(words, { opacity: 0.15 }, { opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: ".how", start: "top 75%", end: "bottom 70%", scrub: true } });
  }
  buildHow();
  window.addEventListener("langchange", () => { buildHow(); ScrollTrigger.refresh(); });

  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
