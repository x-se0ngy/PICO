/* =========================================================
   PICO · 홈 = Living Paper Field (종이 생태 들판)
   실제 지도가 아니라, 종이를 겹겹이 오려 붙인 들판(디오라마)이에요.
   - 뒤(하늘·언덕·들판) / 앞(발밑 풀·꽃) 두 장의 SVG 사이로 피코가 돌아다녀요.
   - 손가락(마우스)을 움직이면 종이 층이 살짝 어긋나며 입체감이 생겨요.
   ========================================================= */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 393;
  const H = 852;

  const back = document.getElementById('field-back');
  const front = document.getElementById('field-front');
  const field = document.getElementById('field');
  if (!back || !front || !field) return;

  // 종이 색 (PICO 팔레트 기반)
  const C = {
    sky: '#F3EEDF',
    skyLow: '#EAF3DF',
    sun: '#EBC878',
    sunIn: '#F4DA9C',
    cloud: '#FBF8F0',
    far: '#CFE9C6',
    farTree: '#B5DDAE',
    mid: '#B4E4AE',
    meadow: '#A3DC9C',
    meadowIn: '#AEE3A7',
    path: '#EFE6CF',
    pond: '#B7DDEA',
    pondIn: '#D4ECF2',
    grass: '#86C981',
    grassDark: '#74B870',
    front: '#7FC57A',
    trunk: '#8A6A4F',
    crown: '#8CCB86',
    crownDark: '#79B974',
    stone: '#D9D2C1',
    stoneDark: '#C7BEA9',
    petal: '#FBF8F0',
    petalY: '#F4D67A',
    petalP: '#F2BDB5',
    petalC: '#C9A15A',
    ink: '#221B17',
  };

  // 항상 같은 들판이 나오도록 고정된 난수
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const jit = (n) => (rnd() - 0.5) * 2 * n;

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // 찢은 종이처럼 살짝 울퉁불퉁한 언덕 윤곽
  function hillPath(base, amp, freq, phase, torn = 1.1) {
    let d = `M -30 ${H + 40} L -30 ${base}`;
    for (let x = -30; x <= W + 30; x += 7) {
      const y = base
        + Math.sin(x * freq + phase) * amp
        + Math.sin(x * freq * 2.7 + phase * 1.9) * amp * 0.28
        + jit(torn);
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return `${d} L ${W + 30} ${H + 40} Z`;
  }

  // 울퉁불퉁한 원/타원 (종이 오림)
  function blobPath(cx, cy, rx, ry, wobble = 1.2, steps = 22) {
    let d = '';
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = cx + Math.cos(a) * (rx + jit(wobble));
      const y = cy + Math.sin(a) * (ry + jit(wobble * 0.7));
      d += `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return `${d}Z`;
  }

  function defs(svg, id) {
    const d = el('defs', {}, svg);
    // 종이 한 장의 그림자
    const f = el('filter', { id: `${id}-shadow`, x: '-10%', y: '-10%', width: '120%', height: '130%' }, d);
    el('feDropShadow', { dx: '0', dy: '2.4', stdDeviation: '1.4', 'flood-color': C.ink, 'flood-opacity': '0.2' }, f);
    const s = el('filter', { id: `${id}-small`, x: '-30%', y: '-30%', width: '160%', height: '170%' }, d);
    el('feDropShadow', { dx: '0.6', dy: '1.4', stdDeviation: '0.7', 'flood-color': C.ink, 'flood-opacity': '0.25' }, s);
    // 종이 결 (아주 옅게)
    const g = el('filter', { id: `${id}-grain`, x: '0', y: '0', width: '100%', height: '100%' }, d);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '3', result: 'n' }, g);
    el('feColorMatrix', { type: 'matrix', values: '0 0 0 0 0.13  0 0 0 0 0.1  0 0 0 0 0.09  0 0 0 0.55 0' }, g);
    const lg = el('linearGradient', { id: `${id}-sky`, x1: '0', y1: '0', x2: '0', y2: '1' }, d);
    el('stop', { offset: '0.35', 'stop-color': C.sky }, lg);
    el('stop', { offset: '0.75', 'stop-color': C.skyLow }, lg);
  }

  const layers = [];              // 시차(패럴랙스)용 층들
  function layer(svg, depth, cls = '') {
    const g = el('g', { class: `pf-layer ${cls}`.trim() }, svg);
    layers.push({ g, depth });
    return g;
  }

  // ---------- 작은 종이 소품 ----------
  function tuft(parent, x, y, s = 1, color = C.grass, sway = true) {
    const g = el('g', { class: sway ? 'pf-sway' : '', filter: 'url(#b-small)' }, parent);
    g.style.animationDelay = `${(-rnd() * 4).toFixed(2)}s`;
    const h = 12 * s;
    const w = 4.5 * s;
    const d = `M ${x - w * 1.6} ${y} L ${x - w * 1.1} ${y - h * 0.7} L ${x - w * 0.5} ${y - h * 0.25}`
      + ` L ${x} ${y - h} L ${x + w * 0.5} ${y - h * 0.3} L ${x + w * 1.2} ${y - h * 0.75}`
      + ` L ${x + w * 1.6} ${y} Z`;
    el('path', { d, fill: color }, g);
    return g;
  }

  function flower(parent, x, y, s = 1, petal = C.petal, stem = true) {
    const g = el('g', { class: 'pf-sway pf-sway--soft', filter: 'url(#b-small)' }, parent);
    g.style.animationDelay = `${(-rnd() * 4).toFixed(2)}s`;
    if (stem) el('rect', { x: x - 0.8 * s, y: y, width: 1.6 * s, height: 13 * s, fill: C.grassDark }, g);
    const r = 3.4 * s;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      el('ellipse', {
        cx: (x + Math.cos(a) * r).toFixed(1),
        cy: (y + Math.sin(a) * r).toFixed(1),
        rx: (2.9 * s).toFixed(1),
        ry: (2.3 * s).toFixed(1),
        transform: `rotate(${((a * 180) / Math.PI).toFixed(0)} ${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)})`,
        fill: petal,
      }, g);
    }
    el('circle', { cx: x, cy: y, r: 2 * s, fill: C.petalC }, g);
    return g;
  }

  function tree(parent, x, y, s = 1, crown = C.crown) {
    const g = el('g', { filter: 'url(#b-shadow)' }, parent);
    el('path', { d: `M ${x - 2.2 * s} ${y} L ${x - 1.4 * s} ${y - 16 * s} L ${x + 1.4 * s} ${y - 16 * s} L ${x + 2.2 * s} ${y} Z`, fill: C.trunk }, g);
    el('path', { d: blobPath(x, y - 24 * s, 13 * s, 12 * s, 1.1 * s), fill: crown }, g);
    el('path', { d: blobPath(x + 4 * s, y - 27 * s, 6 * s, 5 * s, 0.6 * s), fill: C.meadowIn, opacity: '0.55' }, g);
    return g;
  }

  function stone(parent, x, y, s = 1) {
    const g = el('g', { filter: 'url(#b-small)' }, parent);
    el('path', { d: blobPath(x, y, 7 * s, 4.4 * s, 0.7 * s, 14), fill: C.stone }, g);
    el('path', { d: blobPath(x - 1.5 * s, y - 1.2 * s, 3 * s, 1.6 * s, 0.3 * s, 10), fill: C.petal, opacity: '0.6' }, g);
    return g;
  }

  function cloud(parent, x, y, s = 1) {
    const g = el('g', { class: 'pf-cloud', filter: 'url(#b-small)' }, parent);
    g.style.animationDelay = `${(-rnd() * 30).toFixed(1)}s`;
    el('path', { d: blobPath(x, y, 18 * s, 6.5 * s, 0.9, 18), fill: C.cloud }, g);
    el('path', { d: blobPath(x - 5 * s, y - 5 * s, 9 * s, 6.5 * s, 0.7, 14), fill: C.cloud }, g);
    el('path', { d: blobPath(x + 7 * s, y - 3.5 * s, 7 * s, 5 * s, 0.6, 12), fill: C.cloud }, g);
    return g;
  }

  // =======================================================
  // 뒤쪽 장면: 하늘 → 먼 언덕 → 가까운 언덕 → 들판
  // =======================================================
  defs(back, 'b');

  const sky = layer(back, 0);
  el('rect', { x: -40, y: -40, width: W + 80, height: H + 80, fill: 'url(#b-sky)' }, sky);

  const sunL = layer(back, 1.5);
  const sun = el('g', { class: 'pf-sun', filter: 'url(#b-shadow)' }, sunL);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 360;
    el('rect', { x: 336, y: 252, width: 4, height: 9, fill: C.sun, transform: `rotate(${a} 338 292)` }, sun);
  }
  el('path', { d: blobPath(338, 292, 25, 25, 0.9), fill: C.sun }, sun);
  el('path', { d: blobPath(338, 292, 16, 16, 0.6), fill: C.sunIn }, sun);

  const clouds = layer(back, 2.5);
  cloud(clouds, 62, 290, 1.05);
  cloud(clouds, 214, 282, 0.75);

  const far = layer(back, 4);
  el('path', { d: hillPath(314, 16, 0.019, 0.6, 0.9), fill: C.far, filter: 'url(#b-shadow)' }, far);
  [[46, 306, 0.8], [74, 312, 0.62], [258, 320, 0.7], [300, 312, 0.6]].forEach(([x, y, s]) => tree(far, x, y, s, C.farTree));

  const mid = layer(back, 6);
  el('path', { d: hillPath(372, 13, 0.014, 2.4, 1), fill: C.mid, filter: 'url(#b-shadow)' }, mid);
  tree(mid, 178, 378, 1, C.crownDark);
  tree(mid, 200, 382, 0.72, C.crown);
  tree(mid, 336, 372, 0.9, C.crown);
  for (let i = 0; i < 7; i++) tuft(mid, 20 + i * 58 + jit(12), 392 + jit(4), 0.7, C.grass);

  // 들판 (피코들이 사는 곳)
  const meadow = layer(back, 9);
  el('path', { d: hillPath(446, 7, 0.012, 1.2, 1), fill: C.meadow, filter: 'url(#b-shadow)' }, meadow);
  // 들판 무늬: 조금 밝은 종이 조각들
  [[80, 520, 46, 13], [290, 600, 56, 15], [180, 670, 70, 14], [330, 500, 34, 9]].forEach(([x, y, rx, ry]) => {
    el('path', { d: blobPath(x, y, rx, ry, 1.6, 26), fill: C.meadowIn }, meadow);
  });
  // 탐험 길
  el('path', {
    d: 'M 150 870 C 160 780, 250 740, 222 680 C 200 632, 118 628, 150 576 C 172 540, 238 520, 214 470',
    fill: 'none', stroke: C.path, 'stroke-width': 15, 'stroke-linecap': 'round', filter: 'url(#b-small)',
  }, meadow);
  el('path', {
    d: 'M 150 870 C 160 780, 250 740, 222 680 C 200 632, 118 628, 150 576 C 172 540, 238 520, 214 470',
    fill: 'none', stroke: C.ink, 'stroke-opacity': 0.12, 'stroke-width': 1.2, 'stroke-dasharray': '3 6',
  }, meadow);
  // 연못
  const pond = el('g', { filter: 'url(#b-shadow)' }, meadow);
  el('path', { d: blobPath(82, 594, 50, 17, 1.4, 28), fill: C.pond }, pond);
  el('path', { d: blobPath(74, 591, 32, 9, 1, 22), fill: C.pondIn }, pond);
  el('rect', { x: 92, y: 588, width: 14, height: 1.6, fill: C.petal, opacity: 0.8 }, pond);
  stone(meadow, 132, 606, 1);
  stone(meadow, 141, 598, 0.7);
  stone(meadow, 36, 612, 0.8);
  // 꽃밭 (오른쪽)
  [[300, 520], [318, 530], [336, 518], [310, 544], [346, 540], [288, 540], [328, 552]].forEach(([x, y], i) => {
    flower(meadow, x + jit(3), y + jit(2), 0.9 + rnd() * 0.3, [C.petal, C.petalY, C.petalP][i % 3]);
  });
  // 나무 한 그루 (왼쪽 위)
  tree(meadow, 58, 494, 1.25, C.crownDark);
  // 풀 조각
  for (let i = 0; i < 18; i++) {
    tuft(meadow, 16 + rnd() * 360, 470 + rnd() * 230, 0.8 + rnd() * 0.5, rnd() < 0.5 ? C.grass : C.grassDark);
  }

  // 종이 결
  el('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#b-grain)', opacity: 0.35, style: 'mix-blend-mode:multiply' }, back);

  // =======================================================
  // 앞쪽 장면: 발밑의 풀과 꽃 (피코보다 앞)
  // =======================================================
  defs(front, 'f');
  // 소품 함수는 #b- 필터를 쓰므로, 앞 장면에서는 #f- 필터로 바꿔 끼움
  const fixFilter = (root) => root.querySelectorAll('[filter^="url(#b-"]').forEach((n) => {
    n.setAttribute('filter', n.getAttribute('filter').replace('#b-', '#f-'));
  });

  const fore = layer(front, 13);
  el('path', { d: hillPath(724, 9, 0.02, 3.1, 1.2), fill: C.front, filter: 'url(#f-shadow)' }, fore);
  for (let i = 0; i < 14; i++) tuft(fore, i * 30 + jit(8), 724 + jit(5), 1.2 + rnd() * 0.5, C.grassDark);
  flower(fore, 22, 700, 1.5, C.petalY);
  flower(fore, 44, 712, 1.2, C.petal);
  flower(fore, 372, 704, 1.4, C.petalP);
  flower(fore, 352, 716, 1.1, C.petal);
  tuft(fore, 8, 716, 2, C.front);
  tuft(fore, 386, 718, 2.1, C.front);
  fixFilter(front);

  // =======================================================
  // 시차(패럴랙스): 종이 층이 살짝 어긋나며 입체감
  // =======================================================
  const bugsLayer = document.getElementById('field-bugs');
  const BUGS_DEPTH = 10;
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  let t0 = performance.now();

  const phone = field.closest('.mh-phone') || field;
  phone.addEventListener('pointermove', (e) => {
    const r = phone.getBoundingClientRect();
    target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  phone.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(now) {
    const t = (now - t0) / 1000;
    // 가만히 있어도 아주 천천히 숨 쉬듯 움직임
    const idleX = reduce ? 0 : Math.sin(t * 0.35) * 0.25;
    const idleY = reduce ? 0 : Math.cos(t * 0.27) * 0.15;
    cur.x += (target.x + idleX - cur.x) * 0.06;
    cur.y += (target.y + idleY - cur.y) * 0.06;
    for (const { g, depth } of layers) {
      g.setAttribute('transform', `translate(${(-cur.x * depth * 0.6).toFixed(2)} ${(-cur.y * depth * 0.3).toFixed(2)})`);
    }
    if (bugsLayer) {
      bugsLayer.style.transform = `translate(${(-cur.x * BUGS_DEPTH * 0.6).toFixed(2)}px, ${(-cur.y * BUGS_DEPTH * 0.3).toFixed(2)}px)`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // 다른 스크립트에서 쓰는 들판 정보
  window.PicoField = {
    el: field,
    bugsLayer,
    size: { width: W, height: H },
    // 피코가 돌아다닐 수 있는 들판 범위 (헤더·탭바에 가리지 않게)
    bounds: { minX: 34, maxX: W - 34, minY: 478, maxY: 690 },
    // 레이더의 '내 위치' (들판 한가운데)
    me: { x: W / 2, y: 470 },
  };
})();

// ---------- 하단 탭 ----------
document.querySelectorAll('.mh-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mh-tab').forEach((t) => {
      t.classList.remove('is-active');
      t.removeAttribute('aria-current');
    });
    btn.classList.add('is-active');
    btn.setAttribute('aria-current', 'page');
  });
});
