/**
 * 컴포넌트 생성 모듈
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DOMSection, FontInfo } from '../scrape/types.js';

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
function generateComponentTemplate(name: string, category: string): string {
  const componentName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return `"use client";

import { motion } from "motion/react";

// ============================================================================
// CUSTOMIZATION - Edit these values to customize the component
// ============================================================================

const CONTENT = {
  headline: "Your Headline Here",
  subheadline: "Your subheadline text goes here.",
  cta: {
    primary: { label: "Get Started", href: "#" },
    secondary: { label: "Learn More", href: "#" },
  },
} as const;

const COLORS = {
  background: "#FFFFFF",
  text: "#1A1A1A",
  accent: "#3B82F6",
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
  const { name, outputDir, sectionImage, category = 'hero' } = options;

  const componentDir = path.join(outputDir, name);
  const files: string[] = [];

  try {
    // 디렉토리 생성
    fs.mkdirSync(componentDir, { recursive: true });
    fs.mkdirSync(path.join(componentDir, 'assets'), { recursive: true });

    // index.tsx 생성
    const indexPath = path.join(componentDir, 'index.tsx');
    fs.writeFileSync(indexPath, generateComponentTemplate(name, category));
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
