// PICO · 종이접기 변환
// 촬영 4에서 아이가 그린 곤충 그림을 삼각형 면으로 나눠 종이를 접은 것처럼 바꿔요. AI 없이 이 기기 안에서만 계산해요.
//   1) 색연필 선으로 닫힌 안쪽을 그 선의 색으로 채워요 (선만 그린 그림도 면이 생겨요)
//   2) 두꺼운 부분(몸통·머리·날개)만 삼각형 면으로 나누고, 다리·더듬이 같은 가는 선은 그린 그대로 둬요
//   3) 면마다 빛을 받는 정도를 달리해 접힌 판처럼 보이게 하고, 종이 결을 얹어요
//
//   PicoOrigami.make(src)            → Promise<model>   (src: 그림 PNG 주소 또는 Image · 못 접으면 null)
//   PicoOrigami.play(canvas, model, { duration(초, 기본 1.7), onDone, onProgress(0~1) })  접히는 모습을 canvas에 그려요 → { skip() }
//   PicoOrigami.png(model, px)       → 다 접은 모습의 PNG 주소 (배경 투명)
(function () {
  'use strict';
  var S = 360;            // 작업 크기(px). 그림은 이 크기로 맞춰서 계산해요
  var SPACING = 27;       // 조각 크기: 클수록 큰 면

  /* ---------- helpers ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash2(x, y, s) { var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    var top = a + (b - a) * u, bot = c + (d - c) * u;
    return top + (bot - top) * v;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // 합 영역 표(integral image): 네모 안의 칸 수를 한 번에 세요
  function integral(a, W, H) {
    var I = new Int32Array((W + 1) * (H + 1));
    for (var y = 0; y < H; y++) { var row = 0; for (var x = 0; x < W; x++) { row += a[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
    return I;
  }
  function box(I, W, H, ax, ay, bx, by) {
    ax = Math.max(0, ax); ay = Math.max(0, ay); bx = Math.min(W - 1, bx); by = Math.min(H - 1, by);
    return I[(by + 1) * (W + 1) + bx + 1] - I[ay * (W + 1) + bx + 1] - I[(by + 1) * (W + 1) + ax] + I[ay * (W + 1) + ax];
  }
  function dilate(m, W, H, R) {
    var I = integral(m, W, H), out = new Uint8Array(W * H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (box(I, W, H, x - R, y - R, x + R, y + R) > 0) out[y * W + x] = 1;
    return out;
  }

  /* ---------- 1) 선으로 닫힌 안쪽 채우기 ---------- */
  // 선 사이의 작은 틈(약 10px)은 메우고, 그림 밖에서 닿지 않는 안쪽을 찾아 둘러싼 선의 색으로 칠해요.
  function fillEnclosed(img, W, H) {
    var d = img.data, N = W * H, M = new Uint8Array(N), i, x, y, G = 5;
    for (i = 0; i < N; i++) M[i] = d[i * 4 + 3] > 40 ? 1 : 0;
    var M2 = dilate(M, W, H, G);
    // 바깥: 화면 가장자리에서 틈 막은 선(M2)에 부딪힐 때까지 퍼뜨려요
    var outside = new Uint8Array(N), stack = new Int32Array(N), sp = 0;
    function push(p) { if (!M2[p] && !outside[p]) { outside[p] = 1; stack[sp++] = p; } }
    for (x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (sp) {
      var p = stack[--sp], px = p % W, py = (p - px) / W;
      if (px > 0) push(p - 1); if (px < W - 1) push(p + 1); if (py > 0) push(p - W); if (py < H - 1) push(p + W);
    }
    var outD = dilate(outside, W, H, G);          // 선 바깥쪽 가장자리 띠는 바깥으로 돌려줘요
    var near = dilate(outside, W, H, 14);          // 바깥 윤곽선에 해당하는 자리
    var enc = new Uint8Array(N);
    for (i = 0; i < N; i++) enc[i] = (!M[i] && !outD[i]) ? 1 : 0;

    // 칸 색은 그 칸을 둘러싼 선 중 "바깥 윤곽선"의 색을 따라요 (몸통을 빨강으로 그렸으면 안쪽 검은 점·가운데 줄이 있어도 몸통은 빨강).
    // 바깥 윤곽선과 닿지 않는 칸(속이 빈 점·눈)은 둘러싼 선 색 그대로 칠해요.
    var out = { data: new Uint8ClampedArray(d), width: W, height: H }, od = out.data;
    var lab = new Uint8Array(N), pix = new Int32Array(N), filled = 0;
    var vN = new Uint32Array(512), rN = new Uint32Array(512), gN = new Uint32Array(512), bN = new Uint32Array(512);
    var vA = new Uint32Array(512), rA = new Uint32Array(512), gA = new Uint32Array(512), bA = new Uint32Array(512);
    function vote(q, V, R, Gr, B) {
      var r = d[q * 4], g = d[q * 4 + 1], b = d[q * 4 + 2], bk = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      V[bk]++; R[bk] += r; Gr[bk] += g; B[bk] += b;
    }
    function look(c, q, st) {
      if (enc[q]) { if (!lab[q]) { lab[q] = 1; stack[st.sp++] = q; } }
      else if (M[q]) { if (near[q]) vote(q, vN, rN, gN, bN); else vote(q, vA, rA, gA, bA); }
    }
    for (var s = 0; s < N; s++) {
      if (!enc[s] || lab[s]) continue;
      var n = 0, st = { sp: 0 };
      vN.fill(0); rN.fill(0); gN.fill(0); bN.fill(0); vA.fill(0); rA.fill(0); gA.fill(0); bA.fill(0);
      stack[st.sp++] = s; lab[s] = 1;
      while (st.sp) {
        var c = stack[--st.sp], cx = c % W, cy = (c - cx) / W; pix[n++] = c;
        if (cx > 0) look(c, c - 1, st); if (cx < W - 1) look(c, c + 1, st);
        if (cy > 0) look(c, c - W, st); if (cy < H - 1) look(c, c + W, st);
      }
      if (n > N * 0.6) continue;                  // 그림 전체를 두른 큰 테두리는 건드리지 않아요
      var tn = 0, bi; for (bi = 0; bi < 512; bi++) tn += vN[bi];
      var V = tn >= 6 ? vN : vA, Rr = tn >= 6 ? rN : rA, Gg = tn >= 6 ? gN : gA, Bb = tn >= 6 ? bN : bA;
      var best = -1, bv = 0;
      for (bi = 0; bi < 512; bi++) if (V[bi] > bv) { bv = V[bi]; best = bi; }
      if (best < 0) continue;
      var R = Math.round(Rr[best] / bv), Gc = Math.round(Gg[best] / bv), B = Math.round(Bb[best] / bv);
      for (var t = 0; t < n; t++) { var o = pix[t] * 4; od[o] = R; od[o + 1] = Gc; od[o + 2] = B; od[o + 3] = 255; }
      filled += n;
    }
    out.filled = filled;
    return out;
  }

  /* ---------- 삼각분할 (Bowyer-Watson) ---------- */
  function circ(P, a, b, c) {
    var ax = P[a][0], ay = P[a][1], bx = P[b][0], by = P[b][1], cx = P[c][0], cy = P[c][1];
    var d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-9) return { a: a, b: b, c: c, cx: 0, cy: 0, r2: -1 };
    var a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    var ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
    var uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
    return { a: a, b: b, c: c, cx: ux, cy: uy, r2: (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy) };
  }
  function delaunay(pts) {
    var n = pts.length, i, j, t;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (i = 0; i < n; i++) { minX = Math.min(minX, pts[i][0]); maxX = Math.max(maxX, pts[i][0]); minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    var dm = Math.max(maxX - minX, maxY - minY, 1) * 20, mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
    var P = pts.slice();
    P.push([mx - dm, my - dm], [mx, my + dm], [mx + dm, my - dm]);
    var T = [circ(P, n, n + 1, n + 2)];
    for (i = 0; i < n; i++) {
      var px = P[i][0], py = P[i][1], bad = [], keep = [];
      for (j = 0; j < T.length; j++) {
        t = T[j];
        if ((px - t.cx) * (px - t.cx) + (py - t.cy) * (py - t.cy) < t.r2) bad.push(t); else keep.push(t);
      }
      var edges = new Map();
      for (j = 0; j < bad.length; j++) {
        t = bad[j];
        var es = [[t.a, t.b], [t.b, t.c], [t.c, t.a]];
        for (var k = 0; k < 3; k++) {
          var u = es[k][0], v = es[k][1], key = u < v ? u + ',' + v : v + ',' + u;
          if (edges.has(key)) edges.set(key, null); else edges.set(key, es[k]);
        }
      }
      T = keep;
      edges.forEach(function (e) { if (e) T.push(circ(P, e[0], e[1], i)); });
    }
    return T.filter(function (t) { return t.a < n && t.b < n && t.c < n; });
  }

  /* ---------- 2) 두꺼운 부분만: 열기(깎았다가 다시 불리기)로 다리·더듬이를 떼어내요 ---------- */
  function thickMask(d, W, H, R) {
    var N = W * H, m = new Uint8Array(N), i, x, y, total = 0;
    for (i = 0; i < N; i++) { m[i] = d[i * 4 + 3] > 40 ? 1 : 0; total += m[i]; }
    var I1 = integral(m, W, H), er = new Uint8Array(N), full = (2 * R + 1) * (2 * R + 1), kept = 0;
    for (y = R; y < H - R; y++) for (x = R; x < W - R; x++) if (box(I1, W, H, x - R, y - R, x + R, y + R) === full) er[y * W + x] = 1;
    var I2 = integral(er, W, H), out = new Uint8Array(N);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (m[y * W + x] && box(I2, W, H, x - R, y - R, x + R, y + R) > 0) { out[y * W + x] = 1; kept++; }
    return kept < total * 0.15 ? null : out;     // 가는 선뿐인 그림이면 접을 면이 없어요
  }

  /* ---------- 면 만들기 ---------- */
  function buildMesh(img, W, H, spacing, seed) {
    var d = img.data, TM = thickMask(d, W, H, 6);
    if (!TM) return null;
    function A(x, y) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return 0; return d[(y * W + x) * 4 + 3]; }
    function T(x, y) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return 0; return TM[y * W + x]; }
    var x0 = W, y0 = H, x1 = -1, y1 = -1, x, y;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (TM[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    var cxm = (x0 + x1) / 2, halfW = Math.max(1, (x1 - x0) / 2), rnd = mulberry32(seed);
    var pts = [], seen = {};
    function add(px, py) { var k = Math.round(px / 2) + ',' + Math.round(py / 2); if (seen[k]) return; seen[k] = 1; pts.push([px, py]); }

    // 윤곽과 색이 바뀌는 자리의 점: 아이가 그린 모양(점무늬·머리·줄무늬)을 또렷하게 지켜요
    var cell = spacing * 0.5, cellSeen = {};
    for (y = y0; y <= y1; y += 2) for (x = x0; x <= x1; x += 2) {
      if (A(x, y) <= 40 || !T(x, y)) continue;
      var silh = A(x + 3, y) <= 40 || A(x - 3, y) <= 40 || A(x, y + 3) <= 40 || A(x, y - 3) <= 40;
      var edge = silh;
      if (!edge && A(x + 3, y) > 40 && A(x, y + 3) > 40) {
        var i0 = (y * W + x) * 4, i1 = (y * W + x + 3) * 4, i2 = ((y + 3) * W + x) * 4;
        var dx = Math.abs(d[i0] - d[i1]) + Math.abs(d[i0 + 1] - d[i1 + 1]) + Math.abs(d[i0 + 2] - d[i1 + 2]);
        var dy = Math.abs(d[i0] - d[i2]) + Math.abs(d[i0 + 1] - d[i2 + 1]) + Math.abs(d[i0 + 2] - d[i2 + 2]);
        edge = dx > 120 || dy > 120;
      }
      if (edge) {
        var key = Math.floor(x / cell) + ',' + Math.floor(y / cell);
        if (!cellSeen[key]) {
          cellSeen[key] = 1;
          if (silh) {   // 바깥 윤곽점은 실제 가장자리까지 밀어서 종이가 선까지 덮게 해요
            var gx = A(x + 3, y) - A(x - 3, y), gy = A(x, y + 3) - A(x, y - 3), gl = Math.hypot(gx, gy);
            if (gl > 0) add(x - gx / gl * 2.5, y - gy / gl * 2.5); else add(x, y);
          } else add(x, y);
        }
      }
    }
    // 안쪽은 살짝 흔들린 삼각 격자로 채워요
    var dyL = spacing * 0.866, row = 0, minGap = spacing * 0.5;
    for (y = y0 - spacing * 0.4; y <= y1 + spacing * 0.4; y += dyL, row++) {
      for (x = x0 - spacing * 0.4 + (row % 2 ? spacing / 2 : 0); x <= x1 + spacing * 0.4; x += spacing) {
        var jx = x + (rnd() - 0.5) * spacing * 0.35, jy = y + (rnd() - 0.5) * spacing * 0.35, r = spacing * 0.6;
        if (!(T(jx, jy) || T(jx + r, jy) || T(jx - r, jy) || T(jx, jy + r) || T(jx, jy - r))) continue;
        var tooClose = false;
        for (var q = 0; q < pts.length; q++) { var ddx = pts[q][0] - jx, ddy = pts[q][1] - jy; if (ddx * ddx + ddy * ddy < minGap * minGap) { tooClose = true; break; } }
        if (!tooClose) add(jx, jy);
      }
    }
    if (pts.length < 4) return null;

    var tris = delaunay(pts), facets = [], noiseScale = spacing * 2.4, Lx = -0.55, Ly = -0.83;
    for (var ti = 0; ti < tris.length; ti++) {
      var t = tris[ti], p0 = pts[t.a], p1 = pts[t.b], p2 = pts[t.c];
      var fx = (p0[0] + p1[0] + p2[0]) / 3, fy = (p0[1] + p1[1] + p2[1]) / 3;
      if (A(fx, fy) <= 110 || !T(fx, fy)) continue;
      var mt = 0;     // 그림 밖으로 뻗는 뾰족 조각은 버려요
      if (A((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2) <= 40) mt++;
      if (A((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2) <= 40) mt++;
      if (A((p2[0] + p0[0]) / 2, (p2[1] + p0[1]) / 2) <= 40) mt++;
      if (mt >= 2) continue;
      var ix = clamp(Math.round(fx), 0, W - 1), iy = clamp(Math.round(fy), 0, H - 1), pi = (iy * W + ix) * 4;
      var cr = d[pi], cg = d[pi + 1], cb = d[pi + 2];
      var side = fx < cxm ? -1 : 1, nx = Math.abs(fx - cxm) / noiseScale, ny = fy / noiseScale;
      var tx = (vnoise(nx, ny, seed) * 2 - 1) * side, ty = vnoise(nx + 17.3, ny + 9.1, seed + 5) * 2 - 1;
      var k = (tx * Lx + ty * Ly) * 1.4;                           // 이 면이 빛을 얼마나 받는지 (-1~1)
      var shade = 1 + 0.24 * Math.round(clamp(k, -1, 1) * 2) / 2 + (rnd() - 0.5) * 0.03;   // 단계로 끊어서 판처럼 보이게
      var vs = [p0, p1, p2], best = 1e9, hb = 0;                   // 접히는 축 = 몸 가운데에 가장 가까운 변
      for (var e = 0; e < 3; e++) { var ea = vs[e], eb = vs[(e + 1) % 3], md = Math.abs((ea[0] + eb[0]) / 2 - cxm); if (md < best) { best = md; hb = e; } }
      var ha = vs[hb], hbp = vs[(hb + 1) % 3], hx = hbp[0] - ha[0], hy = hbp[1] - ha[1], hl = Math.hypot(hx, hy) || 1;
      facets.push({
        v: [p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]],
        r: cr, g: cg, b: cb, shade: shade,
        h: [ha[0], ha[1], -hy / hl, hx / hl],
        delay: (Math.abs(fx - cxm) / halfW * 0.55 + (fy - y0) / Math.max(1, y1 - y0) * 0.25 + rnd() * 0.12),
        dur: 0.55
      });
    }
    if (!facets.length) return null;
    return { facets: facets, count: facets.length };
  }

  /* ---------- 3) 그리기: 면 + 접힌 선 + 종이 결 ---------- */
  var grain = null;
  function makeGrain() {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), im = g.createImageData(128, 128), r = mulberry32(99), i;
    for (i = 0; i < im.data.length; i += 4) { var v = r(); var l = v > 0.5 ? 255 : 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = l; im.data[i + 3] = Math.abs(v - 0.5) * 34; }
    g.putImageData(im, 0, 0);
    g.lineCap = 'round';
    for (i = 0; i < 110; i++) {
      var x = r() * 128, y = r() * 128, a = r() * Math.PI, len = 5 + r() * 10;
      g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,.14)' : 'rgba(110,80,30,.10)'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
    return c;
  }
  function rgb(r, g, b, k) {
    function ch(v) { return Math.round(clamp(v * k + (k - 1) * 55, 0, 255)); }
    return 'rgb(' + ch(r) + ',' + ch(g) + ',' + ch(b) + ')';
  }
  // time = 접기 시작 뒤 흐른 초. Infinity = 다 접은 모습. ctx는 S x S 좌표로 맞춰져 있어야 해요
  function draw(ctx, model, time) {
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(model.under, 0, 0, S, S);
    var fs = model.mesh.facets;
    ctx.lineJoin = 'round';
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i], s = 1;
      if (time !== Infinity) { s = clamp((time - f.delay) / f.dur, 0, 1); if (s <= 0) continue; s = 1 - Math.pow(1 - s, 3); }
      var v = f.v, ax = v[0], ay = v[1], bx = v[2], by = v[3], cx = v[4], cy = v[5];
      if (s < 1) {
        var h = f.h, k1 = ((ax - h[0]) * h[2] + (ay - h[1]) * h[3]) * (1 - s), k2 = ((bx - h[0]) * h[2] + (by - h[1]) * h[3]) * (1 - s), k3 = ((cx - h[0]) * h[2] + (cy - h[1]) * h[3]) * (1 - s);
        ax -= h[2] * k1; ay -= h[3] * k1; bx -= h[2] * k2; by -= h[3] * k2; cx -= h[2] * k3; cy -= h[3] * k3;
      }
      var col = rgb(f.r, f.g, f.b, f.shade * (0.72 + 0.28 * s));
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 0.8; ctx.strokeStyle = col; ctx.stroke();                  // 면 사이 실금 가리기
      ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(50,30,10,.16)'; ctx.stroke(); // 접힌 선
    }
    if (!grain) grain = makeGrain();
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = ctx.createPattern(grain, 'repeat');
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
  }

  /* ---------- 공개 함수 ---------- */
  function load(src) {
    return new Promise(function (resolve) {
      if (src && src.tagName === 'IMG') { if (src.complete && src.naturalWidth) resolve(src); else { src.onload = function () { resolve(src); }; src.onerror = function () { resolve(null); }; } return; }
      var im = new Image(); im.onload = function () { resolve(im); }; im.onerror = function () { resolve(null); }; im.src = src;
    });
  }
  function make(src, opts) {
    opts = opts || {};
    return load(src).then(function (im) {
      if (!im) return null;
      try {
        var c = document.createElement('canvas'); c.width = c.height = S;
        var g = c.getContext('2d', { willReadFrequently: true });
        var sc = Math.min(S / im.naturalWidth, S / im.naturalHeight);       // 그림 비율은 그대로, 가운데에
        var w = im.naturalWidth * sc, h = im.naturalHeight * sc;
        g.drawImage(im, (S - w) / 2, (S - h) / 2, w, h);
        var filled = fillEnclosed(g.getImageData(0, 0, S, S), S, S);
        g.putImageData(new ImageData(filled.data, S, S), 0, 0);
        var mesh = buildMesh(filled, S, S, opts.spacing || SPACING, opts.seed || 7);
        if (!mesh) return null;
        return { mesh: mesh, under: c, count: mesh.count };
      } catch (e) { return null; }
    });
  }
  // canvas에 접히는 모습을 보여줘요. canvas 크기는 어떤 크기든 괜찮아요
  function play(canvas, model, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d'), total = opts.duration || 1.7, raf = 0, done = false, t0 = 0;
    var K = 1.7 / total;                               // 접는 타임라인은 1.7초 기준 → duration에 맞춰 늘이거나 줄여요
    ctx.setTransform(canvas.width / S, 0, 0, canvas.height / S, 0, 0);
    function finish() { if (done) return; done = true; cancelAnimationFrame(raf); draw(ctx, model, Infinity); if (opts.onDone) opts.onDone(); }
    function frame(now) {
      if (done) return;
      var t = (now - t0) / 1000;
      if (t >= total) { finish(); return; }
      draw(ctx, model, t * K);
      if (opts.onProgress) opts.onProgress(t / total);
      raf = requestAnimationFrame(frame);
    }
    draw(ctx, model, 0);
    raf = requestAnimationFrame(function (now) { t0 = now; frame(now); });
    return { skip: finish };
  }
  function png(model, px) {
    var c = document.createElement('canvas'); c.width = c.height = px || 220;
    var ctx = c.getContext('2d'); ctx.setTransform(c.width / S, 0, 0, c.height / S, 0, 0);
    draw(ctx, model, Infinity);
    return c.toDataURL('image/png');
  }

  window.PicoOrigami = { make: make, play: play, png: png, _fillEnclosed: fillEnclosed, _buildMesh: buildMesh };
})();
