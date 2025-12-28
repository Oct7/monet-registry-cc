/**
 * @oct7/clone-website
 *
 * Clone any website to React/Tailwind components using AI
 */

export { scrapeWebsite, type ScrapeOptions, type ScrapeResult } from './scrape/scraper.js';
export { analyzeDOM, type AnalyzeOptions } from './scrape/html-analyzer.js';
export { extractFramerSiteData, isFramerSite, inferCategoryFromFramerName } from './scrape/framer-extractor.js';
export * from './scrape/types.js';

export { generateComponent, type GenerateOptions } from './generate/component.js';
export { generateProject, type ProjectOptions, type ProjectTemplate } from './generate/project.js';

// Content customization
export {
  parseContentConfig,
  createSampleContentFile,
  generateContentObject,
  applyTextReplacements,
  generateThemeConfig,
  generateThemeCSSVariables,
  generateSiteMetadata,
  type ContentConfig,
  type SiteContent,
  type SectionContent,
  type ContentItem,
  type TextReplacement,
  type ImageReplacement,
  type LinkReplacement,
  type ThemeConfig,
} from './content/index.js';

// Version
export const VERSION = '0.1.0';
