/* =========================================================
   PICO · 홈 지도 정보 카드
   - 마커(핀·깃발·달팽이 뱃지)를 누르면 → 발견할 수 있는 곳 정보
   - 돌아다니는 피코를 누르면 → 곤충 정보 + 자세히 보기
   ========================================================= */
(() => {
  const data = window.PicoData || { places: {}, insects: {} };
  const map = window.PicoMap;
  const phone = document.getElementById('screen-home-map');
  const card = document.getElementById('info-card');
  if (!card || !phone) return;

  const el = {
    thumb: document.getElementById('info-thumb'),
    eyebrow: document.getElementById('info-eyebrow'),
    title: document.getElementById('info-title'),
    meta: document.getElementById('info-meta'),
    text: document.getElementById('info-text'),
    chips: document.getElementById('info-chips'),
    more: document.getElementById('info-more'),
    toggle: document.getElementById('info-toggle'),
    close: document.getElementById('info-close'),
  };

  let current = null;       // { type, release?, marker? }

  const LENS = {
    LOOK: 'LOOK · 생김새를 자세히 봤어요',
    MOVE: 'MOVE · 움직이는 모습을 봤어요',
    PLACE: 'PLACE · 사는 곳을 살펴봤어요',
    BEHAVIOR: 'BEHAVIOR · 하는 행동을 지켜봤어요',
  };

  // ---------- 공통 ----------
  function reset() {
    if (current?.release) current.release();
    if (current?.marker) current.marker.classList.remove('is-selected');
    el.thumb.replaceChildren();
    el.chips.replaceChildren();
    el.more.replaceChildren();
    setExpanded(false);
  }

  function setExpanded(open) {
    el.more.hidden = !open;
    el.toggle.setAttribute('aria-expanded', String(open));
    el.toggle.textContent = open ? '간단히 보기' : '자세히 보기';
    card.classList.toggle('is-expanded', open);
  }

  function show() {
    card.hidden = false;
    phone.classList.add('has-card');
    // 다음 프레임에 등장 애니메이션
    requestAnimationFrame(() => card.classList.add('is-open'));
  }

  function hide() {
    if (card.hidden) return;
    reset();
    current = null;
    card.classList.remove('is-open');
    phone.classList.remove('has-card');
    setTimeout(() => { if (!card.classList.contains('is-open')) card.hidden = true; }, 220);
  }

  function chip(text, variant) {
    const li = document.createElement('li');
    li.className = 'mh-chip' + (variant ? ` mh-chip--${variant}` : '');
    li.textContent = text;
    el.chips.appendChild(li);
  }

  function row(label, value) {
    if (!value) return;
    const wrap = document.createElement('div');
    wrap.className = 'mh-more-row';
    const dt = document.createElement('p');
    dt.className = 'mh-more-label';
    dt.textContent = label;
    const dd = document.createElement('p');
    dd.className = 'mh-more-value';
    dd.textContent = value;
    wrap.append(dt, dd);
    el.more.appendChild(wrap);
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}월 ${d.getDate()}일 발견`;
  }

  // ---------- 장소 카드 ----------
  function openPlace(id, marker) {
    const place = data.places[id];
    if (!place) return;
    reset();
    current = { type: 'place', marker };
    marker?.classList.add('is-selected');

    const visited = place.kind === 'visited';
    const icon = document.createElement('img');
    icon.src = visited ? 'assets/home-map/flag.svg' : 'assets/home-map/pin.svg';
    icon.alt = '';
    el.thumb.className = 'mh-card-thumb mh-card-thumb--place';
    el.thumb.appendChild(icon);

    el.eyebrow.textContent = visited ? '탐험한 곳' : '발견할 수 있는 곳';
    el.title.textContent = place.name;
    el.meta.textContent = [place.distance, place.habitat].filter(Boolean).join(' · ');
    el.text.textContent = place.summary || '';

    const found = new Set(place.found || []);
    (place.insects || []).forEach((name) => chip(name, found.has(name) ? 'found' : ''));

    row('만나기 좋은 때', place.bestTime);
    row('탐험 팁', place.tip);
    if (visited) {
      row('내가 발견한 친구', found.size ? [...found].join(', ') : '아직 없어요. 다시 가볼까요?');
    }

    show();
    focusMarker(marker);
  }

  // 카드에 가려지지 않게 마커를 화면 위쪽으로
  function focusMarker(marker) {
    if (!map || !marker) return;
    const vp = map.viewport.getBoundingClientRect();
    const r = marker.getBoundingClientRect();
    const sx = r.left + r.width / 2 - vp.left;
    const sy = r.top + r.height / 2 - vp.top;
    const cardTop = vp.height - card.offsetHeight - 128;
    if (sy < cardTop - 40) return;            // 이미 잘 보이면 그대로
    const w = map.screenToWorld(sx, sy);
    const targetY = vp.height / 2 + (sy - cardTop + 80);
    map.focus(w.x, w.y + (targetY - vp.height / 2) / map.scale);
  }

  // ---------- 피코(곤충) 카드 ----------
  function openBug(bug) {
    reset();
    current = { type: 'bug', release: bug.release };

    const img = document.createElement('img');
    img.src = bug.src;
    img.alt = '';
    el.thumb.className = 'mh-card-thumb mh-card-thumb--bug';
    el.thumb.appendChild(img);

    const name = bug.name || '이름 없는 피코';
    const info = data.insects[bug.name];
    el.eyebrow.textContent = '내 피코';
    el.title.textContent = name;
    el.meta.textContent = [bug.place, formatDate(bug.date)].filter(Boolean).join(' · ');
    el.text.textContent = bug.note ? `“${bug.note}”` : '내가 발견하고 그린 피코예요. 톡 건드리면 멈춰서 인사해요.';

    if (bug.lens) chip(bug.lens, 'lens');
    if (info) chip('도감에 있어요', 'found');

    row('어떤 친구일까?', info ? info.facts : '아직 도감 정보가 없어요. 이름을 붙여주면 알려줄게요!');
    if (bug.lens) row('관찰 렌즈', LENS[bug.lens] || bug.lens);

    show();
  }

  // ---------- 이벤트 ----------
  document.querySelectorAll('[data-place]').forEach((marker) => {
    marker.addEventListener('click', () => openPlace(marker.dataset.place, marker));
  });

  document.addEventListener('pico:select', (e) => openBug(e.detail));

  el.toggle.addEventListener('click', () => setExpanded(el.more.hidden));
  el.close.addEventListener('click', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

  // 지도 빈 곳을 탭하면 닫기 (드래그 후 손 뗀 건 home-map.js 가 클릭을 막아줌)
  map?.viewport.addEventListener('click', (e) => {
    if (e.target.closest('[data-place], .mh-bug')) return;
    hide();
  });
})();
