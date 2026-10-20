// Opening sequence: a field of wavy lines that drift and bend away from the mouse,
// and the name spelling itself out as you scroll through the pinned intro.
(function () {
  var intro = document.querySelector('.intro');
  if (!intro) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var svg = intro.querySelector('.waves');
  var letters = [].slice.call(intro.querySelectorAll('.ch > span'));
  var tracks = intro.querySelectorAll('.bits__track');
  var bits = intro.querySelectorAll('.bits');
  var outro = intro.querySelector('.intro__outro');
  var hint = intro.querySelector('.intro__hint');

  // Binary bands spell out the name in ASCII
  var code = 'ANIKA LI'.split('').map(function (c) {
    return c === ' ' ? '' : ('0000000' + c.charCodeAt(0).toString(2)).slice(-8);
  }).join('  ');
  var long = Array(8).join(code + '    ');
  tracks.forEach(function (t) { t.textContent = long; });

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
    bits.forEach(function (b) { b.style.transform = 'scaleX(' + ease(clamp((p - 0.02) / 0.25)) + ')'; });
    tracks[0].style.transform = 'translateX(' + (-p * 30) + '%)';
    tracks[1].style.transform = 'translateX(' + (p * 30 - 30) + '%)';

    letters.forEach(function (el, i) {
      var e = ease(clamp((p - 0.08 - i * 0.06) / 0.22));
      el.style.transform = 'translateY(' + (1 - e) * 115 + '%) rotate(' + (1 - e) * 10 + 'deg)';
    });

    var o = ease(clamp((p - 0.72) / 0.16));
    outro.style.opacity = o;
    outro.style.transform = 'translateY(' + (1 - o) * 24 + 'px)';
    outro.style.visibility = o > 0 ? 'visible' : 'hidden';
  }

  // ---- Wave field ----
  var NS = 'http://www.w3.org/2000/svg';
  var cols = [], paths = [], w = 0, h = 0;
  var mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999 };

  function build() {
    var r = svg.getBoundingClientRect();
    w = r.width; h = r.height;
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
    mouse.sx += (mouse.x - mouse.sx) * 0.12;
    mouse.sy += (mouse.y - mouse.sy) * 0.12;
    var R = 170;

    for (var i = 0; i < cols.length; i++) {
      var col = cols[i], d = '';
      for (var j = 0; j < col.length; j++) {
        var pt = col[j];
        // Smooth flowing drift from layered sine waves
        var a = 2.2 * Math.sin(pt.x * 0.0045 + t * 0.00035)
              + 1.8 * Math.cos(pt.y * 0.004 - t * 0.0003)
              + 1.2 * Math.sin((pt.x - pt.y) * 0.0025 + t * 0.0002);
        var x = pt.x + Math.cos(a) * 24, y = pt.y + Math.sin(a) * 10;

        // Springy push away from the cursor
        var dx = x - mouse.sx, dy = y - mouse.sy, dist = Math.hypot(dx, dy), tx = 0, ty = 0;
        if (dist < R && dist > 0) {
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

  // ---- Wiring ----
  var visible = true;
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(intro);

  addEventListener('mousemove', function (e) {
    var r = svg.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
  });
  document.addEventListener('mouseleave', function () { mouse.x = mouse.y = -9999; });

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { build(); if (still) draw(0); }, 150);
  });

  if (still) intro.classList.add('still');
  build();
  reveal(progress());

  if (still) { draw(0); return; }
  addEventListener('scroll', function () { reveal(progress()); }, { passive: true });
  (function loop(t) {
    if (visible) draw(t);
    requestAnimationFrame(loop);
  })(0);
})();
