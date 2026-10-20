// Fallen autumn leaves, like a late night in November. Two soft layers rest behind the whole
// page (a blurry far one and a clearer middle one), drift with the scroll, and now and then a
// leaf floats down. In the opening, a closer drift of leaves sits over the name and scatters
// outward as you scroll, like walking forward through them.
(function () {
  var root = document.querySelector('.leaves');
  if (!root) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var intro = document.querySelector('.intro');
  var frontEl = document.querySelector('.leaves__front');
  function isNight() { return document.documentElement.dataset.theme === 'night'; }

  var NIGHT = ['#b8501c', '#e8742a', '#9a3412', '#c98a2e', '#7c2d12', '#d9a05b'];
  var DAY   = ['#c2531b', '#e07a2f', '#a33a12', '#d19a3c', '#8a3414', '#e0b06a'];

  var layers = [
    { el: root.querySelector('.leaves__far'), seed: 3, per: 15000, min: 16, max: 30, alpha: 0.45, speed: 0.12, falling: 0 },
    { el: root.querySelector('.leaves__mid'), seed: 9, per: 30000, min: 20, max: 40, alpha: 0.7,  speed: 0.26, falling: 0.18 }
  ];
  var front = frontEl && !still ? { el: frontEl, seed: 17 } : null;
  var W = 0, H = 0, tileH = 0, scale = 1;

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // One leaf, drawn in unit space: stem at (0, 0), tip at (0, -1)
  function leafPath(ctx, kind) {
    ctx.beginPath();
    if (kind === 0) {
      // Slender, pointed (like elm or birch)
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(0.42, -0.22, 0.36, -0.74, 0, -1);
      ctx.bezierCurveTo(-0.36, -0.74, -0.42, -0.22, 0, 0);
    } else {
      // Oak: elongated, with wavy lobes along both edges (up the right side, back down the left)
      var N = 40, t, w;
      for (var i = 0; i <= N; i++) {
        t = i / N; w = 0.34 * Math.pow(Math.sin(Math.PI * t), 0.8) * (0.74 + 0.26 * Math.cos(t * Math.PI * 7));
        i ? ctx.lineTo(w, -t) : ctx.moveTo(w, -t);
      }
      for (i = N; i >= 0; i--) {
        t = i / N; w = 0.34 * Math.pow(Math.sin(Math.PI * t), 0.8) * (0.74 + 0.26 * Math.cos(t * Math.PI * 7));
        ctx.lineTo(-w, -t);
      }
      ctx.closePath();
    }
  }

  function drawLeaf(ctx, l, x, y, rot, size, alpha) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(size, size);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = l.color;
    leafPath(ctx, l.kind); ctx.fill();
    // A faint midrib
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -0.9); ctx.stroke();
    // A short stem
    ctx.globalAlpha = alpha; ctx.strokeStyle = l.color; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.02, 0.1, -0.03, 0.18); ctx.stroke();
    ctx.restore();
  }

  function makeLeaf(rand, palette, x, y, size) {
    return { x: x, y: y, size: size, kind: rand() < 0.55 ? 1 : 0, rot: rand() * Math.PI * 2,
             color: palette[Math.floor(rand() * palette.length)], ph: rand() * 6.28,
             fall: 0, sway: 0 };
  }

  function build() {
    W = innerWidth; H = innerHeight;
    scale = Math.min(devicePixelRatio || 1, 2);
    tileH = H * 1.5;
    var palette = isNight() ? NIGHT : DAY;

    layers.forEach(function (layer) {
      var rand = rng(layer.seed), res = scale * 0.6;   // soft layers can render under full resolution
      layer.el.width = Math.round(W * res); layer.el.height = Math.round(H * res);
      layer.ctx = layer.el.getContext('2d'); layer.res = res;
      layer.leaves = [];
      var n = Math.round(W * tileH / layer.per);
      for (var i = 0; i < n; i++) {
        var l = makeLeaf(rand, palette, rand() * W, rand() * tileH, layer.min + rand() * (layer.max - layer.min));
        if (rand() < layer.falling) { l.fall = 10 + rand() * 14; l.sway = 18 + rand() * 24; }
        layer.leaves.push(l);
      }
    });

    if (front) {
      var rand = rng(front.seed);
      front.el.width = Math.round(W * scale); front.el.height = Math.round(H * scale);
      front.ctx = front.el.getContext('2d');
      front.leaves = [];
      // A drift gathered over the middle, where the name sits
      var count = W < 700 ? 34 : 56;
      for (var i = 0; i < count; i++) {
        var a = rand() * Math.PI * 2, d = Math.sqrt(rand());
        var x = W / 2 + Math.cos(a) * d * W * 0.5, y = H * 0.47 + Math.sin(a) * d * H * 0.32;
        var size = (W < 700 ? 34 : 48) + rand() * (W < 700 ? 40 : 70);
        front.leaves.push(makeLeaf(rand, palette, x, y, size));
      }
    }
  }

  function introProgress() {
    if (!intro) return 1;
    var total = intro.offsetHeight - innerHeight;
    return total > 0 ? Math.min(1, Math.max(0, -intro.getBoundingClientRect().top / total)) : 1;
  }

  function draw(t) {
    var time = still ? 0 : t / 1000;

    layers.forEach(function (layer) {
      var ctx = layer.ctx;
      ctx.setTransform(layer.res, 0, 0, layer.res, 0, 0);
      ctx.clearRect(0, 0, W, H);
      layer.leaves.forEach(function (l) {
        var y = l.y + (still ? 0 : scrollY * layer.speed) + l.fall * time;
        y = ((y % tileH) + tileH) % tileH - (tileH - H) / 2;
        if (y < -60 || y > H + 60) return;
        var x = l.x + (l.sway ? Math.sin(time * 0.6 + l.ph) * l.sway : 0);
        var rot = l.rot + Math.sin(time * 0.35 + l.ph) * (l.fall ? 0.5 : 0.06);
        drawLeaf(ctx, l, x, y, rot, l.size, layer.alpha);
      });
    });

    if (front) {
      // Scatter: each leaf moves out from the centre, grows (passing close by) and fades
      var p = introProgress(), e = Math.min(1, p / 0.6);
      e = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
      var ctx = front.ctx;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (e < 1) {
        front.leaves.forEach(function (l) {
          var dx = l.x - W / 2, dy = l.y - H * 0.47, d = Math.hypot(dx, dy) || 1;
          var push = e * (W * 0.7 + d * 0.6);
          var x = l.x + dx / d * push + Math.sin(time * 0.5 + l.ph) * 4;
          var y = l.y + dy / d * push * 0.8 + Math.cos(time * 0.4 + l.ph) * 3;
          var rot = l.rot + Math.sin(time * 0.3 + l.ph) * 0.05 + e * (l.ph - 3) * 0.4;
          drawLeaf(ctx, l, x, y, rot, l.size * (1 + e * 0.9), 0.92 * (1 - e));
        });
      }
    }
  }

  build();
  draw(performance.now());

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { build(); draw(performance.now()); }, 150);
  });
  addEventListener('themechange', function () { build(); draw(performance.now()); });

  if (still) return;
  (function loop(t) { draw(t); requestAnimationFrame(loop); })(0);
})();
