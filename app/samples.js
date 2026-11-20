// PICO · 전시용 예시 곤충 5종
// 전시장에서는 진짜 곤충을 찍을 수 없어서, 전시 모드(?demo=1)에서는 셔터를 누르면(또는 사진첩 버튼을 누르면) 아래 예시 곤충이 차례로 "찍혀요".
// 그 곤충의 사진 · 이름 · 분석글 · 관찰 질문과 보기가 이어서 나오고, 서버 AI에는 묻지 않아요. 전시 모드가 아니면 평소처럼 진짜 카메라 · AI를 써요.
//   focus  : 가로로 긴 사진을 세로 사진틀(375×445)에 맞춰 자를 때 어느 쪽을 보여 줄지 (0 = 왼쪽 끝 · 1 = 오른쪽 끝)
//   crayon : 자동 재생이 몸통에 칠하는 색연필 (4단계 그림)
//   analysis : ai.js 의 예시 분석(DEMO)과 같은 모양이에요 — options 1 위치(3개) · 2 움직임(4개: 느림·빠름·구불구불·멈췄다 움직임 순서) · 3 특징(4개), questions 3, match(색 0~7 · 나머지는 보기 번호)
(function () {
  var CUR = 'pico.sample.cur';   // sessionStorage: 이번 관찰의 예시 곤충 {k, n, c}
  var IDX = 'pico.sample.i';     // localStorage: 다음에 찍힐 예시 번호 (폰마다 다른 곳에서 시작해서 여러 대가 같은 곤충을 동시에 보여 주지 않아요)
  var LIST = [
    { key: 'peacock', photo: 'assets/tabs/detail-peacock.jpg', focus: .5, crayon: '주황',
      analysis: { demo: true, is_insect: true, name: '공작나비', group: '나비류', confidence: 'medium',
        summary: ['날개에 큰 눈 무늬가 있어요.', '꽃꿀을 먹으며 날아다녀요.', '어른 나비로 겨울잠을 자요.'],
        options: { 1: ['풀잎 위에 있어요.', '나무에 있어요.', '꽃 위에 있어요.'], 2: ['천천히 날아요.', '빠르게 날아요.', '하늘하늘 구불구불 날아요.', '앉았다 날아올라요.'], 3: ['없어요.', '1~2개 보여요.', '3~4개 보여요.', '5개가 넘어요.'] },
        questions: { 3: '날개에 눈 모양 무늬가 몇 개 보이나요?' }, match: { 0: 1, 1: 2, 2: 2, 3: 1 } } },
    { key: 'dragonfly', photo: 'assets/tabs/detail-dragonfly.jpg', focus: .68, crayon: '빨강',
      analysis: { demo: true, is_insect: true, name: '고추잠자리', group: '잠자리류', confidence: 'medium',
        summary: ['빨간 몸이 눈에 확 띄어요.', '날개 네 장으로 쌩쌩 날아요.', '모기를 잡아먹는 친구예요.'],
        options: { 1: ['풀잎 위에 있어요.', '나무에 있어요.', '물 위에 있어요.'], 2: ['천천히 날아요.', '휙휙 빠르게 날아요.', '구불구불 날아요.', '날다가 멈춰 앉아요.'], 3: ['머리가 빨개요.', '날개가 빨개요.', '꼬리 쪽이 빨개요.', '다리가 빨개요.'] },
        questions: { 3: '몸에서 빨간 곳은 어디인가요?' }, match: { 0: 0, 1: 0, 2: 1, 3: 2 } } },
    { key: 'stagbeetle', photo: 'assets/tabs/detail-stagbeetle.jpg', focus: .7, crayon: '회색',
      analysis: { demo: true, is_insect: true, name: '사슴벌레', group: '딱정벌레류', confidence: 'medium',
        summary: ['사슴뿔 같은 큰 턱이 있어요.', '참나무 수액을 핥아 먹어요.', '껍데기가 단단하고 반짝여요.'],
        options: { 1: ['나뭇잎 위에 있어요.', '땅 위에 있어요.', '꽃 주변에 있어요.'], 2: ['느릿느릿 걸어요.', '재빨리 걸어요.', '구불구불 걸어요.', '가다가 멈춰요.'], 3: ['작은 더듬이만 있어요.', '사슴뿔 같은 큰 턱이 있어요.', '긴 코가 있어요.', '날개가 있어요.'] },
        questions: { 3: '머리 앞에 무엇이 있나요?' }, match: { 0: 5, 1: 0, 2: 0, 3: 1 } } },
    { key: 'grasshopper', photo: 'assets/tabs/detail-greengrasshopper.jpg', focus: .5, crayon: '연두',
      analysis: { demo: true, is_insect: true, name: '메뚜기', group: '메뚜기류', confidence: 'medium',
        summary: ['풀색 몸이라 풀숲에 숨어요.', '긴 뒷다리로 폴짝 뛰어요.', '풀잎을 갉아 먹고 살아요.'],
        options: { 1: ['풀잎 위에 있어요.', '나뭇가지에 붙어 있어요.', '땅 위에 있어요.'], 2: ['느리게 기어가요.', '빠르게 폴짝 뛰어요.', '구불구불 기어가요.', '멈췄다가 폴짝 뛰어요.'], 3: ['짧고 가늘어요.', '길고 튼튼해요.', '다리가 없어요.', '날개처럼 얇아요.'] },
        questions: { 3: '뒷다리는 어떻게 생겼나요?' }, match: { 0: 3, 1: 1, 2: 3, 3: 1 } } },
    { key: 'hoverfly', photo: 'assets/tabs/detail-hoverfly.jpg', focus: .6, crayon: '노랑',
      analysis: { demo: true, is_insect: true, name: '꽃등에', group: '파리류', confidence: 'medium',
        summary: ['벌처럼 노란 줄무늬가 있어요.', '하지만 침이 없는 파리 친구예요.', '꽃꿀을 먹고 꽃가루를 옮겨요.'],
        options: { 1: ['풀잎 위에 있어요.', '나무에 있어요.', '꽃 위에 있어요.'], 2: ['느릿느릿 걸어요.', '빠르게 날아가요.', '구불구불 날아요.', '멈췄다 날아요.'], 3: ['빨간색과 검은색이에요.', '노란색과 검은색이에요.', '파란색과 흰색이에요.', '줄무늬가 없어요.'] },
        questions: { 3: '몸에 어떤 색 줄무늬가 있나요?' }, match: { 0: 2, 1: 2, 2: 3, 3: 1 } } }
  ];

  function on() { try { return localStorage.getItem('pico.demo') === '1'; } catch (e) { return false; } }
  function idx() {
    var i = NaN; try { i = parseInt(localStorage.getItem(IDX), 10); } catch (e) {}
    if (!(i >= 0)) i = Math.floor(Math.random() * LIST.length);
    return i % LIST.length;
  }
  // 이번에 "찍을" 예시 곤충을 정하고, 다음 번호로 넘겨 둬요
  function next() {
    var i = idx(), s = LIST[i];
    try { localStorage.setItem(IDX, String((i + 1) % LIST.length)); } catch (e) {}
    try { sessionStorage.setItem(CUR, JSON.stringify({ k: s.key, n: s.analysis.name, c: s.crayon })); } catch (e) {}
    return s;
  }
  // 이번 관찰에서 찍은 예시 곤충 (없으면 null)
  function current() {
    var c = null; try { c = JSON.parse(sessionStorage.getItem(CUR) || 'null'); } catch (e) {}
    if (!c) return null;
    for (var i = 0; i < LIST.length; i++) if (LIST[i].key === c.k) return LIST[i];
    return null;
  }
  window.PicoSamples = { LIST: LIST, on: on, next: next, current: current };
})();
