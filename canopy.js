// Shared tree generator: grows limbs from given starting points, clusters leaves along the
// outer twigs, and paints the result onto a canvas. Used by the background shade (shade.js)
// and the branches that part in the opening (intro.js), so both look like the same trees.
window.Canopy = (function () {
  // Small seeded random generator so the trees look the same on every visit
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // starts: [{ x, y, ang, len, width }]; scale: overall size multiplier for leaves and twigs.
  // Optional: minLen (shortest twig), tipDepth (how far in from the tips leaves grow),
  // leafCount and cluster (how many leaves per tip and how wide they spread).
  function grow(rand, starts, opts) {
    var scale = opts.scale || 1, leaf = opts.leaf || 1, density = opts.density || 1;
    var minLen = opts.minLen || 14 * scale, tipDepth = opts.tipDepth === undefined ? 2 : opts.tipDepth;
    var leafCount = opts.leafCount || 1, cluster = opts.cluster || 1;
    var shapes = [], tips = [];

    function branch(x, y, ang, len, width, depth) {
      var bend = (rand() - 0.5) * 0.5;
      var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      var cx = (x + x2) / 2 + Math.cos(ang + Math.PI / 2) * len * bend * 0.3;
      var cy = (y + y2) / 2 + Math.sin(ang + Math.PI / 2) * len * bend * 0.3;
      shapes.push({ t: 'limb', x: x, y: y, cx: cx, cy: cy, x2: x2, y2: y2, w: width });
      if (depth <= tipDepth) tips.push([x2, y2, depth === 0 ? 1 : 0.55]);
      if (depth === 0 || len < minLen) return;
      var kids = rand() < 0.35 ? 3 : 2;
      for (var k = 0; k < kids; k++) {
        var spread = (k - (kids - 1) / 2) * (0.45 + rand() * 0.35);
        branch(x2, y2, ang + spread + (rand() - 0.5) * 0.3, len * (0.68 + rand() * 0.12), Math.max(1, width * 0.68), depth - 1);
      }
    }
    starts.forEach(function (s) { branch(s.x, s.y, s.ang, s.len, s.width, opts.depth || 5); });

    tips.forEach(function (p) {
      var n = Math.round((14 + rand() * 14) * density * leafCount * p[2]);
      var r = (30 + rand() * 30) * scale * leaf * cluster * (0.6 + p[2] * 0.4);
      for (var j = 0; j < n; j++) {
        var a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
        shapes.push({ t: 'leaf', x: p[0] + Math.cos(a) * d, y: p[1] + Math.sin(a) * d,
                      rx: (8 + rand() * 8) * scale * leaf, ry: (4 + rand() * 5) * scale * leaf, rot: rand() * Math.PI });
      }
    });
    return shapes;
  }

  // Paint shapes with the context's current fill/stroke, optionally repeated at vertical offsets
  function paint(ctx, shapes, offsets) {
    (offsets || [0]).forEach(function (dy) {
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

  return { rng: rng, grow: grow, paint: paint };
})();
