// PICO 전시 데모 모드
//   아무도 안 만지면 → 세 가지 기능 소개 화면만 차례로 돌아요 (롤링)
//        01. Explore  발견하고 그리는 즐거운 관찰
//        02. Collect  접어서 모으는 나만의 도감
//        03. Connect  쪽지로 이어지는 우리의 탐험
//   소개 화면을 누르면 → 그 기능의 첫 화면으로 들어가서, 앱의 모든 기능을 직접 체험할 수 있어요
//        01 → 촬영   02 → 도감   03 → 친구
//   USER_IDLE_MS 동안 안 만지면 → "PICO 체험이 종료되었습니다! 3초 후 홈 화면으로 돌아갑니다." → 홈으로 돌아가 다시 롤링해요 (만지면 취소)
// 켜고 끄기: 전시 폰에서 주소 끝에 ?demo=1 로 한 번 열면 그 폰에 저장돼요 (끄기 ?demo=0). shared.js가 켜져 있을 때만 이 파일을 불러와요.
(function () {
  var MODE = 'pico.demo.mode';      // sessionStorage: 'user' = 관객이 체험하는 중 (없으면 롤링)
  var USER_IDLE_MS = 30000;         // 관객이 마지막으로 만진 뒤 이만큼 지나면 종료 안내
  var END_COUNT = 3;                // 종료 안내 카운트다운 (초)
  var ROLL_MS = 5500;               // 소개 화면 하나를 보여 주는 시간
  var FADE_MS = 350;                // 소개 화면이 바뀔 때 디졸브 시간

  var phone = document.querySelector('.phone'); if (!phone) return;
  var page = location.pathname.split('/').pop() || 'index.html';
  var qs = new URLSearchParams(location.search);

  var FEATURES = [
    { n: '01. Explore', t: '발견하고 그리는 즐거운 관찰', go: 'capture-1.html',
      p: ['발견한 곤충을 촬영하고 AI를 통해 특징을 자세히 살펴봅니다. 관찰한 내용을 직접 그림과 메모로 기록하며 자신만의 관찰 카드를 완성합니다.', '사진을 찍고 정보 확인하는 것을 넘어, 스스로 관찰하고 표현하는 능동적인 경험을 제공합니다.'] },
    { n: '02. Collect', t: '접어서 모으는 나만의 도감', go: 'dogam.html',
      p: ['직접 그린 곤충은 종이접기 형태의 피코로 완성되어 도감에 모입니다. 같은 곤충을 다시 발견하면 기존 카드에 새로운 관찰 기록이 쌓입니다.', '작은 발견이 하나의 특별한 기록으로 이어지고, 탐험을 거듭할수록 나만의 도감이 풍성해집니다.'] },
    { n: '03. Connect', t: '쪽지로 이어지는 우리의 탐험', go: 'friends.html',
      p: ['발견한 곤충과 관찰 기록을 쪽지에 담아 친구와 주고받을 수 있습니다. 함께하는 탐험 목표를 통해 진행 상황을 확인하고 서로의 발견을 공유합니다.', '같은 곤충을 서로 다른 시선으로 바라보며, 친구와 함께하는 탐험 경험으로 확장합니다.'] }
  ];

  // ---------- 스타일 ----------
  var css = document.createElement('style');
  css.textContent =
    '.demo-end{position:absolute;left:0;top:0;width:100%;height:812px;z-index:900;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--ink,#000);font-family:var(--font,inherit);background:rgba(255,252,228,.98);opacity:0;visibility:hidden;transition:opacity .4s ease-in-out,visibility 0s .4s}' +
    '.demo-end.on{opacity:1;visibility:visible;transition:opacity .4s ease-in-out}' +
    '.demo-end h3{margin:0 0 14px;font-size:24px;line-height:32px;font-weight:700}' +
    '.demo-end p{margin:0;font-size:16px;line-height:24px}' +
    '.demo-end p.sm{margin-top:28px;font-size:14px;opacity:.7}' +
    '.demo-roll{position:absolute;left:0;top:0;width:100%;height:812px;z-index:901;background:#fff;color:#000;font-family:var(--font,inherit);cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:0}' +
    '.demo-roll > *{opacity:1;transition:opacity ' + FADE_MS + 'ms ease-in-out}' +
    '.demo-roll.fade > *{opacity:0}' +
    '.demo-roll h2{position:absolute;left:24px;right:24px;top:78px;margin:0;font-size:28px;line-height:38px;font-weight:400}' +
    '.demo-roll h2 span{display:block}' +
    '.demo-roll div{position:absolute;left:24px;right:24px;bottom:58px}' +
    '.demo-roll p{margin:0 0 14px;font-size:15px;line-height:23px;word-break:keep-all}' +
    '.demo-roll p:last-child{margin-bottom:0}';
  document.head.appendChild(css);
  var endEl = document.createElement('div'); endEl.className = 'demo-end'; endEl.setAttribute('role', 'status'); endEl.setAttribute('aria-live', 'polite');
  endEl.innerHTML = '<h3>PICO 체험이<br>종료되었습니다!</h3><p><span id="demoSec">3</span>초 후 홈 화면으로<br>돌아갑니다.</p><p class="sm">다른 곤충도 관찰해 보세요!</p>';
  phone.appendChild(endEl);
  var endSec = endEl.querySelector('#demoSec');

  // ---------- 상태 ----------
  function getMode() { try { return sessionStorage.getItem(MODE) === 'user' ? 'user' : 'auto'; } catch (e) { return 'auto'; } }
  function setMode(m) { try { if (m === 'user') sessionStorage.setItem(MODE, 'user'); else sessionStorage.removeItem(MODE); } catch (e) {} }
  var userTimer = 0, endTimer = 0, rollTimer = 0;

  // 새 관객을 위해 관찰 중이던 임시 기록을 비워요 (들판에 놓은 PICO · 도감은 그대로)
  function reset() {
    try {
      Object.keys(sessionStorage).forEach(function (k) { if (/^pico\.(capture\.|photo|analysis|drawing)/.test(k)) sessionStorage.removeItem(k); });
      localStorage.removeItem('pico.safetyAccepted');            // 안전 약속 시트부터 다시 보여 줘요
    } catch (e) {}
  }

  // ---------- 롤링: 기능 소개 화면 ----------
  var rollEl = null, idx = Math.floor(Math.random() * FEATURES.length);   // 폰이 여러 대여도 같은 순간에 같은 화면이 되지 않게 시작 화면이 조금씩 달라요
  function fill(i) {
    var d = FEATURES[i], sp = rollEl.querySelectorAll('h2 span'), box = rollEl.querySelector('div');
    sp[0].textContent = d.n; sp[1].textContent = d.t; box.textContent = '';
    d.p.forEach(function (x) { var p = document.createElement('p'); p.textContent = x; box.appendChild(p); });
    rollEl.setAttribute('aria-label', d.n + ' ' + d.t + ' — 눌러서 체험하기');
  }
  function next() {
    rollEl.classList.add('fade');
    setTimeout(function () { idx = (idx + 1) % FEATURES.length; fill(idx); rollEl.classList.remove('fade'); rollTimer = setTimeout(next, ROLL_MS); }, FADE_MS + 30);
  }
  function select(i) {                                                                           // 누른 기능의 첫 화면으로 들어가요
    clearTimeout(rollTimer); setMode('user');
    location.href = FEATURES[i].go;
  }
  function startRoll() {
    rollEl = document.createElement('div'); rollEl.className = 'demo-roll'; rollEl.tabIndex = 0; rollEl.setAttribute('role', 'button');
    rollEl.innerHTML = '<h2><span></span><span></span></h2><div></div>';
    fill(idx); phone.appendChild(rollEl);
    rollEl.addEventListener('click', function (e) { if (e.isTrusted) select(idx); });
    rollEl.addEventListener('keydown', function (e) { if (e.isTrusted && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(idx); } });
    rollTimer = setTimeout(next, ROLL_MS - Math.random() * 2500);
  }

  // ---------- 관객이 체험하는 중 · 종료 안내 ----------
  function armUser() { clearTimeout(userTimer); userTimer = setTimeout(beginEnd, USER_IDLE_MS); }
  function beginEnd() {
    var n = END_COUNT; endSec.textContent = n; endEl.classList.add('on'); clearInterval(endTimer);
    endTimer = setInterval(function () { n--; if (n > 0) { endSec.textContent = n; return; } clearInterval(endTimer); finish(); }, 1000);
  }
  function cancelEnd() { clearInterval(endTimer); endEl.classList.remove('on'); }
  function finish() { setMode('auto'); reset(); location.href = 'home.html'; }                  // 홈으로 돌아가면 롤링이 다시 시작돼요
  function onInput(e) {
    if (!e.isTrusted || getMode() !== 'user') return;
    if (endEl.classList.contains('on')) cancelEnd();
    armUser();
  }
  ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'mousedown', 'keydown', 'wheel', 'scroll'].forEach(function (ev) { addEventListener(ev, onInput, { passive: true, capture: true }); });
  addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });          // 뒤로 가기로 남아 있던 옛 화면이면 새로 시작

  // 화면이 꺼지지 않게 해요 (폰 설정의 자동 잠금도 '안 함'으로)
  var wake = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', function () { wake = null; }); } } catch (e) {} }
  keepAwake(); document.addEventListener('visibilitychange', keepAwake);

  // ---------- 시작 ----------
  if (getMode() === 'user') { armUser(); return; }                                              // 체험 중이던 화면
  if (page !== 'home.html' || qs.get('state')) { location.replace('home.html'); return; }       // 롤링은 홈에서만 (다른 화면으로 열렸다면 홈으로)
  reset(); startRoll();
})();
