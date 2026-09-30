/* =========================================================
   PICO · 홈 지도 — 드래그 이동, 관성, 핀치/휠 확대
   ========================================================= */
(() => {
  const viewport = document.getElementById('map-viewport');
  const world = document.getElementById('map-world');
  if (!viewport || !world) return;

  // 지도 이미지 크기(CSS px)와, Figma 화면(393x852)이 지도 위 어디에 있는지
  const MAP_W = Number(world.dataset.mapWidth) || 393;
  const MAP_H = Number(world.dataset.mapHeight) || 852;
  const SCREEN_X = Number(world.dataset.screenX) || 0;
  const SCREEN_Y = Number(world.dataset.screenY) || 0;

  world.style.width = `${MAP_W}px`;
  world.style.height = `${MAP_H}px`;
  const overlays = world.querySelector('.mh-overlays');
  if (overlays) {
    overlays.style.left = `${SCREEN_X}px`;
    overlays.style.top = `${SCREEN_Y}px`;
  }
  const MAX_SCALE = 2.5;
  const DRAG_THRESHOLD = 5;   // 이만큼 움직여야 드래그로 판단 (핀 탭과 구분)
  const FRICTION = 0.92;      // 관성 감속

  // Figma와 같은 첫 화면 위치
  const state = { x: -SCREEN_X, y: -SCREEN_Y, scale: 1 };

  const viewSize = () => ({ w: viewport.clientWidth, h: viewport.clientHeight });
  const minScale = () => {
    const { w, h } = viewSize();
    return Math.max(w / MAP_W, h / MAP_H); // 지도가 화면을 항상 꽉 채우도록
  };

  function clamp() {
    const { w, h } = viewSize();
    state.scale = Math.min(MAX_SCALE, Math.max(minScale(), state.scale));
    const minX = w - MAP_W * state.scale;
    const minY = h - MAP_H * state.scale;
    state.x = Math.min(0, Math.max(minX, state.x));
    state.y = Math.min(0, Math.max(minY, state.y));
  }

  const zoomInBtn = document.getElementById('map-zoom-in');
  const zoomOutBtn = document.getElementById('map-zoom-out');
  const locateBtn = document.getElementById('map-locate');

  function render() {
    clamp();
    world.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    world.style.setProperty('--mh-inv', (1 / state.scale).toFixed(4));
    // 최대/최소 배율에서 버튼 비활성화
    if (zoomInBtn) zoomInBtn.disabled = state.scale >= MAX_SCALE - 0.001;
    if (zoomOutBtn) zoomOutBtn.disabled = state.scale <= minScale() + 0.001;
  }

  // 부드럽게 목표 위치·배율로 이동
  let animId = null;
  function animateTo(target, duration = 320) {
    if (animId) cancelAnimationFrame(animId);
    const from = { ...state };
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const k = ease(t);
      state.x = from.x + (target.x - from.x) * k;
      state.y = from.y + (target.y - from.y) * k;
      state.scale = from.scale + (target.scale - from.scale) * k;
      render();
      animId = t < 1 ? requestAnimationFrame(step) : null;
    };
    animId = requestAnimationFrame(step);
  }

  // 화면 가운데를 기준으로 확대/축소 (애니메이션)
  function zoomByButton(factor) {
    const { w, h } = viewSize();
    const s = Math.min(MAX_SCALE, Math.max(minScale(), state.scale * factor));
    const cx = w / 2;
    const cy = h / 2;
    animateTo({
      x: cx - ((cx - state.x) / state.scale) * s,
      y: cy - ((cy - state.y) / state.scale) * s,
      scale: s,
    });
  }

  // 화면상의 한 점(px, py)을 고정한 채로 확대/축소
  function zoomAt(px, py, nextScale) {
    const prev = state.scale;
    const s = Math.min(MAX_SCALE, Math.max(minScale(), nextScale));
    state.x = px - ((px - state.x) / prev) * s;
    state.y = py - ((py - state.y) / prev) * s;
    state.scale = s;
    render();
  }

  // ---------- 포인터(마우스·터치) ----------
  const pointers = new Map();
  let dragging = false;
  let moved = false;
  let start = null;          // 드래그 시작 시점 정보
  let pinch = null;          // 핀치 시작 시점 정보
  let velocity = { x: 0, y: 0 };
  let lastMove = null;
  let inertiaId = null;

  const local = (e) => {
    const r = viewport.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function stopInertia() {
    if (inertiaId) cancelAnimationFrame(inertiaId);
    if (animId) cancelAnimationFrame(animId);
    inertiaId = null;
    animId = null;
  }

  function startInertia() {
    const step = () => {
      velocity.x *= FRICTION;
      velocity.y *= FRICTION;
      if (Math.abs(velocity.x) < 0.1 && Math.abs(velocity.y) < 0.1) { inertiaId = null; return; }
      state.x += velocity.x;
      state.y += velocity.y;
      render();
      inertiaId = requestAnimationFrame(step);
    };
    inertiaId = requestAnimationFrame(step);
  }

  function pinchInfo() {
    const [a, b] = [...pointers.values()];
    return {
      dist: Math.hypot(b.x - a.x, b.y - a.y),
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  }

  viewport.addEventListener('pointerdown', (e) => {
    stopInertia();
    pointers.set(e.pointerId, local(e));

    if (pointers.size === 1) {
      const p = local(e);
      start = { px: p.x, py: p.y, x: state.x, y: state.y };
      moved = false;
      lastMove = { x: p.x, y: p.y, t: performance.now() };
      velocity = { x: 0, y: 0 };
    } else if (pointers.size === 2) {
      const info = pinchInfo();
      pinch = { dist: info.dist, scale: state.scale, cx: info.cx, cy: info.cy, x: state.x, y: state.y };
      moved = true;
    }
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, local(e));

    if (pointers.size >= 2 && pinch) {
      const info = pinchInfo();
      const s = Math.min(MAX_SCALE, Math.max(minScale(), pinch.scale * (info.dist / pinch.dist)));
      // 두 손가락 중심을 기준으로 확대 + 중심 이동만큼 패닝
      state.x = info.cx - ((pinch.cx - pinch.x) / pinch.scale) * s;
      state.y = info.cy - ((pinch.cy - pinch.y) / pinch.scale) * s;
      state.scale = s;
      render();
      return;
    }

    if (!start) return;
    const p = local(e);
    const dx = p.x - start.px;
    const dy = p.y - start.py;

    if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragging = true;
      moved = true;
      viewport.classList.add('is-dragging');
      viewport.setPointerCapture(e.pointerId);
    }
    if (!dragging) return;

    state.x = start.x + dx;
    state.y = start.y + dy;
    render();

    const now = performance.now();
    const dt = Math.max(1, now - lastMove.t);
    velocity = { x: ((p.x - lastMove.x) / dt) * 16, y: ((p.y - lastMove.y) / dt) * 16 };
    lastMove = { x: p.x, y: p.y, t: now };
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);

    if (pointers.size === 1) {
      // 핀치 → 한 손가락 드래그로 자연스럽게 이어가기
      const [p] = [...pointers.values()];
      start = { px: p.x, py: p.y, x: state.x, y: state.y };
      lastMove = { x: p.x, y: p.y, t: performance.now() };
      pinch = null;
      return;
    }

    if (pointers.size === 0) {
      if (dragging && performance.now() - lastMove.t < 80) startInertia();
      dragging = false;
      pinch = null;
      start = null;
      viewport.classList.remove('is-dragging');
    }
  }

  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

  // 드래그한 뒤 손을 뗄 때 핀이 눌리지 않도록
  viewport.addEventListener('click', (e) => {
    if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
  }, true);

  // ---------- 마우스 휠 / 트랙패드 확대 ----------
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    stopInertia();
    const p = local(e);
    zoomAt(p.x, p.y, state.scale * Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  // ---------- 더블탭(더블클릭) 확대 ----------
  viewport.addEventListener('dblclick', (e) => {
    const p = local(e);
    const target = state.scale < 1.6 ? state.scale * 1.8 : 1;
    zoomAt(p.x, p.y, target);
  });

  // ---------- 지도 컨트롤 (내 위치 / + / −) ----------
  zoomInBtn?.addEventListener('click', () => zoomByButton(1.5));
  zoomOutBtn?.addEventListener('click', () => zoomByButton(1 / 1.5));
  // 내 위치: 지금은 처음 화면(Figma 기준 위치)으로 돌아가기.
  // 실제 GPS를 붙이면 여기서 내 좌표로 이동하면 됩니다.
  locateBtn?.addEventListener('click', () => {
    stopInertia();
    animateTo({ x: -SCREEN_X, y: -SCREEN_Y, scale: 1 }, 420);
  });

  window.addEventListener('resize', render);
  render();

  // 다른 스크립트(서식지 등)에서 지도를 다룰 수 있게 공개
  window.PicoMap = {
    world,
    viewport,
    size: { width: MAP_W, height: MAP_H },
    screenOrigin: { x: SCREEN_X, y: SCREEN_Y },
    get scale() { return state.scale; },
    // 화면 좌표 → 지도(월드) 좌표
    screenToWorld(px, py) {
      return { x: (px - state.x) / state.scale, y: (py - state.y) / state.scale };
    },
    // 지도 좌표 한 점을 화면 가운데로 부드럽게 이동
    focus(wx, wy, scale = state.scale) {
      const { w, h } = viewSize();
      stopInertia();
      animateTo({ x: w / 2 - wx * scale, y: h / 2 - wy * scale, scale }, 480);
    },
    wasDrag: () => moved,
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
