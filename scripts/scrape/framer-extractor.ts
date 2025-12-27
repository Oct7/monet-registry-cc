/**
 * Framer 사이트 감지 및 데이터 추출 모듈
 *
 * 커스텀 도메인에서도 동작하도록 HTML 내부 속성 기반으로 Framer 사이트를 감지하고,
 * data-framer-* 속성에서 레이어 정보와 애니메이션 패턴을 추출합니다.
 */

import type { Page } from "puppeteer";
import type {
  FramerElementInfo,
  FramerAnimationPattern,
  FramerInfo,
  AnimationType,
} from "./types";

// ============================================
// Transform 파싱
// ============================================

interface TransformValues {
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
  skewX?: number;
  skewY?: number;
}

/**
 * CSS transform 문자열을 파싱하여 개별 값으로 분해
 */
function parseTransform(transform: string): TransformValues {
  const values: TransformValues = {};
  const regex = /(\w+)\(([^)]+)\)/g;
  let match;

  while ((match = regex.exec(transform)) !== null) {
    const [, prop, value] = match;
    const numValue = parseFloat(value);

    switch (prop) {
      case "translateX":
        values.translateX = numValue;
        break;
      case "translateY":
        values.translateY = numValue;
        break;
      case "translateZ":
        values.translateZ = numValue;
        break;
      case "scale":
        values.scale = numValue;
        break;
      case "scaleX":
        values.scaleX = numValue;
        break;
      case "scaleY":
        values.scaleY = numValue;
        break;
      case "rotate":
        values.rotate = numValue;
        break;
      case "rotateX":
        values.rotateX = numValue;
        break;
      case "rotateY":
        values.rotateY = numValue;
        break;
      case "skewX":
        values.skewX = numValue;
        break;
      case "skewY":
        values.skewY = numValue;
        break;
    }
  }

  return values;
}

// ============================================
// Transition 파싱
// ============================================

interface TransitionPart {
  property: string;
  duration: number;
  easing: string;
  delay?: number;
}

/**
 * CSS transition 문자열을 파싱하여 개별 transition으로 분해
 */
function parseTransitions(str: string): TransitionPart[] {
  if (!str || str === "all 0s ease 0s") return [];

  return str.split(",").map((part) => {
    const [property, duration, easing, delay] = part.trim().split(/\s+/);
    return {
      property: property || "all",
      duration: parseFloat(duration) || 0.3,
      easing: easing?.replace(/-/g, "") || "ease",
      delay: delay ? parseFloat(delay) : undefined,
    };
  });
}

/**
 * Framer 사이트 감지
 * 커스텀 도메인에서도 동작하도록 HTML 내부 속성 기반 감지
 */
export async function isFramerSite(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    // 1. Framer 스크립트 확인
    const hasFramerScript =
      document.querySelector('script[src*="framer.com"]') !== null ||
      document.querySelector('script[src*="framerusercontent.com"]') !== null;

    // 2. Generator 메타 태그 확인
    const generator = document.querySelector('meta[name="generator"]');
    const hasFramerMeta =
      generator?.getAttribute("content")?.includes("Framer") ?? false;

    // 3. data-framer-* 속성 확인 (가장 확실한 방법)
    const hasFramerAttributes =
      document.querySelector("[data-framer-name]") !== null ||
      document.querySelector("[data-framer-appear-id]") !== null ||
      document.querySelector("[data-framer-component-type]") !== null;

    // 4. Framer 스타일시트 확인
    let hasFramerStyles = false;
    try {
      hasFramerStyles = Array.from(document.styleSheets).some(
        (sheet) =>
          sheet.href?.includes("framer") ||
          sheet.href?.includes("framerusercontent")
      );
    } catch {
      // CORS로 인해 스타일시트 접근 불가능한 경우 무시
    }

    // 5. Framer CSS 변수 확인
    const hasFramerCssVars =
      getComputedStyle(document.documentElement).getPropertyValue(
        "--framer-aspect-ratio-supported"
      ) !== "";

    return (
      hasFramerScript ||
      hasFramerMeta ||
      hasFramerAttributes ||
      hasFramerStyles ||
      hasFramerCssVars
    );
  });
}

/**
 * data-framer-* 속성 추출
 */
