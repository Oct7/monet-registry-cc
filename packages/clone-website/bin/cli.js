#!/usr/bin/env node
/**
 * @anthropic/clone-website CLI
 *
 * Clone any website to React/Tailwind components
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { scrapeWebsite } from '../dist/scrape/scraper.js';
import { generateProject } from '../dist/generate/project.js';

const program = new Command();

program
  .name('clone-website')
  .description('Clone any website to React/Tailwind components using AI')
  .version('0.1.0');

program
  .command('scrape <url>')
  .description('Scrape a website and extract sections')
  .option('-o, --output <dir>', 'Output directory')
  .option('-v, --viewport <type>', 'Viewport: mobile|tablet|desktop|wide|all', 'desktop')
  .option('-s, --scale <factor>', 'Device scale factor for Retina', '1')
  .option('--no-lazy-load', 'Disable lazy-load triggering')
  .action(async (url, options) => {
    const spinner = ora('Scraping website...').start();

    try {
      const result = await scrapeWebsite({
        url,
        outputDir: options.output,
        viewportName: options.viewport,
        deviceScaleFactor: parseFloat(options.scale),
        triggerLazyLoad: options.lazyLoad,
      });

      if (result.success) {
        spinner.succeed(chalk.green('Scraping complete!'));
        console.log('');
        console.log(chalk.bold('Results:'));
        console.log(`  Output: ${chalk.cyan(result.outputDir)}`);
        console.log(`  Sections: ${chalk.yellow(result.sections.length)}`);
        console.log(`  Images: ${chalk.yellow(result.images.length)}`);
        console.log(`  Fonts: ${chalk.yellow(result.fonts.length)}`);
        if (result.framer?.isFramerSite) {
          console.log(`  Framer: ${chalk.magenta('Yes')} (${result.framer.animations.length} animations)`);
        }
      } else {
        spinner.fail(chalk.red('Scraping failed'));
        console.error(result.error);
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Scraping failed'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('create <url> <name>')
  .description('Clone a website and create a new project')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-t, --template <type>', 'Template: nextjs|vite|remix', 'vite')
  .option('-v, --viewport <type>', 'Viewport: mobile|tablet|desktop|wide', 'desktop')
  .action(async (url, name, options) => {
    const spinner = ora('Scraping website...').start();

    try {
      // Step 1: Scrape
      const scrapeResult = await scrapeWebsite({
        url,
        viewportName: options.viewport,
      });

      if (!scrapeResult.success) {
        spinner.fail(chalk.red('Scraping failed'));
        console.error(scrapeResult.error);
        process.exit(1);
      }

      spinner.text = 'Generating project...';

      // Step 2: Generate project
      const projectResult = await generateProject({
        name,
        outputDir: options.output,
        template: options.template,
        scrapeResult,
      });

      if (projectResult.success) {
        spinner.succeed(chalk.green('Project created!'));
        console.log('');
        console.log(chalk.bold('Your new project is ready:'));
        console.log(`  ${chalk.cyan(projectResult.projectDir)}`);
        console.log('');
        console.log('Next steps:');
        console.log(`  ${chalk.dim('$')} cd ${name}`);
        console.log(`  ${chalk.dim('$')} pnpm install`);
        console.log(`  ${chalk.dim('$')} pnpm dev`);
        console.log('');
        console.log(`Components generated: ${chalk.yellow(projectResult.components.length)}`);
        projectResult.components.forEach(c => {
          console.log(`  - ${c}`);
        });
      } else {
        spinner.fail(chalk.red('Project generation failed'));
        console.error(projectResult.error);
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed'));
      console.error(error);
      process.exit(1);
    }
  });

program.parse();
