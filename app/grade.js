// PICO · 곤충 단계 (자주 만나는 · 조금 찾아야 하는 · 관찰하기 어려운) + 꼼꼼 관찰
// 곤충 카드 위에 작은 이름표로 붙이고, 도감 맨 위에는 단계별로 몇 종을 만났는지 보여 줘요.
//   PicoGrade.tag('반딧불이')  →  <span class="gr gr-rare">어려워요</span>  (모양은 base.css의 .gr)
//   PicoGrade.look()           →  이번 관찰의 "꼼꼼 관찰" {level: 1~3, stars: '★★☆'} (촬영 2의 질문 답이 AI가 본 것과 얼마나 같은지)
// 단계는 사진마다 AI가 정하지 않고 곤충 종마다 정해 둬요. 목록에 없는 곤충은 "조금 찾아야 하는"으로 봐요.
// 어려운 단계는 "위험한 곳"이 아니라 "계절·시간을 기다리거나 움직임이 빨라 찍기 어려운" 곤충으로 잡았어요.
(function () {
  var TIERS = {
    common: { name: '자주 만나는', short: '쉽게 만나요', label: '쉽게 만나요', total: 30, got: 14 },
    normal: { name: '조금 찾아야 하는', short: '찾아야 해요', label: '찾아야 해요', total: 30, got: 7 },
    rare:   { name: '관찰하기 어려운', short: '어려워요', label: '어려워요', total: 20, got: 3 }
  };   // got = 프로토타입에서 보여 줄 내가 만난 수 (14 + 7 + 3 = 24종 / 80종)
  var ORDER = ['common', 'normal', 'rare'];
  var RARE = ['반딧불이', '장수풍뎅이', '긴수염대벌레', '붉은점모시나비', '상제나비'];
  var COMMON = ['칠성무당벌레', '배추흰나비', '방아깨비', '고추잠자리', '소금쟁이', '꿀벌', '네발나비', '귀뚜라미', '점박이초록파리', '연두금파리', '흰줄숲모기'];
  function norm(n) { return String(n || '').replace(/\s+/g, ''); }
  function of(name) {
    var n = norm(name);
    return RARE.indexOf(n) > -1 ? 'rare' : COMMON.indexOf(n) > -1 ? 'common' : 'normal';
  }
  function tagOf(key) { var t = TIERS[key] || TIERS.normal; return '<span class="gr gr-' + (TIERS[key] ? key : 'normal') + '" title="' + t.name + ' 곤충">' + t.short + '</span>'; }
  function tag(name) { return tagOf(of(name)); }

  // 꼼꼼 관찰: 답한 질문 중 AI가 사진에서 본 것과 같은 보기를 고른 비율 → 별 1~3개 (틀렸다고 하지 않아서 최소 1개)
  function look() {
    var m = null; try { m = JSON.parse(sessionStorage.getItem('pico.capture.match') || 'null'); } catch (e) {}
    if (!m || m.ratio == null) return null;
    var level = m.ratio >= 0.75 ? 3 : m.ratio >= 0.5 ? 2 : 1;
    return { level: level, stars: '★★★'.slice(0, level) + '☆☆☆'.slice(0, 3 - level) };
  }

  window.PicoGrade = { TIERS: TIERS, ORDER: ORDER, of: of, label: function (name) { return (TIERS[of(name)] || TIERS.normal).short; }, tag: tag, tagOf: tagOf, look: look };
})();
