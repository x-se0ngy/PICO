// PICO · 촬영한 사진 저장/불러오기
// 3.1.1 촬영 1에서 찍거나 고른 사진을 이 탭(sessionStorage)에 저장하고,
// 이후 촬영 단계와 관찰 카드의 [data-photo] 자리에 채워 넣어요.
(function () {
  var KEY = 'pico.photo';
  var FALLBACK = 'assets/capture/card-photo-ladybug.png';   // 사진이 없을 때 보여 줄 예시 사진
  var MAX = 1080;                                            // 저장할 때 긴 변 최대 픽셀

  function get() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function set(url) {
    try { sessionStorage.setItem(KEY, url); return true; }
    catch (e) { return false; }   // 용량 초과 등: 저장 없이 진행
  }

  // 촬영한 사진에도 온보딩 사진과 같은 알갱이(질감)를 입혀요 — 앱의 다른 사진 파일에 입힌 것과 같은 모델:
  // 흑백(R·G·B 같은 값) · 화면 0.425px 흐림 · 세기는 밝기의 3%(어두운 곳도 최소 3.4). 사진 긴 변을 화면 340px로 보고 알갱이 크기를 맞춰요.
  var GRAIN_K = 0.03, GRAIN_FLOOR = 3.4, GRAIN_BLUR = 0.425, GRAIN_SHOWN = 340;
  function grain(ctx, w, h) {
    var sig = GRAIN_BLUR * Math.max(w, h) / GRAIN_SHOWN, r = Math.max(1, Math.ceil(sig * 3)), ker = [], sum = 0, sq = 0, i, j, k;
    for (i = -r; i <= r; i++) { var v = Math.exp(-(i * i) / (2 * sig * sig)); ker.push(v); sum += v; }
    for (i = 0; i < ker.length; i++) { ker[i] /= sum; sq += ker[i] * ker[i]; }   // 흐린 뒤 표준편차 = 가중치 제곱합
    var n = w * h, a = new Float32Array(n), b = new Float32Array(n);
    for (i = 0; i < n; i++) a[i] = (Math.random() + Math.random() + Math.random() - 1.5) * 2;   // 균등 3개 합 ≈ 정규분포, 표준편차 1
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {            // 가로로 흐리기
      var s = 0; for (k = -r; k <= r; k++) { var x = i + k; x = x < 0 ? 0 : x >= w ? w - 1 : x; s += a[j * w + x] * ker[k + r]; }
      b[j * w + i] = s;
    }
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {            // 세로로 흐리기
      var t = 0; for (k = -r; k <= r; k++) { var y = j + k; y = y < 0 ? 0 : y >= h ? h - 1 : y; t += b[y * w + i] * ker[k + r]; }
      a[j * w + i] = t;
    }
    var img = ctx.getImageData(0, 0, w, h), d = img.data, norm = 1 / sq;
    for (i = 0; i < n; i++) {
      var p = i * 4, lum = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
      var g = a[i] * norm * Math.max(GRAIN_FLOOR, GRAIN_K * lum);
      for (k = 0; k < 3; k++) { var c = d[p + k] + g; d[p + k] = c < 0 ? 0 : c > 255 ? 255 : c; }
    }
    ctx.putImageData(img, 0, 0);
  }

  // 원본(video 프레임 또는 이미지)을 sw x sh 비율로 가운데 잘라서 JPEG data URL로 만들어요.
  function crop(src, srcW, srcH, aspect, zoom) {
    zoom = Math.max(1, zoom || 1);
    var w = srcW, h = srcW / aspect;
    if (h > srcH) { h = srcH; w = srcH * aspect; }
    w /= zoom; h /= zoom;
    var sx = (srcW - w) / 2, sy = (srcH - h) / 2;
    var scale = Math.min(1, MAX / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    var ctx = c.getContext('2d');
    ctx.drawImage(src, sx, sy, w, h, 0, 0, c.width, c.height);
    try { grain(ctx, c.width, c.height); } catch (e) {}   // 알갱이를 못 입혀도 사진은 그대로 써요
    return c.toDataURL('image/jpeg', 0.88);
  }

  function fromVideo(video, aspect, zoom) {
    if (!video || !video.videoWidth) return null;
    return crop(video, video.videoWidth, video.videoHeight, aspect, zoom);
  }

  function fromFile(file, aspect) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('no file')); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try { resolve(crop(img, img.naturalWidth, img.naturalHeight, aspect, 1)); }
        catch (e) { reject(e); }
        URL.revokeObjectURL(url);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }

  // [data-photo] → 배경으로, img[data-photo] → src로 채워요.
  function fill(root) {
    var url = get() || FALLBACK;
    (root || document).querySelectorAll('[data-photo]').forEach(function (el) {
      if (el.tagName === 'IMG') el.src = url;
      else { el.style.backgroundImage = 'url("' + url + '")'; el.classList.add('has-photo'); }
    });
  }

  window.PicoPhoto = { get: get, set: set, fromVideo: fromVideo, fromFile: fromFile, fill: fill, FALLBACK: FALLBACK };
  document.addEventListener('DOMContentLoaded', function () { fill(); });
})();
