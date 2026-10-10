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
  var KEY = 'pico.capture.lenses', ANS = 'pico.capture.answers2';
  var R = 19;   // 스티커 원 반지름(38px)

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

  // 스티커 한 개 (41px 칸, 38px 원, 오른쪽 아래 번호)
  function html(k, x, y, opts) {
    opts = opts || {};
    // active / placed = green sticker; not active in step 3 = dashed outline (Figma 스티커2 "화이트 선")
    // see-through lens: only the ring is drawn, the photo stays visible inside it
    var cls = 'lens' + (opts.dashed && !opts.active ? ' is-idle' : '') + (opts.active ? ' is-active' : '') + (opts.cls ? ' ' + opts.cls : '');
    return '<' + (opts.tag || 'button') + ' type="button" class="' + cls + '" data-k="' + k + '"' +
      ' style="left:' + (x - R) + 'px;top:' + (y - R) + 'px"' + (opts.attrs || '') + '>' +
      '<span class="ring"></span><span class="n">' + (k + 1) + '</span></' + (opts.tag || 'button') + '>';
  }

  window.PicoLens = {
    KINDS: KINDS, OPTIONS: OPTIONS, PROMPTS: PROMPTS, R: R,
    load: function () { var l = read(KEY, []); return Array.isArray(l) ? l.filter(function (s) { return s && s.k >= 0 && s.k < 4; }) : []; },
    save: function (list) { write(KEY, list); },
    answers: function () { return read(ANS, {}) || {}; },
    saveAnswers: function (a) { write(ANS, a); },
    cover: cover, clamp: clamp, photoSize: photoSize, html: html
  };
})();
