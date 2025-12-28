# @anthropic/clone-website

> Clone any website to React/Tailwind components using AI

웹사이트 URL을 입력하면 React/Tailwind 컴포넌트로 변환하는 CLI 도구입니다.

## 설치

```bash
npm install -g @anthropic/clone-website
# 또는
pnpm add -g @anthropic/clone-website
```

## 빠른 시작

### 웹사이트 클론 (가장 간단한 방법)

```bash
# URL만 입력하면 끝!
npx @anthropic/clone-website clone https://stripe.com

# 프로젝트명 지정
npx @anthropic/clone-website clone https://stripe.com my-saas

# 의존성 설치까지 자동
npx @anthropic/clone-website clone https://stripe.com --install
```

결과:
```
🚀 Cloning https://stripe.com → stripe-com-clone

✔ Scraping complete!
✔ Project created!

✨ Your new project is ready:
  ./stripe-com-clone

Next steps:
  $ cd stripe-com-clone
  $ pnpm install
  $ pnpm dev

Components generated: 8
  • stripe-com-clone-header-0
  • stripe-com-clone-hero-1
  • stripe-com-clone-feature-2
  ...
```

### 스크래핑만 수행

```bash
npx @anthropic/clone-website scrape https://example.com -o ./scraped
```

## CLI 명령어

### `scrape <url>`

웹사이트를 스크래핑하여 섹션별로 분할합니다.

```bash
clone-website scrape https://example.com [options]
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-o, --output <dir>` | 출력 디렉토리 | `./scraped/{domain}-{date}` |
| `-v, --viewport <type>` | 뷰포트: mobile\|tablet\|desktop\|wide\|all | `desktop` |
| `-s, --scale <factor>` | Retina 배율 (1 또는 2) | `1` |
| `--no-lazy-load` | Lazy-load 트리거 비활성화 | - |

### `clone <url> [name]`

웹사이트를 스크래핑하고 바로 새 프로젝트로 생성합니다. **가장 권장되는 명령어입니다.**

```bash
clone-website clone https://stripe.com [options]
clone-website clone https://stripe.com my-project [options]
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-o, --output <dir>` | 출력 디렉토리 | `.` |
| `-t, --template <type>` | 템플릿: nextjs\|vite\|remix | `vite` |
| `-v, --viewport <type>` | 뷰포트: mobile\|tablet\|desktop\|wide\|all | `desktop` |
| `-s, --scale <factor>` | Retina 배율 (1 또는 2) | `2` |
| `--no-lazy-load` | Lazy-load 트리거 비활성화 | - |
| `--install` | pnpm install 자동 실행 | - |

## 프로그래매틱 사용

```typescript
import { scrapeWebsite, generateProject } from '@anthropic/clone-website';

// 스크래핑
const scrapeResult = await scrapeWebsite({
  url: 'https://stripe.com',
  viewportName: 'desktop',
  deviceScaleFactor: 2,
});

console.log(`Found ${scrapeResult.sections.length} sections`);

// 프로젝트 생성
const projectResult = await generateProject({
  name: 'my-project',
  outputDir: './output',
  template: 'nextjs',
  scrapeResult,
});

console.log(`Created ${projectResult.components.length} components`);
```

## 출력 구조

### 스크래핑 결과

```
scraped/{domain}-{date}/
├── full-page.png          # 전체 페이지 스크린샷
├── page.html              # HTML 소스
├── dom-tree.json          # DOM 구조
├── sections.json          # 섹션 분할 정보
├── images.json            # 이미지 목록
├── fonts.json             # 폰트 정보
├── framer.json            # Framer 애니메이션 (해당 시)
├── metadata.json          # 메타데이터
└── sections/
    ├── section-0.png
    ├── section-1.png
    └── ...
```

### 생성된 프로젝트

```
my-project/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── README.md
├── src/
│   ├── globals.css
│   └── components/
│       ├── my-project-header-0/
│       │   ├── index.tsx
│       │   ├── metadata.yaml
│       │   └── preview.png
│       ├── my-project-hero-1/
│       └── ...
└── public/
    └── images/
```

## 특징

### 🎯 정확한 섹션 분할

- 시맨틱 태그 기반 분할 (`<header>`, `<section>`, `<footer>`)
- 적응형 높이 임계값
- 다차원 신뢰도 점수

### ✨ Framer 특화 지원

- Framer 사이트 자동 감지
- `data-framer-*` 속성에서 애니메이션 추출
- motion/react 코드로 자동 변환

### 🌐 다국어 레이어명 지원

- 영어, 한국어, 일본어, 중국어 레이어명 인식
- 정확한 카테고리 추론

### 📱 다중 뷰포트

- Mobile (375×812)
- Tablet (768×1024)
- Desktop (1440×900)
- Wide (1920×1080)

## Claude Code Skill로 사용

`.claude/skills/clone-website.md` 파일을 프로젝트에 추가하면 Claude Code에서 skill로 사용할 수 있습니다.

```markdown
> /skill clone-website https://example.com
```

## 라이선스

MIT © Anthropic
