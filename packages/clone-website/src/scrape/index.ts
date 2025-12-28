/**
 * Scrape module exports
 */

export { scrapeWebsite, type ExtendedScrapeOptions, type ViewportName } from './scraper.js';
export { analyzeDOM, type AnalyzeOptions } from './html-analyzer.js';
export {
  extractFramerSiteData,
  isFramerSite,
  inferCategoryFromFramerName,
  extractFramerElements,
  analyzeAnimationPatterns,
} from './framer-extractor.js';
export * from './types.js';
