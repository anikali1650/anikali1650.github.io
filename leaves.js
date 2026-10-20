// Scattered green leaves with simple shading and veins. Two soft layers rest behind the whole
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

  // Muted sage and forest greens, with a few yellow-greens
  var NIGHT = ['#3d6b47', '#4f7d4a', '#2f5a3f', '#6a8a4f', '#5b7f63', '#7d9a5c'];
  var DAY   = ['#4a8456', '#5f9a54', '#3a7049', '#82a85e', '#6c9a72', '#9ab86a'];

  var layers = [
    { el: root.querySelector('.leaves__far'), seed: 3, per: 15000, min: 16, max: 30, alpha: 0.45, speed: 0.12, falling: 0 },
    { el: root.querySelector('.leaves__mid'), seed: 9, per: 30000, min: 20, max: 40, alpha: 0.75, speed: 0.26, falling: 0.18, shadow: true }
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

  // ---- Leaf shapes, built once in unit space: stem at (0, 0), tip at (0, -1) ----
  function outline(width, n) {
    var path = new Path2D(), i, t;
    for (i = 0; i <= n; i++) { t = i / n; i ? path.lineTo(width(t), -t) : path.moveTo(width(t), -t); }
    for (i = n; i >= 0; i--) { t = i / n; path.lineTo(-width(t), -t); }
    path.closePath();
    return path;
  }
  function pinnateVeins(pairs, reach) {
    var v = new Path2D();
    v.moveTo(0, 0); v.lineTo(0, -0.94);
    for (var k = 1; k <= pairs; k++) {
      var y = -k / (pairs + 1) * 0.9, w = reach * Math.sin(Math.PI * -y);
      v.moveTo(0, y); v.quadraticCurveTo(w * 0.5, y - 0.04, w, y - 0.13);
      v.moveTo(0, y); v.quadraticCurveTo(-w * 0.5, y - 0.04, -w, y - 0.13);
    }
    return v;
  }
  var SHAPES = [
    // Elm: an oval with a fine toothed edge
    { body: outline(function (t) { return 0.36 * Math.pow(Math.sin(Math.PI * t), 0.85) * (1 + 0.05 * Math.sin(t * Math.PI * 26)); }, 80),
      veins: pinnateVeins(6, 0.28) },
    // Oak: rounded lobes along both edges
    { body: outline(function (t) { return 0.34 * Math.pow(Math.sin(Math.PI * t), 0.8) * (0.72 + 0.28 * Math.cos(t * Math.PI * 7)); }, 60),
      veins: pinnateVeins(4, 0.24) },
    // Maple: five pointed lobes around the centre, veins fanning out from the stem
    (function () {
      var body = new Path2D(), veins = new Path2D(), n = 120;
      for (var i = 0; i <= n; i++) {
        var a = i / n * Math.PI * 2;
        var r = 0.48 * (0.5 + 0.5 * Math.pow(Math.abs(Math.cos(a * 2.5)), 1.6));
        var x = Math.sin(a) * r, y = -0.5 - Math.cos(a) * r;
        i ? body.lineTo(x, y) : body.moveTo(x, y);
      }
      body.closePath();
      for (var k = 0; k < 5; k++) {
        var b = k / 5 * Math.PI * 2;
        veins.moveTo(0, -0.12); veins.lineTo(Math.sin(b) * 0.44, -0.5 - Math.cos(b) * 0.44);
      }
      return { body: body, veins: veins };
    })()
  ];

  // Lighten or darken a hex colour (amt from -1 to 1)
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), out = [16, 8, 0].map(function (s) {
      var c = (n >> s) & 255;
      return Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt));
    });
    return 'rgb(' + out.join(',') + ')';
  }

  function drawLeaf(ctx, l, x, y, rot, size, alpha) {
    var shape = SHAPES[l.kind];
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    // Tilt: squash across the width so leaves look like they lie at different angles
    ctx.scale(size * l.tilt, size);
    if (l.shadow) {
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = '#000';
      ctx.translate(0.05, 0.07); ctx.fill(shape.body); ctx.translate(-0.05, -0.07);
    }
    ctx.globalAlpha = alpha;
    // Shading: deeper at the stem, catching light toward the tip
    if (!l.grad) {
      l.grad = ctx.createLinearGradient(-0.2, 0, 0.2, -1);
      l.grad.addColorStop(0, shade(l.color, -0.3));
      l.grad.addColorStop(0.55, l.color);
      l.grad.addColorStop(1, shade(l.color, 0.22));
    }
    ctx.fillStyle = l.grad;
    ctx.fill(shape.body);
    ctx.strokeStyle = 'rgba(235, 245, 215, 0.28)'; ctx.lineWidth = 0.018; ctx.lineCap = 'round';
    ctx.stroke(shape.veins);
    // Stem
    ctx.strokeStyle = shade(l.color, -0.35); ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.02, 0.1, -0.03, 0.2); ctx.stroke();
    ctx.restore();
  }

  function makeLeaf(rand, palette, x, y, size, shadow) {
    var r = rand();
    return { x: x, y: y, size: size, kind: r < 0.45 ? 0 : r < 0.8 ? 1 : 2, rot: rand() * Math.PI * 2,
             tilt: 0.6 + rand() * 0.4, shadow: !!shadow,
             color: palette[Math.floor(rand() * palette.length)], ph: rand() * 6.28,
             fall: 0, sway: 0 };
  }

  // ---- The hedge: a dense wall of overlapping elm leaves over the opening ----
  // It is drawn once into a grid of leafy clumps; scrolling only moves the clumps apart.
  var HEDGE = ['#2d5a2e', '#3b6e35', '#4f8a3c', '#64a043', '#7ab84a'];
  var NEW_GROWTH = ['#a9cc4f', '#c3d95a', '#98c04a'];

  function buildHedge() {
    var rand = rng(front.seed), night = isNight();
    var res = Math.min(devicePixelRatio || 1, 1.5);
    front.el.width = Math.round(W * scale); front.el.height = Math.round(H * scale);
    front.ctx = front.el.getContext('2d');

    var cols = W < 700 ? 2 : 4, rows = 3, cw = W / cols, ch = H / rows;
    var len = W < 700 ? 48 : 72, pad = len * 1.1;
    front.cells = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var cv = document.createElement('canvas');
      cv.width = Math.round((cw + pad * 2) * res); cv.height = Math.round((ch + pad * 2) * res);
      var cx = cv.getContext('2d');
      cx.setTransform(res, 0, 0, res, (pad - c * cw) * res, (pad - r * ch) * res);   // draw in page coordinates
      front.cells.push({ cv: cv, ctx: cx, x: c * cw - pad, y: r * ch - pad, w: cw + pad * 2, h: ch + pad * 2,
                         mx: (c + 0.5) * cw, my: (r + 0.5) * ch, ph: rand() * 6.28 });
    }
    function cellAt(x, y) {
      var c = Math.min(cols - 1, Math.max(0, Math.floor(x / cw))), r = Math.min(rows - 1, Math.max(0, Math.floor(y / ch)));
      return front.cells[r * cols + c];
    }

    // A few thin twigs behind the leaves
    for (var t = 0; t < (W < 700 ? 6 : 12); t++) {
      var x0 = rand() * W, y0 = rand() * H, a0 = rand() * Math.PI * 2, L = 120 + rand() * 220;
      var cell = cellAt(x0, y0);
      cell.ctx.strokeStyle = night ? 'rgba(60, 70, 40, 0.9)' : 'rgba(110, 120, 60, 0.9)';
      cell.ctx.lineWidth = 1.6; cell.ctx.lineCap = 'round';
      cell.ctx.beginPath(); cell.ctx.moveTo(x0, y0);
      cell.ctx.quadraticCurveTo(x0 + Math.cos(a0 + 0.4) * L / 2, y0 + Math.sin(a0 + 0.4) * L / 2, x0 + Math.cos(a0) * L, y0 + Math.sin(a0) * L);
      cell.ctx.stroke();
    }

    var leafArea = 0.27 * len * len;
    // A dark back layer of larger leaves so no background shows through the hedge
    var back = Math.round(1.1 * W * H / (leafArea * 1.6));
    for (var j = 0; j < back; j++) {
      var bx = rand() * (W + pad) - pad / 2, by = rand() * (H + pad) - pad / 2;
      drawLeaf(cellAt(bx, by).ctx, { kind: 0, tilt: 1, shadow: false, color: night ? '#0f1f12' : '#1f3d22' },
               bx, by, rand() * Math.PI * 2, len * 1.3, 1);
    }

    // Leaves from back to front: deeper and darker behind, brighter new growth in front
    var n = Math.round(2.8 * W * H / leafArea);
    for (var i = 0; i < n; i++) {
      var depth = i / n;
      var x = rand() * (W + pad) - pad / 2, y = rand() * (H + pad) - pad / 2;
      var fresh = depth > 0.55 && rand() < 0.22;
      var base = fresh ? NEW_GROWTH[Math.floor(rand() * NEW_GROWTH.length)] : HEDGE[Math.floor(rand() * HEDGE.length)];
      var dim = -0.5 * (1 - depth) - (night ? 0.35 : 0);
      var l = { kind: rand() < 0.85 ? 0 : 1, tilt: 0.7 + rand() * 0.3, shadow: true,
                color: shade(base, dim).replace(/rgb\((\d+),(\d+),(\d+)\)/, function (m, r, g, b) {
                  return '#' + [r, g, b].map(function (v) { return ('0' + (+v).toString(16)).slice(-2); }).join('');
                }) };
      // Leaves mostly hang and point outward, like on a real hedge
      var rot = Math.PI + (rand() - 0.5) * 2.4;
      drawLeaf(cellAt(x, y).ctx, l, x, y, rot, len * (0.75 + rand() * 0.5), 1);
    }
  }

  function drawHedge(time) {
    var p = introProgress(), e = Math.min(1, p / 0.6);
    e = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
    var ctx = front.ctx;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (e >= 1) return;
    ctx.globalAlpha = 1 - Math.max(0, (e - 0.45) / 0.55);
    front.cells.forEach(function (c) {
      // Each clump pushes out from the centre, growing a little as if passing close by
      var dx = c.mx - W / 2, dy = c.my - H * 0.47, d = Math.hypot(dx, dy) || 1;
      var push = e * (W * 0.55 + d * 0.5);
      var rustle = Math.sin(time * 0.8 + c.ph) * 1.5;
      var s = 1 + e * 0.35;
      var ox = c.mx + dx / d * push + rustle, oy = c.my + dy / d * push;
      ctx.drawImage(c.cv, ox + (c.x - c.mx) * s, oy + (c.y - c.my) * s, c.w * s, c.h * s);
    });
    ctx.globalAlpha = 1;
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
        var l = makeLeaf(rand, palette, rand() * W, rand() * tileH, layer.min + rand() * (layer.max - layer.min), layer.shadow);
        if (rand() < layer.falling) { l.fall = 10 + rand() * 14; l.sway = 18 + rand() * 24; }
        layer.leaves.push(l);
      }
    });

    if (front) buildHedge();
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

    if (front) drawHedge(time);
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
