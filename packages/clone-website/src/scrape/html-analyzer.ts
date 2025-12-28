/**
 * HTML 구조 분석 및 섹션 분할 로직
 */

import {
  DOMNode,
  DOMSection,
  CATEGORY_HINTS,
  SEMANTIC_PRIORITY,
  FramerElementInfo,
} from "./types";
import { inferCategoryFromFramerName } from "./framer-extractor";

/**
 * DOM 분석 옵션
 */
export interface AnalyzeOptions {
  totalHeight: number;
  minSectionRatio?: number; // 기본값 0.03 (3%)
  minAbsoluteHeight?: number; // 기본값 100px
  enableAdaptiveThreshold?: boolean; // 적응형 임계값 활성화 (기본값: false)
  enableMultiDimensionalConfidence?: boolean; // 다차원 신뢰도 점수 활성화 (기본값: false)
}

/**
 * 신뢰도 계산 팩터
 */
interface ConfidenceFactors {
  semanticTag: boolean; // 시맨틱 태그 여부
  heightRatio: number; // 높이 비율
  hasHeading: boolean; // h1-h6 포함 여부
  categoryMatch: boolean; // 카테고리 힌트 매칭
  childDensity: number; // 자식 요소 밀도
}

/**
 * 적응형 최소 높이 계산
 */
function calculateMinHeight(options: AnalyzeOptions): number {
  const ratioBasedMin = options.totalHeight * (options.minSectionRatio || 0.03);
  return Math.max(ratioBasedMin, options.minAbsoluteHeight || 100);
}

/**
 * heading 태그를 포함하는지 확인
 */
function hasHeadingChild(node: DOMNode): boolean {
  const headingTags = ["h1", "h2", "h3", "h4", "h5", "h6"];
  if (headingTags.includes(node.tag)) return true;
  return node.children.some((child) => hasHeadingChild(child));
}

/**
 * 다차원 신뢰도 점수 계산
 */
function calculateConfidence(
  node: DOMNode,
  factors: ConfidenceFactors,
  totalHeight: number
): number {
  let score = 0;

  // 시맨틱 태그 여부 (0.3)
  if (factors.semanticTag) {
    score += 0.3;
  }

  // 높이 비율 (0.2) - 높을수록 중요한 섹션일 가능성
  score += Math.min(node.rect.height / totalHeight, 0.2);

  // heading 포함 여부 (0.15)
  if (factors.hasHeading) {
    score += 0.15;
  }

  // 카테고리 매칭 (0.2)
  if (factors.categoryMatch) {
    score += 0.2;
  }

  // 자식 요소 밀도 (0.15) - 구조화된 콘텐츠일 가능성
  score += Math.min(factors.childDensity / 20, 0.15);

  return Math.min(score, 1);
}

/**
 * DOM 노드에서 CSS 선택자 생성
 */
function buildSelector(node: DOMNode): string {
  let selector = node.tag;
  if (node.id) {
    selector += `#${node.id}`;
  } else if (node.className) {
    const firstClass = node.className.split(" ")[0];
    if (firstClass && !firstClass.includes(":")) {
      selector += `.${firstClass}`;
    }
  }
  return selector;
}

/**
 * DOM 노드의 텍스트에서 카테고리 추론
 * @param node DOM 노드
 * @param framerName Framer 레이어명 (data-framer-name 속성값)
 */
function inferCategory(node: DOMNode, framerName?: string): string | null {
  // Framer 레이어명이 있으면 우선 확인 (가장 정확)
  if (framerName) {
    const framerCategory = inferCategoryFromFramerName(framerName);
    if (framerCategory) {
      return framerCategory;
    }
  }

  // 기존 로직: 태그, id, className에서 추론
  const textToSearch = [node.tag, node.id, node.className]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const [category, hints] of Object.entries(CATEGORY_HINTS)) {
    if (hints.some((hint) => textToSearch.includes(hint))) {
      return category;
    }
  }

  return null;
}

/**
 * Framer 요소 정보를 사용하여 DOM 섹션의 카테고리를 보강
 */