export async function extractFramerElements(
  page: Page
): Promise<FramerElementInfo[]> {
  return await page.evaluate(() => {
    const elements: FramerElementInfo[] = [];
    const framerElements = document.querySelectorAll(
      "[data-framer-name], [data-framer-appear-id], [data-framer-component-type]"
    );

    framerElements.forEach((el, idx) => {
      const computed = getComputedStyle(el);
      const framerName = el.getAttribute("data-framer-name");
      const framerAppearId = el.getAttribute("data-framer-appear-id");

      // 고유 선택자 생성
      let selector = `[data-framer-appear-id="${framerAppearId}"]`;
      if (!framerAppearId) {
        selector = framerName
          ? `[data-framer-name="${framerName}"]`
          : `framer-el-${idx}`;
      }

      elements.push({
        selector,
        framerName: framerName || undefined,
        framerAppearId: framerAppearId || undefined,
        framerComponentType:
          el.getAttribute("data-framer-component-type") || undefined,
        initialTransform:
          computed.transform !== "none" ? computed.transform : undefined,
        initialOpacity: computed.opacity !== "1" ? computed.opacity : undefined,
        transition:
          computed.transition !== "all 0s ease 0s"
            ? computed.transition
            : undefined,
        animation:
          computed.animationName !== "none" ? computed.animation : undefined,
      });
    });

    return elements;
  });
}

/**
 * 애니메이션 패턴 분석
 */
export function analyzeAnimationPatterns(
  elements: FramerElementInfo[]
): FramerAnimationPattern[] {
  const patterns: FramerAnimationPattern[] = [];

  for (const el of elements) {
    if (!el.initialTransform && !el.initialOpacity) continue;

    const pattern = detectPattern(el);
    if (pattern) {
      patterns.push({
        ...pattern,
        target: el.framerName || el.selector,
      });
    }
  }

  return patterns;
}

function detectPattern(
  el: FramerElementInfo
): Omit<FramerAnimationPattern, "target"> | null {
  const initial: Record<string, number | string> = {};
  const animate: Record<string, number | string> = {};

  // Opacity 분석
  if (el.initialOpacity && parseFloat(el.initialOpacity) < 1) {
    initial.opacity = parseFloat(el.initialOpacity);
    animate.opacity = 1;
  }

  // Transform 분석 (새로운 parseTransform 함수 사용)
  if (el.initialTransform) {
    const transform = parseTransform(el.initialTransform);

    if (transform.translateY !== undefined) {
      initial.y = transform.translateY;
      animate.y = 0;
    }
    if (transform.translateX !== undefined) {
      initial.x = transform.translateX;
      animate.x = 0;
    }
    if (transform.translateZ !== undefined) {
      initial.z = transform.translateZ;
      animate.z = 0;
    }
    if (transform.scale !== undefined) {
      initial.scale = transform.scale;
      animate.scale = 1;
    }
    if (transform.scaleX !== undefined) {
      initial.scaleX = transform.scaleX;
      animate.scaleX = 1;
    }
    if (transform.scaleY !== undefined) {
      initial.scaleY = transform.scaleY;
      animate.scaleY = 1;
    }
    if (transform.rotate !== undefined) {
      initial.rotate = transform.rotate;
      animate.rotate = 0;
    }
    if (transform.rotateX !== undefined) {
      initial.rotateX = transform.rotateX;
      animate.rotateX = 0;
    }
    if (transform.rotateY !== undefined) {
      initial.rotateY = transform.rotateY;
      animate.rotateY = 0;
    }
    if (transform.skewX !== undefined) {
      initial.skewX = transform.skewX;
      animate.skewX = 0;
    }
    if (transform.skewY !== undefined) {
      initial.skewY = transform.skewY;
      animate.skewY = 0;
    }
  }

  // Blur 효과 감지 (filter: blur() 사용 가능한 경우)
  // 참고: initialTransform에 blur가 있을 수 있으나, 보통 filter 속성에서 처리됨
  // 여기서는 간단히 blur-in을 opacity + scale 조합으로 추론

  if (Object.keys(initial).length === 0) return null;

  // 패턴 타입 결정 (확장된 버전)
  let type: AnimationType = "fade-in";

  // fade-up: translateY < 0 (아래에서 위로) + opacity
  // fade-down: translateY > 0 (위에서 아래로) + opacity
  // fade-left: translateX > 0 (오른쪽에서 왼쪽으로) + opacity
  // fade-right: translateX < 0 (왼쪽에서 오른쪽으로) + opacity
  if ("y" in initial && "opacity" in initial) {
    type = (initial.y as number) > 0 ? "fade-down" : "fade-up";
  } else if ("x" in initial && "opacity" in initial) {
    type = (initial.x as number) > 0 ? "fade-left" : "fade-right";
  } else if ("x" in initial) {
    type = "slide-in";
  } else if ("scale" in initial && (initial.scale as number) < 1) {
    type = "scale-in";
  } else if ("scale" in initial && (initial.scale as number) > 1) {
    type = "scale-out";
  } else if ("rotate" in initial || "rotateX" in initial || "rotateY" in initial) {
    type = "rotate-in";
  } else if ("opacity" in initial && "scale" in initial && (initial.scale as number) < 1) {
    // blur-in 효과는 보통 opacity + scale 조합으로 구현됨
    type = "blur-in";
  }

  // Transition 파싱
  const transition = parseTransition(el.transition);

  return { type, initial, animate, transition };
}

