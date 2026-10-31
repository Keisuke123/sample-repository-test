/* ========================================
   家電製品アドバイザー学習サイト - 共通スクリプト
   ======================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function fmt(n, d) {
    return Number(n).toLocaleString("ja-JP", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  var ICON_SUN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var ICON_MOON = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var ICON_UP = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

  /* ---------- テーマ切替 ---------- */
  function isDark() {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function initTheme() {
    var inner = $(".site-header .header-inner");
    if (!inner) return;
    var btn = document.createElement("button");
    btn.className = "theme-toggle";
    btn.type = "button";
    function paint() {
      btn.innerHTML = isDark() ? ICON_SUN : ICON_MOON;
      btn.setAttribute("aria-label", isDark() ? "ライトモードに切り替え" : "ダークモードに切り替え");
    }
    btn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store("theme", next);
      paint();
    });
    paint();
    inner.appendChild(btn);
  }

  /* ---------- 読了プログレスバー・トップへ戻る ---------- */
  function initScrollUi() {
    var bar = null;
    if ($(".content-layout")) {
      bar = document.createElement("div");
      bar.className = "read-progress";
      bar.innerHTML = "<span></span>";
      document.body.appendChild(bar);
    }
    var up = document.createElement("button");
    up.className = "to-top";
    up.type = "button";
    up.setAttribute("aria-label", "ページの先頭へ戻る");
    up.innerHTML = ICON_UP;
    up.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });
    document.body.appendChild(up);

    var ticking = false;
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var y = window.scrollY;
      if (bar) bar.firstChild.style.setProperty("--p", max > 0 ? Math.min(1, y / max) : 0);
      up.classList.toggle("show", y > 600);
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 目次のスクロール連動 ---------- */
  function initToc() {
    var links = $$(".toc a[href^='#']");
    if (!links.length) return;
    var map = {};
    var sections = [];
    links.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute("href").slice(1));
      var sec = document.getElementById(id);
      if (sec) { map[id] = a; sections.push(sec); }
    });
    var current = null;
    function setActive(id) {
      if (current === id) return;
      current = id;
      links.forEach(function (a) { a.classList.remove("active"); });
      var a = map[id];
      if (!a) return;
      a.classList.add("active");
      var list = a.closest("ol");
      if (list && list.scrollWidth > list.clientWidth) {
        list.scrollTo({ left: a.offsetLeft - list.clientWidth / 2 + a.offsetWidth / 2, behavior: "smooth" });
      }
    }
    function onScroll() {
      var line = window.innerHeight * 0.3;
      var active = sections[0];
      sections.forEach(function (s) { if (s.getBoundingClientRect().top <= line) active = s; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) active = sections[sections.length - 1];
      setActive(active.id);
    }
    var raf = 0;
    window.addEventListener("scroll", function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(onScroll);
    }, { passive: true });
    onScroll();
  }

  /* ---------- 表示アニメーション ---------- */
  function initReveal() {
    var targets = $$(".content-section, .card, .info-box, .info-box-item, .tip-item, .page-nav a, .section-header, .stat, .quiz-banner");
    var groups = new Map();
    targets.forEach(function (el) {
      el.classList.add("reveal");
      var parent = el.parentElement;
      var n = groups.get(parent) || 0;
      el.style.setProperty("--i", Math.min(n, 6));
      groups.set(parent, n + 1);
    });

    var diagrams = $$(".diagram");

    if (!("IntersectionObserver" in window)) {
      targets.concat(diagrams).forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    targets.forEach(function (el) { io.observe(el); });

    // 図解：画面内にある間だけアニメーションを動かす
    var dio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var fig = e.target;
        fig.inView = e.isIntersecting;
        if (e.isIntersecting) fig.classList.add("is-visible");
        $$("svg", fig).forEach(function (svg) {
          if (!svg.pauseAnimations) return;
          if (e.isIntersecting && !reduceMotion) svg.unpauseAnimations();
          else svg.pauseAnimations();
        });
      });
    }, { threshold: 0.15 });
    diagrams.forEach(function (fig) { dio.observe(fig); });
  }

  /* ---------- 見出し番号・テーブル ---------- */
  function initContent() {
    $$(".content-section > table").forEach(function (t) {
      var w = document.createElement("div");
      w.className = "table-wrap";
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });
  }

  /* ---------- セグメントボタン ---------- */
  function bindSeg(seg, cb) {
    var btns = $$("button", seg);
    btns.forEach(function (b) {
      b.type = "button";
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        cb(b.getAttribute("data-v"), b);
      });
    });
    var on = btns.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; })[0] || btns[0];
    if (on) { on.setAttribute("aria-pressed", "true"); cb(on.getAttribute("data-v"), on); }
  }

  /* 画面内にいる間だけ回るアニメーションループ */
  function loop(fig, step) {
    var last = 0;
    function frame(t) {
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (fig.inView !== false && !reduceMotion) step(dt, t / 1000);
      requestAnimationFrame(frame);
    }
    step(0, 0);
    requestAnimationFrame(frame);
  }

  function out(w, key, text) {
    $$("[data-o='" + key + "']", w).forEach(function (o) { o.textContent = text; });
  }

  /* ========================================
     ウィジェット
     ======================================== */
  var widgets = {};

  /* オームの法則：電圧と抵抗を変えると電流（粒の速さ）が変わる */
  widgets.ohm = function (w) {
    var fig = w.closest(".diagram") || w;
    var path = $(".ohm-wire", w);
    var dotsG = $(".ohm-dots", w);
    var glow = $(".ohm-glow", w);
    var len = path.getTotalLength();
    var N = 16;
    var dots = [];
    for (var i = 0; i < N; i++) {
      var c = svgEl("circle", { r: 4.5, class: "d-cat" });
      dotsG.appendChild(c);
      dots.push(c);
    }
    var v = 100, r = 20, pos = 0;
    var inV = $("[data-k='v']", w), inR = $("[data-k='r']", w);
    function calc() {
      v = +inV.value; r = +inR.value;
      var I = v / r, P = v * I;
      out(w, "v", v + " V");
      out(w, "r", r + " Ω");
      out(w, "i", fmt(I, I < 10 ? 2 : 1) + " A");
      out(w, "p", fmt(P) + " W");
      glow.style.opacity = Math.min(1, 0.15 + P / 2500).toFixed(2);
    }
    inV.addEventListener("input", calc);
    inR.addEventListener("input", calc);
    calc();
    loop(fig, function (dt) {
      pos = (pos + dt * Math.min(400, (v / r) * 18)) % len;
      for (var i = 0; i < N; i++) {
        var p = path.getPointAtLength((pos + (i * len) / N) % len);
        dots[i].setAttribute("cx", p.x.toFixed(1));
        dots[i].setAttribute("cy", p.y.toFixed(1));
      }
    });
  };

  /* 交流波形：50Hz / 60Hz */
  widgets.sine = function (w) {
    var fig = w.closest(".diagram") || w;
    var wave = $(".sine-wave", w);
    var hz = 50, phase = 0;
    var X0 = 50, X1 = 470, MID = 120, AMP = 84;
    bindSeg($(".seg", w), function (val) {
      hz = +val;
      out(w, "period", (1000 / hz).toFixed(1).replace(".0", "") + " ms");
      out(w, "flip", hz * 2 + " 回");
    });
    loop(fig, function (dt) {
      phase += dt * 1.2;
      // 横幅 = 40ms の時間窓
      var cycles = (hz * 40) / 1000;
      var d = "";
      for (var x = X0; x <= X1; x += 3) {
        var t = (x - X0) / (X1 - X0);
        var y = MID - AMP * Math.sin(2 * Math.PI * cycles * t - phase);
        d += (x === X0 ? "M" : "L") + x + " " + y.toFixed(1);
      }
      wave.setAttribute("d", d);
    });
  };

  /* IPコード */
  widgets.ip = function (w) {
    var dust = ["保護なし", "直径50mm以上の固形物（手など）", "直径12.5mm以上の固形物（指など）", "直径2.5mm以上の固形物（工具など）", "直径1mm以上の固形物（針金など）", "防塵形：粉塵が内部に入っても動作に支障なし", "耐塵形：粉塵が内部に入らない"];
    var water = ["保護なし", "鉛直に落ちる水滴から保護", "傾斜15°以内の滴水から保護", "散水（60°以内の雨）から保護", "防まつ形：あらゆる方向の水しぶき", "防噴流形：あらゆる方向の噴流水", "耐水形：暴噴流から保護", "防浸形：一時的な水没（1m・30分）", "水中形：継続的な水没（メーカー規定）"];
    var a = "X", b = "4";
    function paint() {
      out(w, "code", "IP" + a + b);
      out(w, "dust", a === "X" ? "第1桁 X：防塵等級は試験していない" : "第1桁 " + a + "：" + dust[+a]);
      out(w, "water", "第2桁 " + b + "：" + water[+b]);
      var drops = $(".ip-meter", w);
      if (drops) drops.style.setProperty("--v", (+b / 8) * 100);
    }
    bindSeg($(".seg-dust", w), function (v) { a = v; paint(); });
    bindSeg($(".seg-water", w), function (v) { b = v; paint(); });
  };

  /* 漏電遮断器 */
  widgets.elb = function (w) {
    var btn = $("button.elb-btn", w);
    var timer = 0;
    function set(state) {
      w.classList.toggle("leak", state !== "normal");
      w.classList.toggle("tripped", state === "tripped");
      if (state === "normal") {
        out(w, "go", "10.000 A"); out(w, "back", "10.000 A"); out(w, "diff", "0 mA"); out(w, "state", "通電中");
        btn.textContent = "漏電を発生させる";
      } else if (state === "leak") {
        out(w, "go", "10.000 A"); out(w, "back", "9.970 A"); out(w, "diff", "30 mA"); out(w, "state", "差を検知…");
        btn.textContent = "リセット";
      } else {
        out(w, "go", "0 A"); out(w, "back", "0 A"); out(w, "diff", "—"); out(w, "state", "遮断（0.1秒以内）");
      }
    }
    btn.addEventListener("click", function () {
      clearTimeout(timer);
      if (w.classList.contains("leak")) { set("normal"); return; }
      set("leak");
      timer = setTimeout(function () { set("tripped"); }, 900);
    });
    set("normal");
  };

  /* エアコン：冷房 / 暖房 */
  widgets.cycle = function (w) {
    bindSeg($(".seg", w), function (v) {
      w.classList.toggle("heat", v === "heat");
      var svg = $("svg", w);
      if (svg && svg.setCurrentTime && svg.getCurrentTime) svg.setCurrentTime(svg.getCurrentTime());
    });
  };

  /* IH：鍋の素材 */
  widgets.ih = function (w) {
    var info = {
      iron: [true, "鉄は磁性体。渦電流が流れて鍋底が発熱します。"],
      cast: [true, "鋳鉄（ホーロー含む）も磁性体なので対応します。"],
      ss: [true, "磁性ステンレス（18-0）は対応。18-8は非対応の場合あり。"],
      alu: [false, "アルミは磁性体ではないため、通常のIHでは加熱できません。"],
      cu: [false, "銅も磁性体ではないため非対応です。"],
      clay: [false, "土鍋・ガラスは金属ではないため渦電流が発生しません。"]
    };
    bindSeg($(".seg", w), function (v) {
      var ok = info[v][0];
      w.classList.toggle("ng", !ok);
      out(w, "verdict", ok ? "IH対応" : "IH非対応");
      out(w, "why", info[v][1]);
    });
  };

  /* 色温度 */
  function kelvinToRgb(k) {
    var t = k / 100, r, g, b;
    r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
    g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
    b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
    function c(x) { return Math.max(0, Math.min(255, Math.round(x))); }
    return "rgb(" + c(r) + "," + c(g) + "," + c(b) + ")";
  }

  widgets.kelvin = function (w) {
    var input = $("input", w);
    var room = $(".kelvin-room", w);
    var names = [
      [3100, "電球色", "リビング・寝室・ダイニング"],
      [3800, "温白色", "電球色と白色の中間。自然で柔らかい"],
      [4500, "白色", "オフィス・キッチン"],
      [5700, "昼白色", "作業場・学校・病院"],
      [99999, "昼光色", "書斎・勉強部屋"]
    ];
    function paint() {
      var k = +input.value;
      room.style.setProperty("--light", kelvinToRgb(k));
      out(w, "k", fmt(k) + " K");
      for (var i = 0; i < names.length; i++) {
        if (k < names[i][0]) { out(w, "name", names[i][1]); out(w, "use", names[i][2]); break; }
      }
    }
    input.addEventListener("input", paint);
    paint();
  };

  /* LED交換の節約額 */
  widgets.led = function (w) {
    var input = $("input", w);
    function paint() {
      var h = +input.value;
      var inc = (60 * h * 365) / 1000, led = (8 * h * 365) / 1000;
      out(w, "h", h + " 時間");
      out(w, "inc", fmt(inc) + " kWh");
      out(w, "led", fmt(led) + " kWh");
      out(w, "yen", fmt((inc - led) * 30) + " 円");
      var bars = $$(".bar", w);
      if (bars[0]) bars[0].style.setProperty("--v", 100);
      if (bars[1]) bars[1].style.setProperty("--v", (8 / 60) * 100);
    }
    input.addEventListener("input", paint);
    paint();
  };

  /* サンプリング（A/D変換） */
  widgets.sampling = function (w) {
    var analog = $(".smp-analog", w), steps = $(".smp-steps", w), dotsG = $(".smp-dots", w);
    var X0 = 30, X1 = 490, MID = 110, AMP = 80;
    var n = 16, bits = 3;
    function f(t) { return Math.sin(2 * Math.PI * t) * 0.75 + Math.sin(6 * Math.PI * t) * 0.25; }
    function draw() {
      var d = "";
      for (var x = X0; x <= X1; x += 2) {
        var t = (x - X0) / (X1 - X0);
        d += (x === X0 ? "M" : "L") + x + " " + (MID - AMP * f(t)).toFixed(1);
      }
      analog.setAttribute("d", d);
      var levels = Math.pow(2, bits) - 1;
      var sd = "", dx = (X1 - X0) / n;
      dotsG.innerHTML = "";
      for (var i = 0; i <= n; i++) {
        var t2 = i / n;
        var q = Math.round(((f(t2) + 1) / 2) * levels) / levels * 2 - 1;
        var x2 = X0 + i * dx, y = MID - AMP * q;
        sd += i === 0 ? "M" + x2 + " " + y.toFixed(1) : "H" + x2.toFixed(1) + "V" + y.toFixed(1);
        var c = svgEl("circle", { cx: x2.toFixed(1), cy: y.toFixed(1), r: n > 40 ? 2 : 3.5, class: "d-cat" });
        dotsG.appendChild(c);
      }
      sd += "H" + X1;
      steps.setAttribute("d", sd);
      out(w, "levels", fmt(levels + 1) + " 段階");
    }
    bindSeg($(".seg-rate", w), function (v) { n = +v; draw(); });
    bindSeg($(".seg-bits", w), function (v) { bits = +v; draw(); });
  };

  /* F値（絞り） */
  widgets.aperture = function (w) {
    var stops = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];
    var input = $("input", w);
    var hole = $(".ap-hole", w);
    var bg = $(".ap-bg", w);
    function paint() {
      var i = +input.value, F = stops[i];
      var rr = 46 * (1.4 / F) + 4;
      hole.setAttribute("r", rr.toFixed(1));
      bg.style.filter = "blur(" + Math.max(0, (8 - i * 1.15)).toFixed(1) + "px)";
      out(w, "f", "F" + F);
      var light = Math.pow(0.5, i);
      out(w, "light", (light >= 0.1 ? fmt(light * 100) : (light * 100).toFixed(1)) + " %");
      out(w, "dof", i <= 2 ? "浅い（背景が大きくボケる）" : i >= 5 ? "深い（全体にピントが合う）" : "中程度");
      var b = $(".bar", w);
      if (b) b.style.setProperty("--v", Math.max(2, light * 100));
    }
    input.addEventListener("input", paint);
    paint();
  };

  /* 粗利計算 */
  widgets.margin = function (w) {
    var cost = $("[data-k='cost']", w), price = $("[data-k='price']", w);
    function paint() {
      var c = +cost.value, p = +price.value;
      var g = p - c;
      out(w, "cost", fmt(c) + " 円");
      out(w, "price", fmt(p) + " 円");
      out(w, "gross", fmt(g) + " 円");
      out(w, "rate", p > 0 ? (g / p * 100).toFixed(1) + " %" : "—");
      var bar = $(".margin-split", w);
      if (bar) bar.style.setProperty("--v", p > 0 ? Math.max(0, Math.min(100, (c / p) * 100)) : 0);
    }
    cost.addEventListener("input", paint);
    price.addEventListener("input", paint);
    paint();
  };

  /* 年間電気代 */
  widgets.bill = function (w) {
    var inW = $("[data-k='w']", w), inH = $("[data-k='h']", w), inU = $("[data-k='u']", w);
    function paint() {
      var W = +inW.value, H = +inH.value, U = +inU.value;
      var kwh = (W / 1000) * H * 365;
      out(w, "w", fmt(W) + " W");
      out(w, "h", H + " h/日");
      out(w, "u", U + " 円");
      out(w, "kwh", fmt(kwh) + " kWh");
      out(w, "yen", fmt(kwh * U) + " 円");
      out(w, "formula", fmt(W) + "W ÷ 1,000 × " + H + "h × 365日 × " + U + "円");
    }
    [inW, inH, inU].forEach(function (el) { el.addEventListener("input", paint); });
    paint();
  };

  /* 汎用：ボタンで data-state を切り替え、見た目は CSS 側で変える */
  widgets.state = function (w) {
    bindSeg($(".seg", w), function (v) { w.setAttribute("data-state", v); });
  };

  /* 汎用タブ（data-widget="tabs"）：ボタンで .tab-panel を切替 */
  widgets.tabs = function (w) {
    var panels = $$(".tab-panel", w);
    bindSeg($(".seg", w), function (v) {
      panels.forEach(function (p) { p.hidden = p.getAttribute("data-v") !== v; });
    });
  };

  function initWidgets() {
    $$("[data-widget]").forEach(function (w) {
      var fn = widgets[w.getAttribute("data-widget")];
      if (fn) {
        try { fn(w); } catch (e) { if (window.console) console.error(e); }
      }
    });
  }

  function init() {
    initContent();
    initTheme();
    initScrollUi();
    initToc();
    initReveal();
    initWidgets();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
