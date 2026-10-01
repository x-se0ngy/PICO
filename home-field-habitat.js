/* =========================================================
   PICO · 내 들판의 피코들
   관찰 → 직접 그리기 → 저장한 그림이 작은 종이 생물이 되어
   종이 들판 위를 돌아다녀요.

   ▶ 그리기 루트(discover.html)에서 피코 보내는 법:
       localStorage.setItem('pico.habitat.pending', JSON.stringify([{
         src,                 // 그린 그림 dataURL
         name: '호박벌',
         place: '노란 꽃',
         note: '아이가 남긴 관찰 메모',
         lens: 'LOOK',
       }]));
       location.href = 'index.html';
     → 홈에 오면 "새로운 친구가 들판에 도착했어요!" 와 함께
       그 그림이 들판으로 날아 들어와요.

   ▶ 레이더에서 '찾으러 가기'를 누르면 그 신호 id 가 저장되고,
     그 뒤 도착한 피코는 그 신호에서 만난 친구로 기록돼요.

   ▶ 시연용: index.html?demo=arrive  → 예시 그림으로 도착 모션 재생
   ========================================================= */
(() => {
  const field = window.PicoField;
  const layer = document.getElementById('field-bugs');
  const phone = document.getElementById('screen-home');
  if (!field || !layer || !phone) return;

  const STORAGE_KEY = 'pico.habitat.v1';
  const PENDING_KEY = 'pico.habitat.pending';
  const TARGET_KEY = 'pico.radar.target';
  const MAX_BUGS = 20;
  const b = field.bounds;

  const bugs = [];

  // ---------- 예시 그림 (들판이 비어 있을 때만 보여줘요) ----------
  const svgURI = (s) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  const crayon = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const SAMPLES = [
    {
      name: '무당벌레', place: '예시 그림', sample: true,
      src: svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><g ${crayon}>
        <path d="M44 62 30 50M44 84 26 86M50 106 36 122M116 62 130 50M116 84 134 86M110 106 124 122" stroke="#221B17" stroke-width="5"/>
        <ellipse cx="80" cy="86" rx="40" ry="36" fill="#E43B45" stroke="#B82630" stroke-width="5"/>
        <path d="M80 52 80 120" stroke="#221B17" stroke-width="5"/>
        <path d="M58 44q22-18 44 0" fill="#221B17" stroke="#221B17" stroke-width="6"/>
        <circle cx="62" cy="76" r="6" fill="#221B17"/><circle cx="98" cy="74" r="6" fill="#221B17"/>
        <circle cx="64" cy="102" r="5.5" fill="#221B17"/><circle cx="97" cy="100" r="5.5" fill="#221B17"/>
        <path d="M70 40 62 26M90 40 98 26" stroke="#221B17" stroke-width="4"/></g></svg>`),
    },
    {
      name: '달팽이', place: '예시 그림', sample: true,
      src: svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><g ${crayon}>
        <path d="M18 118q10 6 30 6h82q14 0 18-14" fill="#9BC641" stroke="#6E9A26" stroke-width="5"/>
        <path d="M140 110q2-26-6-40M126 104q-4-22-12-36" stroke="#6E9A26" stroke-width="5"/>
        <circle cx="134" cy="68" r="4" fill="#221B17"/><circle cx="113" cy="66" r="4" fill="#221B17"/>
        <circle cx="76" cy="84" r="38" fill="#F28A3B" stroke="#C4621D" stroke-width="5"/>
        <path d="M76 84m-6 0a6 6 0 1 1 12 0a12 12 0 1 1-24 0a18 18 0 1 1 36 0a24 24 0 1 1-48 0" stroke="#8A4A18" stroke-width="4.5"/></g></svg>`),
    },
    {
      name: '나비', place: '예시 그림', sample: true, flier: true,
      src: svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><g ${crayon}>
        <path d="M78 76C60 34 22 30 22 58c0 22 30 30 56 22Z" fill="#6B45B9" stroke="#4E2F8F" stroke-width="5"/>
        <path d="M82 76c18-42 56-46 56-18 0 22-30 30-56 22Z" fill="#6B45B9" stroke="#4E2F8F" stroke-width="5"/>
        <path d="M78 86c-26 2-44 18-34 34 8 12 30 2 34-20ZM82 86c26 2 44 18 34 34-8 12-30 2-34-20Z" fill="#F6D34C" stroke="#D2A91D" stroke-width="5"/>
        <circle cx="46" cy="58" r="7" fill="#F6D34C"/><circle cx="114" cy="58" r="7" fill="#F6D34C"/>
        <path d="M80 60v58" stroke="#221B17" stroke-width="7"/>
        <path d="M78 58 66 36M82 58l12-22" stroke="#221B17" stroke-width="4"/></g></svg>`),
    },
  ];

  // =======================================================
  // 피코 만들기
  // =======================================================
  function addBug({ src, x, y, ...info }, { hidden = false } = {}) {
    const el = document.createElement('button');
    el.className = 'mh-bug' + (info.flier ? ' is-flier' : '') + (info.sample ? ' is-sample' : '');
    el.setAttribute('aria-label', info.name ? `내 피코: ${info.name}` : '내 피코');
    if (hidden) el.style.visibility = 'hidden';
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.draggable = false;
    img.style.animationDelay = `${(-Math.random() * 2).toFixed(2)}s`;
    el.appendChild(img);
    layer.appendChild(el);

    const dir = Math.random() < 0.5 ? -1 : 1;
    const bug = {
      el, img, src,
      info: {
        name: info.name || '',
        place: info.place || '',
        note: info.note || '',
        lens: info.lens || '',
        signal: info.signal || '',
        sample: !!info.sample,
        flier: !!info.flier,
        date: info.date || new Date().toISOString(),
      },
      paused: false,
      x: clamp(x ?? rand(b.minX, b.maxX), b.minX, b.maxX),
      y: clamp(y ?? rand(b.minY, b.maxY), b.minY, b.maxY),
      vx: dir * (0.22 + Math.random() * 0.3),
      vy: (Math.random() - 0.5) * 0.2,
      turnT: 0,
      nextTurn: 120 + Math.random() * 160,
      rest: 0,
      flipped: null,
      phase: Math.random() * Math.PI * 2,
    };
    bugs.push(bug);
    el.addEventListener('click', (e) => { e.stopPropagation(); select(bug); });
    place(bug);
    return bug;
  }

  // 피코를 누르면: 멈춰서 톡 튀고, 정보 카드에 알림
  let selected = null;
  function select(bug) {
    document.dispatchEvent(new CustomEvent('pico:select', {
      detail: { src: bug.src, ...bug.info, release: () => deselect(bug) },
    }));
    if (selected && selected !== bug) deselect(selected);
    selected = bug;
    bug.paused = true;
    bug.el.classList.add('is-selected');
    burstDust(bug.x, bug.y);
    beep(520, 260);
  }

  function deselect(bug) {
    bug.paused = false;
    bug.el.classList.remove('is-selected');
    if (selected === bug) selected = null;
  }

  // 종이 부스러기 (들판 좌표)
  function burstDust(x, y, n = 7, parent = layer) {
    for (let i = 0; i < n; i++) {
      const d = document.createElement('span');
      d.className = 'mh-dust';
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      d.style.background = ['#F6F1E4', '#9DDE97', '#F4D67A'][i % 3];
      parent.appendChild(d);
      const a = Math.random() * Math.PI * 2;
      const dist = 16 + Math.random() * 24;
      d.animate(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist - 12}px) rotate(${Math.random() * 180}deg)`, opacity: 0 },
        ],
        { duration: 700 + Math.random() * 300, easing: 'ease-out' }
      ).onfinish = () => d.remove();
    }
  }

  let audioCtx;
  function beep(f1, f2, dur = 0.18, vol = 0.05) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f1, audioCtx.currentTime);
      o.frequency.exponentialRampToValueAtTime(f2, audioCtx.currentTime + dur * 0.8);
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* 소리 없이 진행 */ }
  }

  function place(bug) {
    // 날개 달린 피코는 살랑살랑 떠다니듯
    const bob = bug.info.flier ? Math.sin(bug.phase) * 6 - 10 : 0;
    bug.el.style.translate = `${bug.x}px ${bug.y + bob}px`;
    bug.el.style.zIndex = String(Math.round(bug.y));   // 앞쪽(아래) 피코가 위로
    const flip = bug.vx < 0;
    if (flip !== bug.flipped) {
      bug.flipped = flip;
      bug.img.style.transform = flip ? 'scaleX(-1)' : '';
    }
  }

  function tick() {
    for (const g of bugs) {
      if (g.paused || g.landing) continue;
      g.phase += g.info.flier ? 0.06 : 0.02;
      if (g.rest > 0) { g.rest--; place(g); continue; }
      const speed = g.info.flier ? 1.5 : 1;
      g.x += g.vx * speed;
      g.y += g.vy * speed;

      if (++g.turnT > g.nextTurn) {
        g.turnT = 0;
        g.nextTurn = 120 + Math.random() * 160;
        if (Math.random() < 0.3) g.rest = 60 + Math.random() * 90;   // 잠깐 멈춰 쉬기
        if (Math.random() < 0.5) g.vx *= -1;
        g.vy = (Math.random() - 0.5) * 0.3;
      }
      if (g.x < b.minX) { g.x = b.minX; g.vx = Math.abs(g.vx); }
      if (g.x > b.maxX) { g.x = b.maxX; g.vx = -Math.abs(g.vx); }
      if (g.y < b.minY) { g.y = b.minY; g.vy = Math.abs(g.vy); }
      if (g.y > b.maxY) { g.y = b.maxY; g.vy = -Math.abs(g.vy); }
      place(g);
    }
    requestAnimationFrame(tick);
  }

  // ---------- 저장 (이 기기 브라우저에만) ----------
  const real = () => bugs.filter((g) => !g.info.sample);

  function save() {
    try {
      const data = real().map((g) => ({ src: g.src, x: Math.round(g.x), y: Math.round(g.y), ...g.info }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* 저장 불가 환경이면 그냥 넘어감 */ }
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(data)) data.slice(-MAX_BUGS).forEach((g) => g && g.src && addBug(g));
    } catch (e) { /* 무시 */ }
  }

  function clearSamples() {
    for (let i = bugs.length - 1; i >= 0; i--) {
      if (bugs[i].info.sample) { bugs[i].el.remove(); bugs.splice(i, 1); }
    }
  }

  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  // =======================================================
  // 새 친구 도착: 그린 그림이 들판으로 날아 들어와요
  // =======================================================
  const banner = document.getElementById('arrive-banner');
  const bannerSub = document.getElementById('arrive-sub');
  let bannerTimer = null;

  function showBanner(info) {
    if (!banner) return;
    bannerSub.textContent = info.name ? `${info.name}${josa(info.name)} 나의 들판에서 살게 됐어요` : '내가 그린 친구가 들판에서 살게 됐어요';
    banner.hidden = false;
    banner.classList.remove('is-out');
    void banner.offsetWidth;
    banner.classList.add('is-in');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      banner.classList.add('is-out');
      setTimeout(() => { banner.hidden = true; banner.classList.remove('is-in', 'is-out'); }, 400);
    }, 3400);
  }

  // 받침 없는 이름엔 '가', 있으면 '이'
  function josa(word) {
    const c = word.charCodeAt(word.length - 1);
    if (c < 0xac00 || c > 0xd7a3) return '이(가)';
    return (c - 0xac00) % 28 ? '이' : '가';
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function arrive(src, info = {}) {
    return new Promise((resolve) => {
      if (!info.sample) clearSamples();
      // 들판 가운데쯤 착지
      // 들판 한가운데 풀밭에 착지 (연못은 피해서)
      const lx = rand(170, 290);
      const ly = rand(520, 640);
      const bug = addBug({ ...info, src, x: lx, y: ly }, { hidden: true });
      bug.landing = true;
      while (real().length > MAX_BUGS) {
        const old = real()[0];
        old.el.remove();
        bugs.splice(bugs.indexOf(old), 1);
      }
      save();
      showBanner(info);
      beep(660, 990, 0.25, 0.04);

      // 들판 레이어와 같은 좌표계로 날아오는 그림
      const fly = document.createElement('div');
      fly.className = 'pf-flyer';
      const fimg = document.createElement('img');
      fimg.src = src;
      fimg.alt = '';
      fly.appendChild(fimg);
      const shadow = document.createElement('span');
      shadow.className = 'pf-land-shadow';
      shadow.style.left = `${lx}px`;
      shadow.style.top = `${ly + 22}px`;
      layer.append(shadow, fly);
      fly.style.left = `${lx}px`;
      fly.style.top = `${ly}px`;

      const sx = field.size.width / 2 - lx;     // 출발: 배너 아래 하늘 가운데
      const sy = 380 - ly;
      const dur = reduce ? 10 : 1900;
      const anim = fly.animate(
        [
          { transform: `translate(${sx}px, ${sy - 70}px) scale(0.6) rotate(-40deg)`, opacity: 0, offset: 0 },
          { transform: `translate(${sx}px, ${sy}px) scale(2.6) rotate(-6deg)`, opacity: 1, offset: 0.2 },
          { transform: `translate(${sx - 70}px, ${sy + 40}px) scale(2.2) rotate(14deg)`, offset: 0.42 },
          { transform: `translate(${sx * 0.35 + 40}px, ${sy * 0.45}px) scale(1.6) rotate(-10deg)`, offset: 0.66 },
          { transform: 'translate(0px, -46px) scale(1.15) rotate(6deg)', offset: 0.86 },
          { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1, offset: 1 },
        ],
        { duration: dur, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'forwards' }
      );
      shadow.animate(
        [
          { transform: 'scale(0.2)', opacity: 0 },
          { transform: 'scale(0.4)', opacity: 0.1, offset: 0.6 },
          { transform: 'scale(1)', opacity: 0.35 },
        ],
        { duration: dur, easing: 'ease-in', fill: 'forwards' }
      );

      anim.onfinish = () => {
        fly.remove();
        shadow.remove();
        bug.el.style.visibility = '';
        bug.el.classList.add('is-landed');
        bug.landing = false;
        burstDust(lx, ly + 16, 10);
        beep(420, 300, 0.14, 0.05);
        document.dispatchEvent(new CustomEvent('pico:arrived', { detail: { ...bug.info, src } }));
        setTimeout(() => bug.el.classList.remove('is-landed'), 900);
        updateCount();
        resolve(bug);
      };
    });
  }

  // 다른 페이지(그리기 루트)에서 넘겨준 피코 받기
  async function takePending() {
    let list = [];
    let target = '';
    try {
      list = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
      localStorage.removeItem(PENDING_KEY);
      target = localStorage.getItem(TARGET_KEY) || '';
      if (list.length) localStorage.removeItem(TARGET_KEY);
    } catch (e) { list = []; }

    // 시연용: ?demo=arrive
    if (new URLSearchParams(location.search).get('demo') === 'arrive') {
      const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
      list.push({ src: s.src, name: s.name, place: '꽃이 많은 곳', note: '시연용 예시 그림이에요.', flier: s.flier, sample: true });
      target = target || 'flowers';
    }
    if (!Array.isArray(list) || !list.length) return false;

    document.dispatchEvent(new CustomEvent('pico:arriving'));
    await wait(500);
    for (const item of list) {
      const data = typeof item === 'string' ? { src: item } : item || {};
      const { src, ...info } = data;
      if (!src) continue;
      if (target && !info.signal) info.signal = target;
      await arrive(src, info);
      await wait(700);
    }
    return true;
  }

  // ---------- 들판 이름 아래: 피코 수 ----------
  const countEl = document.getElementById('field-count');
  function updateCount() {
    if (!countEl) return;
    const n = real().length;
    countEl.textContent = n ? `피코 ${n}마리가 살고 있어요` : '관찰하고 그린 친구가 여기에 살게 돼요';
  }

  window.PicoHabitat = {
    arrive,
    deselectAll() { if (selected) deselect(selected); },
    count: () => real().length,
    // 이 신호에서 만난 피코들
    foundIn: (signalId) => real().filter((g) => g.info.signal === signalId).map((g) => ({ src: g.src, ...g.info })),
    clear() {
      real().forEach((g) => { g.el.remove(); bugs.splice(bugs.indexOf(g), 1); });
      save();
      updateCount();
    },
  };

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  // ▶ 예시 그림(무당벌레·달팽이·나비)은 들판에 띄우지 않아요.
  //   아이가 직접 그려서 놓아준 피코만 보여요. (SHOW_SAMPLES = true 로 바꾸면 예시도 나와요)
  const SHOW_SAMPLES = false;
  load();
  if (SHOW_SAMPLES && !real().length) SAMPLES.forEach((s) => addBug({ ...s }));
  updateCount();
  requestAnimationFrame(tick);
  window.PicoHabitat.ready = takePending();
})();
