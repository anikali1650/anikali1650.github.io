// Opening sequence: a short splash with the name in Chinese, then the name comes into focus
// from a soft blur as you scroll. The wavy lines behind it live in lines.js.
(function () {
  var intro = document.querySelector('.intro');
  if (!intro) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var name = intro.querySelector('.name');
  var outro = intro.querySelector('.intro__outro');
  var hint = intro.querySelector('.intro__hint');

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

  // ---- Scroll: the name comes into focus ----

  function progress() {
    if (still) return 1;
    var total = intro.offsetHeight - innerHeight;
    return total > 0 ? clamp(-intro.getBoundingClientRect().top / total) : 1;
  }

  function reveal(p) {
    var r = easeInOut(clamp((p - 0.04) / 0.4));
    hint.style.opacity = 1 - clamp(p / 0.08);
    name.style.opacity = r;
    name.style.filter = r < 1 ? 'blur(' + (1 - r) * 16 + 'px)' : 'none';
    name.style.transform = 'scale(' + (0.95 + 0.05 * r) + ')';

    var o = ease(clamp((p - 0.38) / 0.25));
    outro.style.opacity = o;
    outro.style.transform = 'translateY(' + (1 - o) * 24 + 'px)';
    outro.style.visibility = o > 0 ? 'visible' : 'hidden';
  }

  if (still) intro.classList.add('still');
  reveal(progress());
  intro.classList.add('ready');

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { reveal(progress()); }, 150);
  });

  if (still) return;
  addEventListener('scroll', function () { reveal(progress()); }, { passive: true });
})();