export function enhanceSectionsWithFramerData(
  sections: DOMSection[],
  framerElements: FramerElementInfo[]
): DOMSection[] {
  if (framerElements.length === 0) {
    return sections;
  }

  return sections.map((section) => {
    // 이미 카테고리가 있으면 유지
    if (section.category) {
      return section;
    }

    // Framer 요소 중 해당 섹션과 관련된 것 찾기
    const relatedFramerEl = framerElements.find((el) => {
      // selector가 섹션 selector에 포함되거나 매칭
      if (el.framerName) {
        const sectionText = [section.tag, section.selector].join(" ").toLowerCase();
        return sectionText.includes(el.framerName.toLowerCase());
      }
      return false;
    });

    if (relatedFramerEl?.framerName) {
      const framerCategory = inferCategoryFromFramerName(relatedFramerEl.framerName);
      if (framerCategory) {
        return {
          ...section,
          category: framerCategory,
          confidence: 0.85, // Framer 레이어 기반 추론은 높은 신뢰도
        };
      }
    }

    return section;
  });
}

/**
 * DOM 트리에서 섹션 분할 (하이브리드 1차 단계)
 */
export function analyzeDOM(
  domTree: DOMNode,
  options?: AnalyzeOptions
): DOMSection[] {
  const sections: DOMSection[] = [];
  const coveredRanges: { start: number; end: number }[] = [];

  // 옵션 기본값 설정
  const enableAdaptiveThreshold = options?.enableAdaptiveThreshold ?? false;
  const enableMultiDimensionalConfidence =
    options?.enableMultiDimensionalConfidence ?? false;

  // 적응형 임계값 계산 (활성화된 경우)
  const minHeightThreshold = enableAdaptiveThreshold && options
    ? calculateMinHeight(options)
    : 100; // 기본값: 100px

  const totalHeight = options?.totalHeight ?? 5000; // 기본값

  // 1차: 시맨틱 태그 기반 분할
  function findSemanticSections(node: DOMNode, depth: number = 0): void {
    const isSemanticTag = SEMANTIC_PRIORITY.includes(node.tag);
    const hasSignificantHeight = node.rect.height > minHeightThreshold;

    if (isSemanticTag && hasSignificantHeight) {
      const selector = buildSelector(node);
      const category = inferCategory(node);

      // 신뢰도 계산
      let confidence: number;
      if (enableMultiDimensionalConfidence) {
        const factors: ConfidenceFactors = {
          semanticTag: true,
          heightRatio: node.rect.height / totalHeight,
          hasHeading: hasHeadingChild(node),
          categoryMatch: category !== null,
          childDensity: node.children.length,
        };
        confidence = calculateConfidence(node, factors, totalHeight);
      } else {
        // 기존 로직 유지
        confidence = node.tag === "section" ? 0.9 : 0.8;
      }

      sections.push({
        index: sections.length,
        tag: node.tag,
        selector,
        category,
        rect: {
          top: node.rect.top,
          height: node.rect.height,
        },
        confidence,
      });

      coveredRanges.push({
        start: node.rect.top,
        end: node.rect.top + node.rect.height,
      });

      // 시맨틱 태그 내부는 더 깊이 탐색하지 않음 (단, main은 제외)
      if (node.tag !== "main") {
        return;
      }
    }

    // 자식 탐색
    for (const child of node.children) {
      findSemanticSections(child, depth + 1);
    }
  }

  findSemanticSections(domTree);

  // 2차: 높이 기반 추가 분할 (시맨틱 태그로 분할되지 않은 영역)
  function findGaps(node: DOMNode, depth: number = 0): void {
    // 적응형 임계값 사용 (활성화된 경우)
    const gapMinHeight = enableAdaptiveThreshold && options
      ? calculateMinHeight(options) * 2 // 2배로 더 보수적으로
      : 200; // 기본값: 200px

    const gapSectionHeight = enableAdaptiveThreshold && options
      ? calculateMinHeight(options) * 3 // 3배로 더 보수적으로
      : 300; // 기본값: 300px

    if (node.rect.height < gapMinHeight || depth > 5) return;

    const nodeStart = node.rect.top;
    const nodeEnd = nodeStart + node.rect.height;

    // 이미 커버된 영역인지 확인
    const isCovered = coveredRanges.some(
      (range) => nodeStart >= range.start && nodeEnd <= range.end
    );

    // div이고 충분히 크고 아직 커버되지 않은 경우
    if (!isCovered && node.tag === "div" && node.rect.height > gapSectionHeight) {
      // 자식 중 하나라도 시맨틱 태그면 스킵
      const hasSemanticChild = node.children.some((c) =>
        SEMANTIC_PRIORITY.includes(c.tag)
      );

      if (!hasSemanticChild) {
        const selector = buildSelector(node);
        const category = inferCategory(node);

        // 신뢰도 계산
        let confidence: number;
        if (enableMultiDimensionalConfidence) {
          const factors: ConfidenceFactors = {
            semanticTag: false,
            heightRatio: node.rect.height / totalHeight,
            hasHeading: hasHeadingChild(node),
            categoryMatch: category !== null,
            childDensity: node.children.length,
          };
          confidence = calculateConfidence(node, factors, totalHeight);
        } else {
          // 기존 로직 유지
          confidence = 0.5;
        }

        sections.push({
          index: sections.length,
          tag: node.tag,
          selector,
          category,
          rect: {
            top: node.rect.top,
            height: node.rect.height,
          },
          confidence,
        });

        coveredRanges.push({
          start: nodeStart,
          end: nodeEnd,
        });
      }
    }

    for (const child of node.children) {
      findGaps(child, depth + 1);
    }
  }

  findGaps(domTree);

  // 정렬 및 인덱스 재할당
  sections.sort((a, b) => a.rect.top - b.rect.top);
  sections.forEach((s, i) => {
    s.index = i;
  });

  // 중복/겹침 제거
  return deduplicateSections(sections);
}

