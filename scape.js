// Water caustics behind the page: the shifting web of light on the floor of a pool.
// A small WebGL shader layers two sets of slowly moving cells, bends them with a gentle
// wobble, and lights up the thin borders between cells. White light on black at night,
// a faint grey web on white by day. Strongest in the opening, a faint wash behind content.
(function () {
  var cv = document.querySelector('.scape');
  if (!cv) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var intro = document.querySelector('.intro');
  var gl = cv.getContext('webgl', { premultipliedAlpha: false, antialias: false });
  if (!gl) { cv.remove(); return; }
  function isNight() { return document.documentElement.dataset.theme === 'night'; }

  var vert = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
  var frag = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform float uNight;',

    'vec2 hash2(vec2 p) {',
    '  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));',
    '  return fract(sin(p) * 43758.5453);',
    '}',

    // Distance to the nearest border between moving cells (0 right on a border)
    'float border(vec2 p, float t) {',
    '  vec2 g = floor(p), f = fract(p);',
    '  float d1 = 8.0, d2 = 8.0;',
    '  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {',
    '    vec2 o = vec2(float(x), float(y));',
    '    vec2 h = 0.5 + 0.45 * sin(t + 6.2831 * hash2(g + o));',
    '    vec2 r = o + h - f;',
    '    float d = dot(r, r);',
    '    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }',
    '  }',
    '  return sqrt(d2) - sqrt(d1);',
    '}',

    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / uRes.y;',
    '  uv.y += uScroll;',
    '  float t = uTime * 0.35;',
    // A slow wobble, like light bent by a moving surface
    '  vec2 w = uv * 3.0;',
    '  w += 0.45 * vec2(sin(w.y * 1.3 + t), cos(w.x * 1.1 - t * 0.8));',
    '  w += 0.2 * vec2(sin(w.y * 2.9 - t * 1.2), cos(w.x * 3.3 + t));',
    // Thin bright lines plus a soft glow around them
    '  float e1 = border(w, t), e2 = border(w * 1.6 + 3.1, t * 1.25);',
    '  float a = (1.0 - smoothstep(0.0, 0.05, e1)) + 0.35 * (1.0 - smoothstep(0.0, 0.22, e1));',
    '  float b = (1.0 - smoothstep(0.0, 0.04, e2)) + 0.3 * (1.0 - smoothstep(0.0, 0.18, e2));',
    '  float c = clamp(a * 0.7 + b * 0.4, 0.0, 1.0);',
    '  gl_FragColor = uNight > 0.5 ? vec4(1.0, 1.0, 1.0, c * 0.3) : vec4(0.2, 0.2, 0.2, c * 0.16);',
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
    console.warn('Water shader failed:', err);
    cv.remove();
    return;
  }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['uRes', 'uTime', 'uScroll', 'uNight'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });

  var W = 0, H = 0;
  function resize() {
    W = innerWidth; H = innerHeight;
    // Soft light hides lower resolution, which keeps this light on the GPU
    var res = Math.min(devicePixelRatio || 1, 2) * 0.5;
    cv.width = Math.round(W * res); cv.height = Math.round(H * res);
    gl.viewport(0, 0, cv.width, cv.height);
  }

  function strength() {
    if (!intro) return 0.4;
    var end = intro.offsetTop + intro.offsetHeight - H;
    var past = (scrollY - end) / H;
    return past <= 0 ? 1 : Math.max(0.35, 1 - past * 0.65);
  }

  function draw(t) {
    cv.style.opacity = strength();
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, cv.width, cv.height);
    gl.uniform1f(U.uTime, still ? 4 : (t / 1000) % 10000);
    gl.uniform1f(U.uScroll, still ? 0 : scrollY / H * 0.25);
    gl.uniform1f(U.uNight, isNight() ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  draw(performance.now());
  addEventListener('resize', function () { resize(); draw(performance.now()); });
  addEventListener('themechange', function () { draw(performance.now()); });

  if (still) { addEventListener('scroll', function () { draw(0); }, { passive: true }); return; }
  (function loop(t) { draw(t); requestAnimationFrame(loop); })(0);
})();
