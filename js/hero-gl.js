/* ===========================
   Hero GL — LIFEBIT LAB の「デジタル実験体」
   素の WebGL1。失敗した場合は何もせず CSS のフォールバックを残す。
   文字・ナビゲーションはすべて HTML 側にある。
   =========================== */
(() => {
  const canvas = document.getElementById('stage-gl');
  const state  = window.LIFEBIT;
  if (!canvas || !state) return;

  const isSmall = window.matchMedia('(max-width: 900px)').matches;
  const reduced = state.reducedMotion;

  let gl;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' });
  } catch (e) { gl = null; }
  if (!gl) { canvas.remove(); return; }

  const STEPS = isSmall ? 40 : 64;
  const PARTICLES = isSmall ? 36 : 64;

  const vert = `
    attribute vec2 a;
    void main() { gl_Position = vec4(a, 0.0, 1.0); }
  `;

  const frag = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    #define STEPS ${STEPS}
    #define PARTICLES ${PARTICLES}

    uniform vec2  uRes;
    uniform float uTime;
    uniform vec2  uMouse;
    uniform vec3  uPos;     // x, y, scale
    uniform float uHue;     // 0 lime 寄り → 1 violet 寄り
    uniform float uConv;    // 収束度
    uniform float uIntro;   // ロード演出 0 → 1

    const vec3 INK    = vec3(0.031, 0.039, 0.059);
    const vec3 NAVY   = vec3(0.063, 0.082, 0.129);
    const vec3 LIME   = vec3(0.784, 1.0, 0.271);
    const vec3 VIOLET = vec3(0.573, 0.455, 1.0);

    mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

    float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }

    float radius() { return 0.78 * smoothstep(0.18, 0.85, uIntro) * (1.0 - 0.25 * uConv); }

    float field(vec3 p) {
      float t = uTime * 0.45;
      float d = sin(p.x * 3.1 + t) * sin(p.y * 2.7 - t * 1.3) * sin(p.z * 3.3 + t * 0.8);
      d += 0.5 * sin(p.x * 6.3 - t * 1.7 + p.z * 2.0) * sin(p.y * 5.9 + t);
      return d;
    }

    float map(vec3 p) {
      p.xz *= rot(uTime * 0.12 + uMouse.x * 0.6);
      p.yz *= rot(uMouse.y * 0.4);
      return length(p) - radius() + field(p) * 0.09 * (1.0 - 0.6 * uConv);
    }

    vec3 normal(vec3 p) {
      const vec2 e = vec2(0.002, -0.002);
      return normalize(
        e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
        e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
      float aspect = uRes.x / uRes.y;
      vec2 center = vec2(uPos.x * aspect * 0.62, uPos.y);
      vec2 q = (uv - center) / uPos.z;

      // 背景：深い空間と控えめなフォグ
      vec3 col = mix(INK, NAVY, smoothstep(1.6, -0.4, length(uv - vec2(center.x, -1.2))) * 0.55);

      vec3 accentA = mix(LIME, VIOLET, uHue * 0.7);
      vec3 accentB = mix(VIOLET, LIME, 0.15 + uHue * 0.15);

      // レイマーチング
      vec3 ro = vec3(0.0, 0.0, 3.2);
      vec3 rd = normalize(vec3(q, -1.8));
      float t = 0.0, glow = 0.0;
      bool hit = false;
      for (int i = 0; i < STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        glow += exp(-max(d, 0.0) * 10.0) * 0.012;
        if (d < 0.002) { hit = true; break; }
        t += d * 0.8;
        if (t > 6.0) break;
      }

      float rad = radius();
      if (hit && rad > 0.01) {
        vec3 p = ro + rd * t;
        vec3 n = normal(p);
        float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        float band = smoothstep(-0.7, 0.7, n.y + 0.4 * sin(uTime * 0.3 + n.x * 2.0));
        vec3 rim = mix(accentA, accentB, band);
        vec3 body = INK * 0.6 + NAVY * 0.5 * max(dot(n, normalize(vec3(-0.4, 0.8, 0.6))), 0.0);
        float inner = 0.5 + 0.5 * field(p * 1.4);
        col = body + rim * fres * 1.25 + accentB * inner * 0.06;
        // 局所的なハイライト
        col += LIME * pow(max(dot(reflect(rd, n), normalize(vec3(0.6, 0.7, 0.4))), 0.0), 24.0) * 0.6;
      }
      col += mix(VIOLET, accentA, 0.35) * glow * smoothstep(0.1, 0.8, uIntro);

      // 粒子の軌道
      float spread = 1.0 + (1.0 - smoothstep(0.0, 0.9, uIntro)) * 3.5;
      float shrink = 1.0 - uConv * 0.55;
      vec3 sparks = vec3(0.0);
      for (int i = 0; i < PARTICLES; i++) {
        float fi = float(i);
        float lane = mod(fi, 3.0);
        float r = (1.12 + 0.12 * lane + 0.25 * fract(fi * 0.618)) * spread * shrink;
        float a = fi * 2.39996 + uTime * (0.18 + 0.06 * lane) * (1.0 + uConv);
        vec3 pp = vec3(cos(a) * r, 0.0, sin(a) * r);
        pp.xy *= rot(0.45 + lane * 0.55);
        pp.yz *= rot(0.35 + uMouse.y * 0.3);
        float persp = 1.8 / (3.2 - pp.z);
        vec2 sp = pp.xy * persp;
        float dd = length(q - sp);
        float b = 0.00035 / (dd * dd + 0.00012);
        if (pp.z < 0.0 && length(sp) < rad * persp * 1.05) b *= 0.15;
        sparks += mix(accentA, VIOLET, step(1.5, lane)) * b * (0.4 + 0.6 * fract(fi * 0.37));
      }
      col += sparks * 0.11 * smoothstep(0.0, 0.4, uIntro);

      // ロード演出の最初の小さな光
      float seed = 1.0 - smoothstep(0.15, 0.6, uIntro);
      col += LIME * 0.014 / (length(q) + 0.02) * seed * smoothstep(0.0, 0.1, uIntro);

      // ビネットと粒状感
      col *= 1.0 - 0.35 * smoothstep(0.6, 1.9, length(uv));
      col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.025;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    console.warn('[hero-gl] fallback:', e.message);
    canvas.remove();
    return;
  }

  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uRes', 'uTime', 'uMouse', 'uPos', 'uHue', 'uConv', 'uIntro'].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

  // 解像度：負荷に応じて自動で下げる
  let quality = isSmall ? 0.5 : 0.7;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
    const w = Math.max(1, Math.round(window.innerWidth * dpr));
    const h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // 現在値（シーン目標へなめらかに追従）
  const cur = { ...state.scene };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced && !isSmall) {
    window.addEventListener('pointermove', (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  const start = performance.now();
  const INTRO_MS = 1600;
  let raf = 0, last = start, frames = 0, slow = 0, lost = false;

  function render(now) {
    const k = reduced ? 1 : Math.min(1, (now - last) / 1000 * 3.2);
    for (const key of ['x', 'y', 's', 'h', 'c']) cur[key] += (state.scene[key] - cur[key]) * k;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    const intro = reduced ? 1 : Math.min(1, (now - start) / INTRO_MS);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, reduced ? 8.0 : (now - start) / 1000);
    gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform3f(U.uPos, cur.x, cur.y, cur.s);
    gl.uniform1f(U.uHue, cur.h);
    gl.uniform1f(U.uConv, cur.c);
    gl.uniform1f(U.uIntro, 1.0 - Math.pow(1.0 - intro, 3.0));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = now - last;
    // 背景が見えないセクション（Projects）では描画しない
    if (state.scene.o > 0.01) {
      render(now);
      // 負荷監視：遅いフレームが続いたら解像度を下げる
      frames++;
      if (dt > 28) slow++;
      if (frames >= 90) {
        if (slow > 30 && quality > 0.3) { quality -= 0.1; resize(); }
        frames = 0; slow = 0;
      }
    }
    last = now;
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove('gl-on');
  });

  if (reduced) {
    // 動きを減らす設定：静止画として描画し、シーンが変わった時だけ描き直す
    const draw = () => { if (!lost) { resize(); render(performance.now()); } };
    draw();
    document.documentElement.classList.add('gl-on');
    let prev = JSON.stringify(state.scene);
    window.addEventListener('scroll', () => {
      const nowScene = JSON.stringify(state.scene);
      if (nowScene !== prev) { prev = nowScene; draw(); }
    }, { passive: true });
    window.addEventListener('resize', draw, { passive: true });
    return;
  }

  render(start);
  document.documentElement.classList.add('gl-on');
  raf = requestAnimationFrame(loop);

  // タブ非表示時は止める
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden && !lost) { last = performance.now(); raf = requestAnimationFrame(loop); }
  });
})();
