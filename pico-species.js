/* =========================================================
   PICO · 도감에 들어가는 생물 목록 (도감·랭킹 공용)
   - doodle: 들판 예시 그림과 같은 크레파스 그림체 SVG
   - 아이가 직접 그린 피코가 있으면 도감에서는 그 그림이 먼저 보여요.
   ========================================================= */
(() => {
  const g = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><g ${g}>${body}</g></svg>`;

  const SPECIES = [
    { id: 'bumblebee', name: '호박벌', category: '벌·개미류', lens: 4, level: '03', notes: 3,
      hint: '노란 꽃 주변에서 붕붕 소리가 나요.',
      doodle: svg(`<path d="M62 62C44 30 16 38 26 58c6 12 24 12 38 8ZM98 62c18-32 46-24 36-4-6 12-24 12-38 8Z" fill="#F4EDDD" stroke="#8C7B70" stroke-width="4.5"/>
        <path d="M58 116 48 132M80 120v16M102 116l10 16" stroke="#221B17" stroke-width="5"/>
        <ellipse cx="80" cy="92" rx="38" ry="32" fill="#F6D34C" stroke="#D2A91D" stroke-width="5"/>
        <path d="M50 84q30 10 60 0M48 104q32 10 64 0" stroke="#221B17" stroke-width="8"/>
        <circle cx="80" cy="58" r="16" fill="#221B17" stroke="#221B17" stroke-width="4"/>
        <circle cx="74" cy="56" r="3" fill="#F4EDDD"/><circle cx="87" cy="56" r="3" fill="#F4EDDD"/>
        <path d="M72 44 64 28M88 44l8-16" stroke="#221B17" stroke-width="4"/>`) },
    { id: 'ladybug', name: '무당벌레', category: '딱정벌레류', lens: 3, level: '02', notes: 2,
      hint: '잎 뒤에 숨어 있는 빨간 점박이.',
      doodle: svg(`<path d="M44 62 30 50M44 84 26 86M50 106 36 122M116 62 130 50M116 84 134 86M110 106 124 122" stroke="#221B17" stroke-width="5"/>
        <ellipse cx="80" cy="86" rx="40" ry="36" fill="#E43B45" stroke="#B82630" stroke-width="5"/>
        <path d="M80 52 80 120" stroke="#221B17" stroke-width="5"/>
        <path d="M58 44q22-18 44 0" fill="#221B17" stroke="#221B17" stroke-width="6"/>
        <circle cx="62" cy="76" r="6" fill="#221B17"/><circle cx="98" cy="74" r="6" fill="#221B17"/>
        <circle cx="64" cy="102" r="5.5" fill="#221B17"/><circle cx="97" cy="100" r="5.5" fill="#221B17"/>
        <path d="M70 40 62 26M90 40 98 26" stroke="#221B17" stroke-width="4"/>`) },
    { id: 'butterfly', name: '호랑나비', category: '나비·나방류', lens: 2, level: '01', notes: 1,
      hint: '꽃밭 위를 팔랑팔랑 날아다녀요.',
      doodle: svg(`<path d="M78 76C60 34 22 30 22 58c0 22 30 30 56 22Z" fill="#6B45B9" stroke="#4E2F8F" stroke-width="5"/>
        <path d="M82 76c18-42 56-46 56-18 0 22-30 30-56 22Z" fill="#6B45B9" stroke="#4E2F8F" stroke-width="5"/>
        <path d="M78 86c-26 2-44 18-34 34 8 12 30 2 34-20ZM82 86c26 2 44 18 34 34-8 12-30 2-34-20Z" fill="#F6D34C" stroke="#D2A91D" stroke-width="5"/>
        <circle cx="46" cy="58" r="7" fill="#F6D34C"/><circle cx="114" cy="58" r="7" fill="#F6D34C"/>
        <path d="M80 60v58" stroke="#221B17" stroke-width="7"/>
        <path d="M78 58 66 36M82 58l12-22" stroke="#221B17" stroke-width="4"/>`) },
    { id: 'snail', name: '달팽이', category: '그 밖의 친구', lens: 1, level: '01', notes: 1,
      hint: '비 온 뒤 촉촉한 돌 위를 찾아봐요.',
      doodle: svg(`<path d="M18 118q10 6 30 6h82q14 0 18-14" fill="#9BC641" stroke="#6E9A26" stroke-width="5"/>
        <path d="M140 110q2-26-6-40M126 104q-4-22-12-36" stroke="#6E9A26" stroke-width="5"/>
        <circle cx="134" cy="68" r="4" fill="#221B17"/><circle cx="113" cy="66" r="4" fill="#221B17"/>
        <circle cx="76" cy="84" r="38" fill="#F28A3B" stroke="#C4621D" stroke-width="5"/>
        <path d="M76 84m-6 0a6 6 0 1 1 12 0a12 12 0 1 1-24 0a18 18 0 1 1 36 0a24 24 0 1 1-48 0" stroke="#8A4A18" stroke-width="4.5"/>`) },
    { id: 'ant', name: '개미', category: '벌·개미류', hint: '과자 부스러기 근처에 줄지어 다녀요.' },
    { id: 'stagbeetle', name: '사슴벌레', category: '딱정벌레류', hint: '여름밤 참나무 수액 근처에 있어요.' },
    { id: 'beetle', name: '장수풍뎅이', category: '딱정벌레류', hint: '머리에 큰 뿔이 달린 힘센 친구.' },
    { id: 'whitebutterfly', name: '배추흰나비', category: '나비·나방류', hint: '텃밭 배추 잎 근처를 살펴봐요.' },
    { id: 'dragonfly', name: '고추잠자리', category: '잠자리류', hint: '가을 하늘에 빨갛게 떠 있어요.' },
    { id: 'grasshopper', name: '메뚜기', category: '메뚜기류', hint: '풀숲을 걸으면 톡 튀어올라요.' },
    { id: 'cicada', name: '매미', category: '매미류', hint: '한여름 나무에서 맴맴 울어요.' },
    { id: 'firefly', name: '반딧불이', category: '딱정벌레류', hint: '깨끗한 물가, 깜깜한 밤에 반짝여요.' },
  ];

  // 시연용으로 처음부터 만난 친구들 + 실제로 들판에 보낸 피코
  const DEMO_FOUND = ['bumblebee', 'ladybug', 'butterfly', 'snail'];

  function myPicos() {
    try {
      const list = JSON.parse(localStorage.getItem('pico.habitat.v1') || '[]');
      return Array.isArray(list) ? list.filter((p) => p && p.src && p.name) : [];
    } catch (e) { return []; }
  }

  function collection() {
    const mine = myPicos();
    return SPECIES.map((s) => {
      const drawn = mine.filter((p) => p.name === s.name);
      const found = DEMO_FOUND.includes(s.id) || drawn.length > 0;
      return {
        ...s,
        found,
        lens: found ? Math.max(s.lens || 1, Math.min(4, drawn.length)) : 0,
        notes: (s.notes || 0) + drawn.length,
        // 아이가 그린 그림이 있으면 가장 최근 것을 대표 그림으로
        img: drawn.length ? drawn[drawn.length - 1].src
          : s.doodle ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.doodle)}` : null,
      };
    });
  }

  window.PicoSpecies = { SPECIES, collection };
})();
