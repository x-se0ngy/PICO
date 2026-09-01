# PICO 웹앱 배포 가이드

## 지금 상태
- `393×852` 모바일 프레임 안에 홈 화면 뼈대(상태바 + 화면 영역 + 하단 탭바)가 잡혀 있어요.
- Figma 색상(마룬 #2A0E0B, 민트 #BCE8C4, 페이퍼 #F6F1E4, 골드 #C9A15A)과 폰트(Gowun Batang / Pretendard / Space Grotesk)가 이미 연결되어 있어요.
- PWA 설정이 되어 있어서, 배포 후 폰에서 "홈 화면에 추가"를 하면 진짜 앱처럼 아이콘이 생기고 풀스크린으로 열려요.

## 가장 빠른 배포 방법 (계정 가입 없이, 5분)

1. https://app.netlify.com/drop 접속
2. 이 폴더(`pico-app`) 전체를 브라우저에 드래그 앤 드롭
3. 몇 초 후 `https://랜덤이름.netlify.app` 링크가 바로 생성됨
4. 이 링크를 교수님께 공유하거나, QR코드 생성기(예: qr-code-generator.com)에 넣어서 전시장에 배치

> 나중에 화면을 업데이트하고 싶으면 같은 폴더를 다시 드래그하면 같은 링크로 재배포돼요.

## 나중에 계속 업데이트하며 쓰고 싶다면 (권장, GitHub 연동)

1. GitHub에 새 저장소 만들고 이 폴더 내용을 업로드
2. https://vercel.com 에서 GitHub 계정으로 로그인 → 저장소 Import
3. 별도 빌드 설정 없이 그대로 Deploy (정적 HTML이라 빌드 명령어 불필요)
4. 이후 GitHub에 코드를 새로 올릴 때마다 자동으로 재배포됨

## Figma 디자인을 받으면 할 일
- `index.html`의 `<main class="screen" id="screen-home">` 안쪽 `.placeholder` 부분을 실제 화면 마크업으로 교체
- 화면이 여러 개면 `<main class="screen">` 블록을 화면 수만큼 만들고, `app.js`의 탭 클릭 로직에서 보여줄 화면을 전환하도록 연결
- 이 프로젝트로 다시 가져오시면 제가 이어서 작업해드릴게요.

## 폴더 구조
```
pico-app/
├── index.html      # 메인 화면 (393x852 프레임)
├── style.css        # 색상/폰트/레이아웃
├── app.js           # 탭 전환 등 인터랙션
├── manifest.json     # PWA 설정
├── sw.js             # 서비스워커 (홈 화면 추가용)
└── icons/            # 앱 아이콘
```
