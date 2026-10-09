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
    c.getContext('2d').drawImage(src, sx, sy, w, h, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
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
