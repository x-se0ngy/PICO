// PICO · AI 관찰 분석 (촬영 1 · 촬영 3 · 관찰 카드)
// 사진을 /api/analyze 로 보내 분석을 받고, 이 탭(sessionStorage)에 저장해 다음 단계와 관찰 카드에서 써요.
// 서버에 API 키가 없거나 인터넷이 안 되면 예시 분석(DEMO)으로 계속 진행해요.
(function () {
  var KEY = 'pico.analysis';
  var MIN_WAIT = 1400;      // "AI가 분석중이에요"를 적어도 이만큼은 보여줘요
  var TIMEOUT = 20000;

  // 예시 분석: 키가 없을 때 쓰는 기존 관찰 카드 내용 (Figma 3.1.6)
  var DEMO = {
    demo: true, is_insect: true, name: '칠성무당벌레', group: '딱정벌레류', confidence: 'medium',
    summary: ['빨간 등에 검은 점이 일곱 개 있어요.', '진딧물을 잡아먹는 고마운 곤충이에요.', '놀라면 다리를 접고 죽은 척해요.'],
    options: { 0: ['점이 없어요.', '1~3개 있어요.', '4~7개 있어요.', '8개가 넘어요.'] },
    questions: { 0: '등에 검은 점이 몇 개 있나요?' },
    match: { 0: 2 }
  };

  function read() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  function post(payload) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = ctrl && setTimeout(function () { ctrl.abort(); }, TIMEOUT);
    return fetch('/api/analyze', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false }; })
      .then(function (j) { if (t) clearTimeout(t); return j; });
  }

  // 촬영 1: 사진 속 곤충 알아보기
  function analyze(photo) {
    if (!photo) { write(DEMO); return Promise.resolve(DEMO); }
    return post({ mode: 'identify', image: photo }).then(function (j) {
      var r = j && j.ok ? {
        demo: false, is_insect: j.is_insect, name: j.name, group: j.group, confidence: j.confidence,
        summary: j.summary && j.summary.length ? j.summary : DEMO.summary, options: j.options || {},
        questions: j.questions || {}, match: j.match || {}
      } : DEMO;
      write(r); return r;
    });
  }

  // (예전 스티커 단계용 — 지금은 쓰지 않아요) 스티커를 붙인 자리마다 선택지 4개
  function stickers(photo, lenses, insect) {
    if (!photo || !lenses.length) return Promise.resolve({ demo: true, options: {} });
    return post({ mode: 'stickers', image: photo, insect: insect || '',
      stickers: lenses.map(function (s) { return { k: s.k, u: +s.u.toFixed(3), v: +s.v.toFixed(3) }; }) })
      .then(function (j) { return j && j.ok ? { demo: false, options: j.options || {} } : { demo: true, options: {} }; });
  }

  function current() { return read() || DEMO; }
  function clear() { try { sessionStorage.removeItem(KEY); } catch (e) {} }

  // "AI가 분석중이에요" 화면 (Figma 디졸브로 나타나고 사라져요)
  function wait(title, sub) {
    var phone = document.querySelector('.phone'), started = Date.now();
    var el = document.createElement('div');
    el.className = 'ai-wait'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="ai-card"><div class="ai-photo"><span class="ai-scan"></span>' +
      '<span class="ai-corner tl"></span><span class="ai-corner tr"></span><span class="ai-corner bl"></span><span class="ai-corner br"></span></div>' +
      '<p class="ai-title"></p><p class="ai-sub"></p><span class="ai-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>';
    el.querySelector('.ai-title').textContent = title || 'AI가 분석중이에요';
    el.querySelector('.ai-sub').textContent = sub || '';
    var photo = (window.PicoPhoto && PicoPhoto.get()) || (window.PicoPhoto && PicoPhoto.FALLBACK);
    if (photo) el.querySelector('.ai-photo').style.backgroundImage = 'url("' + photo + '")';
    (phone || document.body).appendChild(el);
    return {
      // 최소 시간을 채운 뒤 끝나요. keep = true면 화면을 남겨 둔 채로(페이지를 넘길 때) 끝내요.
      done: function (keep) {
        var left = Math.max(0, MIN_WAIT - (Date.now() - started));
        return new Promise(function (resolve) {
          setTimeout(function () {
            if (keep) { resolve(); return; }
            el.classList.add('is-out');
            setTimeout(function () { el.remove(); resolve(); }, (window.picoDur ? picoDur() : 300) + 20);
          }, left);
        });
      }
    };
  }

  window.PicoAI = { analyze: analyze, stickers: stickers, current: current, clear: clear, wait: wait, DEMO: DEMO };
})();
