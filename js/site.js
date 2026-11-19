/* Lura Study site — copy buttons and the motion layer.
   Progressive enhancement: without JavaScript every section is visible, the copy
   buttons stay hidden (they ship with `hidden`) and the commands remain plain,
   selectable text. Motion is skipped under prefers-reduced-motion (mostly in CSS;
   the pointer tilt checks it here). No dependencies, no network requests. */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var win = window;
  var raf = win.requestAnimationFrame ? win.requestAnimationFrame.bind(win) : function (fn) { return setTimeout(fn, 16); };
  var passive = { passive: true };

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function media(q) { return win.matchMedia ? win.matchMedia(q) : { matches: false }; }
  function onMedia(m, fn) {
    if (m.addEventListener) m.addEventListener("change", fn);
    else if (m.addListener) m.addListener(fn);
  }

  var reduce = media("(prefers-reduced-motion: reduce)");
  var finePointer = media("(hover: hover) and (pointer: fine)");

  /* Geometry is cached and re-measured only when the layout changes. */
  var measurers = [];
  var measurePending = false;
  function remeasure() {
    if (measurePending) return;
    measurePending = true;
    raf(function () {
      measurePending = false;
      measurers.forEach(function (fn) { fn(); });
    });
  }

  /* ---------- copy buttons ---------- */
  function initCopy() {
    var RESET_MS = 1600;
    var status = doc.getElementById("copy-status");

    function announce(msg) {
      if (!status) return;
      status.textContent = "";
      setTimeout(function () { status.textContent = msg; }, 60);
    }

    function selectCode(code) {
      try {
        var sel = win.getSelection();
        var range = doc.createRange();
        range.selectNodeContents(code);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) { /* selection unsupported; the text is still selectable by hand */ }
    }

    $$(".cmd-copy").forEach(function (btn) {
      var box = btn.closest ? btn.closest(".cmd") : null;
      var code = box ? box.querySelector("pre code") : null;
      if (!code) return;

      var label = btn.textContent;
      var name = (btn.getAttribute("aria-label") || "Copy command").replace(/^Copy /, "");
      var timer = null;

      function flash(text, ok) {
        clearTimeout(timer);
        btn.textContent = text;
        btn.classList.remove("is-copied");
        if (ok) {
          void btn.offsetWidth; /* restart the pulse on repeated clicks */
          btn.classList.add("is-copied");
        }
        timer = setTimeout(function () {
          btn.textContent = label;
          btn.classList.remove("is-copied");
        }, RESET_MS);
      }

      function fail() {
        selectCode(code);
        flash("Select + copy", false);
        announce("Could not copy. " + name + " selected; copy it with your keyboard.");
      }

      btn.addEventListener("click", function () {
        var text = code.textContent.trim();
        try {
          if (!navigator.clipboard || !navigator.clipboard.writeText) { fail(); return; }
          navigator.clipboard.writeText(text).then(function () {
            flash("Copied", true);
            announce("Copied " + name);
          }, fail);
        } catch (e) {
          fail();
        }
      });

      btn.hidden = false;
    });
  }

  /* ---------- scroll reveals ---------- */
  function initReveal() {
    var items = $$("[data-reveal]");
    function show(el) { el.classList.add("is-in"); }
    function showAll() { items.forEach(show); }

    /* Anything already on (or above) the screen is shown at once, so nothing
       above the fold waits. Measured before .js exists, i.e. untransformed. */
    var vh = win.innerHeight;
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh) show(el);
    });

    if (!("IntersectionObserver" in win)) { showAll(); root.classList.add("js"); return; }
    try {
      var io = new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.style.setProperty("--rd", Math.min(n++, 5) * 70 + "ms");
          show(el);
          io.unobserve(el);
        });
      }, { rootMargin: "0px 0px -8% 0px" });
      items.forEach(function (el) {
        if (!el.classList.contains("is-in")) io.observe(el);
      });
    } catch (e) {
      setTimeout(showAll, 120);
    }
    /* Only now may CSS hide unrevealed blocks; if anything above threw, .js
       is never added and everything stays visible. */
    root.classList.add("js");
  }

  /* ---------- header: scrolled state, progress line, active section ---------- */
  function initHeader() {
    var header = $(".site-header");
    if (!header) return;

    var bar = doc.createElement("span");
    bar.className = "header-progress";
    bar.setAttribute("aria-hidden", "true");
    header.appendChild(bar);

    var links = $$('.nav a[href^="#"]');
    var sections = $$("main section[id]");
    var spans = [];
    var maxScroll = 1;
    var ticking = false;
    var scrolled = null;
    var current;
    var clicked = null;
    var settle = 0;

    function setActive(id) {
      if (id === current) return;
      current = id;
      links.forEach(function (a) {
        if (id && a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
    }

    function update() {
      ticking = false;
      var y = win.pageYOffset;
      var isScrolled = y > 8;
      if (isScrolled !== scrolled) {
        scrolled = isScrolled;
        header.classList.toggle("is-scrolled", isScrolled);
      }
      bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, y / maxScroll)).toFixed(4) + ")";

      if (clicked) return; /* the clicked link holds until scrolling settles */
      var line = y + win.innerHeight * 0.4;
      var id = null;
      for (var i = 0; i < spans.length; i++) {
        if (line >= spans[i].top && line < spans[i].bottom) { id = spans[i].id; break; }
      }
      setActive(id);
    }

    function measure() {
      var y = win.pageYOffset;
      maxScroll = Math.max(1, root.scrollHeight - win.innerHeight);
      spans = sections.map(function (s) {
        var r = s.getBoundingClientRect();
        return { id: s.id, top: r.top + y, bottom: r.bottom + y };
      });
      update();
    }

    function release() {
      clicked = null;
      update();
    }

    links.forEach(function (a) {
      a.addEventListener("click", function () {
        clicked = a.getAttribute("href").slice(1);
        setActive(clicked);
        clearTimeout(settle);
        settle = setTimeout(release, 600);
      });
    });

    win.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; raf(update); }
      if (clicked) { clearTimeout(settle); settle = setTimeout(release, 160); }
    }, passive);

    measurers.push(measure);
    measure();
  }

  /* ---------- facts strip: fill to cover the viewport twice, then loop ---------- */
  function initMarquee() {
    var strip = $(".marquee");
    var track = strip && $(".marquee-track", strip);
    var group = track && track.firstElementChild;
    if (!group) return;

    measurers.push(function () {
      var width = group.getBoundingClientRect().width;
      if (!width) return;
      var half = Math.max(1, Math.ceil(win.innerWidth / width));
      /* the track is two identical halves, so translating it by -50% is seamless */
      while (track.children.length < half * 2) track.appendChild(group.cloneNode(true));
      while (track.children.length > half * 2) track.removeChild(track.lastElementChild);
      var seconds = Math.min(60, Math.max(40, (half * width) / 30));
      track.style.setProperty("--marquee-dur", seconds.toFixed(1) + "s");
      strip.classList.add("is-live");
    });
  }

  /* ---------- hero visual: slight pointer tilt (fine pointers only) ---------- */
  function initTilt() {
    var hero = $(".hero");
    var hud = hero && $(".hud", hero);
    if (!hud) return null;

    var box = null;
    var tx = 0, ty = 0, cx = 0, cy = 0;
    var frame = 0;

    function enabled() { return finePointer.matches && !reduce.matches && !doc.hidden; }
    function clamp(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

    function render() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      if (Math.abs(tx - cx) < 0.002 && Math.abs(ty - cy) < 0.002) {
        cx = tx; cy = ty; frame = 0;
      } else {
        frame = raf(render);
      }
      hud.style.transform = cx || cy
        ? "perspective(1000px) rotateX(" + (-cy * 2).toFixed(3) + "deg) rotateY(" + (cx * 2).toFixed(3) +
          "deg) translate3d(" + (cx * 6).toFixed(2) + "px," + (cy * 6).toFixed(2) + "px,0)"
        : "";
    }

    function kick() { if (!frame) frame = raf(render); }

    function stop() {
      tx = ty = cx = cy = 0;
      if (frame && win.cancelAnimationFrame) win.cancelAnimationFrame(frame);
      frame = 0;
      hud.style.transform = "";
    }

    hero.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch" || !enabled()) return;
      if (!box) {
        var r = hud.getBoundingClientRect();
        box = { x: r.left + win.pageXOffset + r.width / 2, y: r.top + win.pageYOffset + r.height / 2, w: r.width * 0.75 || 1, h: r.height * 0.75 || 1 };
      }
      tx = clamp((e.pageX - box.x) / box.w);
      ty = clamp((e.pageY - box.y) / box.h);
      kick();
    }, passive);

    hero.addEventListener("pointerleave", function () { tx = ty = 0; kick(); }, passive);

    function check() { if (!enabled()) stop(); }
    onMedia(reduce, check);
    onMedia(finePointer, check);
    measurers.push(function () { box = null; });

    return { stop: stop };
  }

  /* ---------- boot ---------- */
  function run(fn) {
    try { return fn(); } catch (e) { return null; }
  }

  run(initCopy);
  run(initReveal);
  run(initHeader);
  run(initMarquee);
  var tilt = run(initTilt);

  win.addEventListener("resize", remeasure, passive);
  win.addEventListener("load", remeasure);
  doc.addEventListener("toggle", remeasure, true); /* FAQ rows change the page height */
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(remeasure, function () {});
  remeasure();

  doc.addEventListener("visibilitychange", function () {
    root.classList.toggle("is-hidden", doc.hidden);
    if (doc.hidden && tilt) tilt.stop();
  });
})();
