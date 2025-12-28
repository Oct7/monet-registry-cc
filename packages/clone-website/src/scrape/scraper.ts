/**
 * 웹사이트 스크래핑 메인 모듈
 *
 * 독립 패키지용으로 리팩터링된 버전
 */

import puppeteer, { Page, Browser } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeDOM } from './html-analyzer.js';
import { extractFramerSiteData } from './framer-extractor.js';
import type {
  ScrapeOptions,
  ScrapeResult,
  DOMNode,
  DOMSection,
  ImageInfo,
  FontInfo,
  VideoInfo,
} from './types.js';

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS | 'all';

export interface ExtendedScrapeOptions extends ScrapeOptions {
  viewportName?: ViewportName;
  deviceScaleFactor?: number;
  triggerLazyLoad?: boolean;
  waitForNetworkIdle?: boolean;
}

/**
 * 실제 페이지 높이 감지
 */
async function getActualPageHeight(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
  });
}

/**
 * Lazy-load 콘텐츠 트리거
 */
async function triggerLazyLoad(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * URL에서 도메인 추출
 */
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '').replace(/\./g, '-');
  } catch {
    return 'unknown';
  }
}

/**
 * DOM 트리 추출
 */
async function extractDOMTree(page: Page): Promise<DOMNode> {
  return await page.evaluate(() => {
    function processNode(element: Element): DOMNode {
      const rect = element.getBoundingClientRect();
      const children: DOMNode[] = [];

      for (const child of Array.from(element.children)) {
        children.push(processNode(child));
      }

      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        className: element.className || null,
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        },
        children,
      };
    }

    return processNode(document.body);
  });
}

/**
 * 이미지 정보 추출
 */
async function extractImages(page: Page, baseUrl: string): Promise<ImageInfo[]> {
  const rawImages = await page.evaluate(() => {
    const images: Array<{
      src: string;
      type: 'img' | 'background' | 'svg';
      alt?: string;
      width?: number;
      height?: number;
      top: number;
    }> = [];

    // <img> 태그
    document.querySelectorAll('img').forEach((img) => {
      const src = img.src || img.dataset.src;
      if (src && !src.startsWith('data:')) {
        const rect = img.getBoundingClientRect();
        images.push({
          src,
          type: 'img',
          alt: img.alt || undefined,
          width: img.naturalWidth || img.width || undefined,
          height: img.naturalHeight || img.height || undefined,
          top: rect.top + window.scrollY,
        });
      }
    });

    // CSS background-image
    document.querySelectorAll('*').forEach((el) => {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
        if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
          const rect = el.getBoundingClientRect();
          images.push({
            src: urlMatch[1],
            type: 'background',
            top: rect.top + window.scrollY,
          });
        }
      }
    });

    return images;
  });

  // URL 정규화 및 중복 제거
  const uniqueUrls = new Set<string>();
  return rawImages
    .filter((img) => {
      try {
        const absoluteUrl = new URL(img.src, baseUrl).href;
        if (uniqueUrls.has(absoluteUrl)) return false;
        uniqueUrls.add(absoluteUrl);
        return true;
      } catch {
        return false;
      }
    })
    .map((img) => ({
      originalUrl: new URL(img.src, baseUrl).href,
      localPath: '',
      type: img.type,
      sectionIndex: -1,
      alt: img.alt,
      width: img.width,
      height: img.height,
      downloaded: false,
    }));
}

/**
 * 폰트 정보 추출
 */
async function extractFonts(page: Page): Promise<FontInfo[]> {
  return await page.evaluate(() => {
    const fonts: FontInfo[] = [];
    const seenFamilies = new Set<string>();

    // @font-face에서 추출
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule instanceof CSSFontFaceRule) {
            const family = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim();
            if (family && !seenFamilies.has(family)) {
              seenFamilies.add(family);
              const src = rule.style.getPropertyValue('src');
              const urlMatch = src.match(/url\(["']?([^"')]+)["']?\)/);

              let source: 'google-fonts' | 'adobe-fonts' | 'custom' | 'system' = 'custom';
              if (urlMatch?.[1]?.includes('fonts.gstatic.com')) source = 'google-fonts';
              else if (urlMatch?.[1]?.includes('use.typekit.net')) source = 'adobe-fonts';

              fonts.push({
                family,
                url: urlMatch?.[1],
                source,
                weights: [rule.style.getPropertyValue('font-weight') || '400'],
                styles: [rule.style.getPropertyValue('font-style') || 'normal'],
                downloaded: false,
              });
            }
          }
        }
      } catch {
        // CORS 제한으로 접근 불가
      }
    }

    // Google Fonts 링크에서 추출
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href) {
        const familyMatch = href.match(/family=([^&]+)/);
        if (familyMatch) {
          const families = familyMatch[1].split('|');
          for (const familyStr of families) {
            const [name, weights] = familyStr.split(':');
            const family = name.replace(/\+/g, ' ');
            if (!seenFamilies.has(family)) {
              seenFamilies.add(family);
              fonts.push({
                family,
                url: href,
                source: 'google-fonts',
                weights: weights ? weights.split(',') : ['400'],
                styles: ['normal'],
                downloaded: false,
              });
            }
          }
        }
      }
    });

    return fonts;
  });
}

