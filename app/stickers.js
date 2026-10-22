// PICO · 관찰 질문 (capture-3 → capture-4 → 관찰 카드)
// 사진을 보고 모양 · 장소 · 움직임 · 행동을 하나씩 골라요. (스티커를 붙이던 단계는 없앴어요 — 렌즈 그리기 코드는 남겨 두었지만 쓰지 않아요.)
// 모양 질문은 "점이 몇 개 있나요?"처럼 사진을 자세히 세어 보는 질문이에요.
(function () {
  // Figma 버튼 (2884:4619) 순서: 1 모양 · 2 장소 · 3 움직임 · 4 행동 — 2·3·5단계가 모두 이 순서를 써요.
  var KINDS = ['모양', '장소', '움직임', '행동'];
  // 질문마다 고를 수 있는 표현. 모양(0번)은 점·줄무늬 개수를 세어 보는 질문이에요.
  var OPTIONS = [
    ['점이 없어요.', '1~3개 있어요.', '4~7개 있어요.', '8개가 넘어요.'],
    ['풀잎 위에 있어요.', '나무에 있어요.', '꽃 주변에 있어요.', '물가에 있어요.'],
    ['날아다녀요.', '기어 다녀요.', '폴짝폴짝 뛰어요.', '가만히 있어요.'],
    ['꽃에서 꿀을 먹어요.', '잎을 갉아 먹어요.', '혼자 움직이고 있어요.', '다른 친구와 있어요.']
  ];
  var PROMPTS = ['점이나 줄무늬가 몇 개 있나요?', '어디에 있나요?', '어떻게 움직이나요?', '무엇을 하고 있나요?'];
  var MATCH = {};   // AI가 보기에 사진과 가장 가까운 보기 번호 (질문별) — 관찰이 실제와 얼마나 닮았는지 볼 때 써요
  // AI 분석(app/ai.js, 촬영 1 사진 분석)이 만든 질문·선택지가 있으면 그걸 써요. 없으면 위의 기본.
  (function () {
    function rd(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
    var photoAi = rd('pico.analysis');
    if (!photoAi) return;
    for (var k = 0; k < 4; k++) {
      var o = photoAi.options && photoAi.options[k];
      if (Array.isArray(o) && o.length === 4) OPTIONS[k] = o.slice();
      var q = photoAi.questions && photoAi.questions[k];
      if (typeof q === 'string' && q) PROMPTS[k] = q;
      var m = photoAi.match && photoAi.match[k];
      if (Number.isInteger(m) && m >= 0 && m < 4) MATCH[k] = m;
    }
  })();
  // 촬영 2 버튼 이름과 버튼 아래 안내 (촬영 02 맨트 2884:5571)
  var LABELS = KINDS;
  var LINES = ['어떤 생김새인지 궁금한 곳에 붙여요.', '어디에서 살고 있는지 궁금한 곳에 붙여요.', '어떻게 움직이는지 궁금한 곳에 붙여요.', '무엇을 하고 있는지 궁금한 곳에 붙여요.'];
  var KEY = 'pico.capture.lenses', ANS = 'pico.capture.answers2';
  var R = 21;   // 41px 스티커 칸에서 원 중심까지 (Figma 스티커2: 38px 원이 (2, 2)에서 시작)

  // Figma 스티커2 (2841:881) 원본 패스: Variant3(on, 올리브 띠 #A7C049) · Variant4(크림 띠 #FDF4B1).
  // 두 줄 테두리 렌즈 + 말린 귀퉁이, 가운데는 비어 있어서 사진이 보여요. 번호 칸은 .n (HTML)으로 그려요.
  var SHINE = 'M16.7595 6C15.2595 6.5 11.6118 7.89939 8.75939 12C7.37619 13.9885 5.25949 19 6.25953 24';
  var RING = 'M21 1.5C31.7696 1.5 40.5 10.2304 40.5 21V21.207L21.207 40.5H21C10.2304 40.5 1.5 31.7696 1.5 21C1.5 10.2304 10.2304 1.5 21 1.5ZM21 3.5C11.335 3.5 3.5 11.335 3.5 21C3.5 30.461 11.0079 38.1653 20.3906 38.4863L38.4863 20.3906C38.1653 11.0079 30.461 3.5 21 3.5Z';
  var CURL = 'M21 1.5C31.7696 1.5 40.5 10.2304 40.5 21L39.7705 21.4434H39.7695C39.7675 21.4423 39.7637 21.4409 39.7588 21.4385C39.7483 21.4333 39.7313 21.4249 39.708 21.4141C39.6609 21.3921 39.5878 21.3591 39.4912 21.3193C39.2981 21.2399 39.0097 21.1326 38.6396 21.0244C37.8983 20.8077 36.8318 20.5905 35.5439 20.5938C32.9822 20.6004 29.5004 21.4781 25.915 25.0635L25.5762 25.4072L25.5771 25.4082C22.125 29.0189 21.1122 32.6375 20.9502 35.3398C20.8689 36.6952 21.0015 37.8253 21.1533 38.6133C21.2292 39.0071 21.3095 39.3149 21.3701 39.5215C21.4003 39.6246 21.4262 39.7022 21.4434 39.7529C21.4519 39.7781 21.4578 39.7971 21.4619 39.8086C21.4639 39.8141 21.466 39.818 21.4668 39.8203L21.4678 39.8223C21.4678 39.8222 21.4672 39.8218 21.4658 39.8223L21 40.5C10.2304 40.5 1.5 31.7696 1.5 21C1.5 10.2304 10.2304 1.5 21 1.5ZM21 3.5C11.335 3.5 3.5 11.335 3.5 21C3.5 30.0193 10.3237 37.4431 19.0898 38.3945C18.9582 37.5064 18.8735 36.3748 18.9639 35.0723C19.1867 31.8626 20.4613 27.6891 24.501 23.6494C28.4736 19.6768 32.4679 18.6006 35.5391 18.5928C36.6306 18.59 37.5892 18.7222 38.3721 18.8936C37.3319 10.2221 29.9519 3.5 21 3.5Z';
  // Property 1=그린 (2841:880): 반투명 올리브 렌즈 · 번호 칸 없이 숫자만 (5단계에서 "다 붙였어요" 모습)
  var G1 = 'M19 0.5C29.1488 0.5 37.3871 8.67214 37.4971 18.7949L18.7949 37.4971C8.67214 37.3871 0.5 29.1488 0.5 19C0.5 8.78273 8.78273 0.5 19 0.5Z';
  var G2 = 'M19 0.5C28.9647 0.5 37.0869 8.37843 37.4824 18.2461C37.3192 18.188 37.1311 18.1262 36.9199 18.0645C36.1048 17.8261 34.9422 17.5892 33.541 17.5928C30.7246 17.6 26.987 18.5774 23.208 22.3564C19.3543 26.2101 18.1687 30.1492 17.9609 33.1406C17.8574 34.6317 17.9976 35.8816 18.1641 36.7617C18.217 37.0418 18.2735 37.2845 18.3252 37.4863C8.42055 37.1312 0.5 28.9913 0.5 19C0.5 8.78273 8.78273 0.5 19 0.5Z';
  function green() {
    return '<svg class="art" viewBox="0 0 41 41" width="41" height="41" fill="none" aria-hidden="true">' +
      '<path d="' + G1 + '" fill="#B1BD35" fill-opacity=".32" stroke="#000"/><path d="' + G2 + '" stroke="#000"/></svg>';
  }
  function art(on) {
    var band = on ? '#A7C049' : '#FDF4B1';
    return '<svg class="art" viewBox="0 0 42 42" width="42" height="42" fill="none" aria-hidden="true">' +
      '<path opacity=".3" d="' + SHINE + '" stroke="#fff" stroke-opacity=".4" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="' + RING + '" fill="' + band + '" stroke="#000"/>' +
      '<path d="' + CURL + '" fill="' + band + '" stroke="#000" stroke-linejoin="bevel"/>' +
      '</svg>';
  }

  function read(key, fallback) { try { var v = JSON.parse(sessionStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function write(key, v) { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  // object-fit: cover 로 그린 사진에서 (u,v) ↔ 칸 안의 (x,y)
  function cover(boxW, boxH, imgW, imgH) {
    var s = Math.max(boxW / imgW, boxH / imgH), w = imgW * s, h = imgH * s;
    var x0 = (boxW - w) / 2, y0 = (boxH - h) / 2;
    return {
      toBox: function (u, v) { return { x: x0 + u * w, y: y0 + v * h }; },
      toImg: function (x, y) { return { u: (x - x0) / w, v: (y - y0) / h }; }
    };
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  // 사진 원본 크기 (찍은 사진이 없으면 예시 사진)
  function photoSize(cb) {
    var img = new Image();
    img.onload = function () { cb(img.naturalWidth || 1, img.naturalHeight || 1); };
    img.onerror = function () { cb(1, 1); };
    img.src = (window.PicoPhoto && PicoPhoto.get()) || (window.PicoPhoto ? PicoPhoto.FALLBACK : '');
  }

  // 스티커 한 개 (41px 칸, 오른쪽 아래 13px 번호 칸). opts.on = 올리브 띠
  function inner(k, on, style) {
    if (style === 'green') return green() + '<span class="n n--plain">' + (k + 1) + '</span>';
    return art(on) + '<span class="n">' + (k + 1) + '</span>';
  }
  function html(k, x, y, opts) {
    opts = opts || {};
    var cls = 'lens' + (opts.on ? ' is-on' : '') + (opts.style ? ' is-' + opts.style : '') + (opts.cls ? ' ' + opts.cls : '');
    return '<' + (opts.tag || 'button') + ' type="button" class="' + cls + '" data-k="' + k + '"' +
      ' style="left:' + (x - R) + 'px;top:' + (y - R) + 'px"' + (opts.attrs || '') + '>' +
      inner(k, opts.on, opts.style) + '</' + (opts.tag || 'button') + '>';
  }

  window.PicoLens = {
    KINDS: KINDS, OPTIONS: OPTIONS, PROMPTS: PROMPTS, MATCH: MATCH, LABELS: LABELS, LINES: LINES, R: R, inner: inner,
    load: function () { var l = read(KEY, []); return Array.isArray(l) ? l.filter(function (s) { return s && s.k >= 0 && s.k < 4; }) : []; },
    save: function (list) { write(KEY, list); },
    answers: function () { return read(ANS, {}) || {}; },
    // 답을 저장할 때 "실제 관찰과 얼마나 닮았는지"도 같이 적어 둬요 (보여 주는 화면은 아직 없어요).
    // hit = AI가 사진에서 본 것과 같은 보기를 고른 질문 수, total = AI가 기준을 가진 질문 중 답한 수
    saveAnswers: function (a) {
      write(ANS, a);
      var hit = 0, total = 0;
      Object.keys(MATCH).forEach(function (k) { if (a[k] != null) { total++; if (a[k] === MATCH[k]) hit++; } });
      write('pico.capture.match', { hit: hit, total: total, ratio: total ? hit / total : null });
    },
    match: function () { return read('pico.capture.match', null); },
    cover: cover, clamp: clamp, photoSize: photoSize, html: html
  };
})();
