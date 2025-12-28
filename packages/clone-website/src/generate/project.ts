/**
 * 프로젝트 생성 모듈
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ScrapeResult } from '../scrape/types.js';
import { generateComponent } from './component.js';

export type ProjectTemplate = 'nextjs' | 'vite' | 'remix';

export interface ProjectOptions {
  name: string;
  outputDir: string;
  template: ProjectTemplate;
  scrapeResult: ScrapeResult;
  includeAllSections?: boolean;
}

export interface ProjectResult {
  success: boolean;
  projectDir: string;
  components: string[];
  error?: string;
}

/**
 * Next.js 프로젝트 package.json
 */
function generateNextjsPackageJson(name: string): string {
  return JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
    dependencies: {
      next: '^14.0.0',
      react: '^18.0.0',
      'react-dom': '^18.0.0',
      'motion': '^11.0.0',
      'lucide-react': '^0.300.0',
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/react': '^18.0.0',
      '@types/react-dom': '^18.0.0',
      typescript: '^5.0.0',
      tailwindcss: '^3.4.0',
      postcss: '^8.0.0',
      autoprefixer: '^10.0.0',
    },
  }, null, 2);
}

/**
 * Vite 프로젝트 package.json
 */
function generateVitePackageJson(name: string): string {
  return JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.0.0',
      'react-dom': '^18.0.0',
      'motion': '^11.0.0',
      'lucide-react': '^0.300.0',
    },
    devDependencies: {
      '@types/react': '^18.0.0',
      '@types/react-dom': '^18.0.0',
      '@vitejs/plugin-react': '^4.0.0',
      typescript: '^5.0.0',
      vite: '^5.0.0',
      tailwindcss: '^3.4.0',
      postcss: '^8.0.0',
      autoprefixer: '^10.0.0',
    },
  }, null, 2);
}

/**
 * Tailwind 설정 생성
 */
function generateTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
}

/**
 * PostCSS 설정 생성
 */
function generatePostcssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
}

/**
 * 글로벌 CSS
 */
function generateGlobalCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
}

/**
 * 프로젝트 생성
 */
export async function generateProject(options: ProjectOptions): Promise<ProjectResult> {
  const {
    name,
    outputDir,
    template,
    scrapeResult,
    includeAllSections = true,
  } = options;

  const projectDir = path.join(outputDir, name);
  const components: string[] = [];

  try {
    // 프로젝트 디렉토리 구조 생성
    const dirs = [
      projectDir,
      path.join(projectDir, 'src'),
      path.join(projectDir, 'src', 'components'),
      path.join(projectDir, 'public'),
      path.join(projectDir, 'public', 'images'),
    ];

    if (template === 'nextjs') {
      dirs.push(path.join(projectDir, 'app'));
    }

    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // package.json 생성
    const packageJson = template === 'nextjs'
      ? generateNextjsPackageJson(name)
      : generateVitePackageJson(name);
    fs.writeFileSync(path.join(projectDir, 'package.json'), packageJson);

    // Tailwind 설정
    fs.writeFileSync(path.join(projectDir, 'tailwind.config.js'), generateTailwindConfig());
    fs.writeFileSync(path.join(projectDir, 'postcss.config.js'), generatePostcssConfig());
    fs.writeFileSync(path.join(projectDir, 'src', 'globals.css'), generateGlobalCss());

    // tsconfig.json
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
    }, null, 2));

    // 섹션별 컴포넌트 생성
    const sections = includeAllSections
      ? scrapeResult.sections
      : scrapeResult.sections.slice(0, 5);

    for (const section of sections) {
      const componentName = `${name}-${section.category || 'section'}-${section.index}`;
      const sectionImage = path.join(scrapeResult.outputDir, 'sections', `section-${section.index}.png`);

      const result = await generateComponent({
        name: componentName,
        outputDir: path.join(projectDir, 'src', 'components'),
        sectionImage,
        category: section.category || 'hero',
        fonts: scrapeResult.fonts,
        sourceUrl: scrapeResult.metadata.url,
        sectionIndex: section.index,
      });

      if (result.success) {
        components.push(componentName);
      }
    }

    // README 생성
    const readme = `# ${name}

This project was cloned from: ${scrapeResult.metadata.url}

## Getting Started

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Components

${components.map(c => `- \`${c}\``).join('\n')}

## Generated with

[@anthropic/clone-website](https://github.com/anthropics/clone-website)
`;
    fs.writeFileSync(path.join(projectDir, 'README.md'), readme);

    return {
      success: true,
      projectDir,
      components,
    };
  } catch (error) {
    return {
      success: false,
      projectDir,
      components,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
