// Opening sequence: a short splash with the name, then the name spells itself out
// letter by letter as you scroll. The tree shadows behind it live in shade.js.
(function () {
  var intro = document.querySelector('.intro');
  if (!intro) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var darkQuery = matchMedia('(prefers-color-scheme: dark)');
  var name = intro.querySelector('.name');
  var letters = [].slice.call(intro.querySelectorAll('.ch > span'));
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
      var e = ease(clamp((p - 0.08 - i * 0.06) / 0.22));
      el.style.transform = 'translateY(' + (1 - e) * 115 + '%) rotate(' + (1 - e) * 10 + 'deg)';
    });

    var o = ease(clamp((p - 0.72) / 0.16));
    outro.style.opacity = o;
    outro.style.transform = 'translateY(' + (1 - o) * 24 + 'px)';
    outro.style.visibility = o > 0 ? 'visible' : 'hidden';
  }

  if (still) intro.classList.add('still');
  reveal(progress());
  intro.classList.add('ready');

  if (still) return;
  addEventListener('scroll', function () { reveal(progress()); }, { passive: true });
  addEventListener('resize', function () { reveal(progress()); });
})();
