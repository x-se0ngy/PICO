// PICO · AI 관찰 분석 (촬영 1 · 촬영 3 · 관찰 카드)
// 사진을 /api/analyze 로 보내 분석을 받고, 이 탭(sessionStorage)에 저장해 다음 단계와 관찰 카드에서 써요.
// 서버에 API 키가 없거나 인터넷이 안 되면 예시 분석(DEMO)으로 계속 진행해요.
//
// 촬영 1의 분석은 두 갈래로 동시에 보내요 (start):
//   quick = 곤충 이름·분류만 (답이 짧아서 빨라요) → "○○ 같아요!" 화면을 먼저 보여 줘요
//   full  = 분석글 · 관찰 질문 · 보기 전부 (조금 걸려요) → 아이가 결과 화면을 읽는 동안 이어서 받아요
// 그래서 "분석중" 화면은 짧게 끝나고, 나머지는 '다음'을 누를 때까지 기다리지 않아도 대부분 도착해 있어요.
(function () {
  var KEY = 'pico.analysis';
  var MIN_WAIT = 1000;      // "AI가 분석중이에요"를 적어도 이만큼은 보여줘요 (너무 번쩍 지나가지 않게)
  var QUICK_TIMEOUT = 4000; // 이름만 받는 짧은 질문: 이만큼 지나도 답이 없으면 전체 분석 쪽으로 넘어가요
  var TIMEOUT = 8000;       // 전체 분석: 이만큼 기다려도 답이 없으면 멈추고 예시 분석으로 넘어가요
  var SEND_MAX = 768;       // AI에 보내는 사진은 긴 변 768px로 줄여서 (올리는 시간이 짧아져요). 저장된 사진은 그대로예요
  var SWAP_MS = 175;        // 분석중 → 결과로 글이 바뀔 때, 흐려지고 다시 나타나는 시간 (HIN 분석 화면의 디졸브처럼 한 번에 ~350ms)

  // 예시 분석: 키가 없을 때 쓰는 기존 관찰 카드 내용 (Figma 3.1.6)
  var DEMO = {
    demo: true, is_insect: true, name: '칠성무당벌레', group: '딱정벌레류', confidence: 'medium',
    summary: ['빨간 등에 검은 점이 일곱 개 있어요.', '진딧물을 잡아먹는 고마운 곤충이에요.', '놀라면 다리를 접고 죽은 척해요.'],
    options: { 2: ['느릿느릿 기어가요.', '재빨리 기어가요.', '빙글빙글 돌아요.', '가다가 멈춰요.'], 3: ['점이 없어요.', '1~3개 있어요.', '4~7개 있어요.', '8개가 넘어요.'] },
    questions: { 3: '등에 검은 점이 몇 개 있나요?' },
    match: { 0: 0, 1: 0, 2: 0, 3: 2 }     // 색 = 빨강 · 위치 = 풀잎 위 · 움직임 = 느리게 · 특징 = 점 4~7개
  };

  function read() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  function post(payload, limit) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = ctrl && setTimeout(function () { ctrl.abort(); }, limit || TIMEOUT);
    return fetch('/api/analyze', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false }; })
      .then(function (j) { if (t) clearTimeout(t); return j; });
  }

  // 사진을 AI에 보낼 크기로 줄여요 (이미 작으면 그대로)
  function shrink(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var k = Math.min(1, SEND_MAX / Math.max(img.naturalWidth, img.naturalHeight));
          if (k >= 1) { resolve(url); return; }
          var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.75));
        } catch (e) { resolve(url); }
      };
      img.onerror = function () { resolve(url); };
      img.src = url;
    });
  }

  // 전체 분석을 서버에서 받아요 (저장은 안 해요). 안 되면 DEMO
  function fetchFull(image) {
    return post({ mode: 'identify', image: image }).then(function (j) {
      return j && j.ok ? {
        demo: false, is_insect: j.is_insect, name: j.name, group: j.group, confidence: j.confidence,
        summary: j.summary && j.summary.length ? j.summary : DEMO.summary, options: j.options || {},
        questions: j.questions || {}, match: j.match || {}
      } : DEMO;
    });
  }
  // 이름·분류만 짧게 받아요. 안 되면 null
  function fetchQuick(image) {
    return post({ mode: 'quick', image: image }, QUICK_TIMEOUT).then(function (j) {
      return j && j.ok ? { is_insect: j.is_insect, name: j.name, group: j.group, confidence: j.confidence } : null;
    });
  }

  // 촬영 1: 사진 속 곤충 알아보기 (한 번에 전체를 기다리는 예전 방식 — 지금 화면은 start를 써요)
  function analyze(photo) {
    if (!photo) { write(DEMO); return Promise.resolve(DEMO); }
    return fetchFull(photo).then(function (r) { write(r); return r; });
  }

  // 이름은 알았는데 전체 분석이 안 왔을 때: 그 곤충에 맞는 말만 쓰고, 질문 보기는 앱 기본 보기로 가요 (DEMO의 무당벌레 글을 다른 곤충에 붙이지 않게)
  function plain(q) {
    return {
      demo: false, is_insect: q.is_insect, name: q.name, group: q.group, confidence: q.confidence,
      summary: [q.name + ' 친구를 만났어요.', '천천히 눈으로 관찰해 봐요.', '손대지 않고 가까이서 봐요.'],
      options: {}, questions: {}, match: {}
    };
  }

  // 촬영 1: 두 갈래 분석을 동시에 시작해요.
  //   first = 먼저 도착한 곤충 이름·분류 (quick, 안 되면 전체 분석 · 예시)
  //   full  = 전체 분석 (결과가 sessionStorage에 저장돼요. 이름·분류는 first와 같게 맞춰요)
  var gen = 0;
  // 전시 자동 재생 중(demo.js)에는 서버에 묻지 않고 예시 분석으로 바로 가요 (폰 여러 대가 하루 종일 돌려도 AI 사용량이 안 늘어요). 관객이 직접 만지는 중이면 평소대로 분석해요.
  function autoDemo() { try { return localStorage.getItem('pico.demo') === '1' && sessionStorage.getItem('pico.demo.mode') !== 'user'; } catch (e) { return false; } }
  function start(photo) {
    var my = ++gen;
    if (!photo || autoDemo()) { write(DEMO); var d = Promise.resolve(DEMO); return { first: d, full: d }; }
    var small = shrink(photo);
    var quickP = small.then(fetchQuick);
    var fullP = small.then(fetchFull);
    var full = Promise.all([quickP, fullP]).then(function (v) {
      var q = v[0], r = v[1];
      if (q) {
        if (r.demo) r = plain(q);
        else { r.name = q.name; r.group = q.group; r.confidence = q.confidence; r.is_insect = q.is_insect; }
      }
      if (my === gen) write(r);     // 그 사이 새 사진을 찍었다면 늦게 온 옛 결과는 저장하지 않아요
      return r;
    });
    var first = quickP.then(function (q) { return q || fullP; });
    return { first: first, full: full };
  }

  // (예전 스티커 단계용 — 지금은 쓰지 않아요) 스티커를 붙인 자리마다 선택지 4개
  function stickers(photo, lenses, insect) {
    if (!photo || !lenses.length) return Promise.resolve({ demo: true, options: {} });
    return post({ mode: 'stickers', image: photo, insect: insect || '',
      stickers: lenses.map(function (s) { return { k: s.k, u: +s.u.toFixed(3), v: +s.v.toFixed(3) }; }) })
      .then(function (j) { return j && j.ok ? { demo: false, options: j.options || {} } : { demo: true, options: {} }; });
  }

  function current() { return read() || DEMO; }
  function clear() { gen++; try { sessionStorage.removeItem(KEY); } catch (e) {} }

  // "AI가 분석중이에요" 화면 (Figma 디졸브로 나타나고 사라져요)
  function wait(title, sub) {
    var phone = document.querySelector('.phone'), started = Date.now();
    var el = document.createElement('div');
    el.className = 'ai-wait'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="ai-board"><i class="ai-lime"></i><div class="ai-photo"></div></div>' +
      '<div class="ai-text"><p class="ai-title"></p><p class="ai-sub"></p></div><span class="ai-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    el.querySelector('.ai-title').textContent = title || 'AI가 분석중이에요';
    el.querySelector('.ai-sub').textContent = sub || '';
    var photo = (window.PicoPhoto && PicoPhoto.get()) || (window.PicoPhoto && PicoPhoto.FALLBACK);
    if (photo) el.querySelector('.ai-photo').style.backgroundImage = 'url("' + photo + '")';
    (phone || document.body).appendChild(el);
    var DISSOLVE = 350;   // 이 화면의 디졸브 (base.css .ai-wait --dissolve 와 같아요)
    return {
      // 최소 시간을 채운 뒤 끝나요. keep = true면 화면을 남겨 둔 채로(페이지를 넘길 때) 끝내요.
      done: function (keep) {
        var left = Math.max(0, MIN_WAIT - (Date.now() - started));
        return new Promise(function (resolve) {
          setTimeout(function () {
            if (keep) { resolve(); return; }
            el.classList.add('is-out');
            setTimeout(function () { el.remove(); resolve(); }, DISSOLVE + 20);
          }, left);
        });
      },
      // 알아본 곤충을 가볍게 보여 줘요: 같은 화면에서 글만 "○○ 같아요!"로 바뀌고(점은 사라지고 종이판이 톡 올라와요), '다음' 버튼이 나타나요.
      // '다음'을 누르면 full(전체 분석)이 도착해 있을 때 바로, 아직이면 도착하는 대로 href로 넘어가요.
      found: function (r, full, href) {
        var left = Math.max(0, MIN_WAIT - (Date.now() - started));
        setTimeout(function () {
          var text = el.querySelector('.ai-text'), title = el.querySelector('.ai-title'), sub = el.querySelector('.ai-sub');
          text.classList.add('is-swap');
          setTimeout(function () {
            title.textContent = r.name + ' 같아요!';
            sub.textContent = r.confidence === 'low' ? '확실하진 않아요. 같이 자세히 살펴봐요.' : '맞는지 자세히 살펴볼까요?';
            el.classList.add('is-found');
            text.classList.remove('is-swap');
            var a = document.createElement('a');
            a.className = 'cta step ai-next'; a.href = href;
            a.innerHTML = '<span class="cta-face"><span class="ai-next-label">다음</span> <img src="assets/icons/outline/arrow-right.svg" alt=""></span>';
            el.appendChild(a);
            var ready = false; full.then(function () { ready = true; });
            a.addEventListener('click', function (e) {
              e.preventDefault();
              if (a.classList.contains('is-off')) return;
              if (ready) { location.href = href; return; }
              a.classList.add('is-off'); a.querySelector('.ai-next-label').textContent = '분석 마무리 중';   // 전체 분석이 아직이면 잠깐만 (최대 TIMEOUT까지)
              full.then(function () { location.href = href; });
            });
          }, SWAP_MS);
        }, left);
      }
    };
  }

  window.PicoAI = { analyze: analyze, start: start, stickers: stickers, current: current, clear: clear, wait: wait, DEMO: DEMO };
})();
