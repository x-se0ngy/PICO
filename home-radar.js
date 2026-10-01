/* =========================================================
   PICO · Nearby Radar (주변 생태 신호)
   포켓몬GO처럼 생물 아이콘을 지도에 박는 대신,
   종이 들판 위에 파동이 퍼지면서 '관찰할 만한 곳의 신호'만 보여줘요.
   - 처음부터 종 이름은 알려주지 않아요 → "뭐가 있지?"
   - 신호를 누르면 방향 · 거리 · 관찰 힌트 → '찾으러 가기'(카메라)
   - 탐험을 마친 신호는 표지판 아이콘 대신 내가 그린 그림으로 바뀌어요.
   ========================================================= */
(() => {
  const data = window.PicoData || { signals: [] };
  const field = window.PicoField;
  const phone = document.getElementById('screen-home');
  const radar = document.getElementById('radar');
  const rings = document.getElementById('radar-rings');
  const list = document.getElementById('radar-signals');
  const me = document.getElementById('radar-me');
  const caption = document.getElementById('radar-caption');
  const btn = document.getElementById('radar-btn');
  const badge = document.getElementById('radar-badge');
  const toast = document.getElementById('radar-toast');
  if (!field || !radar || !btn) return;

  const NS = 'http://www.w3.org/2000/svg';
  const CX = field.me.x;
  const CY = field.me.y;
  const RANGE = 300;          // 레이더 가장 바깥 원 = 300m
  const R = 168;              // 그 원의 화면 반지름(px)
  const toPx = (m) => (m / RANGE) * R;
  const TARGET_KEY = 'pico.radar.target';

  // ---------- 방향 · 걸음 ----------
  const DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  const dirName = (deg) => `${DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]}쪽`;
  const walkMin = (m) => Math.max(1, Math.round(m / 67));   // 어린이 걸음 ≈ 분당 67m

  const explored = (s) => (window.PicoHabitat?.foundIn(s.id) || []);
  const fresh = () => data.signals.filter((s) => !explored(s).length);

  // ---------- 원과 파동 그리기 ----------
  function drawRings() {
    rings.replaceChildren();
    const g = document.createElementNS(NS, 'g');
    [100, 200, 300].forEach((m) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', CX);
      c.setAttribute('cy', CY);
      c.setAttribute('r', toPx(m));
      c.setAttribute('class', 'pr-ring');
      g.appendChild(c);
      const t = document.createElementNS(NS, 'text');
      // 거리 라벨은 오른쪽(동쪽) 원 위에
      t.setAttribute('x', CX + toPx(m) - 3);
      t.setAttribute('y', CY - 4);
      t.setAttribute('text-anchor', 'end');
      t.setAttribute('class', 'pr-ring-label');
      t.textContent = `${m}m`;
      g.appendChild(t);
    });
    // 북쪽 표시
    const n = document.createElementNS(NS, 'text');
    n.setAttribute('x', CX);
    n.setAttribute('y', CY - R - 8);
    n.setAttribute('class', 'pr-north');
    n.setAttribute('text-anchor', 'middle');
    n.textContent = 'N';
    g.appendChild(n);
    rings.appendChild(g);

    // 퍼지는 파동 (3겹)
    for (let i = 0; i < 3; i++) {
      const w = document.createElementNS(NS, 'circle');
      w.setAttribute('cx', CX);
      w.setAttribute('cy', CY);
      w.setAttribute('r', R);
      w.setAttribute('class', 'pr-wave');
      w.style.animationDelay = `${i * 0.9}s`;
      rings.appendChild(w);
    }
    me.style.left = `${CX}px`;
    me.style.top = `${CY}px`;
  }

  // ---------- 신호 표시 ----------
  function drawSignals() {
    list.replaceChildren();
    data.signals.forEach((s, i) => {
      const r = toPx(s.distance);
      const a = (s.bearing * Math.PI) / 180;
      const x = CX + Math.sin(a) * r;
      const y = CY - Math.cos(a) * r;
      const found = explored(s);

      const li = document.createElement('li');
      li.className = 'pr-signal' + (found.length ? ' is-explored' : '') + (s.isNew && !found.length ? ' is-new' : '');
      li.style.left = `${x}px`;
      li.style.top = `${y}px`;
      // 파동이 그 거리에 닿을 때 나타나기
      li.style.animationDelay = `${0.15 + (r / R) * 0.75 + i * 0.05}s`;

      const b = document.createElement('button');
      b.className = 'pr-signal-btn';
      b.setAttribute('aria-label', `${s.label}, ${s.distance}미터, ${dirName(s.bearing)}${found.length ? ', 탐험 완료' : ''}`);
      const mark = document.createElement('span');
      mark.className = 'pr-signal-mark';
      if (found.length) {
        const img = document.createElement('img');
        img.src = found[found.length - 1].src;
        img.alt = '';
        mark.appendChild(img);
      } else {
        mark.innerHTML = '<span class="pi pi-presentation" style="--pi-size:22px" aria-hidden="true"></span>';
      }
      const label = document.createElement('span');
      label.className = 'pr-signal-label';
      label.textContent = `${s.label} · ${s.distance}m`;
      // 화면 밖으로 넘치지 않게 라벨 위치 조정
      if (x > 300) label.classList.add('is-left');
      else if (x < 93) label.classList.add('is-right');
      // 내 위치보다 위쪽 신호는 라벨을 위에 (가운데 내 위치 점을 가리지 않게)
      if (y < CY) label.classList.add('is-above');
      b.append(mark, label);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        select(li, s);
      });
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  let selectedLi = null;
  function select(li, s) {
    if (selectedLi) selectedLi.classList.remove('is-selected');
    selectedLi = li;
    li.classList.add('is-selected');
    document.dispatchEvent(new CustomEvent('pico:signal', {
      detail: {
        ...s,
        direction: dirName(s.bearing),
        walk: walkMin(s.distance),
        found: explored(s),
        release: () => { li.classList.remove('is-selected'); if (selectedLi === li) selectedLi = null; },
      },
    }));
  }

  // ---------- 열기 / 닫기 ----------
  let open = false;
  function setOpen(next) {
    if (next === open) return;
    open = next;
    btn.setAttribute('aria-pressed', String(open));
    btn.classList.toggle('is-on', open);
    phone.classList.toggle('radar-on', open);
    hideToast();
    if (open) {
      drawRings();
      drawSignals();
      const n = fresh().length;
      caption.textContent = n ? `주변에서 ${n}개의 생태 신호를 찾았어요` : '주변 신호를 모두 탐험했어요!';
      radar.hidden = false;
      void radar.offsetWidth;
      radar.classList.add('is-open');
      updateBadge(true);
      ping();
    } else {
      radar.classList.remove('is-open');
      document.dispatchEvent(new CustomEvent('pico:radar-close'));
      setTimeout(() => { if (!open) radar.hidden = true; }, 300);
    }
  }

  btn.addEventListener('click', () => setOpen(!open));
  // 레이더가 켜져 있을 때 빈 곳을 누르면 닫기 (카드가 먼저 닫히고, 한 번 더 누르면 레이더도)
  radar.addEventListener('click', (e) => {
    if (e.target.closest('.pr-signal')) return;
    if (document.getElementById('info-card')?.classList.contains('is-open')) return;
    setOpen(false);
  });

  // '찾으러 가기' → 어떤 신호를 따라갔는지 기억 (돌아온 피코에 연결)
  document.addEventListener('pico:go', (e) => {
    try { localStorage.setItem(TARGET_KEY, e.detail.id); } catch (err) { /* 무시 */ }
  });

  // ---------- 알림 (화면 가장자리 파동 + 토스트) ----------
  function updateBadge(seen) {
    const n = fresh().length;
    badge.textContent = n ? String(n) : '';
    btn.classList.toggle('has-signal', n > 0 && !seen);
    btn.classList.toggle('has-count', n > 0);
  }

  let toastTimer = null;
  function showToast() {
    if (open || !fresh().length) return;
    toast.hidden = false;
    void toast.offsetWidth;
    toast.classList.add('is-in');
    ping(0.03);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5200);
  }
  function hideToast() {
    clearTimeout(toastTimer);
    if (toast.hidden) return;
    toast.classList.remove('is-in');
    setTimeout(() => { if (!toast.classList.contains('is-in')) toast.hidden = true; }, 300);
  }
  toast.addEventListener('click', () => setOpen(true));

  // 소나 같은 작은 소리
  let ctx;
  function ping(vol = 0.045) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.16].forEach((t, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(i ? 1180 : 880, ctx.currentTime + t);
        g.gain.setValueAtTime(vol, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.36);
      });
    } catch (e) { /* 소리 없이 */ }
  }

  // 새 친구가 도착하면 신호 상태 갱신 (탐험 완료 → 그림으로 바뀜)
  document.addEventListener('pico:arrived', () => {
    updateBadge(true);
    if (open) drawSignals();
  });

  updateBadge(false);

  // 도착 모션이 있으면 끝난 뒤, 아니면 잠시 후 알림
  Promise.resolve(window.PicoHabitat?.ready).then((arrived) => {
    setTimeout(showToast, arrived ? 3600 : 1600);
  });

  window.PicoRadar = { open: () => setOpen(true), close: () => setOpen(false), get isOpen() { return open; } };
})();
