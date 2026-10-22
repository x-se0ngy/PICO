// PICO · 관찰 등급 (흔함 · 보통 · 희귀)
// 곤충 카드 위에 작은 이름표로 붙여요. 이름이 목록에 없으면 "보통"이에요.
//   PicoGrade.tag('반딧불이')  →  <span class="gr gr-rare">희귀</span>  (모양은 쓰는 화면의 CSS에서 .gr · .gr-rare 등으로 꾸며요)
(function () {
  var RARE = ['반딧불이', '장수풍뎅이', '긴수염대벌레', '붉은점모시나비', '상제나비'];
  var COMMON = ['칠성무당벌레', '배추흰나비', '방아깨비', '고추잠자리', '소금쟁이', '꿀벌', '네발나비', '귀뚜라미', '점박이초록파리', '연두금파리', '흰줄숲모기'];
  var LABEL = { common: '흔함', normal: '보통', rare: '희귀' };
  function norm(n) { return String(n || '').replace(/\s+/g, ''); }
  function of(name) {
    var n = norm(name);
    return RARE.indexOf(n) > -1 ? 'rare' : COMMON.indexOf(n) > -1 ? 'common' : 'normal';
  }
  function tag(name) { var g = of(name); return '<span class="gr gr-' + g + '">' + LABEL[g] + '</span>'; }
  window.PicoGrade = { of: of, label: function (name) { return LABEL[of(name)]; }, tag: tag };
})();
