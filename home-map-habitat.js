/* =========================================================
   PICO · 내 서식지 = 홈 들판 지도
   카메라로 발견 → 그리기 루트에서 완성한 피코가
   이 들판 위에 풀려나 돌아다닙니다. (지도를 움직여도 같이 붙어 다님)

   ▶ 그리기 루트에서 피코 보내는 법 (다른 페이지에서):
       // canvas = 그린 그림
       const src = canvas.toDataURL('image/png');   // 96x96 정도로 줄이면 가벼워요
       localStorage.setItem('pico.habitat.pending', JSON.stringify([{
         src,
         name: '무당벌레',                 // 곤충 이름 (선택)
         place: '후문 꽃밭',               // 발견한 곳 (선택)
         note: '빨간 등에 점이 7개 있었어', // 아이가 남긴 관찰 메모 (선택)
         lens: 'LOOK',                     // LOOK · MOVE · PLACE · BEHAVIOR (선택)
       }]));
       location.href = 'index.html';
     → 홈에 오면 그 피코가 톡 튀어나오며 카메라가 그쪽으로 이동해요.

   ▶ 같은 페이지 안이라면:
       PicoHabitat.release(src, { name, place, note });

   ▶ 피코를 누르면 'pico:select' 이벤트가 발생해요 (정보 카드가 받아서 띄움).
   ========================================================= */
