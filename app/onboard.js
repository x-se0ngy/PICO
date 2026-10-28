// PICO 온보딩: 건너뛰기를 누르면 종이 모서리가 대각선을 따라 접힌 뒤 홈으로 가요.
(function () {
  var fold = document.querySelector('.ob-fold'); if (!fold) return;
  var hit = fold.querySelector('.ob-fold-hit');
  hit.addEventListener('click', function (e) {
    e.preventDefault();
    if (fold.classList.contains('is-folding')) return;
    var go = hit.getAttribute('href');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { location.href = go; return; }
    fold.classList.add('is-folding');
    var ms = parseFloat(getComputedStyle(fold).getPropertyValue('--fold')) || 720;
    setTimeout(function () { location.href = go; }, ms + 180);   // 다 접힌 모습을 잠깐 보여 준 뒤 이동
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) fold.classList.remove('is-folding'); });   // 뒤로 가기로 돌아오면 다시 펴져 있어요
})();
