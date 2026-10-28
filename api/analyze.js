// PICO · AI 관찰 분석 (Vercel 서버 함수: POST /api/analyze)
//
// 아이가 찍은 사진을 Claude에게 보여 주고, 아래 두 가지를 JSON으로 받아요.
//   mode "identify"  (촬영 1) : 어떤 곤충인지, 분류, 아이에게 들려줄 분석글 3줄,
//                               관찰 질문 4개 = 공통 관찰(색·위치) + 맞춤 관찰(움직임·특징), 사진과 가장 가까운 보기 번호(match)
//                               위치(보기 3개)·특징(보기 4개)은 AI가 질문/보기를 만들고(특징은 "점이 몇 개 있나요?"처럼 세어 보는 질문),
//                               색(8색)·움직임(4가지)은 보기가 앱에 고정이라 AI는 번호만 알려 줘요.
//   mode "stickers"  (예전 스티커 단계용, 지금 화면은 쓰지 않아요) : 스티커를 붙인 자리에 맞는 선택지 4개
//
// 준비: Vercel 프로젝트 Settings → Environment Variables 에 아래 중 하나를 넣어 주세요.
//   ANTHROPIC_API_KEY  Claude (유료, 사진 한 장에 아주 적은 비용)
//   GEMINI_API_KEY     Google Gemini (Google AI Studio 무료 사용량으로 시작할 수 있어요)
// 둘 다 있으면 Claude를 먼저 써요. 둘 다 없으면 501을 돌려주고, 화면(app/ai.js)은 예시 분석으로 계속 진행해요.

const MODEL = process.env.PICO_AI_MODEL || 'claude-haiku-5-5';
const GEMINI_MODEL = process.env.PICO_GEMINI_MODEL || 'gemini-flash-latest';   // 항상 최신 Flash
const KINDS = ['색', '위치', '움직임', '특징'];          // 관찰 질문 (촬영 2)
const FIXED = [0];                                         // 보기가 앱에 고정된 질문: 색 (움직임은 곤충에 맞춰 문구를 새로 만들어요)
const STICKER_KINDS = ['모양', '장소', '움직임', '행동'];   // 예전 스티커 단계용
const GROUPS = ['나비류', '딱정벌레류', '벌·개미류', '잠자리류', '메뚜기류', '기타'];
const MAX_IMAGE_CHARS = 4_000_000;   // data URL 길이 (약 3MB 사진)

const STYLE = [
  '너는 어린이 자연 관찰 앱 PICO의 곤충 선생님이야. 사용자는 초등학생이야.',
  '쉬운 우리말, 부드러운 해요체로 써. 무섭거나 징그러운 표현, 어려운 학술어는 쓰지 마.',
  '사진에서 보이는 것만 말하고, 확실하지 않으면 "~인 것 같아요"처럼 조심스럽게 말해.',
  '독이 있거나 쏘는 곤충이면 "손대지 말고 눈으로만 봐요" 같은 안전 한마디를 분석글에 넣어.',
  '반드시 JSON 하나만 출력해. 설명, 마크다운, 코드 블록은 쓰지 마.'
].join('\n');

