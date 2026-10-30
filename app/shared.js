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
  var FIXED = '.top[data-fixed], .tabbar, .home-ind, .dim, .sheet, .modal, .toast, .ov, .ox, .ox-dim, [data-fixed], script';
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
  // 앱 전체 움직임 길이(base.css의 --dur) — 애니메이션이 끝난 뒤 정리하는 타이머가 같은 값을 써요
  window.picoDur = function () { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur')) || 300; };
  // 문서 간 View Transition이 없는 브라우저: 나타날 때 디졸브(CSS .no-vt), 떠날 때 먼저 흐려진 뒤 이동해요
  if (!('CSSViewTransitionRule' in window)) {
    document.documentElement.classList.add('no-vt');
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0 || a.target || a.hasAttribute('download') || a.hasAttribute('data-confirm')) return;
      var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search && u.hash)) return;
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;
      e.preventDefault();
      document.documentElement.classList.add('is-leaving');
      setTimeout(function () { location.href = a.href; }, window.picoDur() * 0.6);
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) document.documentElement.classList.remove('is-leaving'); });
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
  // 하단바 촬영 네모: 누르면 종이접기하듯 ½ → ¼로 접힌 뒤 촬영 화면으로 넘어가요 (Figma 하단바 2821:44176).
  // 접는 선은 Figma 네모 안의 점선 두 줄. 아이콘은 화면에서 똑바로 서 있도록 종이 회전(60°)만큼 되돌려 그려요.
  // 두 번째 접기는 첫 번째가 내려앉는 끝자락에 이어 시작하고, ¼로 내려앉는 동안 촬영 화면이 디졸브로 겹쳐 나타나요.
  var FOLD_OVERLAP = 60, FOLD_LEAD = 100;
  function foldMs() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fold-ms')) || 380; }
  function paperHTML() {
    var face = '<rect x="0" y="0" width="50" height="50" fill="#FFFCE4" stroke="black" stroke-linecap="square" stroke-dasharray="2 2"/>' +
      '<path d="M25 0V50M0 25H50" stroke="black" stroke-dasharray="2 2"/>' +
      '<g transform="translate(25 25) rotate(-60) translate(-34.83 -34.83)">' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M38.6641 22.4565L38.7744 22.3931L42.2314 28.3813L45.5312 29.2651L45.6445 28.3638L48.6211 28.7358L48.457 30.0493L49.6152 30.3599L48.8389 33.2583L48.082 33.0552L46.4736 45.9526L46.4707 45.9517V46.4995H21.8838V43.313H23.4453L22.1641 33.0396L20.8809 33.3843L20.0557 30.3052L22.3379 29.6929L21.8838 26.0522L25.0469 25.6577L25.4463 28.8608L27.8633 28.2134L29.5098 25.3628H29.1338V22.3628H38.6641V22.4565ZM37.4102 33.9985L37.8633 37.2896L33.9502 38.1929L32.1387 35.0396L33.3389 32.3491L37.4102 33.9985Z" fill="#FFFCE4"/>' +
      '<path d="M38.6641 22.457L38.7744 22.3936L42.2314 28.3818L45.5312 29.2656L45.6445 28.3643L48.6211 28.7363L48.457 30.0498L49.6152 30.3604L48.8389 33.2588L48.082 33.0557L46.4736 45.9531L46.4707 45.9521V46.5H21.8838V43.3135H23.4453L22.1641 33.04L20.8809 33.3848L20.0557 30.3057L22.3379 29.6934L21.8838 26.0527L25.0469 25.6582L25.4463 28.8613L27.8633 28.2139L29.5098 25.3633H29.1338V22.3633H38.6641V22.457ZM29.9453 30.9824L29.8311 30.916L29.8486 30.9814L25.2725 32.207L26.6572 43.3135H43.7803L45.1562 32.2715L39.668 30.8008L39.8242 30.2139L37.0244 25.3633H33.1895L29.9453 30.9824ZM37.4102 33.999L37.8633 37.29L33.9502 38.1934L32.1387 35.04L33.3389 32.3496L37.4102 33.999Z" fill="black"/></g>';
    function q(qx, qy, side) {
      // 바깥쪽 테두리 선은 반쯤 바깥에 그려지니, 바깥 가장자리만 1px 넉넉히 보여줘요
      var clip = [qy ? 0 : -1, qx ? -1 : 0, qy ? -1 : 0, qx ? 0 : -1].map(function (v) { return v + 'px'; }).join(' ');
      return '<span class="q ' + side + '"><span class="pface front" style="clip-path:inset(' + clip + ')">' +
        '<svg width="52" height="52" viewBox="-1 -1 52 52" style="left:' + (-qx - 1) + 'px;top:' + (-qy - 1) + 'px" fill="none">' + face + '</svg></span>' +
        '<span class="pface back"><svg width="26" height="26" viewBox="-0.5 -0.5 26 26" style="left:-0.5px;top:-0.5px" fill="none">' +
        '<rect x="0" y="0" width="25" height="25" fill="#F1ECBF" stroke="black" stroke-linecap="square" stroke-dasharray="2 2"/></svg></span></span>';
    }
    return '<span class="origami" aria-hidden="true"><span class="paper">' +
      '<span class="half top">' + q(0, 0, 'left') + q(25, 0, 'right') + '</span>' +
      '<span class="half bottom">' + q(0, 25, 'left') + q(25, 25, 'right') + '</span></span></span>';
  }
  function setupOrigami() {
    document.querySelectorAll('a.tab-cam').forEach(function (a) {
      if (a.classList.contains('is-origami')) return;
      a.insertAdjacentHTML('beforeend', paperHTML());
      a.classList.add('is-origami');
    });
  }
  document.addEventListener('DOMContentLoaded', setupOrigami);
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.tab-cam.is-origami'); if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    e.preventDefault();
    var paper = a.querySelector('.paper');
    if (paper.classList.contains('f1')) return;   // 이미 접히는 중
    var step = foldMs(), href = a.getAttribute('href');
    paper.classList.add('f1');
    setTimeout(function () { paper.classList.add('f2'); }, step - FOLD_OVERLAP);
    setTimeout(function () { location.href = href; }, 2 * step - FOLD_OVERLAP - FOLD_LEAD);
  });
  // 뒤로 가기로 돌아오면(bfcache) 접힌 종이를 다시 펼쳐 둬요
  window.addEventListener('pageshow', function () {
    document.querySelectorAll('.tab-cam .paper').forEach(function (p) { p.classList.remove('f1', 'f2'); });
  });

  // [data-show="#id"] / [data-hide="#id"] → toggle overlays
  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-show]'), h = e.target.closest('[data-hide]');
    if (!s && !h) return;
    // showing: the overlay's own CSS dissolve plays; hiding: crossfade the change
    if (s) document.querySelectorAll(s.getAttribute('data-show')).forEach(function (n) { n.hidden = false; });
    if (h) window.picoSwap(function () { document.querySelectorAll(h.getAttribute('data-hide')).forEach(function (n) { n.hidden = true; }); });
  });
  // <a data-confirm="관찰을 중단할까요?"> → 중단 확인 팝업 (Figma .ox팝업): 취소 closes, 네 follows the link
  window.picoConfirm = function (title, href) {
    var ph = document.querySelector('.phone'); if (!ph) { location.href = href; return; }
    var dim = document.createElement('div'); dim.className = 'ox-dim';
    var box = document.createElement('div'); box.className = 'ox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<p class="ox-title"></p><div class="ox-btns"><button type="button" class="ox-no">취소</button><a class="ox-yes">네</a></div>';
    box.querySelector('.ox-title').textContent = title; box.querySelector('.ox-yes').href = href;
    function close() { dim.remove(); box.remove(); }
    dim.addEventListener('click', close); box.querySelector('.ox-no').addEventListener('click', close);
    ph.appendChild(dim); ph.appendChild(box); box.querySelector('.ox-no').focus();
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-confirm]'); if (!a) return;
    e.preventDefault(); window.picoConfirm(a.getAttribute('data-confirm'), a.getAttribute('href'));
  });
  // 홈 화면에 설치하는 앱(PWA): 서비스워커 등록
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(function () {}); });
  }
  // ?state=xxx → body[data-state] so a page can open in a specific Figma-frame state
  var st = new URLSearchParams(location.search).get('state'); if (st) document.documentElement.setAttribute('data-state', st);
})();
