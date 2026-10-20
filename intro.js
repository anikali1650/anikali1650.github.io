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
