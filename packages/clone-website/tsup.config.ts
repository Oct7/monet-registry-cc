import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'scrape/index': 'src/scrape/index.ts',
    'scrape/scraper': 'src/scrape/scraper.ts',
    'scrape/html-analyzer': 'src/scrape/html-analyzer.ts',
    'scrape/framer-extractor': 'src/scrape/framer-extractor.ts',
    'scrape/types': 'src/scrape/types.ts',
    'generate/index': 'src/generate/index.ts',
    'generate/component': 'src/generate/component.ts',
    'generate/project': 'src/generate/project.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  external: ['puppeteer'],
});
