/* =========================================================
   PICO · 홈 정보 카드
   - 레이더 신호를 누르면 → 방향 · 거리 · 관찰 힌트 (종 이름은 비밀) + 찾으러 가기
   - 돌아다니는 피코를 누르면 → 내가 그린 친구 정보
   ========================================================= */
(() => {
  const data = window.PicoData || { insects: {} };
  const phone = document.getElementById('screen-home');
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
    go: document.getElementById('info-go'),
    close: document.getElementById('info-close'),
  };

  let current = null;       // { type, release? }

  const LENS = {
    LOOK: 'LOOK · 생김새를 자세히 봤어요',
    MOVE: 'MOVE · 움직이는 모습을 봤어요',
    PLACE: 'PLACE · 사는 곳을 살펴봤어요',
    BEHAVIOR: 'BEHAVIOR · 하는 행동을 지켜봤어요',
  };

  // ---------- 공통 ----------
  function reset() {
    if (current?.release) current.release();
    el.thumb.replaceChildren();
    el.chips.replaceChildren();
    el.more.replaceChildren();
    el.go.hidden = true;
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

  // 받침 있으면 '을', 없으면 '를'
  function eul(word) {
    const c = word.charCodeAt(word.length - 1);
    if (c < 0xac00 || c > 0xd7a3) return '을(를)';
    return (c - 0xac00) % 28 ? '을' : '를';
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}월 ${d.getDate()}일 발견`;
  }

  // ---------- 생태 신호 카드 ----------
  function openSignal(s) {
    reset();
    current = { type: 'signal', release: s.release };
    const found = s.found || [];

    el.thumb.className = 'mh-card-thumb mh-card-thumb--signal';
    if (found.length) {
      const img = document.createElement('img');
      img.src = found[found.length - 1].src;
      img.alt = '';
      el.thumb.appendChild(img);
    } else {
      el.thumb.innerHTML = '<span class="pi pi-presentation" style="--pi-size:30px" aria-hidden="true"></span>';
    }

    el.eyebrow.textContent = found.length ? '탐험한 신호' : (s.isNew ? '새로운 신호' : '생태 신호');
    el.title.textContent = s.label;
    el.meta.textContent = `${s.distance}m · ${s.direction} · 걸어서 약 ${s.walk}분`;

    if (found.length) {
      const names = [...new Set(found.map((f) => f.name).filter(Boolean))];
      el.text.textContent = names.length
        ? `여기서 ${names.join(', ')}${eul(names[names.length - 1])} 만났어요! 또 다른 친구가 있을지도 몰라요.`
        : '여기서 만난 친구가 들판에 살고 있어요.';
      chip('탐험 완료', 'found');
    } else {
      el.text.textContent = s.hint;
    }
    (s.clues || []).forEach((c) => chip(c));

    row('어떤 친구일까?', s.guess);
    row('관찰 팁', s.tip);

    el.go.hidden = false;
    el.go.textContent = found.length ? '다시 찾으러 가기' : '찾으러 가기';
    el.go.onclick = () => {
      document.dispatchEvent(new CustomEvent('pico:go', { detail: { id: s.id } }));
    };
    show();
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
    el.eyebrow.textContent = bug.sample ? '예시 피코' : '내 피코';
    el.title.textContent = name;

    if (bug.sample) {
      el.meta.textContent = '아이가 그린 그림 예시';
      el.text.textContent = '관찰하고 직접 그린 친구는 이렇게 들판에서 살아 움직여요. 레이더로 주변 신호를 찾아볼까요?';
    } else {
      const signal = (window.PicoData?.signals || []).find((s) => s.id === bug.signal);
      el.meta.textContent = [signal?.label || bug.place, formatDate(bug.date)].filter(Boolean).join(' · ');
      el.text.textContent = bug.note ? `“${bug.note}”` : '내가 발견하고 그린 피코예요. 톡 건드리면 멈춰서 인사해요.';
    }

    if (bug.lens) chip(bug.lens, 'lens');
    if (info && !bug.sample) chip('도감에 있어요', 'found');

    row('어떤 친구일까?', info ? info.facts : '아직 도감 정보가 없어요. 이름을 붙여주면 알려줄게요!');
    if (bug.lens) row('관찰 렌즈', LENS[bug.lens] || bug.lens);

    show();
  }

  // ---------- 이벤트 ----------
  document.addEventListener('pico:signal', (e) => openSignal(e.detail));
  document.addEventListener('pico:select', (e) => openBug(e.detail));
  document.addEventListener('pico:radar-close', hide);
  document.addEventListener('pico:arriving', hide);

  el.toggle.addEventListener('click', () => setExpanded(el.more.hidden));
  el.close.addEventListener('click', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

  // 빈 들판 / 레이더 빈 곳을 탭하면 카드 닫기
  document.getElementById('field')?.addEventListener('click', (e) => {
    if (e.target.closest('.mh-bug')) return;
    hide();
  });
  document.getElementById('radar')?.addEventListener('click', (e) => {
    if (e.target.closest('.pr-signal')) return;
    if (card.classList.contains('is-open')) { e.stopImmediatePropagation(); hide(); }
  }, true);
})();
