// Opening sequence: a short splash with the name, then a field of wavy lines that drift
// and bend away from the mouse while the name spells itself out as you scroll. Then a
// photo panel rises behind the name and the letters turn white where they overlap it.
(function () {
  var intro = document.querySelector('.intro');
  if (!intro) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Two copies of the name: the dark one on the page, and a white one inside the photo panel
  var letters = [].slice.call(intro.querySelectorAll('.ch > span'));
  var perCopy = letters.length / 2;
  var stage = intro.querySelector('.intro__stage');
  var panel = intro.querySelector('.intro__panel');
  var photo = intro.querySelector('.intro__photo');
  var hint = intro.querySelector('.intro__hint');

  // Splash: hold the pulsing name for at least a moment, until fonts are ready, then fade it out
  var splash = document.querySelector('.splash');
  if (splash) {
    var shown = performance.now();
    var hideSplash = function () {
      setTimeout(function () {
        splash.classList.add('gone');
        setTimeout(function () { splash.remove(); }, 600);
      }, Math.max(0, (still ? 300 : 1100) - (performance.now() - shown)));
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(hideSplash);
  }

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { return 1 - Math.pow(1 - v, 3); }

  // ---- Scroll-driven reveal ----

  function progress() {
    if (still) return 1;
    var total = intro.offsetHeight - innerHeight;
    return total > 0 ? clamp(-intro.getBoundingClientRect().top / total) : 1;
  }

  function reveal(p) {
    hint.style.opacity = 1 - clamp(p / 0.08);

    letters.forEach(function (el, i) {
      var e = ease(clamp((p - 0.06 - (i % perCopy) * 0.05) / 0.18));
      el.style.transform = 'translateY(' + (1 - e) * 115 + '%) rotate(' + (1 - e) * 10 + 'deg)';
    });

    // The photo panel rises from the bottom; its rounded inset shrinks until it fills the screen
    var r = clamp((p - 0.56) / 0.44);
    var top = (1 - r) * stage.clientHeight, side = (1 - r) * 16, round = (1 - r) * 24;
    panel.style.clipPath = 'inset(' + top + 'px ' + side + 'px 0 ' + side + 'px round ' + round + 'px ' + round + 'px 0 0)';
    photo.style.transform = 'translateY(' + top + 'px)';

    // Keep the nav dark-on-white while the white part of the opening is behind it
    var light = top > 60 && intro.getBoundingClientRect().bottom > 60;
    document.documentElement.classList.toggle('nav-light', light);
  }

  // ---- Mouse ----
  var mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, on: false };
  addEventListener('mousemove', function (e) {
    var r = stage.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
    if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
  });
  document.addEventListener('mouseleave', function () { mouse.on = false; });

  var visible = true;
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(intro);

  var backdrop = startLines();

  if (still) intro.classList.add('still');
  reveal(progress());
  intro.classList.add('ready');
  backdrop.resize();

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { backdrop.resize(); reveal(progress()); if (still) backdrop.draw(0); }, 150);
  });

  if (still) { backdrop.draw(0); return; }
  addEventListener('scroll', function () { reveal(progress()); }, { passive: true });
  (function loop(t) {
    if (visible) {
      mouse.sx += (mouse.x - mouse.sx) * 0.12;
      mouse.sy += (mouse.y - mouse.sy) * 0.12;
      backdrop.draw(t);
    }
    requestAnimationFrame(loop);
  })(0);

  // ===== Wavy line field (SVG) =====
  function startLines() {
    var svg = intro.querySelector('.waves');
    var NS = 'http://www.w3.org/2000/svg';
    var cols = [], paths = [];

    function resize() {
      var r = svg.getBoundingClientRect(), w = r.width, h = r.height;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      paths.forEach(function (p) { p.remove(); });
      cols = []; paths = [];
      var gapX = w < 700 ? 16 : 12, gapY = 28;
      var nx = Math.ceil((w + 120) / gapX), ny = Math.ceil((h + 60) / gapY);
      var ox = (w - nx * gapX) / 2, oy = (h - ny * gapY) / 2;
      for (var i = 0; i <= nx; i++) {
        var col = [];
        for (var j = 0; j <= ny; j++) col.push({ x: ox + i * gapX, y: oy + j * gapY, cx: 0, cy: 0, vx: 0, vy: 0 });
        cols.push(col);
        var path = document.createElementNS(NS, 'path');
        svg.appendChild(path);
        paths.push(path);
      }
    }

    function draw(t) {
      var R = 170;
      for (var i = 0; i < cols.length; i++) {
        var col = cols[i], d = '';
        for (var j = 0; j < col.length; j++) {
          var pt = col[j];
          var a = 2.2 * Math.sin(pt.x * 0.0045 + t * 0.00035)
                + 1.8 * Math.cos(pt.y * 0.004 - t * 0.0003)
                + 1.2 * Math.sin((pt.x - pt.y) * 0.0025 + t * 0.0002);
          var x = pt.x + Math.cos(a) * 24, y = pt.y + Math.sin(a) * 10;
          var dx = x - mouse.sx, dy = y - mouse.sy, dist = Math.hypot(dx, dy), tx = 0, ty = 0;
          if (mouse.on && dist < R && dist > 0) {
            var f = Math.pow(1 - dist / R, 2) * 70;
            tx = dx / dist * f; ty = dy / dist * f;
          }
          pt.vx = (pt.vx + (tx - pt.cx) * 0.08) * 0.82;
          pt.vy = (pt.vy + (ty - pt.cy) * 0.08) * 0.82;
          pt.cx += pt.vx; pt.cy += pt.vy;
          d += (j ? 'L' : 'M') + (x + pt.cx).toFixed(1) + ' ' + (y + pt.cy).toFixed(1);
        }
        paths[i].setAttribute('d', d);
      }
    }

    return { resize: resize, draw: draw };
  }
})();
