// PICO · 내 들판 (서식지)
// 촬영 5에서 그린 그림이 관찰 카드를 거쳐 "들판에 놓아주기"를 누르면
// 홈 > 내 들판에 스티커가 되어 돌아다녀요.
//   capture-5.html  → PicoField.saveDraft(canvas, colorName)
//   capture-card    → PicoField.saveFolded(png)    (origami.js로 접은 모습을 그림에 붙여요)
//                     PicoField.release(species)   (그림이 없으면 들판에 보내지 않음)
//   home.html       → PicoField.mount(layerEl)
(function () {
  var DRAFT = 'pico.drawing';          // 이번 관찰에서 그린 그림 (sessionStorage)
  var LIST = 'pico.field';             // 들판에 사는 내 PICO 목록 (localStorage)
  var NEW = 'pico.field.new';          // 방금 도착한 PICO id
  var MAX = 12;

  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function list() { try { return JSON.parse(ls(LIST) || '[]'); } catch (e) { return []; } }

  // ---------- 1) 그림 저장: 그린 부분만 잘라 정사각형 PNG로 ----------
  function saveDraft(canvas, colorName) {
    var w = canvas.width, h = canvas.height, data;
    try { data = canvas.getContext('2d').getImageData(0, 0, w, h).data; } catch (e) { return false; }
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y += 2) for (var x = 0; x < w; x += 2) {
      if (data[(y * w + x) * 4 + 3] > 20) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    if (maxX < 0) { ss(DRAFT, null); return false; }            // 아무것도 안 그림
    var pad = 8; minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w, maxX + pad); maxY = Math.min(h, maxY + pad);
    var bw = maxX - minX, bh = maxY - minY, SIZE = 200, s = Math.min(SIZE / bw, SIZE / bh);
    var out = document.createElement('canvas'); out.width = out.height = SIZE;
    out.getContext('2d').drawImage(canvas, minX, minY, bw, bh, (SIZE - bw * s) / 2, (SIZE - bh * s) / 2, bw * s, bh * s);
    ss(DRAFT, JSON.stringify({ src: out.toDataURL('image/png'), color: colorName || '' }));
    return true;
  }

  // 관찰 카드에서 종이로 접은 모습(PNG)을 이번 그림에 붙여 둬요 (들판 스티커는 접은 모습을 써요)
  function saveFolded(png) {
    var d; try { d = JSON.parse(ss(DRAFT) || 'null'); } catch (e) { d = null; }
    if (!d || !d.src) return false;
    d.folded = png; ss(DRAFT, JSON.stringify(d));
    return true;
  }

  // ---------- 2) 들판에 놓아주기 ----------
  function release(species) {
    var d; try { d = JSON.parse(ss(DRAFT) || 'null'); } catch (e) { d = null; }
    if (!d || !d.src) return null;                               // 그림 없음 = 들판에 보내지 않음
    var short = (species || '').replace(/^칠성|^호랑|^배추흰|^고추|^왕/, '') || 'PICO';
    var item = { id: 'p' + Date.now(), src: d.folded || d.src, name: (d.color ? d.color + ' ' : '') + short, species: species || '', at: Date.now() };
    var all = list(); all.push(item); while (all.length > MAX) all.shift();
    ls(LIST, JSON.stringify(all)); ls(NEW, item.id); ss(DRAFT, null);
    return item;
  }
  function hasDraft() { return !!ss(DRAFT); }

  // ---------- 3) 들판: 스티커들이 돌아다녀요 ----------
  var BF = '<path d="M31 22c-5-9-18-14-21-6-3 7 7 13 20 11" fill="#F4D35E"/><path d="M33 22c5-9 18-13 21-5 2 7-8 12-20 10" fill="#F4D35E"/><path d="M31 31c-7 2-15 8-12 13 3 4 10-1 12-8" fill="#F2A7C3"/><path d="M33 31c7 2 14 8 11 13-3 4-10-1-11-8" fill="#F2A7C3"/><path d="M32 19c.6 10-.4 20 .3 30"/><path d="M31 19l-4-7M33 19l5-6"/>';
  var DF = '<path d="M30 24C20 14 6 14 6 20s14 8 24 6M34 24c10-10 24-10 24-4s-14 8-24 6M30 30C20 34 8 40 10 44s14-2 20-10M34 30c10 4 22 10 20 14s-14-2-20-10" fill="#8ED8FF"/><path d="M32 18v40" stroke-width="5"/><circle cx="32" cy="16" r="5" fill="#00B2FF"/>';
  var LB = '<path d="M24 22a8 6 0 0 1 16 0" fill="#111"/><ellipse cx="32" cy="38" rx="18" ry="16" fill="#E8432E"/><path d="M32 22v32"/><circle cx="24" cy="32" r="3" fill="#111"/><circle cx="40" cy="32" r="3" fill="#111"/><circle cx="22" cy="43" r="2.5" fill="#111"/><circle cx="42" cy="43" r="2.5" fill="#111"/>';
  var HOP = '<path d="M8 40 L44 26 L56 30 L50 38 Z" fill="#B3BE37"/><path d="M20 36 L28 22 L40 30 M28 22 L34 46 M18 38 L14 50 M30 34 L32 50"/><path d="M54 30 L60 16"/>';
  var SNAIL = '<path d="M6 48h46c4 0 6-6 2-8" fill="#F2A7C3"/><circle cx="30" cy="32" r="14" fill="#F4D35E"/><path d="M30 32a6 6 0 1 1 6-6"/><path d="M50 40l2-14M54 40l6-12"/>';
  // 예시 친구들: 아이들이 직접 그린 그림을 종이접기로 바꾼 것 (assets/dummy/) — 앱 더미 데이터예요.
  // 위에서부터 들판에 나오고, species가 있는 건 도감 사진첩의 같은 곤충 칸에도 들어가요.
  var KIDS = [
    { f: 'k01', name: '분홍 나비',   fly: true, species: '붉은점모시나비' },
    { f: 'k17', name: '노랑 달팽이', slow: true },
    { f: 'k15', name: '무당벌레',    species: '칠성무당벌레' },
    { f: 'k12', name: '노랑 나비',   fly: true, species: '배추흰나비' },
    { f: 'k14', name: '꿀벌',        fly: true },
    { f: 'k16', name: '지렁이',      slow: true },
    { f: 'k03', name: '나무 위 친구', species: '흰줄숲모기' },
    { f: 'k05', name: '보라 나비',   fly: true, species: '상제나비' },
    { f: 'k02', name: '달팽이',      slow: true },
    { f: 'k04', name: '빨간 지렁이', slow: true },
    { f: 'k06', name: '지네' },
    { f: 'k07', name: '핑크 나비',   fly: true },
    { f: 'k08', name: '가시 노린재', species: '갈색여치' },
    { f: 'k09', name: '점박이 나비', fly: true },
    { f: 'k10', name: '잠자리',      fly: true },
    { f: 'k11', name: '동글 무당벌레' },
    { f: 'k13', name: '빨간 벌레',   slow: true },
    { f: 'p01', name: '줄무늬 벌',   fly: true }
  ];
  var SAMPLE_COUNT = 8;                                         // 내 PICO가 늘면 그만큼 줄어요
  function kidSrc(k) { return 'assets/dummy/' + k.f + '.png'; }
  // 도감 사진첩용: 곤충 이름에 맞는 아이 그림 (없으면 null)
  function kidFor(species) {
    var key = (species || '').replace(/\s+/g, '');
    for (var i = 0; i < KIDS.length; i++) if (KIDS[i].species === key) return kidSrc(KIDS[i]);
    return null;
  }

  // 들판 좌표(375x812 폰 기준): 걷는 친구는 언덕 위, 나는 친구는 하늘~언덕
  var GROUND = { x0: 14, x1: 300, y0: 400, y1: 640 };
  var SKY = { x0: 14, x1: 300, y0: 250, y1: 470 };
  var POND = { x0: 10, x1: 190, y0: 590, y1: 680 };
  var TOGGLE = { x0: 260, x1: 375, y0: 600, y1: 700 };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function inRect(p, r) { return p.x > r.x0 - 40 && p.x < r.x1 && p.y > r.y0 - 50 && p.y < r.y1; }
  // 처음 자리는 서로 멀찍이 (여러 친구가 한곳에 뭉쳐서 시작하지 않게)
  function spread(area, bugs) {
    var best = null, bestD = -1;
    for (var k = 0; k < 14; k++) {
      var p = pick(area), dmin = 1e9;
      bugs.forEach(function (o) { if (o.pos) { var dd = Math.hypot(o.pos.x - p.x, o.pos.y - p.y); if (dd < dmin) dmin = dd; } });
      if (dmin > 90) return p;
      if (dmin > bestD) { bestD = dmin; best = p; }
    }
    return best;
  }
  function pick(area) {
    for (var i = 0; i < 20; i++) {
      var p = { x: rnd(area.x0, area.x1), y: rnd(area.y0, area.y1) };
      if (area === GROUND && (inRect(p, POND) || inRect(p, TOGGLE))) continue;
      return p;
    }
    return { x: rnd(area.x0, area.x1), y: area.y0 };
  }

  function mount(layer, opts) {
    opts = opts || {};
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mine = list(), newId = ls(NEW);
    var sampleCount = Math.max(0, SAMPLE_COUNT - mine.length);     // 내 PICO가 많아지면 예시는 줄어요
    var bugs = KIDS.slice(0, sampleCount).map(function (k) { return { name: k.name, kid: true, fly: k.fly, slow: k.slow, html: '<img src="' + kidSrc(k) + '" alt="" width="64" height="64" draggable="false">' }; })
      .concat(mine.map(function (m) { return { id: m.id, name: m.name, mine: true, html: '<img src="' + m.src + '" alt="" width="64" height="64">' }; }));

    layer.innerHTML = '';
    bugs.forEach(function (b, i) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'pf-bug' + (b.mine ? ' is-mine' : '') + (b.kid ? ' is-kid' : '') + (b.fly ? ' is-fly' : '') + (b.hop ? ' is-hop' : '');
      el.setAttribute('aria-label', b.name + (b.mine ? ' · 내가 그린 PICO' : b.kid ? ' · 아이들이 그린 PICO' : ''));
      el.innerHTML = '<span class="pf-body"><span class="pf-flip">' + b.html + '</span></span><span class="pf-name">' + b.name + '</span>';
      layer.appendChild(el);
      b.el = el; b.flip = el.querySelector('.pf-flip');
      b.area = b.fly ? SKY : GROUND;
      b.pos = spread(b.area, bugs); b.to = pick(b.area);
      b.speed = b.slow ? 6 : b.fly ? rnd(26, 36) : rnd(12, 20);
      b.wait = rnd(0, 1500);
      el.style.animationDelay = (-i * 0.37) + 's';
      el.addEventListener('click', function () {
        el.classList.remove('is-poke'); void el.offsetWidth; el.classList.add('is-poke');
        if (opts.onTap) opts.onTap(b);
      });
      place(b);
      if (b.mine && b.id === newId) {                           // 방금 놓아준 친구: 위에서 폴짝 내려와요
        el.classList.add('is-arrive'); b.wait = 1600;
        ls(NEW, null);
        if (opts.onArrive) opts.onArrive(b);
      }
    });

    // 다른 친구의 목적지와 너무 가깝지 않은 곳으로 (서로 겹쳐 뭉치지 않게)
    function pickFree(b) {
      var best = null, bestD = -1;
      for (var k = 0; k < 8; k++) {
        var p = pick(b.area), dmin = 1e9;
        bugs.forEach(function (o) { if (o !== b && o.to) { var dd = Math.hypot(o.to.x - p.x, o.to.y - p.y); if (dd < dmin) dmin = dd; } });
        if (dmin > 80) return p;
        if (dmin > bestD) { bestD = dmin; best = p; }
      }
      return best;
    }
    bugs.forEach(function (b) { b.to = pickFree(b); });

    function place(b) {
      b.el.style.transform = 'translate(' + b.pos.x.toFixed(1) + 'px,' + b.pos.y.toFixed(1) + 'px)';
    }
    if (reduce) return;

    var lastT = 0, running = true;
    function tick(t) {
      if (!running) return;
      var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0; lastT = t;
      if (layer.offsetParent !== null) {                        // 들판이 보일 때만 움직여요
        bugs.forEach(function (b) {
          if (b.wait > 0) { b.wait -= dt * 1000; b.el.classList.remove('is-moving'); return; }
          var dx = b.to.x - b.pos.x, dy = b.to.y - b.pos.y, d = Math.hypot(dx, dy);
          if (d < 2) { b.to = pickFree(b); b.wait = b.fly ? rnd(300, 1500) : rnd(800, 3200); return; }
          var step = Math.min(d, b.speed * dt);
          b.pos.x += dx / d * step; b.pos.y += dy / d * step;
          b.flip.style.transform = dx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
          b.el.classList.add('is-moving');
          b.el.style.zIndex = Math.round(b.pos.y);              // 아래쪽 친구가 앞에
          place(b);
        });
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return { stop: function () { running = false; } };
  }

  // 도감 사진첩용 예시 그림 (아이가 크레용으로 그린 느낌: 색칠 + 굵은 검은 선)
  var DOODLE = {
    butterfly: BF, butterfly2: '<path d="M31 22c-5-9-18-14-21-6-3 7 7 13 20 11" fill="#fff"/><path d="M33 22c5-9 18-13 21-5 2 7-8 12-20 10" fill="#fff"/><circle cx="20" cy="18" r="3" fill="#E8432E"/><circle cx="44" cy="18" r="3" fill="#E8432E"/><path d="M31 31c-7 2-15 8-12 13 3 4 10-1 12-8" fill="#fff"/><path d="M33 31c7 2 14 8 11 13-3 4-10-1-11-8" fill="#fff"/><path d="M32 19c.6 10-.4 20 .3 30"/><path d="M31 19l-4-7M33 19l5-6"/>',
    butterfly3: '<path d="M31 22c-5-9-18-14-21-6-3 7 7 13 20 11" fill="#fff"/><path d="M33 22c5-9 18-13 21-5 2 7-8 12-20 10" fill="#fff"/><path d="M14 14l12 10M50 14L38 24M20 40l8-8M44 40l-8-8"/><path d="M31 31c-7 2-15 8-12 13 3 4 10-1 12-8" fill="#fff"/><path d="M33 31c7 2 14 8 11 13-3 4-10-1-11-8" fill="#fff"/><path d="M32 19c.6 10-.4 20 .3 30"/>',
    dragonfly: DF.replace(/#8ED8FF/g, '#FCE3D8').replace(/#00B2FF/g, '#E8432E').replace('stroke-width="5"', 'stroke-width="5" stroke="#E8432E"'),
    ladybug: LB, hop: HOP,
    strider: '<ellipse cx="32" cy="32" rx="12" ry="5" fill="#7A5A3A"/><path d="M22 30L8 20M22 34L6 44M42 30l14-10M42 34l16 10M26 28l-4-10M38 28l4-10"/>',
    beetle: '<ellipse cx="32" cy="36" rx="14" ry="17" fill="#3B4A2A"/><circle cx="32" cy="17" r="6" fill="#3B4A2A"/><path d="M32 22v30M18 30l-8-4M46 30l8-4M18 42l-8 4M46 42l8 4"/>',
    mosquito: '<ellipse cx="32" cy="36" rx="4" ry="12" fill="#444"/><path d="M28 30l-14-12M36 30l14-12" /><path d="M30 26c-6-6-14-6-14-2s8 4 14 2zM34 26c6-6 14-6 14-2s-8 4-14 2z" fill="#DDF3FF"/><path d="M32 24v-10M30 40l-10 14M34 40l10 14M30 36l-14 4M34 36l14 4"/>',
    stick: '<path d="M10 50L54 14" stroke-width="5"/><path d="M20 42l-6 10M24 38l4 12M34 30l-8-8M40 26l8 6M50 18l4-10"/>',
    moth: '<path d="M30 24C20 14 8 18 10 28s14 8 20 2" fill="#F4D35E"/><path d="M34 24c10-10 22-6 20 4s-14 8-20 2" fill="#F4D35E"/><path d="M32 22v24" stroke-width="4"/><path d="M31 22C26 10 22 4 14 2M33 22c5-12 9-18 17-20"/>'
  };
  function doodle(key) {
    var inner = DOODLE[key] || LB;
    return '<svg viewBox="2 2 60 60" aria-hidden="true"><g fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g></svg>';
  }

  window.PicoField = { kidFor: kidFor, doodle: doodle, saveDraft: saveDraft, saveFolded: saveFolded, release: release, hasDraft: hasDraft, mount: mount, list: list };
})();
