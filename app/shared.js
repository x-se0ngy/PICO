// PICO prototype helpers: fit the 375px phone to small screens; data-go navigation; toggles.
(function () {
  function fit() {
    var p = document.querySelector('.phone'); if (!p) return;
    var w = window.innerWidth;
    if (w < 375) { p.style.transform = 'scale(' + (w / 375) + ')'; document.body.style.height = (p.offsetHeight * w / 375) + 'px'; }
    else { p.style.transform = ''; document.body.style.height = ''; }
  }
  window.addEventListener('resize', fit); document.addEventListener('DOMContentLoaded', fit);
  // [data-go="page.html"] → navigate on click (for non-<a> elements)
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-go]'); if (el) { location.href = el.getAttribute('data-go'); }
  });
  // [data-show="#id"] / [data-hide="#id"] → toggle overlays
  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-show]'); if (s) { document.querySelectorAll(s.getAttribute('data-show')).forEach(function (n) { n.hidden = false; }); }
    var h = e.target.closest('[data-hide]'); if (h) { document.querySelectorAll(h.getAttribute('data-hide')).forEach(function (n) { n.hidden = true; }); }
  });
  // ?state=xxx → body[data-state] so a page can open in a specific Figma-frame state
  var st = new URLSearchParams(location.search).get('state'); if (st) document.documentElement.setAttribute('data-state', st);
})();
