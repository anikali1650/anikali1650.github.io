// Dappled tree shadows behind the whole site, like walking down a path under oak trees.
// Two layers (a softer far canopy and a sharper near one) are generated once, sway gently,
// and slide down the screen as you scroll, so scrolling feels like walking forward.
// In dark mode the same canopy is drawn as patches of light filtering through the leaves.
(function () {
  var root = document.querySelector('.shade');
  if (!root) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var darkQuery = matchMedia('(prefers-color-scheme: dark)');
  var intro = document.querySelector('.intro');

  var layers = [
    { el: root.querySelector('.shade__far'),  seed: 7,  leaf: 1.35, density: 0.8, speed: 0.22, sway: 0.0045, phase: 1.7 },
    { el: root.querySelector('.shade__near'), seed: 21, leaf: 1.0,  density: 1.0, speed: 0.34, sway: 0.0065, phase: 0 }
  ];
  var RES = 0.5;          // render at half resolution; the CSS blur hides it
  var W = 0, H = 0, tileW = 0, tileH = 0;

  // Small seeded random generator so the canopy looks the same on every visit
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Grow limbs in from the sides and top, then cluster leaves around the twig tips
  function buildCanopy(layer) {
    var rand = rng(layer.seed);
    var tile = document.createElement('canvas');
    tile.width = tileW; tile.height = tileH;
    var ctx = tile.getContext('2d');
    var shapes = [];
    var tips = [];

    function grow(x, y, ang, len, width, depth) {
      var bend = (rand() - 0.5) * 0.5;
      var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      var cx = (x + x2) / 2 + Math.cos(ang + Math.PI / 2) * len * bend * 0.3;
      var cy = (y + y2) / 2 + Math.sin(ang + Math.PI / 2) * len * bend * 0.3;
      shapes.push({ t: 'limb', x: x, y: y, cx: cx, cy: cy, x2: x2, y2: y2, w: width });
      if (depth <= 2) tips.push([x2, y2, depth === 0 ? 1 : 0.55]);
      if (depth === 0 || len < 14 * RES) return;
      var kids = rand() < 0.35 ? 3 : 2;
      for (var k = 0; k < kids; k++) {
        var spread = (k - (kids - 1) / 2) * (0.45 + rand() * 0.35);
        grow(x2, y2, ang + spread + (rand() - 0.5) * 0.3, len * (0.68 + rand() * 0.12), Math.max(1, width * 0.68), depth - 1);
      }
    }

    // More limbs on tall, narrow screens so the shade covers top to bottom
    var limbs = Math.round((5 + 2.4 * tileH / tileW) * layer.density);
    for (var i = 0; i < limbs; i++) {
      var side = i % 3, x, y, ang;
      var band = (i + rand()) / limbs * tileH;   // spread limbs evenly down the tile
      if (side === 0) { x = -20; y = band; ang = (rand() - 0.5) * 0.9; }
      else if (side === 1) { x = tileW + 20; y = band; ang = Math.PI + (rand() - 0.5) * 0.9; }
      else { x = rand() * tileW; y = -20; ang = Math.PI / 2 + (rand() - 0.5) * 1.2; }
      grow(x, y, ang, tileW * (0.12 + rand() * 0.06), 22 * RES * (0.8 + rand() * 0.5), 5);
    }

    tips.forEach(function (p) {
      var n = Math.round((14 + rand() * 14) * layer.density * p[2]);
      var r = (30 + rand() * 30) * RES * layer.leaf * (0.6 + p[2] * 0.4);
      for (var j = 0; j < n; j++) {
        var a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
        shapes.push({ t: 'leaf', x: p[0] + Math.cos(a) * d, y: p[1] + Math.sin(a) * d,
                      rx: (8 + rand() * 8) * RES * layer.leaf, ry: (4 + rand() * 5) * RES * layer.leaf, rot: rand() * Math.PI });
      }
    });

    // Draw everything three times (shifted up and down) so the tile repeats seamlessly while walking
    function drawShapes() {
      [-tileH, 0, tileH].forEach(function (dy) {
        shapes.forEach(function (s) {
          if (s.t === 'limb') {
            ctx.lineWidth = s.w; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(s.x, s.y + dy); ctx.quadraticCurveTo(s.cx, s.cy + dy, s.x2, s.y2 + dy); ctx.stroke();
          } else {
            ctx.beginPath(); ctx.ellipse(s.x, s.y + dy, s.rx, s.ry, s.rot, 0, Math.PI * 2); ctx.fill();
          }
        });
      });
    }

    if (darkQuery.matches) {
      // Dark mode: soft light everywhere, with the canopy cut out of it
      ctx.fillStyle = 'rgb(255, 244, 225)';
      ctx.fillRect(0, 0, tileW, tileH);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = ctx.strokeStyle = '#000';
    } else {
      ctx.fillStyle = ctx.strokeStyle = 'rgb(74, 62, 46)';
    }
    drawShapes();

    // Sun flecks: small soft openings in the canopy where light gets through
    var flecks = Math.round(tileW * tileH / 160);
    if (darkQuery.matches) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgb(255, 244, 225)'; }
    else { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; }
    for (var f = 0; f < flecks; f++) {
      var fx = rand() * tileW, fy = rand() * tileH, fr = (1.5 + rand() * 3.5) * layer.leaf;
      [-tileH, 0, tileH].forEach(function (dy) {
        ctx.beginPath(); ctx.ellipse(fx, fy + dy, fr * 1.3, fr, rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
      });
    }
    layer.tile = tile;
  }

  function resize() {
    W = innerWidth; H = innerHeight;
    // Wider than the screen so swaying never shows an edge; taller so the walk has room
    tileW = Math.round(W * 1.15 * RES);
    tileH = Math.round(H * 1.6 * RES);
    layers.forEach(function (l) {
      l.el.width = Math.round(W * RES);
      l.el.height = Math.round(H * RES);
      l.ctx = l.el.getContext('2d');
      buildCanopy(l);
    });
  }

  function strength() {
    // Full strength through the opening, then a faint wash behind the content
    if (!intro) return 0.45;
    var end = intro.offsetTop + intro.offsetHeight - H;
    var past = (scrollY - end) / H;
    return past <= 0 ? 1 : Math.max(0.4, 1 - past * 0.6);
  }

  function draw(t) {
    var walk = still ? 0 : scrollY;
    root.style.opacity = strength();
    layers.forEach(function (l) {
      var ctx = l.ctx, cw = l.el.width, ch = l.el.height;
      var sway = still ? 0 : Math.sin(t * 0.00035 + l.phase) * l.sway + Math.sin(t * 0.00091 + l.phase) * l.sway * 0.4;
      var drift = still ? 0 : Math.sin(t * 0.0005 + l.phase) * 5 * RES;
      var off = ((walk * l.speed * RES) % tileH + tileH) % tileH;
      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      ctx.translate(cw / 2, 0);
      ctx.rotate(sway);
      ctx.translate(-tileW / 2 + drift, off - tileH);
      ctx.drawImage(l.tile, 0, 0);
      ctx.drawImage(l.tile, 0, tileH);
      ctx.restore();
    });
  }

  resize();
  draw(0);

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); draw(performance.now()); }, 150);
  });
  darkQuery.addEventListener && darkQuery.addEventListener('change', function () { resize(); draw(performance.now()); });

  if (still) { addEventListener('scroll', function () { root.style.opacity = strength(); }, { passive: true }); return; }
  (function loop(t) { draw(t); requestAnimationFrame(loop); })(0);
})();