function identifyPrompt() {
  return [
    '이 사진 속 생물을 살펴봐 줘. 아래 모양의 JSON으로만 답해.',
    '{',
    '  "is_insect": true,                 // 곤충이나 거미·지렁이·달팽이 같은 작은 생물이 보이면 true, 안 보이거나 너무 흐리면 false',
    '  "name": "칠성무당벌레",             // 우리말 이름. 종까지 모르겠으면 "무당벌레 무리"처럼 넓게',
    `  "group": "딱정벌레류",             // 다음 중 하나: ${GROUPS.join(', ')}`,
    '  "confidence": "high",               // high | medium | low',
    '  "summary": ["...", "...", "..."],  // 아이에게 들려줄 분석글 3줄. 한 줄에 20자 이내, 문장마다 "요."로 끝내기',
    '  "questions": {                      // 아이에게 물어볼 질문. 20자 이내, "나요?"/"까요?"로 끝내기',
    '    "위치": "어디에 있었나요?", "특징": "..."',
    '  },',
    '  "options": {                        // 아이가 고를 보기. 각 11자 이내, "요."로 끝내기. 위치는 정확히 3개, 움직임과 특징은 정확히 4개',
    '    "위치": [...], "움직임": [...], "특징": [...]',
    '  },',
    '  "match": { "색": 0, "위치": 0, "움직임": 1, "특징": 3 }   // 질문마다 이 사진·이 곤충과 가장 가까운 보기의 번호. 알 수 없으면 그 질문은 빼',
    '}',
    '관찰 질문은 4가지야. 색은 앱에 보기가 정해져 있어서 보기를 만들지 말고 match 번호만 골라.',
    '- "색": 곤충 몸의 가장 큰 색. 0 빨강, 1 주황, 2 노랑, 3 초록, 4 파랑, 5 갈색, 6 검정, 7 흰색 (0~7). 이 8색에 없으면 가장 가까운 색으로.',
    '- "움직임": 아이가 사진 위에 곤충이 움직인 길을 손가락으로 그리면 앱이 선을 느림·빠름·구불구불·멈췄다 움직임 중 하나로 분류해. 그 네 가지에 맞는 보기를 이 곤충에 어울리는 말로 만들어. 질문은 만들지 마.',
    '  반드시 이 순서야: 0 느린 움직임, 1 빠른 움직임, 2 구불구불한 움직임, 3 움직이다 멈추는 움직임. 예) 나비라면 ["살랑살랑 날아요.", "휙 날아가요.", "이리저리 날아요.", "앉았다 날아요."], 무당벌레라면 ["느릿느릿 기어가요.", "재빨리 기어가요.", "빙글빙글 돌아요.", "가다가 멈춰요."]',
    '  match는 사진이 멈춰 있으니 이 곤충이 보통 보이는 움직임으로 골라(0~3).',
    '- "위치": 사진 속 배경(잎, 꽃, 나무, 땅, 물가 등)을 보고 곤충이 어디에 있는지 보기 3개를 만들어(0~2). 사진에 보이는 곳이 1개 이상 들어가게. "다른 곳" 보기는 앱이 따로 붙이니 넣지 마.',
    '- "특징": 이 곤충만의 눈에 띄는 모습을 세어 보는 질문이야. 점·줄무늬·날개·다리처럼 세어 볼 수 있는 것이 있으면',
    '  "등에 검은 점이 몇 개 있나요?"처럼 개수를 묻고, 보기는 "3개 있어요."처럼 서로 다른 개수 4개(사진의 실제 개수가 하나 들어가게)로 만들어.',
    '  세어 볼 것이 없으면 "어떤 무늬가 있나요?"처럼 생김새를 묻고 표현 보기 4개로 만들어.',
    '정답 고르기가 아니라 아이가 본 것을 말로 표현하도록 돕는 보기야. 서로 겹치지 않게 만들어.'
  ].join('\n');
}

function stickersPrompt(stickers, insectName) {
  const spots = stickers.map(s =>
    `- ${s.k + 1}번 "${STICKER_KINDS[s.k]}" 스티커: 사진 왼쪽에서 ${Math.round(s.u * 100)}%, 위에서 ${Math.round(s.v * 100)}% 자리`
  ).join('\n');
  return [
    insectName ? `사진 속 생물은 "${insectName}"(으)로 보여.` : '',
    '아이가 사진에서 궁금한 자리에 관찰 스티커를 붙였어.',
    spots,
    '스티커마다 그 자리를 자세히 보고, 아이가 고를 표현 4개를 만들어 줘.',
    '- 모양: 그 자리의 생김새·색·무늬 / 장소: 그 자리 주변 환경 / 움직임: 어떻게 움직일지 / 행동: 무엇을 하고 있는지',
    '- 각 11자 이내, "요."로 끝내기. 4개 중 2개 이상은 그 자리에서 실제로 보이는 것, 나머지는 있을 법한 것.',
    '아래 모양의 JSON으로만 답해. 키는 스티커 번호에서 1을 뺀 숫자(0~3)야.',
    '{ "options": { "0": ["...", "...", "...", "..."] } }'
  ].filter(Boolean).join('\n');
}

function parseImage(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  return m ? { media_type: m[1], data: m[2] } : null;
}

function firstJson(text) {
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no json');
  return JSON.parse(text.slice(start, end + 1));
}

const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
function four(list, max, n = 4) {
  if (!Array.isArray(list)) return null;
  const out = list.map(x => clean(x, max)).filter(Boolean).slice(0, n);
  return out.length === n ? out : null;
}