function parseTransition(
  transitionStr?: string
): FramerAnimationPattern["transition"] {
  if (!transitionStr) {
    return { duration: 0.5, ease: "easeOut" };
  }

  // "opacity 0.3s ease-out 0.1s" 형식 파싱
  const parts = transitionStr.split(" ");
  return {
    duration: parseFloat(parts[1]) || 0.5,
    ease: parts[2]?.replace(/-/g, "") || "easeOut",
    delay: parts[3] ? parseFloat(parts[3]) : undefined,
  };
}

/**
 * Framer CSS 변수 추출
 */
export async function extractFramerCssVariables(
  page: Page
): Promise<Record<string, string>> {
  return await page.evaluate(() => {
    const variables: Record<string, string> = {};
    const computed = getComputedStyle(document.documentElement);

    // 주요 Framer CSS 변수들
    const framerVarNames = [
      "--framer-aspect-ratio-supported",
      "--framer-link-text-color",
      "--framer-link-text-decoration",
      "--framer-paragraph-spacing",
    ];

    for (const name of framerVarNames) {
      const value = computed.getPropertyValue(name).trim();
      if (value) {
        variables[name] = value;
      }
    }

    return variables;
  });
}

/**
 * 다국어 카테고리 매핑
 */
const MULTILANG_CATEGORY_MAP: Record<string, string[]> = {
  hero: ["hero", "히어로", "ヒーロー", "英雄", "bannière"],
  header: ["header", "nav", "navigation", "헤더", "ヘッダー", "导航", "navbar"],
  footer: ["footer", "푸터", "フッター", "页脚"],
  pricing: ["pricing", "price", "가격", "料金", "价格", "plan", "plans"],
  testimonial: [
    "testimonial",
    "review",
    "후기",
    "レビュー",
    "评价",
    "reviews",
  ],
  faq: ["faq", "질문", "よくある質問", "常见问题", "question", "questions"],
  cta: ["cta", "call-to-action", "행동유도"],
  contact: ["contact", "연락", "お問い合わせ", "联系"],
  feature: ["feature", "features", "기능", "機能", "功能"],
  stats: ["stats", "statistics", "통계", "統計", "统计"],
  "logo-cloud": ["logo", "logos", "partner", "partners", "client", "clients"],
  team: ["team", "people", "팀", "チーム", "团队"],
  "how-it-works": ["how-it-works", "process", "steps", "workflow"],
};

/**
 * Framer 레이어명 → 카테고리 매핑 (다국어 지원)
 */
export function inferCategoryFromFramerName(framerName: string): string | null {
  const lowerName = framerName.toLowerCase();

  for (const [category, keywords] of Object.entries(MULTILANG_CATEGORY_MAP)) {
    if (keywords.some((kw) => lowerName.includes(kw.toLowerCase()))) {
      return category;
    }
  }

  return null;
}

/**
 * 전체 Framer 데이터 추출
 */
export async function extractFramerSiteData(page: Page): Promise<FramerInfo> {
  const isFramer = await isFramerSite(page);

  if (!isFramer) {
    return {
      isFramerSite: false,
      elements: [],
      animations: [],
      cssVariables: {},
    };
  }

  const elements = await extractFramerElements(page);
  const animations = analyzeAnimationPatterns(elements);
  const cssVariables = await extractFramerCssVariables(page);

  return {
    isFramerSite: true,
    elements,
    animations,
    cssVariables,
  };
}
