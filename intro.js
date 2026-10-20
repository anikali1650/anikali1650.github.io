// Opening sequence: a short splash with the name in Chinese, then two clusters of leafy
// branches in front of the name that sway gently and swing open, like walking through
// them, as you scroll. The faint shade behind the page lives in shade.js.
(function () {
  var intro = document.querySelector('.intro');
  if (!intro) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function isNight() { return document.documentElement.dataset.theme === 'night'; }
  var stage = intro.querySelector('.intro__stage');
  var name = intro.querySelector('.name');
  var outro = intro.querySelector('.intro__outro');
  var hint = intro.querySelector('.intro__hint');
  var sides = [
    { el: intro.querySelector('.branches__left'),  dir: 1,  seed: 11, phase: 0 },
    { el: intro.querySelector('.branches__right'), dir: -1, seed: 29, phase: 2.1 }
  ];

  // Splash: hold the pulsing name for at least a moment, until fonts are ready, then fade it out
  var splash = document.querySelector('.splash');
  if (splash) {
    var shown = performance.now();
    var hideSplash = function () {
      setTimeout(function () {
        splash.classList.add('gone');
        setTimeout(function () { splash.remove(); }, 600);
      }, Math.max(0, (still ? 300 : 1300) - (performance.now() - shown)));
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(hideSplash);
  }

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { return 1 - Math.pow(1 - v, 3); }
  function easeInOut(v) { return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }

  // ---- Branches: grown once per screen size, from the left and right edges toward the middle ----
  function buildBranches() {
    if (!window.Canopy || still) return;
    var C = window.Canopy;
    var W = stage.clientWidth, H = stage.clientHeight;
    var scale = Math.min(devicePixelRatio || 1, 2);
    var dark = isNight();

    sides.forEach(function (side) {
      var cv = side.el;
      cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
      var ctx = cv.getContext('2d');
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      var rand = C.rng(side.seed);
      var x0 = side.dir > 0 ? -30 : W + 30, base = side.dir > 0 ? 0 : Math.PI;
      var limbs = Math.round(3 + 2 * H / W), starts = [];
      for (var i = 0; i < limbs; i++) {
        var y = (0.04 + 0.92 * (i + rand()) / limbs) * H;
        // Limbs reach in roughly level, at varied lengths, so leaves spread across the width
        starts.push({ x: x0, y: y, ang: base + (rand() - 0.5) * 0.5 * side.dir,
                      len: W * (0.09 + rand() * 0.11), width: 7 + rand() * 4 });
      }
      // Delicate: few splits, small leaves only near the twig tips
      var shapes = C.grow(rand, starts, { scale: 1, depth: 4, minLen: 28, tipDepth: 1,
                                          leaf: W < 700 ? 0.6 : 0.75, leafCount: 0.3, cluster: 0.85 });
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = ctx.strokeStyle = dark ? 'rgb(96, 84, 72)' : 'rgb(38, 35, 30)';
      C.paint(ctx, shapes);
    });
  }

  // ---- Scroll: the branches swing open and the name comes a little closer ----
  var open = 0;

  function progress() {
    if (still) return 1;
    var total = intro.offsetHeight - innerHeight;
    return total > 0 ? clamp(-intro.getBoundingClientRect().top / total) : 1;
  }

  function reveal(p) {
    open = easeInOut(clamp(p / 0.7));
    hint.style.opacity = 1 - clamp(p / 0.08);
    name.style.transform = 'scale(' + (0.9 + 0.1 * open) + ')';

    var o = ease(clamp((p - 0.72) / 0.16));
    outro.style.opacity = o;
    outro.style.transform = 'translateY(' + (1 - o) * 24 + 'px)';
    outro.style.visibility = o > 0 ? 'visible' : 'hidden';
  }

  function placeBranches(t) {
    sides.forEach(function (side) {
      // A slow breeze while idle, then each cluster swings out from its own edge
      var sway = Math.sin(t * 0.0006 + side.phase) * 0.6 + Math.sin(t * 0.0013 + side.phase) * 0.25;
      var rot = (-14 * open + sway) * side.dir;
      side.el.style.transform = 'translateX(' + (-38 * open * side.dir) + '%) rotate(' + rot + 'deg) scale(' + (1 + 0.2 * open) + ')';
      side.el.style.opacity = 1 - clamp((open - 0.55) / 0.45);
    });
  }

  if (still) intro.classList.add('still');
  buildBranches();
  reveal(progress());
  placeBranches(0);
  intro.classList.add('ready');

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { buildBranches(); reveal(progress()); }, 150);
  });
  addEventListener('themechange', buildBranches);

  if (still) return;
  addEventListener('scroll', function () { reveal(progress()); placeBranches(performance.now()); }, { passive: true });

  var visible = true;
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(intro);
  (function loop(t) {
    if (visible && open < 1) placeBranches(t);
    requestAnimationFrame(loop);
  })(0);
})();