(() => {
  const map = window.PicoMap;
  const layer = document.getElementById('map-bugs');
  if (!map || !layer) return;

  const STORAGE_KEY = 'pico.habitat.v1';
  const MAX_BUGS = 20;
  const BUG_PX = 96;          // 저장할 곤충 이미지 크기

  // 곤충이 돌아다닐 범위 (지도 좌표). 헤더/탭바 밑으로 숨지 않도록 여백.
  const bounds = {
    minX: 30,
    maxX: map.size.width - 30,
    minY: map.screenOrigin.y + 175,
    maxY: Math.min(map.size.height, map.screenOrigin.y + 852) - 170,
  };

  // =======================================================
  // 서식지: 곤충 움직임
  // =======================================================
  const bugs = [];

  function addBug({ src, x, y, ...info }, { isNew = false } = {}) {
    const el = document.createElement('button');
    el.className = 'mh-bug' + (isNew ? ' is-new' : '');
    el.setAttribute('aria-label', info.name ? `내 피코: ${info.name}` : '내 피코');
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.draggable = false;
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
        date: info.date || new Date().toISOString(),
      },
      paused: false,
      x: clamp(x, bounds.minX, bounds.maxX),
      y: clamp(y, bounds.minY, bounds.maxY),
      vx: dir * (0.25 + Math.random() * 0.35),
      vy: (Math.random() - 0.5) * 0.2,
      turnT: 0,
      nextTurn: 120 + Math.random() * 160,
      scurry: 0,
      flipped: null,
    };
    bugs.push(bug);
    el.addEventListener('click', () => select(bug));
    place(bug);
    return bug;
  }

  // 피코를 누르면: 멈춰서 톡 튀고, 정보 카드에 알림
  let selected = null;
  function select(bug) {
    // 카드가 이전 선택을 먼저 정리하도록 이벤트를 먼저 보냄
    document.dispatchEvent(new CustomEvent('pico:select', {
      detail: { src: bug.src, ...bug.info, release: () => deselect(bug) },
    }));
    if (selected && selected !== bug) deselect(selected);
    selected = bug;
    bug.paused = true;
    bug.el.classList.add('is-selected');
    burstDust(bug.x, bug.y);
    beep();
  }

  function deselect(bug) {
    bug.paused = false;
    bug.el.classList.remove('is-selected');
    if (selected === bug) selected = null;
  }

  function burstDust(x, y) {
    const inv = 1 / map.scale;
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('span');
      d.className = 'mh-dust';
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      layer.appendChild(d);
      const a = Math.random() * Math.PI * 2;
      const dist = (14 + Math.random() * 22) * inv;
      d.animate(
        [
          { transform: `translate(0,0) scale(${inv})`, opacity: 0.9 },
          { transform: `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist - 10 * inv}px) scale(${inv})`, opacity: 0 },
        ],
        { duration: 650 + Math.random() * 300, easing: 'ease-out' }
      ).onfinish = () => d.remove();
    }
  }

  let audioCtx;
  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(520, audioCtx.currentTime);
      o.frequency.exponentialRampToValueAtTime(260, audioCtx.currentTime + 0.15);
      g.gain.setValueAtTime(0.05, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.18);
    } catch (e) { /* 소리 없이 진행 */ }
  }

  function place(bug) {
    bug.el.style.translate = `${bug.x}px ${bug.y}px`;
    const flip = bug.vx < 0;
    if (flip !== bug.flipped) {
      bug.flipped = flip;
      bug.img.style.transform = flip ? 'scaleX(-1)' : '';
    }
  }

  function tick() {
    for (const b of bugs) {
      if (b.paused) continue;
      const speed = b.scurry > 0 ? 2.6 : 1;
      b.x += b.vx * speed;
      b.y += b.vy * speed;
      if (b.scurry > 0) b.scurry--;

      if (++b.turnT > b.nextTurn) {
        b.turnT = 0;
        b.nextTurn = 120 + Math.random() * 160;
        if (Math.random() < 0.5) b.vx *= -1;
        b.vy = (Math.random() - 0.5) * 0.3;
        if (Math.abs(b.vx) > 0.6) b.vx = Math.sign(b.vx) * (0.25 + Math.random() * 0.35);
      }

      if (b.x < bounds.minX) { b.x = bounds.minX; b.vx = Math.abs(b.vx); }
      if (b.x > bounds.maxX) { b.x = bounds.maxX; b.vx = -Math.abs(b.vx); }
      if (b.y < bounds.minY) { b.y = bounds.minY; b.vy = Math.abs(b.vy); }
      if (b.y > bounds.maxY) { b.y = bounds.maxY; b.vy = -Math.abs(b.vy); }
      place(b);
    }
    requestAnimationFrame(tick);
  }

  // ---------- 저장 (이 기기 브라우저에만) ----------
  function save() {
    try {
      const data = bugs.map((b) => ({ src: b.src, x: Math.round(b.x), y: Math.round(b.y), ...b.info }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* 저장 불가 환경이면 그냥 넘어감 */ }
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(data)) data.slice(-MAX_BUGS).forEach((b) => b && b.src && addBug(b));
    } catch (e) { /* 무시 */ }
  }

  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  // =======================================================
  // 그리기 루트 → 들판으로 놓아주기
  // =======================================================
  const PENDING_KEY = 'pico.habitat.pending';

  function release(src, info = {}, { focus = true } = {}) {
    if (!src) return null;
    // 지금 보고 있는 화면 가운데 근처에 풀어주기
    const vp = map.viewport.getBoundingClientRect();
    const c = map.screenToWorld(vp.width / 2, vp.height / 2 + 60);
    const bug = addBug(
      { ...info, src, x: c.x + (Math.random() - 0.5) * 60, y: c.y + (Math.random() - 0.5) * 40 },
      { isNew: true }
    );
    while (bugs.length > MAX_BUGS) bugs.shift().el.remove();
    save();
    if (focus) {
      setTimeout(() => {
        map.focus(bug.x, bug.y);
        burstDust(bug.x, bug.y);
      }, 250);
    }
    return bug;
  }

  // 다른 페이지(그리기 루트)에서 넘겨준 피코 받기
  function takePending() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
      localStorage.removeItem(PENDING_KEY);
    } catch (e) { return; }
    if (!Array.isArray(list)) return;
    list.forEach((item, i) => {
      const data = typeof item === 'string' ? { src: item } : item || {};
      const { src, ...info } = data;
      if (src) setTimeout(() => release(src, info, { focus: i === list.length - 1 }), 300 + i * 250);
    });
  }

  window.PicoHabitat = {
    release,
    deselectAll() { if (selected) deselect(selected); },
    count: () => bugs.length,
    clear() {
      bugs.splice(0).forEach((b) => b.el.remove());
      save();
    },
  };

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  load();
  takePending();
  requestAnimationFrame(tick);
})();
