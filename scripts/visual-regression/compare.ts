/**
 * 시각적 회귀 테스트 - 원본 vs 클론 비교
 */
import puppeteer from 'puppeteer';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import * as fs from 'fs';
import * as path from 'path';

export interface ComparisonResult {
  componentName: string;
  originalPath: string;
  clonePath: string;
  diffPath: string;
  pixelDiffCount: number;
  pixelDiffPercent: number;
  totalPixels: number;
  passed: boolean;
  threshold: number;
}

export interface ComparisonOptions {
  threshold?: number;  // 기본값 0.1 (10% 차이까지 허용)
  outputDir?: string;
}

/**
 * 두 이미지 비교
 */
export async function compareImages(
  img1Path: string,
  img2Path: string,
  diffOutputPath: string,
  threshold: number = 0.1
): Promise<{ diffCount: number; diffPercent: number; totalPixels: number }> {
  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));

  // 크기가 다르면 리사이즈 필요
  const width = Math.max(img1.width, img2.width);
  const height = Math.max(img1.height, img2.height);
  const totalPixels = width * height;

  const diff = new PNG({ width, height });

  const diffCount = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }  // pixelmatch 자체 threshold
  );

  fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));

  return {
    diffCount,
    diffPercent: (diffCount / totalPixels) * 100,
    totalPixels,
  };
}

/**
 * 컴포넌트의 클론 스크린샷 캡처
 */
export async function captureCloneScreenshot(
  componentName: string,
  outputPath: string,
  port: number = 3000
): Promise<void> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${port}/preview/${componentName}`, {
    waitUntil: 'networkidle0',
  });

  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();
}

/**
 * 단일 컴포넌트 비교
 */
export async function compareComponent(
  componentName: string,
  options: ComparisonOptions = {}
): Promise<ComparisonResult> {
  const threshold = options.threshold || 0.1;
  const outputDir = options.outputDir || path.join(process.cwd(), 'visual-regression-output');

  fs.mkdirSync(outputDir, { recursive: true });

  // 원본 스크린샷 경로 (스크래핑 결과)
  const registryDir = path.join(process.cwd(), 'src/components/registry', componentName);
  const metadataPath = path.join(registryDir, 'metadata.yaml');

  // metadata에서 원본 이미지 경로 읽기
  // ... (yaml 파싱)

  const originalPath = path.join(process.cwd(), 'public/registry/preview', `${componentName}.png`);
  const clonePath = path.join(outputDir, `${componentName}-clone.png`);
  const diffPath = path.join(outputDir, `${componentName}-diff.png`);

  // 클론 스크린샷 캡처
  await captureCloneScreenshot(componentName, clonePath);

  // 비교
  const { diffCount, diffPercent, totalPixels } = await compareImages(
    originalPath,
    clonePath,
    diffPath,
    threshold
  );

  return {
    componentName,
    originalPath,
    clonePath,
    diffPath,
    pixelDiffCount: diffCount,
    pixelDiffPercent: diffPercent,
    totalPixels,
    passed: diffPercent <= threshold * 100,
    threshold,
  };
}