async function askClaude(image, prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1100,
      system: STYLE,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } },
        { type: 'text', text: prompt }
      ] }]
    })
  });
  if (!r.ok) throw new Error('anthropic ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const body = await r.json();
  const text = (body.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  return firstJson(text);
}

// Gemini 키: 이름은 GEMINI_API_KEY가 기본이고, GEMINI · GOOGLE_API_KEY 로 넣어도, 대소문자가 달라도(Gemini) 읽어요. (앞뒤 공백은 지워요)
const GEMINI_NAMES = ['GEMINI_API_KEY', 'GEMINI', 'GOOGLE_API_KEY'];
function geminiKey() {
  const k = Object.keys(process.env).find(n => GEMINI_NAMES.includes(n.toUpperCase()) && String(process.env[n] || '').trim());
  return k ? String(process.env[k]).trim() : '';
}

// Google Gemini (무료 사용량 있음). 같은 프롬프트로 같은 JSON을 받아요.
// 한 모델이 붐비면(503)·한도에 걸리면(429)·오래 걸리면 다음 모델로 넘어가요.
const GEMINI_FALLBACKS = ['gemini-flash-lite-latest'];
async function askGeminiOnce(model, image, prompt) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiKey() },
    signal: AbortSignal.timeout(9000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: STYLE }] },
      contents: [{ role: 'user', parts: [
        { inline_data: { mime_type: image.media_type, data: image.data } },
        { text: prompt }
      ] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 }
    })
  });
  if (!r.ok) throw new Error('gemini ' + r.status + ' ' + model + ' ' + (await r.text()).slice(0, 160));
  const body = await r.json();
  const parts = (body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts) || [];
  return firstJson(parts.map(p => p.text || '').join(''));
}
async function askGemini(image, prompt) {
  let last;
  for (const model of [GEMINI_MODEL, ...GEMINI_FALLBACKS]) {
    try { return await askGeminiOnce(model, image, prompt); }
    catch (e) {
      last = e;
      const m = String(e && e.message);
      const retry = e && (e.name === 'TimeoutError' || e.name === 'AbortError') || /^gemini (429|500|502|503|504)/.test(m);
      if (!retry) throw e;     // 키 오류(400·403)나 잘못된 요청은 다른 모델로 가도 같아요
    }
  }
  throw last;
}

// 키가 있는 쪽을 써요 (Claude 우선)
function ask(image, prompt) { return process.env.ANTHROPIC_API_KEY ? askClaude(image, prompt) : askGemini(image, prompt); }

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }
  if (!process.env.ANTHROPIC_API_KEY && !geminiKey()) { res.status(501).json({ ok: false, error: 'ANTHROPIC_API_KEY or GEMINI_API_KEY is not set' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  if (typeof body.image !== 'string' || body.image.length > MAX_IMAGE_CHARS) { res.status(400).json({ ok: false, error: 'image missing or too large' }); return; }
  const image = parseImage(body.image);
  if (!image) { res.status(400).json({ ok: false, error: 'image must be a base64 data URL' }); return; }

  try {
    if (body.mode === 'stickers') {
      const stickers = (Array.isArray(body.stickers) ? body.stickers : [])
        .filter(s => s && Number.isInteger(s.k) && s.k >= 0 && s.k < 4 && isFinite(s.u) && isFinite(s.v)).slice(0, 4);
      if (!stickers.length) { res.status(400).json({ ok: false, error: 'no stickers' }); return; }
      const j = await ask(image, stickersPrompt(stickers, clean(body.insect, 30)));
      const options = {};
      stickers.forEach(s => { const o = four(j.options && j.options[String(s.k)], 14); if (o) options[s.k] = o; });
      res.status(200).json({ ok: true, options });
      return;
    }

    const j = await ask(image, identifyPrompt());
    const options = {}, questions = {}, match = {};
    KINDS.forEach((k, i) => {
      const m = j.match && j.match[k];
      if (FIXED.includes(i)) {                      // 색(8색) · 움직임(4가지): 보기는 앱에 있어서 번호만 받아요
        if (Number.isInteger(m) && m >= 0 && m < (i === 0 ? 8 : 4)) match[i] = m;
        return;
      }
      const n = i === 1 ? 3 : 4;                    // 위치는 3개 (4번째 칸은 앱의 "다른 곳이에요")
      const o = four(j.options && j.options[k], 14, n); if (o) options[i] = o;
      const q = i === 2 ? '' : clean(j.questions && j.questions[k], 26);   // 움직임 질문은 앱의 "곤충은 어떻게 움직였나요?" 그대로
      if (q && o) questions[i] = q;
      if (o && Number.isInteger(m) && m >= 0 && m < n) match[i] = m;
    });
    const summary = (Array.isArray(j.summary) ? j.summary : []).map(s => clean(s, 30)).filter(Boolean).slice(0, 3);
    res.status(200).json({
      ok: true,
      is_insect: j.is_insect !== false,
      name: clean(j.name, 20) || '이름 모를 곤충',
      group: GROUPS.includes(j.group) ? j.group : '기타',
      confidence: ['high', 'medium', 'low'].includes(j.confidence) ? j.confidence : 'medium',
      summary,
      options,
      questions,
      match
    });
  } catch (e) {
    console.error(e);
    res.status(502).json({ ok: false, error: 'analysis failed', detail: /^(gemini|anthropic) \d{3}/.test(String(e && e.message)) ? String(e.message).slice(0, 240) : 'request failed (API 키 값을 확인해 주세요)' });   // 제공사가 돌려준 오류만 보여 주고, 그 밖의 오류는 키가 새지 않게 가려요
  }
};
