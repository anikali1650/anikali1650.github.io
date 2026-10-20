// Faint dappled tree shadows behind the whole site, like walking down a path under oak trees.
// Two layers (a softer far canopy and a sharper near one) are generated once, sway gently,
// and slide down the screen as you scroll, so scrolling feels like walking forward.
// In dark mode the same canopy is drawn as patches of light filtering through the leaves.
(function () {
  var root = document.querySelector('.shade');
  if (!root) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function isNight() { return document.documentElement.dataset.theme === 'night'; }

  var layers = [
    { el: root.querySelector('.shade__far'),  seed: 7,  leaf: 1.35, density: 0.8, speed: 0.22, sway: 0.0045, phase: 1.7 },
    { el: root.querySelector('.shade__near'), seed: 21, leaf: 1.0,  density: 1.0, speed: 0.34, sway: 0.0065, phase: 0 }
  ];
  var RES = 0.5;          // render at half resolution; the CSS blur hides it
  var W = 0, H = 0, tileW = 0, tileH = 0;

  var C = window.Canopy;

  // Grow limbs in from the sides and top of a tile that repeats vertically
  function buildCanopy(layer) {
    var rand = C.rng(layer.seed);
    var tile = document.createElement('canvas');
    tile.width = tileW; tile.height = tileH;
    var ctx = tile.getContext('2d');

    // More limbs on tall, narrow screens so the shade covers top to bottom
    var limbs = Math.round((5 + 2.4 * tileH / tileW) * layer.density), starts = [];
    for (var i = 0; i < limbs; i++) {
      var side = i % 3, x, y, ang;
      var band = (i + rand()) / limbs * tileH;   // spread limbs evenly down the tile
      if (side === 0) { x = -20; y = band; ang = (rand() - 0.5) * 0.9; }
      else if (side === 1) { x = tileW + 20; y = band; ang = Math.PI + (rand() - 0.5) * 0.9; }
      else { x = rand() * tileW; y = -20; ang = Math.PI / 2 + (rand() - 0.5) * 1.2; }
      starts.push({ x: x, y: y, ang: ang, len: tileW * (0.12 + rand() * 0.06), width: 22 * RES * (0.8 + rand() * 0.5) });
    }
    var shapes = C.grow(rand, starts, { scale: RES, leaf: layer.leaf, density: layer.density });
    // Drawn three times (shifted up and down) so the tile repeats seamlessly while walking
    function drawShapes() { C.paint(ctx, shapes, [-tileH, 0, tileH]); }

    if (isNight()) {
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
    if (isNight()) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgb(255, 244, 225)'; }
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

  function draw(t) {
    var walk = still ? 0 : scrollY;
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
  addEventListener('themechange', function () { resize(); draw(performance.now()); });

  if (still) return;
  (function loop(t) { draw(t); requestAnimationFrame(loop); })(0);
})();
