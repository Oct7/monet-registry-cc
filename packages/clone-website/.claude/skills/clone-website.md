---
name: clone-website
description: 웹사이트 URL을 입력받아 React/Tailwind 프로젝트로 클론합니다. 새 프로젝트를 시작할 때 참고할 디자인을 가져올 수 있습니다.
---

# Clone Website Skill

웹사이트를 React/Tailwind 컴포넌트로 변환하는 AI 기반 클론 도구입니다.

## 사용법

### 한 번에 클론 (권장)

```bash
# URL만 입력하면 스크래핑 + 프로젝트 생성까지 한번에!
npx @anthropic/clone-website clone https://stripe.com

# 프로젝트명 지정
npx @anthropic/clone-website clone https://stripe.com my-stripe

# 의존성 설치까지 자동
npx @anthropic/clone-website clone https://stripe.com --install
```

옵션:
- `-o, --output <dir>`: 출력 디렉토리
- `-t, --template <type>`: nextjs|vite|remix
- `-v, --viewport <type>`: mobile|tablet|desktop|wide|all
- `-s, --scale <factor>`: Retina 스크린샷 배율 (1 또는 2)
- `--install`: pnpm install 자동 실행
- `--no-lazy-load`: Lazy-load 트리거 비활성화

### 스크래핑만 수행 (선택)

```bash
npx @anthropic/clone-website scrape https://example.com -o ./scraped
```

## 워크플로우

1. **스크래핑 단계**
   - Puppeteer로 웹사이트 캡처
   - 섹션 자동 분할 (시맨틱 태그 + 높이 기반)
   - 이미지, 폰트, 비디오 추출
   - Framer 사이트 감지 및 애니메이션 패턴 추출

2. **분석 단계** (AI 수행)
   - 스크린샷 이미지 분석
   - 색상, 타이포그래피, 레이아웃 파악
   - 애니메이션 패턴 식별

3. **생성 단계**
   - React 컴포넌트 코드 생성
   - Tailwind CSS 스타일링
   - motion/react 애니메이션 구현

## 스크래핑 결과 활용

스크래핑 후 생성되는 파일들:

```
scraped/{domain}-{date}/
├── full-page.png          # 전체 페이지 스크린샷
├── page.html              # HTML 소스
├── sections.json          # 섹션 분할 정보
├── images.json            # 이미지 목록
├── fonts.json             # 폰트 정보
├── framer.json            # Framer 애니메이션 (해당 시)
├── metadata.json          # 메타데이터
└── sections/
    ├── section-0.png      # 섹션별 스크린샷
    ├── section-1.png
    └── ...
```

## AI 에이전트 연동

이 skill을 사용하는 AI 에이전트는 다음을 수행합니다:

1. `scrape` 명령으로 대상 웹사이트 캡처
2. `sections/` 폴더의 이미지를 분석
3. `fonts.json`, `framer.json` 데이터 참조
4. React 컴포넌트 코드 생성
5. Tailwind 스타일 적용
6. motion/react 애니메이션 구현

## 예시

```bash
# Stripe 랜딩페이지 클론 (가장 간단한 방법)
npx @anthropic/clone-website clone https://stripe.com

# Next.js 템플릿으로 클론 + 의존성 자동 설치
npx @anthropic/clone-website clone https://stripe.com -t nextjs --install

# 결과 (--install 사용 시)
cd stripe-com-clone
pnpm dev
```

## 지원 기능

- ✅ 다중 뷰포트 (mobile/tablet/desktop/wide)
- ✅ Retina 스크린샷
- ✅ Lazy-load 콘텐츠 트리거
- ✅ Framer 사이트 특화 (애니메이션 추출)
- ✅ 시맨틱 섹션 분할
- ✅ 폰트 감지 (Google Fonts, Adobe Fonts)
- ✅ Next.js / Vite / Remix 템플릿

## 제한사항

- 로그인이 필요한 페이지는 스크래핑 불가
- JavaScript 렌더링 후 콘텐츠만 캡처 (SSR 페이지 권장)
- 매우 긴 페이지는 최대 높이까지만 캡처
