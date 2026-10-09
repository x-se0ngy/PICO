// PICO prototype helpers: fit the 375px phone to small screens; data-go navigation; toggles.
(function () {
  // On phones, scale the 375x812 frame to fit the screen (both width and height).
  function fit() {
    var p = document.querySelector('.phone'); if (!p) return;
    var w = window.innerWidth, h = window.innerHeight;
    if (w < 500) { p.style.transform = 'scale(' + Math.min(w / 375, h / 812) + ')'; }
    else { p.style.transform = ''; }
  }
  // Pages taller than 812 (--h) scroll inside the frame. Fixed layers stay direct children of .phone.
  var FIXED = '.top[data-fixed], .tabbar, .home-ind, .dim, .sheet, .modal, .toast, .ov, [data-fixed], script';
  function wrap() {
    var p = document.querySelector('.phone'); if (!p || p.querySelector(':scope > .scroll')) return;
    var hv = parseFloat(getComputedStyle(p).getPropertyValue('--h')) || 812;
    if (hv <= 812) return;
    var sc = document.createElement('div'); sc.className = 'scroll';
    var cv = document.createElement('div'); cv.className = 'canvas';
    sc.appendChild(cv);
    Array.prototype.slice.call(p.children).forEach(function (c) { if (!c.matches(FIXED)) cv.appendChild(c); });
    p.insertBefore(sc, p.firstChild);
  }
  window.addEventListener('resize', fit);
  document.addEventListener('DOMContentLoaded', function () { wrap(); fit(); });
  // [data-go="page.html"] → navigate on click (for non-<a> elements)
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-go]'); if (el) { location.href = el.getAttribute('data-go'); }
  });
  // Dissolve an in-page state change (Figma "Dissolve · Slow · 300ms") where the browser supports it.
  window.picoSwap = function (fn) {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) document.startViewTransition(fn); else fn();
  };
  // [data-show="#id"] / [data-hide="#id"] → toggle overlays
  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-show]'), h = e.target.closest('[data-hide]');
    if (!s && !h) return;
    // showing: the overlay's own CSS dissolve plays; hiding: crossfade the change
    if (s) document.querySelectorAll(s.getAttribute('data-show')).forEach(function (n) { n.hidden = false; });
    if (h) window.picoSwap(function () { document.querySelectorAll(h.getAttribute('data-hide')).forEach(function (n) { n.hidden = true; }); });
  });
  // ?state=xxx → body[data-state] so a page can open in a specific Figma-frame state
  var st = new URLSearchParams(location.search).get('state'); if (st) document.documentElement.setAttribute('data-state', st);
})();
