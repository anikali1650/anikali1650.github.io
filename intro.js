// Splash: the name in Chinese pulses on a blank page for a moment (until fonts are ready),
// then fades away. The wavy lines behind the opening live in lines.js.
(function () {
  var splash = document.querySelector('.splash');
  if (!splash) return;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var shown = performance.now();
  function hide() {
    setTimeout(function () {
      splash.classList.add('gone');
      setTimeout(function () { splash.remove(); }, 600);
    }, Math.max(0, (still ? 300 : 1300) - (performance.now() - shown)));
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(hide);
})();

// The UT Tower drawing on the right of the opening fades and drifts up as you scroll away
(function () {
  var art = document.querySelector('.hero__art');
  if (!art) return;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function update() {
    var t = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.6)));
    art.style.opacity = (0.55 * (1 - t)).toFixed(3);
    if (!still) art.style.transform = 'translateY(' + (-scrollY * 0.25).toFixed(1) + 'px)';
  }
  update();
  addEventListener('scroll', update, { passive: true });
})();
