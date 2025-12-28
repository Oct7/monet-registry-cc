/**
 * 컴포넌트 생성 모듈
 */

import * as fs from 'fs';
import * as path from 'path';
import type { FontInfo } from '../scrape/types.js';
import type { TextReplacement } from '../content/types.js';

export interface GenerateOptions {
  name: string;
  outputDir: string;
  sectionImage: string;
  category?: string;
  fonts?: FontInfo[];
  language?: 'en' | 'ko' | 'ja' | 'zh';
  tags?: {
    functional?: string[];
    style?: string[];
    layout?: string[];
    industry?: string[];
  };
  sourceUrl?: string;
  sectionIndex?: number;
  /** Custom content code to include in component */
  customContent?: string;
  /** Text replacements to apply */
  textReplacements?: TextReplacement[];
}

export interface GenerateResult {
  success: boolean;
  componentDir: string;
  files: string[];
  error?: string;
}

/**
 * 컴포넌트 기본 템플릿 생성
 */
function generateComponentTemplate(
  name: string,
  category: string,
  customContent?: string
): string {
  const componentName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  // If custom content is provided, use it
  const contentBlock = customContent
    ? `// Content from content.yaml
${customContent}

const CONTENT = {
  headline: content.heading || "Your Headline Here",
  subheadline: content.subheading || "Your subheadline text goes here.",
  body: content.body || "",
  cta: {
    primary: { label: content.ctaText || "Get Started", href: content.ctaLink || "#" },
    secondary: { label: "Learn More", href: "#" },
  },
  items: content.items || [],
} as const;`
    : `const CONTENT = {
  headline: "Your Headline Here",
  subheadline: "Your subheadline text goes here.",
  body: "",
  cta: {
    primary: { label: "Get Started", href: "#" },
    secondary: { label: "Learn More", href: "#" },
  },
  items: [] as Array<{ title?: string; description?: string; icon?: string }>,
} as const;`;

  return `"use client";

import { motion } from "motion/react";

// ============================================================================
// CUSTOMIZATION - Edit these values to customize the component
// ============================================================================

${contentBlock}

const COLORS = {
  background: "var(--color-background, #FFFFFF)",
  text: "var(--color-foreground, #1A1A1A)",
  accent: "var(--color-primary, #3B82F6)",
} as const;

// ============================================================================
// END CUSTOMIZATION
// ============================================================================

interface ${componentName}Props {
  mode?: "light" | "dark";
}

export default function ${componentName}({ mode = "light" }: ${componentName}Props) {
  return (
    <section
      className="relative w-full py-16 md:py-24"
      style={{ backgroundColor: COLORS.background }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl" style={{ color: COLORS.text }}>
            {CONTENT.headline}
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {CONTENT.subheadline}
          </p>
          {CONTENT.body && (
            <p className="mt-4 text-base text-gray-500 max-w-3xl mx-auto">
              {CONTENT.body}
            </p>
          )}
          {CONTENT.items.length > 0 && (
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {CONTENT.items.map((item, index) => (
                <div key={index} className="p-6 rounded-xl bg-gray-50">
                  {item.icon && <span className="text-3xl">{item.icon}</span>}
                  {item.title && <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>}
                  {item.description && <p className="mt-2 text-gray-600">{item.description}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href={CONTENT.cta.primary.href}
              className="px-6 py-3 rounded-lg font-medium text-white transition-colors"
              style={{ backgroundColor: COLORS.accent }}
            >
              {CONTENT.cta.primary.label}
            </a>
            <a
              href={CONTENT.cta.secondary.href}
              className="px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {CONTENT.cta.secondary.label}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
`;
}

/**
 * 메타데이터 YAML 생성
 */
function generateMetadataYaml(options: GenerateOptions): string {
  const { name, category, fonts, language, tags, sourceUrl, sectionIndex } = options;

  let yaml = `schemaVersion: "2.0"
name: ${name}
category: ${category || 'hero'}

images:
  preview: registry/${name}/preview.png

`;

  if (tags) {
    yaml += 'tags:\n';
    if (tags.functional?.length) {
      yaml += `  functional:\n${tags.functional.map(t => `    - ${t}`).join('\n')}\n`;
    }
    if (tags.style?.length) {
      yaml += `  style:\n${tags.style.map(t => `    - ${t}`).join('\n')}\n`;
    }
    if (tags.layout?.length) {
      yaml += `  layout:\n${tags.layout.map(t => `    - ${t}`).join('\n')}\n`;
    }
    if (tags.industry?.length) {
      yaml += `  industry:\n${tags.industry.map(t => `    - ${t}`).join('\n')}\n`;
    }
  }

  if (fonts?.length) {
    yaml += `\nfontFamily:\n${fonts.map(f => `  - ${f.family}`).join('\n')}\n`;
  }

  if (sourceUrl) {
    yaml += `
source:
  type: url
  url: ${sourceUrl}
  scrapedAt: "${new Date().toISOString()}"
`;
    if (sectionIndex !== undefined) {
      yaml += `  sectionIndex: ${sectionIndex}\n`;
    }
  }

  yaml += `
createdAt: "${new Date().toISOString()}"
status: draft
language: ${language || 'en'}
`;

  return yaml;
}

/**
 * 컴포넌트 파일 생성
 */
export async function generateComponent(options: GenerateOptions): Promise<GenerateResult> {
  const { name, outputDir, sectionImage, category = 'hero', customContent } = options;

  const componentDir = path.join(outputDir, name);
  const files: string[] = [];

  try {
    // 디렉토리 생성
    fs.mkdirSync(componentDir, { recursive: true });
    fs.mkdirSync(path.join(componentDir, 'assets'), { recursive: true });

    // index.tsx 생성
    const indexPath = path.join(componentDir, 'index.tsx');
    fs.writeFileSync(indexPath, generateComponentTemplate(name, category, customContent));
    files.push(indexPath);

    // metadata.yaml 생성
    const metadataPath = path.join(componentDir, 'metadata.yaml');
    fs.writeFileSync(metadataPath, generateMetadataYaml(options));
    files.push(metadataPath);

    // 이미지 복사
    if (fs.existsSync(sectionImage)) {
      const previewPath = path.join(componentDir, 'preview.png');
      fs.copyFileSync(sectionImage, previewPath);
      files.push(previewPath);
    }

    return {
      success: true,
      componentDir,
      files,
    };
  } catch (error) {
    return {
      success: false,
      componentDir,
      files,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
