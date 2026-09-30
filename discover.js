/* =========================================================
   PICO · 발견하기 흐름
   카메라(FIND) → STEP1 생김새 → STEP2 움직임 → STEP3 사는 곳
   → STEP4 느낌 → STEP5 오늘의 발견 → 관찰 완료 → 들판에 놓아주기
   ========================================================= */
(() => {
  // ---------------------------------------------------------
  // 오늘 발견한 곤충 (지금은 호박벌 고정)
  // 나중에 카메라 인식 결과로 이 객체만 바꿔 끼우면 됩니다.
  // ---------------------------------------------------------
  const FIND = {
    name: '호박벌',
    category: '벌·개미류',
    level: '03',
    place: '노란 꽃',
    tip: '‘호박벌’이 노란 꽃 주변에서 머무르고 있어요.',
    // STEP 5 에서 PICO가 정리해 주는 기록 (줄 단위)
    record: [
      '노란 꽃 위에서 꽃꿀을 먹던 호박벌은 몸은 통통한데 날개는',
      '생각보다 작았어요. 그 날개로 꽃 사이를 계속 바쁘게 몸에 난',
      '촘촘한 털에 꽃가루를 묻혀 다른 꽃으로 옮기고 있었어요.',
    ],
  };

  // ---------------------------------------------------------
  // STEP 1~4 (그리기). lens 는 홈 카드의 관찰 렌즈와 연결돼요.
  // ---------------------------------------------------------
  const STEPS = [
    { id: 'step1', label: 'STEP 1', lens: 'LOOK',
      title: '어떻게 생겼지?',
      q: (n) => `‘${n}’을 보고 뭐가 가장 기억에 남았나요?`,
      hint: '눈에 띄는 부분을 선으로 따라 그려보세요.' },
    { id: 'step2', label: 'STEP 2', lens: 'MOVE',
      title: '어떻게 움직였지?',
      q: (n) => `‘${n}’이 어떻게 움직였나요?`,
      hint: '움직인 길을 선으로 그려보세요.' },
    { id: 'step3', label: 'STEP 3', lens: 'PLACE',
      title: '어디서 만났지?',
      q: (n) => `‘${n}’을 어디에서 만났나요?`,
      hint: '주변에 있던 것도 함께 그려보세요.' },
    { id: 'step4', label: 'STEP 4', lens: 'BEHAVIOR',
      title: '어떤 느낌이었지?',
      q: (n) => `‘${n}’을 보며 어떤 느낌이 들었나요?`,
      hint: '기억나는 것을 그림이나 기호로 표현해 보세요.' },
  ];

  const CRAYONS = [
    { key: 'red',    label: '빨강',   color: '#E43B45' },
    { key: 'orange', label: '주황',   color: '#F28A3B' },
    { key: 'yellow', label: '노랑',   color: '#F6D34C' },
    { key: 'green',  label: '연두',   color: '#9BC641' },
    { key: 'teal',   label: '청록',   color: '#3DB8C1' },
    { key: 'blue',   label: '파랑',   color: '#2F6ED8' },
    { key: 'purple', label: '보라',   color: '#6B45B9' },
    { key: 'eraser', label: '지우개', color: null },
  ];

  // 그리기 단계 배경 = 아이가 직접 찍은 사진 (디자인 샘플 사진은 쓰지 않음)
  let captured = null;          // 찍은 사진 (dataURL)

  const root = document.getElementById('discover');
  const template = document.getElementById('draw-template');
  const doneScreen = root.querySelector('[data-screen="done"]');
  const drawings = {};   // step id → canvas

  // =========================================================
  // 화면 전환
  // =========================================================
  const ORDER = ['camera', ...STEPS.map((s) => s.id), 'step5', 'done'];
  let current = 'camera';

  // 같은 배경(사진·종이)을 쓰는 STEP 끼리는 화면을 통째로 바꾸지 않고
  // 글자와 그림만 부드럽게 바뀌게 → 깜빡임 없이 자연스럽게 이어짐
  const PAPER_STEPS = new Set([...STEPS.map((st) => st.id), 'step5']);

  function go(id) {
    const from = root.querySelector(`[data-screen="${current}"]`);
    const to = root.querySelector(`[data-screen="${id}"]`);
    if (!to || from === to) return;
    const seamless = PAPER_STEPS.has(current) && PAPER_STEPS.has(id);

    if (drawings[id] || id === 'step5') stackPrevious(id);
    if (id === 'step5') prepareRecord();
    if (id === 'done') prepareDone();

    if (seamless) {
      from.classList.add('is-instant');
      to.classList.add('is-instant', 'is-entering');
      from.classList.remove('is-active');
      to.classList.add('is-active');
      requestAnimationFrame(() => {
        from.classList.remove('is-instant');
        to.classList.remove('is-instant');
      });
      setTimeout(() => to.classList.remove('is-entering'), 600);
    } else {
      from.classList.remove('is-active');
      to.classList.add('is-active');
    }
    current = id;
    if (id === 'camera') startCamera();
  }

  function prev() {
    const i = ORDER.indexOf(current);
    if (i <= 0) { location.href = 'index.html'; return; }
    go(ORDER[i - 1]);
  }

  // 뒤로가기 (STEP 화면은 나중에 만들어지므로 위임 방식으로)
  root.addEventListener('click', (e) => {
    if (e.target.closest('.dc-back')) prev();
  });

  // =========================================================
  // 0. 카메라 (실제 폰 카메라)
  //  - https(예: Vercel) 또는 localhost 에서만 켜져요.
  //  - 카메라를 못 쓰면 디자인 사진으로 대신 체험할 수 있어요.
  // =========================================================
  document.getElementById('tip-text').textContent = FIND.tip;
  const camScreen = root.querySelector('[data-screen="camera"]');
  const video = document.getElementById('cam-video');
  const camMsg = document.getElementById('cam-msg');
  const flipBtn = document.getElementById('flip-btn');
  let stream = null;
  let facing = 'environment';   // 뒷카메라 먼저

  function showMsg(text) {
    camMsg.textContent = text;
    camMsg.hidden = !text;
  }

  async function startCamera() {
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      showMsg(location.protocol === 'https:' || location.hostname === 'localhost'
        ? '이 브라우저에서는 카메라를 쓸 수 없어요. 셔터를 누르면 앨범이 열려요.'
        : '카메라는 https 주소에서 열어야 켜져요. 셔터를 누르면 앨범이 열려요.');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // 4:3 로 요청 (폰에서는 세로 3:4 로 들어옴) — 억지로 16:9 를 요청하면 확대돼 보여요
        video: { facingMode: { ideal: facing }, width: { ideal: 1440 }, height: { ideal: 1080 }, aspectRatio: { ideal: 4 / 3 } },
        audio: false,
      });
      video.srcObject = stream;
      video.classList.toggle('is-mirrored', facing === 'user');
      await video.play().catch(() => {});
      camScreen.classList.add('is-live');
      showMsg('');
    } catch (err) {
      camScreen.classList.remove('is-live');
      showMsg(err && err.name === 'NotAllowedError'
        ? '카메라 사용을 허락하면 곤충을 직접 찍을 수 있어요. 셔터를 누르면 앨범이 열려요.'
        : '카메라를 켤 수 없어요. 셔터를 누르면 앨범이 열려요.');
    }
  }

  function stopCamera() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
    camScreen.classList.remove('is-live');
  }

  // 카메라에 보이는 그대로(자르지 않고) 저장
  function grabFrame() {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;
    const scale = Math.min(1, 1440 / Math.max(vw, vh));
    const outW = Math.round(vw * scale);
    const outH = Math.round(vh * scale);
    const c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext('2d');
    if (facing === 'user') { ctx.translate(outW, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, outW, outH);
    return c.toDataURL('image/jpeg', 0.88);
  }

  function usePhoto(dataUrl) {
    captured = dataUrl;
    root.querySelectorAll('.dc-draw .dc-photo').forEach((img) => { img.src = dataUrl; });
    document.getElementById('photo5').src = dataUrl;
    document.getElementById('gallery-thumb').src = dataUrl;
  }

  // 카메라가 막 켜져서 아직 화면이 안 들어왔으면 잠깐 기다렸다 찍기
  async function grabFrameWhenReady() {
    for (let i = 0; i < 20; i++) {
      const shot = grabFrame();
      if (shot) return shot;
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  }

  function snap(dataUrl) {
    if (!dataUrl) return;
    usePhoto(dataUrl);
    stopCamera();
    go('step1');
  }

  const galleryInput = document.getElementById('gallery-input');
  document.getElementById('shutter').addEventListener('click', async () => {
    if (stream) {
      const shot = await grabFrameWhenReady();
      if (shot) { snap(shot); return; }
    }
    // 카메라를 못 쓰면 앨범에서 사진을 고르게
    showMsg('카메라가 켜지지 않았어요. 앨범에서 사진을 골라주세요.');
    galleryInput.click();
  });

  flipBtn.addEventListener('click', () => {
    facing = facing === 'environment' ? 'user' : 'environment';
    flipBtn.classList.toggle('is-turning');
    startCamera();
  });

  // 앨범에서 사진 고르기
  document.getElementById('gallery-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // 너무 큰 사진은 줄여서 사용
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 1080 / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        snap(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // 다른 앱으로 갔다 오면 카메라 다시 켜기 / 끄기
  document.addEventListener('visibilitychange', () => {
    if (current !== 'camera') return;
    if (document.hidden) stopCamera(); else startCamera();
  });

  // =========================================================
  // STEP 1~4 화면 만들기
  // =========================================================
  const step5 = root.querySelector('[data-screen="step5"]');

  STEPS.forEach((step, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.screen = step.id;
    node.setAttribute('aria-label', `${step.label} ${step.title}`);
    node.querySelector('.dc-photo').classList.add('is-capture');
    node.querySelector('.dc-paper-top').src = 'assets/discover/paper-top.png';
    node.querySelector('.dc-bottom-bg').src = 'assets/discover/paper-bottom-dark.png';

    node.querySelector('.dc-step-badge').textContent = step.label;
    node.querySelector('.dc-step-title').textContent = step.title;
    node.querySelector('.dc-step-q').textContent = step.q(FIND.name);
    node.querySelector('.dc-step-hint').textContent = step.hint;

    root.insertBefore(node, step5);
    setupDrawing(node, step, index);
  });

  // =========================================================
  // 그리기
  // =========================================================
  function setupDrawing(screen, step, index) {
    const canvas = screen.querySelector('.dc-now');
    const ctx = canvas.getContext('2d');
    const next = screen.querySelector('.dc-next');
    const crayonBox = screen.querySelector('.dc-crayons');
    drawings[step.id] = canvas;

    // 처음 안내 말풍선
    const bubble = document.createElement('div');
    bubble.className = 'dc-hint-bubble';
    bubble.textContent = '크레파스를 고르고 사진 위에 그려봐요';
    if (index === 0) screen.appendChild(bubble);   // 안내는 STEP 1 에서만

    // 크레파스
    let tool = CRAYONS[0];
    const widths = [39, 39, 43, 42, 41, 43, 42, 60];
    CRAYONS.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'dc-crayon';
      b.style.width = `${widths[i]}px`;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', c.label);
      b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
      const img = document.createElement('img');
      img.src = `assets/discover/crayon-${c.key}.png`;
      img.alt = '';
      b.appendChild(img);
      b.addEventListener('click', () => {
        tool = c;
        crayonBox.querySelectorAll('.dc-crayon').forEach((x) => x.setAttribute('aria-checked', 'false'));
        b.setAttribute('aria-checked', 'true');
      });
      crayonBox.appendChild(b);
    });

    // 캔버스는 2배 해상도 (393x500 → 786x1000)
    const scale = () => canvas.width / canvas.getBoundingClientRect().width;
    let drawing = false;
    let last = null;
    let hasInk = false;

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      const s = scale();
      return { x: (e.clientX - r.left) * s, y: (e.clientY - r.top) * s };
    };

    function stroke(a, b) {
      ctx.save();
      if (tool.color) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = tool.color;
        ctx.lineWidth = 12;
        ctx.globalAlpha = 0.92;
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 44;
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      // 크레파스 질감: 가장자리에 작은 알갱이
      if (tool.color) {
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const n = Math.min(6, Math.ceil(d / 6));
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = tool.color;
        for (let i = 0; i < n; i++) {
          const t = Math.random();
          const px = a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 16;
          const py = a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 16;
          ctx.fillRect(px, py, 2, 2);
        }
      }
      ctx.restore();
    }

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing = true;
      last = pos(e);
      stroke(last, { x: last.x + 0.1, y: last.y });
      bubble.classList.add('is-hidden');
      if (tool.color) setInk(true);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      stroke(last, p);
      last = p;
    });
    const end = () => {
      if (!drawing) return;
      drawing = false;
      if (!tool.color) setInk(!isBlank(canvas));
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    function setInk(v) {
      hasInk = v;
      next.disabled = !v;
      next.classList.toggle('is-ready', v);
    }

    next.addEventListener('click', () => {
      if (!hasInk) return;
      go(ORDER[ORDER.indexOf(step.id) + 1]);
    });
  }

  // 앞 단계 그림들을 겹쳐서 보여주기 (STEP 5 는 1~4 전부)
  function stackPrevious(id) {
    const ids = STEPS.map((st) => st.id);
    const upTo = id === 'step5' ? ids.length : ids.indexOf(id);
    const target = id === 'step5'
      ? document.getElementById('all-drawing')
      : root.querySelector(`[data-screen="${id}"] .dc-prev`);
    const ctx = target.getContext('2d');
    ctx.clearRect(0, 0, target.width, target.height);
    ids.slice(0, upTo).forEach((sid) => ctx.drawImage(drawings[sid], 0, 0));
  }

  // 찍은 사진 + STEP 1~4 그림을, 그릴 때 보던 모습 그대로 한 장으로
  //  (그림판 = 화면 y 200~700 영역, 사진 = y 236 부터 393x525 칸에 꽉 차게)
  function photoWithDrawing() {
    return new Promise((resolve) => {
      const drawing = combinedDrawing();
      const W = drawing.width;               // 786 (2배)
      const H = drawing.height;              // 1000
      const k = W / 393;
      const out = document.createElement('canvas');
      out.width = W;
      out.height = H;
      const ctx = out.getContext('2d');
      const done = () => {
        ctx.drawImage(drawing, 0, 0);
        resolve(out.toDataURL('image/jpeg', 0.9));
      };
      if (!captured) { ctx.fillStyle = '#F4EDDD'; ctx.fillRect(0, 0, W, H); done(); return; }
      const img = new Image();
      img.onload = () => {
        // 사진 칸(393x525, 그림판 기준 y=36)에 object-fit: cover
        const bx = 0, by = 36 * k, bw = 393 * k, bh = 525 * k;
        const s = Math.max(bw / img.width, bh / img.height);
        const dw = img.width * s, dh = img.height * s;
        ctx.drawImage(img, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
        // 그림판 윗부분(사진 없는 곳)은 종이색
        ctx.fillStyle = '#F4EDDD';
        ctx.fillRect(0, 0, W, by);
        done();
      };
      img.src = captured;
    });
  }

  // STEP 1~4 그림을 한 장으로 합치기
  function combinedDrawing() {
    const c = document.createElement('canvas');
    const first = drawings[STEPS[0].id];
    c.width = first.width;
    c.height = first.height;
    const ctx = c.getContext('2d');
    STEPS.forEach((st) => ctx.drawImage(drawings[st.id], 0, 0));
    return c;
  }

  function isBlank(canvas) {
    const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < d.length; i += 16) if (d[i] !== 0) return false;
    return true;
  }

  startCamera();

  // =========================================================
  // STEP 5 오늘의 발견
  // =========================================================
  const myLine = document.getElementById('my-line');
  function prepareRecord() {
    document.getElementById('record-q').textContent = `오늘 만난 ${FIND.name}, PICO는 어떻게 봤을까요?`;
    const box = document.getElementById('record-lines');
    if (box.childElementCount) return;
    FIND.record.forEach((line) => {
      const p = document.createElement('p');
      p.className = 'dc-note-line';
      p.textContent = line;
      const rule = document.createElement('span');
      rule.className = 'dc-note-rule';
      box.append(p, rule);
    });
  }
  myLine.addEventListener('keydown', (e) => { if (e.key === 'Enter') myLine.blur(); });
  document.getElementById('record-next').addEventListener('click', () => go('done'));

  // =========================================================
  // 관찰 완료
  // =========================================================
  function prepareDone() {
    document.getElementById('card-cat').textContent = `[ ${FIND.category} ]`;
    document.getElementById('card-name').textContent = FIND.name;
    document.getElementById('card-lv').textContent = FIND.level;
    const sticker = document.getElementById('card-sticker');
    sticker.alt = `내가 찍고 그린 ${FIND.name}`;
    sticker.classList.add('is-capture');
    doneScreen.querySelector('.dc-card').classList.add('has-capture');
    photoWithDrawing().then((url) => { sticker.src = url; });
    const mine = myLine.value.trim();
    document.getElementById('card-text').textContent = FIND.record.join(' ') + (mine ? ` ${mine}` : '');
    document.getElementById('done-caption').textContent = `오늘 만난 ${FIND.name}이 나의 들판에 추가됐어요!`;
    // 카드 등장 애니메이션 다시 재생
    const card = doneScreen.querySelector('.dc-card');
    card.classList.remove('is-flying');
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';
  }

  // STEP 1~4 누적 그림을 그린 부분만 잘라 피코로 만들기
  function makePico() {
    const src = combinedDrawing();
    if (!src || isBlank(src)) return null;
    const { width: W, height: H } = src;
    const d = src.getContext('2d').getImageData(0, 0, W, H).data;
    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        if (d[(y * W + x) * 4 + 3] > 10) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const pad = 12;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(W, maxX + pad); maxY = Math.min(H, maxY + pad);
    const w = maxX - minX, h = maxY - minY;
    const out = document.createElement('canvas');
    const SIZE = 160;
    out.width = out.height = SIZE;
    const s = Math.min(SIZE / w, SIZE / h);
    out.getContext('2d').drawImage(src, minX, minY, w, h, (SIZE - w * s) / 2, (SIZE - h * s) / 2, w * s, h * s);
    return out.toDataURL('image/png');
  }

  document.getElementById('release-btn').addEventListener('click', () => {
    const src = makePico() || captured;
    const mine = myLine.value.trim();
    try {
      const pending = JSON.parse(localStorage.getItem('pico.habitat.pending') || '[]');
      pending.push({
        src,
        name: FIND.name,
        place: FIND.place,
        note: mine || FIND.record.join(' '),
        lens: 'LOOK',
      });
      localStorage.setItem('pico.habitat.pending', JSON.stringify(pending));
    } catch (e) { /* 저장 불가 환경이어도 홈으로는 이동 */ }

    doneScreen.querySelector('.dc-card').classList.add('is-flying');
    setTimeout(() => { location.href = 'index.html'; }, 650);
  });

  // 공유 (지원하는 기기에서만)
  document.getElementById('share-btn').addEventListener('click', async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: 'PICO', text: `오늘 ${FIND.name}을 발견했어요!` });
    } catch (e) { /* 취소 */ }
  });
})();
