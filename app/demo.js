// PICO 전시 데모 모드
//   아무도 안 만지면 → 세 가지 이야기를 차례로 혼자 돌아요. 각 이야기는 제목 화면으로 시작해요 (손가락 모양이 눌러야 할 곳을 먼저 알려 줘요)
//        01. Explore  발견하고 그리는 즐거운 관찰   홈 → 촬영 → 질문 → 일기 → 그림 → 관찰 카드 → 들판
//        02. Collect  접어서 모으는 나만의 도감     도감 → 곤충 카드
//        03. Connect  쪽지로 이어지는 우리의 탐험   친구 → 쪽지 → 친구의 들판
//        다 돌고 나면 "PICO 체험이 종료되었습니다! 3초 후 홈 화면으로 돌아갑니다." 안내 → 홈으로 돌아가 처음부터 다시 돌아요
//   손가락으로 만지면  → 그 순간 자동 재생이 멈추고, 보고 있던 화면에서 이어서 직접 해볼 수 있어요
//   USER_IDLE_MS 동안 안 만지면 → 같은 종료 안내 → 홈으로 돌아가 자동 재생을 다시 시작해요
// 켜고 끄기: 전시 폰에서 주소 끝에 ?demo=1 로 한 번 열면 그 폰에 저장돼요 (끄기 ?demo=0). shared.js가 켜져 있을 때만 이 파일을 불러와요.
// 자동으로 누르는 건 가짜 터치(isTrusted = false)라서, 진짜 손가락만 "만졌다"고 쳐요.
(function () {
  var MODE = 'pico.demo.mode';      // sessionStorage: 'user' = 관객이 만지는 중 (없으면 자동 재생)
  var BASE = 'pico.demo.base';      // sessionStorage: 자동 재생이 들판에 놓기 전의 내 PICO 목록 (재생이 놓은 것만 알아내려고)
  var AUTO = 'pico.demo.auto';      // sessionStorage: 자동 재생이 들판에 놓은 PICO 번호 (다음 바퀴 처음에 이것만 치워요)
  var DG = 'pico.demo.dogam';       // sessionStorage: 이번 바퀴에 도감을 이미 둘러봤는지
  var USER_IDLE_MS = 20000;         // 관객이 마지막으로 만진 뒤 이만큼 지나면 종료 안내
  var END_COUNT = 3;                // 종료 안내 카운트다운 (초)
  var INTRO_MS = 5800;              // 이야기 제목 화면을 보여 주는 시간
  var SAMPLE = 'assets/capture/card-photo-ladybug.png';

  var phone = document.querySelector('.phone'); if (!phone) return;
  var page = location.pathname.split('/').pop() || 'index.html';
  var qs = new URLSearchParams(location.search);

  // ---------- 손가락 모양 · 종료 안내 ----------
  var css = document.createElement('style');
  css.textContent =
    '.demo-tap{position:absolute;left:0;top:0;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;pointer-events:none;z-index:899;opacity:0;border:1.5px solid #000;background:rgba(225,241,60,.6);box-shadow:0 0 0 7px rgba(225,241,60,.3)}' +
    '.demo-tap.go{animation:demo-tap 900ms cubic-bezier(.4,0,.2,1) forwards}' +
    '.demo-tap.hold{opacity:1;transform:scale(.8);animation:none}' +
    '@keyframes demo-tap{0%{opacity:0;transform:scale(1.7)}35%{opacity:1;transform:scale(1)}58%{opacity:1;transform:scale(.8)}100%{opacity:0;transform:scale(.8)}}' +
    '.demo-end{position:absolute;left:0;top:0;width:100%;height:812px;z-index:900;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--ink,#000);font-family:var(--font,inherit);background:rgba(255,252,228,.98);opacity:0;visibility:hidden;transition:opacity .4s ease-in-out,visibility 0s .4s}' +
    '.demo-end.on{opacity:1;visibility:visible;transition:opacity .4s ease-in-out}' +
    '.demo-end h3{margin:0 0 14px;font-size:24px;line-height:32px;font-weight:700}' +
    '.demo-end p{margin:0;font-size:16px;line-height:24px}' +
    '.demo-end p.sm{margin-top:28px;font-size:14px;opacity:.7}' +
    '.demo-intro{position:absolute;left:0;top:0;width:100%;height:812px;z-index:901;background:#fff;color:#000;font-family:var(--font,inherit);opacity:1;transition:opacity .35s ease-in-out}' +
    '.demo-intro.off{opacity:0;pointer-events:none}' +
    '.demo-intro h2{position:absolute;left:24px;right:24px;top:78px;margin:0;font-size:28px;line-height:38px;font-weight:400}' +
    '.demo-intro h2 span{display:block}' +
    '.demo-intro div{position:absolute;left:24px;right:24px;bottom:58px}' +
    '.demo-intro p{margin:0 0 14px;font-size:15px;line-height:23px;word-break:keep-all}' +
    '.demo-intro p:last-child{margin-bottom:0}';
  document.head.appendChild(css);
  var ring = document.createElement('div'); ring.className = 'demo-tap'; phone.appendChild(ring);
  var endEl = document.createElement('div'); endEl.className = 'demo-end'; endEl.setAttribute('role', 'status'); endEl.setAttribute('aria-live', 'polite');
  endEl.innerHTML = '<h3>PICO 체험이<br>종료되었습니다!</h3><p><span id="demoSec">3</span>초 후 홈 화면으로<br>돌아갑니다.</p><p class="sm">다른 곤충도 관찰해 보세요!</p>';
  phone.appendChild(endEl);
  var endSec = endEl.querySelector('#demoSec');

  // ---------- 이야기 제목 화면 (01 · 02 · 03) ----------
  var INTRO = [null,
    { n: '01. Explore', t: '발견하고 그리는 즐거운 관찰', p: ['발견한 곤충을 촬영하고 AI를 통해 특징을 자세히 살펴봅니다. 관찰한 내용을 직접 그림과 메모로 기록하며 자신만의 관찰 카드를 완성합니다.', '사진을 찍고 정보 확인하는 것을 넘어, 스스로 관찰하고 표현하는 능동적인 경험을 제공합니다.'] },
    { n: '02. Collect', t: '접어서 모으는 나만의 도감', p: ['직접 그린 곤충은 종이접기 형태의 피코로 완성되어 도감에 모입니다. 같은 곤충을 다시 발견하면 기존 카드에 새로운 관찰 기록이 쌓입니다.', '작은 발견이 하나의 특별한 기록으로 이어지고, 탐험을 거듭할수록 나만의 도감이 풍성해집니다.'] },
    { n: '03. Connect', t: '쪽지로 이어지는 우리의 탐험', p: ['발견한 곤충과 관찰 기록을 쪽지에 담아 친구와 주고받을 수 있습니다. 함께하는 탐험 목표를 통해 진행 상황을 확인하고 서로의 발견을 공유합니다.', '같은 곤충을 서로 다른 시선으로 바라보며, 친구와 함께하는 탐험 경험으로 확장합니다.'] }
  ];
  var introEl = null;
  function showIntro(n) {
    var d = INTRO[n]; introEl = document.createElement('div'); introEl.className = 'demo-intro'; introEl.setAttribute('role', 'status');
    introEl.innerHTML = '<h2><span></span><span></span></h2><div></div>';
    var sp = introEl.querySelectorAll('h2 span'); sp[0].textContent = d.n; sp[1].textContent = d.t;
    d.p.forEach(function (x) { var p = document.createElement('p'); p.textContent = x; introEl.lastChild.appendChild(p); });
    phone.appendChild(introEl);
  }
  function hideIntro(fast) {
    var el = introEl; introEl = null; if (!el) return;
    if (fast) { el.remove(); return; }
    el.classList.add('off'); setTimeout(function () { el.remove(); }, 400);
  }

  // ---------- 상태 ----------
  function getMode() { try { return sessionStorage.getItem(MODE) === 'user' ? 'user' : 'auto'; } catch (e) { return 'auto'; } }
  function setMode(m) { try { if (m === 'user') sessionStorage.setItem(MODE, 'user'); else sessionStorage.removeItem(MODE); } catch (e) {} }
  var tok = 0, userTimer = 0, endTimer = 0;
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  // 이 화면에서 새 이야기가 시작되면 그 번호 (자동 재생 중일 때만)
  var introNo = getMode() !== 'auto' ? 0 : page === 'home.html' && !qs.get('state') ? 1 : page === 'dogam.html' && ssGet(DG) !== '1' ? 2 : page === 'friends.html' ? 3 : 0;
  if (introNo) showIntro(introNo);

  // ---------- 도우미 ----------
  var $ = function (s) { return document.querySelector(s); };
  var all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var rnd = function (n) { return Math.floor(Math.random() * n); };
  var shown = function (el) { return !!el && el.getClientRects().length > 0 && !el.closest('[hidden]'); };
  function sleep(ms, t) { return new Promise(function (r) { setTimeout(function () { r(t === tok); }, ms); }); }   // 그 사이 멈췄다면 false
  async function waitFor(fn, t, max) {                          // 조건이 될 때까지 (시간이 지나도 안 되면 그냥 넘어가요). 멈췄다면 false
    var t0 = Date.now();
    while (!fn()) { if (!(await sleep(80, t))) return false; if (Date.now() - t0 > (max || 6000)) break; }
    return t === tok;
  }
  function place(x, y) {                                        // 화면 좌표 → .phone 안 좌표 (폰 크기에 맞춰 줄어든 것까지 계산)
    var pr = phone.getBoundingClientRect(), k = pr.width / phone.offsetWidth;
    ring.style.left = ((x - pr.left) / k) + 'px'; ring.style.top = ((y - pr.top) / k) + 'px';
  }
  function pulseAt(el) {
    var r = el.getBoundingClientRect(); place(r.left + r.width / 2, r.top + r.height / 2);
    ring.classList.remove('go', 'hold'); void ring.offsetWidth; ring.classList.add('go');
  }
  async function tap(target, t, o) {                            // 손가락이 먼저 나타나고, 누르는 순간에 실제로 눌러요
    var el = typeof target === 'function' ? target() : (typeof target === 'string' ? null : target);
    if (typeof target === 'string') { if (!(await waitFor(function () { return shown($(target)); }, t))) return false; el = $(target); }
    if (typeof target === 'function' && !el) { if (!(await waitFor(function () { el = target(); return shown(el); }, t))) return false; }
    if (!el) return true;
    pulseAt(el);
    if (!(await sleep(560, t))) return false;
    if (!(o && o.noClick)) el.click();
    return true;
  }
  function ptr(el, type, x, y) {
    el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 77, pointerType: 'touch', isPrimary: true, width: 1, height: 1, pressure: type === 'pointerup' ? 0 : .5 }));
  }
  async function drag(el, pts, stepMs, t) {                     // pts: 캔버스 안 비율 [[0~1, 0~1], …] — 손가락이 따라가며 그려요
    var r = el.getBoundingClientRect(), X = function (p) { return r.left + p[0] * r.width; }, Y = function (p) { return r.top + p[1] * r.height; };
    place(X(pts[0]), Y(pts[0])); ring.classList.remove('go'); ring.classList.add('hold');
    ptr(el, 'pointerdown', X(pts[0]), Y(pts[0]));
    for (var i = 1; i < pts.length; i++) {
      if (!(await sleep(stepMs, t))) { ptr(el, 'pointercancel', X(pts[i]), Y(pts[i])); ring.classList.remove('hold'); return false; }
      place(X(pts[i]), Y(pts[i])); ptr(el, 'pointermove', X(pts[i]), Y(pts[i]));
    }
    ptr(el, 'pointerup', X(pts[pts.length - 1]), Y(pts[pts.length - 1]));
    ring.classList.remove('hold');
    return true;
  }
  async function scrollTo(y, ms, t) {                            // 화면을 손가락으로 쓸어 내리듯 부드럽게 (y = 'end' 면 맨 아래)
    var sc = $('.phone > .scroll') || document.scrollingElement; if (!sc) return true;
    var from = sc.scrollTop, to = y === 'end' ? sc.scrollHeight - sc.clientHeight : y, t0 = performance.now(), prev = sc.style.scrollBehavior;
    sc.style.scrollBehavior = 'auto';
    while (true) {
      var k = Math.min(1, (performance.now() - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      sc.scrollTop = from + (to - from) * e;
      if (k >= 1) break;
      if (!(await sleep(16, t))) { sc.style.scrollBehavior = prev; return false; }
    }
    sc.style.scrollBehavior = prev; return true;
  }
  function circle(cx, cy, rx, ry, n) { var p = []; for (var i = 0; i <= n; i++) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return p; }

  // ---------- 처음부터 다시 (새 관객 · 새 바퀴) ----------
  function reset() {
    try {
      Object.keys(sessionStorage).forEach(function (k) { if (/^pico\.(capture\.|photo|analysis|drawing|demo\.dogam)/.test(k)) sessionStorage.removeItem(k); });
      localStorage.removeItem('pico.safetyAccepted');            // 안전 약속 시트부터 다시 보여 줘요
    } catch (e) {}
  }
  function snapField() { try { sessionStorage.setItem(BASE, JSON.stringify(window.PicoField ? PicoField.list().map(function (m) { return m.id; }) : [])); } catch (e) {} }
  function markAuto() {                                           // 들판에 막 놓은 PICO = 자동 재생이 놓은 것 (관객이 직접 놓은 건 아니에요)
    try {
      var base = JSON.parse(sessionStorage.getItem(BASE) || 'null'); sessionStorage.removeItem(BASE);
      if (!base || !window.PicoField) return;
      sessionStorage.setItem(AUTO, JSON.stringify(PicoField.list().map(function (m) { return m.id; }).filter(function (id) { return base.indexOf(id) < 0; })));
    } catch (e) {}
  }
  function cleanAuto() {                                          // 다음 바퀴를 시작할 때, 자동 재생이 놓았던 PICO만 치워요 (관객이 직접 놓은 건 그대로)
    try {
      var ids = JSON.parse(sessionStorage.getItem(AUTO) || '[]'); sessionStorage.removeItem(AUTO);
      if (window.PicoField) ids.forEach(function (id) { PicoField.remove(id); });
    } catch (e) {}
  }
  async function feedPhoto() {                                    // 카메라 대신 예시 사진을 넣어요 (사진첩에서 고른 것과 같은 길)
    var inp = $('#pickAlbum'); if (!inp) return;
    var b = await (await fetch(SAMPLE)).blob(), dt = new DataTransfer();
    dt.items.add(new File([b], 'ladybug.png', { type: 'image/png' })); inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---------- 화면별 순서 ----------
  var DIARY = [' 가까이서 보니 정말 예뻤어요.', ' 한참 동안 구경했어요.', ' 오늘 처음 만난 친구예요.', ' 가만히 보니 귀여웠어요.'];
  var BODY = ['빨강', '주황', '노랑', '파랑'];
  var crayon = function (label) { return function () { return all('#crayons .crayon').filter(function (b) { return b.getAttribute('aria-label') === label; })[0]; }; };
  var option = function () { return all('#options .opt')[rnd(3)]; };
  var tab = function (label) { return function () { return $('.tabbar-group a[aria-label="' + label + '"]'); }; };
  var SCRIPTS = {
    'home.html': function () {
      if (qs.get('state') === 'field') return [['do', markAuto], ['wait', 3400], ['tap', tab('도감')]];             // 01 끝: 들판에 놓은 모습을 보여 준 뒤 → 02 도감으로
      return [['do', function () { reset(); cleanAuto(); }], ['intro'], ['wait', function () { return 600 + Math.random() * 1500; }], ['tap', '.tab-cam']];   // 폰이 여러 대여도 같은 순간에 같은 화면이 되지 않게 조금씩 달라요
    },
    'capture-1.html': function () {
      return [['wait', 1000],
        ['if', function () { return shown($('#safety')); }, [['wait', 2300], ['tap', '#promise'], ['wait', 900]]],
        ['tap', '#shutter', { noClick: true }], ['do', feedPhoto],
        ['until', function () { return $('.ai-next'); }, 20000], ['wait', 1700], ['tap', '.ai-next']];
    },
    'capture-3.html': function () {
      return [['wait', 1400],
        ['tap', option], ['wait', 700], ['tap', '#next'], ['wait', 1100],                                       // 02-1 위치
        ['until', function () { return $('#trace.on'); }, 4000], ['do', async function (t) {                      // 02-2 움직임: 사진 위에 길을 그려요
          var p = [], n = 22; for (var i = 0; i <= n; i++) p.push([.16 + .68 * i / n, .62 - .24 * i / n + .1 * Math.sin(i / n * 6.28)]);
          return drag($('#trace'), p, (700 + rnd(800)) / n, t);
        }], ['wait', 1000], ['tap', '#next'], ['wait', 1100],
        ['tap', option], ['wait', 700], ['tap', '#next']];                                                       // 02-3 특징
    },
    'capture-4.html': function () {
      return [['wait', 1300], ['tap', function () { return all('#chips .chip')[0]; }], ['wait', 800],
        ['do', async function (t) {                                                                              // 일기를 한 글자씩 써요
          var d = $('#diary'), s = DIARY[rnd(DIARY.length)];
          for (var i = 0; i < s.length; i++) { if (!(await sleep(70, t))) return false; d.value += s[i]; d.dispatchEvent(new Event('input', { bubbles: true })); }
          return true;
        }], ['wait', 900], ['tap', '.cta.step']];
    },
    'capture-5.html': function () {
      var body = BODY[rnd(BODY.length)];
      return [['wait', 1200], ['tap', crayon(body)], ['wait', 500],
        ['do', function (t) { return drag($('#pad'), circle(.5, .5, .27, .2, 36), 24, t); }], ['wait', 1500],       // 몸통을 그리면 색이 채워져요
        ['do', async function (t) {                                                                              // 머리 · 날개 (같은 색)
          var pad = $('#pad'), loops = [circle(.5, .24, .07, .055, 20), circle(.37, .52, .08, .11, 16), circle(.63, .52, .08, .11, 16)];
          for (var i = 0; i < loops.length; i++) { if (!(await sleep(450, t))) return false; if (!(await drag(pad, loops[i], 24, t))) return false; }
          return true;
        }], ['wait', 900], ['tap', crayon('회색')], ['wait', 500],
        ['do', async function (t) {                                                                              // 가운데 줄 · 점 (회색 — 가장 많이 쓴 색은 몸통 색이 되게 적게)
          var pad = $('#pad');
          if (!(await drag(pad, [[.5, .3], [.5, .42], [.5, .56], [.5, .7]], 80, t))) return false;
          var dots = [[.4, .46], [.6, .46]];
          for (var i = 0; i < dots.length; i++) { if (!(await sleep(350, t))) return false; if (!(await drag(pad, circle(dots[i][0], dots[i][1], .028, .022, 14), 24, t))) return false; }
          return true;
        }], ['wait', 1500], ['tap', '.cta.step']];
    },
    'capture-card.html': function () {
      return [['until', function () { return !document.documentElement.classList.contains('fold-pending'); }, 25000], ['wait', 2600],   // 종이로 접는 연출이 끝나고, 카드를 잠깐 보여 줘요
        ['do', snapField], ['tap', '#release']];
    },
    // ---- 02. Collect ----
    'dogam.html': function () {
      if (ssGet(DG) === '1') return [['wait', 1200], ['tap', tab('친구')]];                                          // 카드를 보고 돌아왔다면 → 03 친구로
      ssSet(DG, '1');
      return [['intro'], ['wait', 600], ['do', function (t) { return scrollTo(560, 1900, t); }], ['wait', 500], ['do', function (t) { return scrollTo(0, 1300, t); }], ['wait', 700],
        ['tap', function () { var c = all('.icard'); return c.filter(function (x) { return /무당벌레/.test(x.getAttribute('data-name') || ''); })[0] || c[0]; }]];
    },
    'dogam-detail.html': function () {
      return [['wait', 1300], ['do', function (t) { return scrollTo('end', 7000, t); }], ['wait', 900], ['tap', 'a[aria-label="뒤로"]']];
    },
    // ---- 03. Connect ----
    'friends.html': function () {
      return [['intro'], ['wait', 900], ['tap', function () { return all('#envs button.fr:not(.on)')[0]; }], ['wait', 1100],
        ['do', function (t) { return scrollTo(300, 1500, t); }], ['wait', 1300], ['tap', '#letter .ph']];
    },
    'friend-field.html': function () {
      return [['wait', 4800], ['do', function () { beginEnd(); return true; }]];                                    // 다 돌았어요 → 종료 안내
    }
  };
  var OTHER = function () { return [['wait', 1500], ['go', 'home.html']]; };                                    // 순서가 없는 화면에 있다면 홈으로

  async function run(ops, t) {
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i], k = op[0], a = typeof op[1] === 'function' && k === 'wait' ? op[1]() : op[1], ok = true;
      if (k === 'wait') ok = await sleep(a, t);
      else if (k === 'intro') { if (introEl) { ok = await sleep(INTRO_MS, t); if (ok) { hideIntro(); ok = await sleep(420, t); } } }
      else if (k === 'tap') ok = await tap(a, t, op[2]);
      else if (k === 'until') ok = await waitFor(a, t, op[2]);
      else if (k === 'do') { var r = await a(t); ok = r !== false && t === tok; }
      else if (k === 'if') { if (a()) ok = await run(op[2], t); }
      else if (k === 'go') { location.href = a; return false; }
      if (!ok) return false;
    }
    return true;
  }

  // ---------- 관객이 만지면 넘겨받기 · 종료 안내 ----------
  function armUser() { clearTimeout(userTimer); userTimer = setTimeout(beginEnd, USER_IDLE_MS); }
  function beginEnd() {
    var n = END_COUNT; endSec.textContent = n; endEl.classList.add('on'); clearInterval(endTimer);
    endTimer = setInterval(function () { n--; if (n > 0) { endSec.textContent = n; return; } clearInterval(endTimer); finish(); }, 1000);
  }
  function cancelEnd() { clearInterval(endTimer); endEl.classList.remove('on'); }
  function finish() { setMode('auto'); reset(); location.href = 'home.html'; }                  // 홈으로 돌아가면 자동 재생이 다시 시작돼요
  function onInput(e) {
    if (!e.isTrusted) return;                                                                   // 자동으로 누른 가짜 터치는 세지 않아요
    if (getMode() === 'auto') { setMode('user'); tok++; ring.classList.remove('go', 'hold'); hideIntro(true); }
    if (endEl.classList.contains('on')) cancelEnd();
    armUser();
  }
  ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'mousedown', 'keydown', 'wheel'].forEach(function (ev) { addEventListener(ev, onInput, { passive: true, capture: true }); });
  addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });          // 뒤로 가기로 남아 있던 옛 화면이면 새로 시작

  // 자동 재생 중에는 폰 화면이 꺼지지 않게 해요 (폰 설정의 자동 잠금도 '안 함'으로)
  var wake = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', function () { wake = null; }); } } catch (e) {} }
  keepAwake(); document.addEventListener('visibilitychange', keepAwake);

  // ---------- 시작 ----------
  (async function () {
    while (!document.getElementById('pico-ready')) await new Promise(function (r) { setTimeout(r, 50); });
    if (getMode() === 'user') { armUser(); return; }
    var t = ++tok;
    if (!(await sleep(700, t))) return;                                                         // 화면이 나타나는 디졸브가 끝나도록
    await run((SCRIPTS[page] || OTHER)(), t);
  })();
})();