/**
 * 겹치는 섹션 제거 (더 높은 confidence 유지)
 */
function deduplicateSections(sections: DOMSection[]): DOMSection[] {
  const result: DOMSection[] = [];

  for (const section of sections) {
    const overlapping = result.find((existing) => {
      const overlapStart = Math.max(existing.rect.top, section.rect.top);
      const overlapEnd = Math.min(
        existing.rect.top + existing.rect.height,
        section.rect.top + section.rect.height
      );
      const overlapHeight = overlapEnd - overlapStart;

      // 50% 이상 겹치면 중복으로 판단
      const minHeight = Math.min(existing.rect.height, section.rect.height);
      return overlapHeight > minHeight * 0.5;
    });

    if (overlapping) {
      // confidence가 더 높은 것을 유지
      if (section.confidence > overlapping.confidence) {
        const idx = result.indexOf(overlapping);
        result[idx] = section;
      }
    } else {
      result.push(section);
    }
  }

  // 인덱스 재할당
  result.forEach((s, i) => {
    s.index = i;
  });

  return result;
}

/**
 * 섹션 조정 적용 (AI 피드백 기반)
 */
export function applySectionAdjustments(
  sections: DOMSection[],
  adjustments: Array<{
    type: "merge" | "split" | "recategorize";
    indices: number[];
    newCategory?: string;
    splitAt?: number;
  }>
): DOMSection[] {
  let result = [...sections];

  for (const adj of adjustments) {
    switch (adj.type) {
      case "merge":
        // 여러 섹션을 하나로 병합
        const toMerge = adj.indices
          .map((i) => result[i])
          .filter(Boolean)
          .sort((a, b) => a.rect.top - b.rect.top);

        if (toMerge.length >= 2) {
          const first = toMerge[0];
          const last = toMerge[toMerge.length - 1];

          const merged: DOMSection = {
            index: first.index,
            tag: first.tag,
            selector: first.selector,
            category: adj.newCategory || first.category,
            rect: {
              top: first.rect.top,
              height: last.rect.top + last.rect.height - first.rect.top,
            },
            confidence: 0.7,
          };

          // 병합된 섹션들 제거하고 새 섹션 추가
          result = result.filter((s) => !adj.indices.includes(s.index));
          result.push(merged);
        }
        break;

      case "recategorize":
        // 카테고리 변경
        for (const idx of adj.indices) {
          if (result[idx] && adj.newCategory) {
            result[idx].category = adj.newCategory;
          }
        }
        break;

      case "split":
        // 섹션 분할 (추후 구현)
        break;
    }
  }

  // 정렬 및 인덱스 재할당
  result.sort((a, b) => a.rect.top - b.rect.top);
  result.forEach((s, i) => {
    s.index = i;
  });

  return result;
}
