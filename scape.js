// A quiet landscape behind the page: layered mountain ridges fading into haze, above a still
// lake that reflects them, with a slow ripple moving through the reflection. The mountains are
// drawn once; each frame only redraws the reflection in thin rippling strips.
(function () {
  var cv = document.querySelector('.scape');
  if (!cv) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var intro = document.querySelector('.intro');
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, res = 1, horizon = 0, mountains = null;
  function isNight() { return document.documentElement.dataset.theme === 'night'; }

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Smooth 1D noise, layered in octaves, for natural-looking ridgelines
  function ridgeNoise(seed) {
    var rand = rng(seed), lattice = [];
    for (var i = 0; i < 512; i++) lattice.push(rand());
    function n(x) {
      var i = Math.floor(x), f = x - i, a = lattice[i & 511], b = lattice[(i + 1) & 511];
      f = f * f * (3 - 2 * f);
      return a + (b - a) * f;
    }
    return function (x) {
      var v = 0, amp = 1, freq = 1, total = 0;
      for (var o = 0; o < 5; o++) { v += n(x * freq) * amp; total += amp; amp *= 0.5; freq *= 2.1; }
      return v / total;
    };
  }

  function build() {
    W = innerWidth; H = innerHeight;
    res = Math.min(devicePixelRatio || 1, 2) * 0.75;
    cv.width = Math.round(W * res); cv.height = Math.round(H * res);
    horizon = Math.round(H * 0.64);
    var night = isNight();

    mountains = document.createElement('canvas');
    mountains.width = Math.round(W * res); mountains.height = Math.round(horizon * res);
    var m = mountains.getContext('2d');
    m.setTransform(res, 0, 0, res, 0, 0);

    // Sky: a faint glow rising from the horizon
    var sky = m.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, 'rgba(0,0,0,0)');
    sky.addColorStop(1, night ? 'rgba(120, 110, 100, 0.22)' : 'rgba(255, 252, 245, 0.7)');
    m.fillStyle = sky; m.fillRect(0, 0, W, horizon);

    // Ridges from far to near; each new layer first veils the ones behind it in haze
    var colors = night
      ? ['#2a2827', '#232120', '#1c1a19', '#161413', '#100e0d']
      : ['#d8d2c9', '#c6bfb5', '#b2aba1', '#9d968d', '#89827a'];
    var haze = night ? 'rgba(40, 36, 34, 0.25)' : 'rgba(246, 243, 237, 0.35)';
    var scaleX = 1 / Math.max(W, 600);
    for (var i = 0; i < colors.length; i++) {
      if (i > 0) { m.fillStyle = haze; m.fillRect(0, 0, W, horizon); }
      var noise = ridgeNoise(11 + i * 7);
      var top = horizon - H * (0.30 - i * 0.045), amp = H * (0.16 - i * 0.018), freq = 2.2 + i * 1.1;
      m.beginPath(); m.moveTo(0, horizon);
      for (var x = 0; x <= W; x += 3) m.lineTo(x, top + (1 - noise(x * scaleX * freq + i * 3.7)) * amp);
      m.lineTo(W, horizon); m.closePath();
      m.fillStyle = colors[i]; m.fill();
    }
  }

  function strength() {
    // Full in the opening, then a faint wash behind the content
    if (!intro) return 0.35;
    var end = intro.offsetTop + intro.offsetHeight - H;
    var past = (scrollY - end) / H;
    return past <= 0 ? 1 : Math.max(0.3, 1 - past * 0.7);
  }

  function draw(t) {
    var time = still ? 0 : t / 1000;
    cv.style.opacity = strength();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(mountains, 0, 0);

    // Reflection: the mountains flipped below the horizon, in strips that drift side to side
    var hz = horizon * res, depth = cv.height - hz, step = Math.max(1, Math.round(2 * res));
    for (var y = 0; y < depth; y += step) {
      var d = y / depth;                            // 0 at the shoreline, 1 at the bottom
      var src = hz - y - step;
      if (src < 0) break;
      var wave = Math.sin(y / res * 0.09 - time * 1.1) * (1 + d * 7) * res
               + Math.sin(y / res * 0.031 + time * 0.6) * (1 + d * 4) * res;
      ctx.globalAlpha = 0.55 * (1 - d * 0.85);
      ctx.drawImage(mountains, 0, src, cv.width, step, wave, hz + y, cv.width, step);
    }
    ctx.globalAlpha = 1;

    // A faint line of light where the water meets the land
    ctx.fillStyle = isNight() ? 'rgba(255, 235, 215, 0.06)' : 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(0, hz, cv.width, Math.max(1, res));
  }

  build();
  draw(performance.now());

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { build(); draw(performance.now()); }, 150);
  });
  addEventListener('themechange', function () { build(); draw(performance.now()); });

  if (still) { addEventListener('scroll', function () { draw(0); }, { passive: true }); return; }
  (function loop(t) { draw(t); requestAnimationFrame(loop); })(0);
})();
