// 탭 전환 기본 로직 — 화면이 추가되면 여기서 각 탭에 맞는 화면을 보여주도록 확장하세요.
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    // TODO: data-tab 값에 따라 .screen 안의 내용을 교체
  });
});

// PWA 서비스워커 등록 (오프라인 캐싱 없이, 홈 화면 추가만 지원)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
