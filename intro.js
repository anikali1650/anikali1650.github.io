// Opening sequence: a short splash with the name, then a flowing sheet of liquid metal with a faint pearly sheen that
// reflects the name, and the name spelling itself out as you scroll through the
// pinned intro. Falls back to a field of wavy SVG lines where WebGL isn't available.
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
  var reveals = letters.map(function () { return 0; });
  var revealChanged = true;

  function progress() {
    if (still) return 1;
    var total = intro.offsetHeight - innerHeight;
    return total > 0 ? clamp(-intro.getBoundingClientRect().top / total) : 1;
  }

  function reveal(p) {
    hint.style.opacity = 1 - clamp(p / 0.08);

    letters.forEach(function (el, i) {
      var e = ease(clamp((p - 0.08 - i * 0.06) / 0.22));
      if (e !== reveals[i]) { reveals[i] = e; revealChanged = true; }
      el.style.transform = 'translateY(' + (1 - e) * 115 + '%) rotate(' + (1 - e) * 10 + 'deg)';
    });

    var o = ease(clamp((p - 0.72) / 0.16));
    outro.style.opacity = o;
    outro.style.transform = 'translateY(' + (1 - o) * 24 + 'px)';
    outro.style.visibility = o > 0 ? 'visible' : 'hidden';
  }

  // ---- Mouse (shared by both backdrops) ----
  var mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, amt: 0, on: false };
  addEventListener('mousemove', function (e) {
    var r = intro.querySelector('.intro__stage').getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
    if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
  });
  document.addEventListener('mouseleave', function () { mouse.on = false; });

  var visible = true;
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(intro);

  var backdrop = startSheen() || startLines();

  if (still) intro.classList.add('still');
  reveal(progress());
  intro.classList.add('ready');
  backdrop.resize();

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { backdrop.resize(); revealChanged = true; if (still) backdrop.draw(0); }, 150);
  });

  if (still) { backdrop.draw(0); return; }
  addEventListener('scroll', function () { reveal(progress()); }, { passive: true });
  (function loop(t) {
    if (visible) {
      mouse.sx += (mouse.x - mouse.sx) * 0.12;
      mouse.sy += (mouse.y - mouse.sy) * 0.12;
      mouse.amt += ((mouse.on ? 1 : 0) - mouse.amt) * 0.05;
      backdrop.draw(t);
    }
    requestAnimationFrame(loop);
  })(0);

  // ===== Liquid-metal sheet (WebGL) =====
  function startSheen() {
    var canvas = intro.querySelector('.sheen');
    var gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
    if (!gl) { canvas.remove(); return null; }

    var vert = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
    var frag = [
      '#ifdef GL_FRAGMENT_PRECISION_HIGH',
      'precision highp float;',
      '#else',
      'precision mediump float;',
      '#endif',
      'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uMouseAmt;',
      'uniform sampler2D uText; uniform vec2 uName; uniform float uDark;',

      // Height of the sheet: layered, domain-warped waves so it folds like foil or silk
      'float height(vec2 p){',
      '  float t = uTime * 0.12;',
      '  vec2 q = p + 0.35 * vec2(sin(p.y * 2.1 + t * 1.3), cos(p.x * 1.7 - t));',
      '  float h = 0.50 * sin(q.x * 2.4 + q.y * 1.1 + t * 2.0)',
      '          + 0.30 * sin(-q.x * 1.3 + q.y * 3.2 - t * 1.6)',
      '          + 0.16 * sin((q.x + q.y) * 5.1 + t * 2.6)',
      '          + 0.06 * sin(q.x * 9.0 - q.y * 7.0 + t * 3.1);',
      '  vec2 d = p - uMouse;',
      '  return h - uMouseAmt * 0.45 * exp(-dot(d, d) * 14.0);',
      '}',

      'void main(){',
      '  vec2 uv = gl_FragCoord.xy / uRes;',
      '  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;',
      '  float e = 0.003;',
      '  p *= 1.25;',
      '  float h = height(p);',
      '  vec2 g = vec2(height(p + vec2(e, 0.0)) - height(p - vec2(e, 0.0)),',
      '                height(p + vec2(0.0, e)) - height(p - vec2(0.0, e))) / (2.0 * e);',
      '  vec3 n = normalize(vec3(-g * 0.2, 1.0));',

      // Chrome: flowing light/dark bands from the surface angle, plus a sharp highlight
      '  float band = 0.5 + 0.5 * sin(n.x * 13.0 + n.y * 8.0 + h * 1.6);',
      '  band = pow(smoothstep(0.15, 1.0, band), 2.2);',
      '  float rim = smoothstep(0.55, 0.95, length(n.xy) * 1.4);',
      '  float spec = pow(max(dot(n, normalize(vec3(-0.35, 0.55, 1.0))), 0.0), 60.0);',

      // Faint thin-film sheen: soft pearl tints that shift with the folds, kept desaturated
      '  vec3 film = 0.5 + 0.5 * cos(6.2831 * (h * 0.3 + length(g) * 0.05 + vec3(0.0, 0.33, 0.67)));',
      '  film = mix(vec3(dot(film, vec3(0.333))), film, 0.35);',

      // Reflections of the name: mirrored above and below it, warped by the folds
      '  vec2 w = n.xy * 0.10;',
      '  float below = texture2D(uText, vec2(uv.x, 2.0 * uName.x - uv.y) + w).a * exp(-(uName.x - uv.y) * 8.0) * step(uv.y, uName.x);',
      '  float above = texture2D(uText, vec2(uv.x, 2.0 * uName.y - uv.y) + w).a * exp(-(uv.y - uName.y) * 8.0) * step(uName.y, uv.y);',
      '  float ghost = texture2D(uText, uv + w * 1.6).a;',
      '  float refl = max(below, above) * 0.32 + ghost * 0.06;',

      '  vec3 col;',
      '  if (uDark > 0.5) {',
      '    col = vec3(0.02) + band * 0.36 * mix(vec3(1.0), film, 0.4) + rim * 0.10 + spec * 0.85 * mix(vec3(1.0), film, 0.3);',
      '    col += refl * (0.2 + 0.35 * band) * mix(vec3(1.0), film, 0.4);',
      '  } else {',
      '    col = vec3(0.97) - (1.0 - band) * 0.22 - rim * 0.06 + spec * 0.15;',
      '    col = mix(col, col * mix(vec3(1.0), film, 0.5), 0.35);',
      '    col -= refl * (0.12 + 0.25 * (1.0 - band));',
      '  }',
      '  vec2 v = uv - 0.5;',
      '  col *= 1.0 - dot(v, v) * (uDark > 0.5 ? 0.6 : 0.2);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n');

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog = gl.createProgram();
    try {
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, vert));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (err) {
      console.warn('Sheen shader failed, using lines instead:', err);
      canvas.remove();
      return null;
    }
    intro.querySelector('.waves').remove();
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['uRes', 'uTime', 'uMouse', 'uMouseAmt', 'uText', 'uName', 'uDark'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });

    // The name is drawn into an offscreen canvas that the shader samples for reflections
    var text = document.createElement('canvas');
    var ctx = text.getContext('2d');
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.uniform1i(U.uText, 0);

    var scale = 1, cssW = 0, cssH = 0, nameEdges = [0, 0];

    function paintText() {
      var c = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, text.width, text.height);
      var nr = name.getBoundingClientRect();
      var size = parseFloat(getComputedStyle(name).fontSize) * scale;
      ctx.font = size + 'px Anton, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      letters.forEach(function (el, i) {
        var box = el.parentNode.getBoundingClientRect();
        ctx.save();
        ctx.beginPath();
        ctx.rect((box.left - c.left) * scale, (box.top - c.top) * scale, box.width * scale, box.height * scale);
        ctx.clip();
        var y = (box.top - c.top + box.height * 0.53 + (1 - reveals[i]) * box.height * 1.15) * scale;
        ctx.fillText(el.textContent, (box.left - c.left) * scale, y);
        ctx.restore();
      });
      // Reflection lines sit just outside the letters' top and bottom edges (flipped y for GL)
      nameEdges = [1 - (nr.bottom - c.top) / cssH, 1 - (nr.top - c.top) / cssH];
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, text);
      revealChanged = false;
    }

    // Redraw the reflection once the web font has loaded
    if (document.fonts) document.fonts.ready.then(function () { revealChanged = true; if (still) draw(0); });

    function resize() {
      var r = canvas.getBoundingClientRect();
      cssW = r.width; cssH = r.height;
      // The surface is smooth, so rendering under full resolution keeps it fast with no visible loss
      scale = Math.min(devicePixelRatio || 1, 2) * (cssW < 700 ? 0.6 : 0.5);
      canvas.width = text.width = Math.round(cssW * scale);
      canvas.height = text.height = Math.round(cssH * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
      revealChanged = true;
    }

    function draw(t) {
      if (revealChanged) paintText();
      var W = canvas.width, H = canvas.height;
      gl.uniform2f(U.uRes, W, H);
      gl.uniform1f(U.uTime, still ? 20 : (t / 1000) % 1000);
      gl.uniform2f(U.uMouse, (mouse.sx * scale - W / 2) / H, ((cssH - mouse.sy) * scale - H / 2) / H);
      gl.uniform1f(U.uMouseAmt, mouse.amt);
      gl.uniform2f(U.uName, nameEdges[0], nameEdges[1]);
      gl.uniform1f(U.uDark, darkQuery.matches ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    return { resize: resize, draw: draw };
  }

  // ===== Fallback: wavy line field (SVG) =====
  function startLines() {
    var svg = intro.querySelector('.waves');
    var NS = 'http://www.w3.org/2000/svg';
    var cols = [], paths = [];

    function resize() {
      var r = svg.getBoundingClientRect(), w = r.width, h = r.height;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      paths.forEach(function (p) { p.remove(); });
      cols = []; paths = [];
      var gapX = w < 700 ? 16 : 12, gapY = 28;
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
      var R = 170;
      for (var i = 0; i < cols.length; i++) {
        var col = cols[i], d = '';
        for (var j = 0; j < col.length; j++) {
          var pt = col[j];
          var a = 2.2 * Math.sin(pt.x * 0.0045 + t * 0.00035)
                + 1.8 * Math.cos(pt.y * 0.004 - t * 0.0003)
                + 1.2 * Math.sin((pt.x - pt.y) * 0.0025 + t * 0.0002);
          var x = pt.x + Math.cos(a) * 24, y = pt.y + Math.sin(a) * 10;
          var dx = x - mouse.sx, dy = y - mouse.sy, dist = Math.hypot(dx, dy), tx = 0, ty = 0;
          if (mouse.on && dist < R && dist > 0) {
            var f = Math.pow(1 - dist / R, 2) * 70;
            tx = dx / dist * f; ty = dy / dist * f;
          }
          pt.vx = (pt.vx + (tx - pt.cx) * 0.08) * 0.82;
          pt.vy = (pt.vy + (ty - pt.cy) * 0.08) * 0.82;
          pt.cx += pt.vx; pt.cy += pt.vy;
          d += (j ? 'L' : 'M') + (x + pt.cx).toFixed(1) + ' ' + (y + pt.cy).toFixed(1);
        }
        paths[i].setAttribute('d', d);
      }
    }

    return { resize: resize, draw: draw };
  }
})();
