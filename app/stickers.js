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

  // Figma 스티커2 (2841:881) 원본 패스: Variant3(on, 올리브 띠 #A7C049) · Variant4(크림 띠 #FDF4B1).
  // 두 줄 테두리 렌즈 + 말린 귀퉁이, 가운데는 비어 있어서 사진이 보여요. 번호 칸은 .n (HTML)으로 그려요.
  var SHINE = 'M16.7595 6C15.2595 6.5 11.6118 7.89939 8.75939 12C7.37619 13.9885 5.25949 19 6.25953 24';
  var RING = 'M21 1.5C31.7696 1.5 40.5 10.2304 40.5 21V21.207L21.207 40.5H21C10.2304 40.5 1.5 31.7696 1.5 21C1.5 10.2304 10.2304 1.5 21 1.5ZM21 3.5C11.335 3.5 3.5 11.335 3.5 21C3.5 30.461 11.0079 38.1653 20.3906 38.4863L38.4863 20.3906C38.1653 11.0079 30.461 3.5 21 3.5Z';
  var CURL = 'M21 1.5C31.7696 1.5 40.5 10.2304 40.5 21L39.7705 21.4434H39.7695C39.7675 21.4423 39.7637 21.4409 39.7588 21.4385C39.7483 21.4333 39.7313 21.4249 39.708 21.4141C39.6609 21.3921 39.5878 21.3591 39.4912 21.3193C39.2981 21.2399 39.0097 21.1326 38.6396 21.0244C37.8983 20.8077 36.8318 20.5905 35.5439 20.5938C32.9822 20.6004 29.5004 21.4781 25.915 25.0635L25.5762 25.4072L25.5771 25.4082C22.125 29.0189 21.1122 32.6375 20.9502 35.3398C20.8689 36.6952 21.0015 37.8253 21.1533 38.6133C21.2292 39.0071 21.3095 39.3149 21.3701 39.5215C21.4003 39.6246 21.4262 39.7022 21.4434 39.7529C21.4519 39.7781 21.4578 39.7971 21.4619 39.8086C21.4639 39.8141 21.466 39.818 21.4668 39.8203L21.4678 39.8223C21.4678 39.8222 21.4672 39.8218 21.4658 39.8223L21 40.5C10.2304 40.5 1.5 31.7696 1.5 21C1.5 10.2304 10.2304 1.5 21 1.5ZM21 3.5C11.335 3.5 3.5 11.335 3.5 21C3.5 30.0193 10.3237 37.4431 19.0898 38.3945C18.9582 37.5064 18.8735 36.3748 18.9639 35.0723C19.1867 31.8626 20.4613 27.6891 24.501 23.6494C28.4736 19.6768 32.4679 18.6006 35.5391 18.5928C36.6306 18.59 37.5892 18.7222 38.3721 18.8936C37.3319 10.2221 29.9519 3.5 21 3.5Z';
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