/**
 * 메인 스크래핑 함수
 */
export async function scrapeWebsite(options: ExtendedScrapeOptions): Promise<ScrapeResult> {
  const {
    url,
    outputDir,
    viewportName = 'desktop',
    deviceScaleFactor = 1,
    maxHeight,
    waitTime = 3000,
    triggerLazyLoad: shouldTriggerLazyLoad = true,
    waitForNetworkIdle = true,
  } = options;

  const domain = extractDomain(url);
  const timestamp = new Date().toISOString().split('T')[0];
  const finalOutputDir = outputDir || `./scraped/${domain}-${timestamp}`;

  // 출력 디렉토리 생성
  fs.mkdirSync(finalOutputDir, { recursive: true });
  fs.mkdirSync(path.join(finalOutputDir, 'sections'), { recursive: true });
  fs.mkdirSync(path.join(finalOutputDir, 'images'), { recursive: true });

  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    const viewport = VIEWPORTS[viewportName === 'all' ? 'desktop' : viewportName];

    await page.setViewport({
      ...viewport,
      deviceScaleFactor,
    });

    // 페이지 로드
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 네트워크 안정화 대기
    if (waitForNetworkIdle) {
      try {
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 });
      } catch {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Lazy-load 트리거
    if (shouldTriggerLazyLoad) {
      await triggerLazyLoad(page);
    }

    // 페이지 높이 감지
    const actualHeight = await getActualPageHeight(page);
    const captureHeight = maxHeight ? Math.min(actualHeight, maxHeight) : actualHeight;

    // 스크린샷 캡처
    await page.screenshot({
      path: path.join(finalOutputDir, 'full-page.png'),
      fullPage: true,
      clip: { x: 0, y: 0, width: viewport.width, height: captureHeight },
    });

    // HTML 저장
    const html = await page.content();
    fs.writeFileSync(path.join(finalOutputDir, 'page.html'), html);

    // DOM 트리 추출 및 분석
    const domTree = await extractDOMTree(page);
    fs.writeFileSync(path.join(finalOutputDir, 'dom-tree.json'), JSON.stringify(domTree, null, 2));

    // 섹션 분할
    const sections = analyzeDOM(domTree, {
      totalHeight: captureHeight,
      enableAdaptiveThreshold: true,
      enableMultiDimensionalConfidence: true,
    });
    fs.writeFileSync(path.join(finalOutputDir, 'sections.json'), JSON.stringify(sections, null, 2));

    // 섹션별 스크린샷
    for (const section of sections) {
      await page.screenshot({
        path: path.join(finalOutputDir, 'sections', `section-${section.index}.png`),
        clip: {
          x: 0,
          y: section.rect.top,
          width: viewport.width,
          height: section.rect.height,
        },
      });
    }

    // 이미지 추출
    const images = await extractImages(page, url);
    fs.writeFileSync(path.join(finalOutputDir, 'images.json'), JSON.stringify(images, null, 2));

    // 폰트 추출
    const fonts = await extractFonts(page);
    fs.writeFileSync(path.join(finalOutputDir, 'fonts.json'), JSON.stringify(fonts, null, 2));

    // Framer 데이터 추출
    const framer = await extractFramerSiteData(page);
    if (framer.isFramerSite) {
      fs.writeFileSync(path.join(finalOutputDir, 'framer.json'), JSON.stringify(framer, null, 2));
    }

    // 메타데이터 저장
    const metadata = {
      url,
      domain,
      timestamp: new Date().toISOString(),
      pageTitle: await page.title(),
      totalHeight: captureHeight,
      viewport: viewportName,
      deviceScaleFactor,
      sectionsCount: sections.length,
      imagesCount: images.length,
      fontsCount: fonts.length,
      isFramerSite: framer.isFramerSite,
    };
    fs.writeFileSync(path.join(finalOutputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    return {
      success: true,
      outputDir: finalOutputDir,
      sections,
      images,
      fonts,
      videos: [],
      framer: framer.isFramerSite ? framer : undefined,
      metadata: {
        url,
        domain,
        timestamp: metadata.timestamp,
        pageTitle: metadata.pageTitle,
        totalHeight: captureHeight,
        imageStats: { total: images.length, downloaded: 0, failed: 0 },
        fontStats: { total: fonts.length, downloaded: 0, failed: 0 },
        videoStats: { total: 0, thumbnailsDownloaded: 0, failed: 0 },
      },
    };
  } catch (error) {
    return {
      success: false,
      outputDir: finalOutputDir,
      sections: [],
      images: [],
      fonts: [],
      videos: [],
      metadata: {
        url,
        domain,
        timestamp: new Date().toISOString(),
        pageTitle: '',
        totalHeight: 0,
        imageStats: { total: 0, downloaded: 0, failed: 0 },
        fontStats: { total: 0, downloaded: 0, failed: 0 },
        videoStats: { total: 0, thumbnailsDownloaded: 0, failed: 0 },
      },
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
