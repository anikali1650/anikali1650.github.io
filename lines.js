// The opening's backdrop: a field of thin wavy lines that drift slowly and bend away
// from the mouse.
(function () {
  var intro = document.querySelector('.intro');
  var svg = intro && intro.querySelector('.waves');
  if (!svg) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stage = intro.querySelector('.intro__stage');
  var NS = 'http://www.w3.org/2000/svg';
  var cols = [], paths = [];
  var mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, on: false };

  addEventListener('mousemove', function (e) {
    var r = stage.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
    if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
  });
  document.addEventListener('mouseleave', function () { mouse.on = false; });

  function resize() {
    var r = svg.getBoundingClientRect(), w = r.width, h = r.height;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    paths.forEach(function (p) { p.remove(); });
    cols = []; paths = [];
    var gapX = w < 700 ? 16 : 12, gapY = 14;
    var nx = Math.ceil((w + 120) / gapX), ny = Math.ceil((h + 60) / gapY);
    var ox = (w - nx * gapX) / 2, oy = (h - ny * gapY) / 2;
    for (var i = 0; i <= nx; i++) {
      var col = [];
      for (var j = 0; j <= ny; j++) col.push({ x: ox + i * gapX, y: oy + j * gapY, cx: 0, cy: 0, vx: 0, vy: 0 });
      cols.push(col);
      var path = document.createElementNS(NS, 'path');
      svg.appendChild(path);
      paths.push(path);
    }
  }

  function draw(t) {
    var R = 200;
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i], d = '';
      for (var j = 0; j < col.length; j++) {
        var pt = col[j];
        // Smooth flowing drift from layered sine waves
        var a = 2.2 * Math.sin(pt.x * 0.0045 + t * 0.00035)
              + 1.8 * Math.cos(pt.y * 0.004 - t * 0.0003)
              + 1.2 * Math.sin((pt.x - pt.y) * 0.0025 + t * 0.0002);
        var x = pt.x + Math.cos(a) * 24, y = pt.y + Math.sin(a) * 10;
        // Springy push away from the cursor
        var dx = x - mouse.sx, dy = y - mouse.sy, dist = Math.hypot(dx, dy), tx = 0, ty = 0;
        if (mouse.on && dist < R && dist > 0) {
          // A soft, rounded bulge rather than a sharp point
          var f = Math.exp(-Math.pow(dist / R * 2.2, 2)) * 55;
          tx = dx / dist * f; ty = dy / dist * f;
        }
        // A calm spring, so lines ease back instead of snapping
        pt.vx = (pt.vx + (tx - pt.cx) * 0.05) * 0.86;
        pt.vy = (pt.vy + (ty - pt.cy) * 0.05) * 0.86;
        pt.cx += pt.vx; pt.cy += pt.vy;
        pt.px = x + pt.cx; pt.py = y + pt.cy;
      }
      // Smooth curve through the points: bend at each point, pass through the midpoints
      d = 'M' + col[0].px.toFixed(1) + ' ' + col[0].py.toFixed(1);
      for (j = 1; j < col.length - 1; j++) {
        var mx = (col[j].px + col[j + 1].px) / 2, my = (col[j].py + col[j + 1].py) / 2;
        d += 'Q' + col[j].px.toFixed(1) + ' ' + col[j].py.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
      }
      var last = col[col.length - 1];
      d += 'L' + last.px.toFixed(1) + ' ' + last.py.toFixed(1);
      paths[i].setAttribute('d', d);
    }
  }

  resize();
  draw(0);

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); draw(performance.now()); }, 150);
  });
  if (still) return;

  // Only animate while the opening is on screen
  var visible = true;
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(intro);
  (function loop(t) {
    if (visible) {
      mouse.sx += (mouse.x - mouse.sx) * 0.12;
      mouse.sy += (mouse.y - mouse.sy) * 0.12;
      draw(t);
    }
    requestAnimationFrame(loop);
  })(0);
})();
