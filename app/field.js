// PICO · 내 들판 (서식지)
// 촬영 4에서 그린 그림이 관찰 카드를 거쳐 "들판에 놓아주기"를 누르면
// 홈 > 내 들판에 스티커가 되어 돌아다녀요.
//   capture-4.html  → PicoField.saveDraft(canvas, colorName)
//   capture-card    → PicoField.release(species)   (그림이 없으면 들판에 보내지 않음)
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

  // ---------- 2) 들판에 놓아주기 ----------
  function release(species) {
    var d; try { d = JSON.parse(ss(DRAFT) || 'null'); } catch (e) { d = null; }
    if (!d || !d.src) return null;                               // 그림 없음 = 들판에 보내지 않음
    var short = (species || '').replace(/^칠성|^호랑|^배추흰|^고추|^왕/, '') || 'PICO';
    var item = { id: 'p' + Date.now(), src: d.src, name: (d.color ? d.color + ' ' : '') + short, species: species || '', at: Date.now() };
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
  function svgSticker(inner) {
    return '<svg viewBox="-6 -6 76 76" width="64" height="64" aria-hidden="true">' +
      '<g fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g>' +
      '<g fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g></svg>';
  }
  // 예시 친구들 (그림을 아직 안 그렸을 때도 들판이 비어 보이지 않게)
  var SAMPLES = [
    { name: '노랑 날개', svg: BF, fly: true },
    { name: '파랑 꼬리', svg: DF, fly: true },
    { name: '빨강 점박이', svg: LB },
    { name: '통통 다리', svg: HOP, hop: true },
    { name: '느릿느릿', svg: SNAIL, slow: true }
  ];

  // 들판 좌표(375x812 폰 기준): 걷는 친구는 언덕 위, 나는 친구는 하늘~언덕
  var GROUND = { x0: 14, x1: 300, y0: 400, y1: 640 };
  var SKY = { x0: 14, x1: 300, y0: 250, y1: 470 };
  var POND = { x0: 10, x1: 190, y0: 590, y1: 680 };
  var TOGGLE = { x0: 260, x1: 375, y0: 600, y1: 700 };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function inRect(p, r) { return p.x > r.x0 - 40 && p.x < r.x1 && p.y > r.y0 - 50 && p.y < r.y1; }
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
    var sampleCount = Math.max(0, 5 - mine.length);                // 내 PICO가 많아지면 예시는 줄어요
    var bugs = SAMPLES.slice(0, sampleCount).map(function (s) { return { name: s.name, html: svgSticker(s.svg), fly: s.fly, hop: s.hop, slow: s.slow }; })
      .concat(mine.map(function (m) { return { id: m.id, name: m.name, mine: true, html: '<img src="' + m.src + '" alt="" width="64" height="64">' }; }));

    layer.innerHTML = '';
    bugs.forEach(function (b, i) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'pf-bug' + (b.mine ? ' is-mine' : '') + (b.fly ? ' is-fly' : '') + (b.hop ? ' is-hop' : '');
      el.setAttribute('aria-label', b.name + (b.mine ? ' · 내가 그린 PICO' : ''));
      el.innerHTML = '<span class="pf-body"><span class="pf-flip">' + b.html + '</span></span><span class="pf-name">' + b.name + '</span>';
      layer.appendChild(el);
      b.el = el; b.flip = el.querySelector('.pf-flip');
      b.area = b.fly ? SKY : GROUND;
      b.pos = pick(b.area); b.to = pick(b.area);
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

  window.PicoField = { saveDraft: saveDraft, release: release, hasDraft: hasDraft, mount: mount, list: list };
})();
