// PICO · 렌즈 스티커 (촬영 2 → 3 → 5)
// 스티커 위치는 "사진 기준" 좌표(u, v: 0~1)로 저장해서, 2단계(335×335)와 3단계(335×200)처럼
// 사진 칸 비율이 달라도 같은 곳을 가리켜요.
(function () {
  var KINDS = ['생김새', '움직임', '사는 곳', '관계'];
  // Figma 3.1.3 촬영 3~6: 스티커 종류마다 고를 수 있는 표현
  var OPTIONS = [
    ['줄무늬가 있어요.', '점무늬가 있어요.', '한 가지 색이에요.', '반짝이고 있어요.'],
    ['날아다녀요.', '기어 다녀요.', '폴짝폴짝 뛰어요.', '가만히 있어요.'],
    ['풀잎 위에 있어요.', '나무에 있어요.', '꽃 주변에 있어요.', '물가에 있어요.'],
    ['꽃에서 꿀을 먹어요.', '잎을 갉아 먹어요.', '혼자 움직이고 있어요.', '다른 친구와 있어요.']
  ];
  var PROMPTS = ['내가 관찰한 특징들을 표현해 봐요.', '내가 관찰한 특징들을 표현해 봐요.', '내가 관찰한 특징들을 표현해 봐요.', '주변과 어떻게 어울리고 있나요?'];
  // 촬영 2 버튼 이름과 버튼 아래 안내 (Figma 버튼 2884:4619 · 촬영 02 맨트 2884:5571)
  var LABELS = ['모양', '움직임', '장소', '행동'];
  var LINES = ['어떤 생김새인지 궁금한 곳에 붙여요.', '어떻게 움직이는지 궁금한 곳에 붙여요.', '어디에서 살고 있는지 궁금한 곳에 붙여요.', '무엇을 하고 있는지 궁금한 곳에 붙여요.'];
  var KEY = 'pico.capture.lenses', ANS = 'pico.capture.answers2';
  var R = 21;   // 41px 스티커 칸에서 원 중심까지 (Figma 스티커2: 38px 원이 (2, 2)에서 시작)

  // Figma 스티커2 (붙인 스티커): 두 줄 테두리 렌즈 + 오른쪽 아래가 말려 올라간 귀퉁이.
  // 테두리 사이 띠 색: on = 지금 고른 종류(올리브), 나머지 = 크림. 가운데는 비어 있어서 사진이 보여요.
  var BODY = 'M39 19A18.1 18.1 0 1 0 19 39Z', FLAP = 'M19 39C19 31 27 21.5 39 19Z';
  function art(on) {
    var band = on ? 'var(--brand)' : 'var(--surface)';
    return '<svg class="art" viewBox="0 0 41 41" width="41" height="41" aria-hidden="true">' +
      '<path d="' + BODY + '" fill="rgba(255,255,255,.18)" stroke="var(--ink)" stroke-width="3.6" stroke-linejoin="round"/>' +
      '<path d="' + BODY + '" fill="none" stroke="' + band + '" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M8.5 16.5A13 13 0 0 1 14.5 8.6" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="' + FLAP + '" fill="rgba(255,255,255,.3)" stroke="var(--ink)" stroke-width="3.6" stroke-linejoin="round"/>' +
      '<path d="' + FLAP + '" fill="none" stroke="' + band + '" stroke-width="1.5" stroke-linejoin="round"/>' +
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
  function inner(k, on) { return art(on) + '<span class="n">' + (k + 1) + '</span>'; }
  function html(k, x, y, opts) {
    opts = opts || {};
    var cls = 'lens' + (opts.on ? ' is-on' : '') + (opts.cls ? ' ' + opts.cls : '');
    return '<' + (opts.tag || 'button') + ' type="button" class="' + cls + '" data-k="' + k + '"' +
      ' style="left:' + (x - R) + 'px;top:' + (y - R) + 'px"' + (opts.attrs || '') + '>' +
      inner(k, opts.on) + '</' + (opts.tag || 'button') + '>';
  }

  window.PicoLens = {
    KINDS: KINDS, OPTIONS: OPTIONS, PROMPTS: PROMPTS, LABELS: LABELS, LINES: LINES, R: R, inner: inner,
    load: function () { var l = read(KEY, []); return Array.isArray(l) ? l.filter(function (s) { return s && s.k >= 0 && s.k < 4; }) : []; },
    save: function (list) { write(KEY, list); },
    answers: function () { return read(ANS, {}) || {}; },
    saveAnswers: function (a) { write(ANS, a); },
    cover: cover, clamp: clamp, photoSize: photoSize, html: html
  };
})();
