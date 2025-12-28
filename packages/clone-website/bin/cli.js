#!/usr/bin/env node
/**
 * @oct7/clone-website CLI
 *
 * Clone any website to React/Tailwind components
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { scrapeWebsite } from '../dist/scrape/scraper.js';
import { generateProject } from '../dist/generate/project.js';
import { parseContentConfig, createSampleContentFile } from '../dist/content/index.js';

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

// Init command - create sample content.yaml
program
  .command('init')
  .description('Create a sample content.yaml file for content customization')
  .option('-o, --output <file>', 'Output file path', 'content.yaml')
  .action((options) => {
    const outputPath = options.output;
    createSampleContentFile(outputPath);
    console.log(chalk.green(`✔ Created ${chalk.cyan(outputPath)}`));
    console.log('');
    console.log('Edit this file with your content, then run:');
    console.log(`  ${chalk.dim('$')} clone-website clone https://example.com --content ${outputPath}`);
  });

program
  .command('clone <url> [name]')
  .description('Clone a website to a new React project (scrape + generate in one step)')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-t, --template <type>', 'Template: nextjs|vite|remix', 'vite')
  .option('-v, --viewport <type>', 'Viewport: mobile|tablet|desktop|wide|all', 'desktop')
  .option('-s, --scale <factor>', 'Device scale factor for Retina', '2')
  .option('-c, --content <file>', 'Content config file (yaml/json) for custom content')
  .option('--no-lazy-load', 'Disable lazy-load triggering')
  .option('--install', 'Run pnpm install after creation')
  .action(async (url, name, options) => {
    // Auto-generate name from URL if not provided
    if (!name) {
      try {
        const urlObj = new URL(url);
        name = urlObj.hostname.replace(/^www\./, '').replace(/\./g, '-') + '-clone';
      } catch {
        name = 'website-clone';
      }
    }
    console.log(chalk.bold(`\n🚀 Cloning ${chalk.cyan(url)} → ${chalk.green(name)}\n`));

    // Parse content config if provided
    let contentConfig = null;
    if (options.content) {
      const parseResult = await parseContentConfig(options.content);
      if (!parseResult.success) {
        console.error(chalk.red(`Error: ${parseResult.error}`));
        process.exit(1);
      }
      contentConfig = parseResult.config;
      console.log(chalk.dim(`Using content config: ${options.content}\n`));
    }

    const spinner = ora('Scraping website...').start();

    try {
      // Step 1: Scrape
      const scrapeResult = await scrapeWebsite({
        url,
        viewportName: options.viewport,
        deviceScaleFactor: parseFloat(options.scale),
        triggerLazyLoad: options.lazyLoad,
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
        contentConfig,
      });

      if (projectResult.success) {
        spinner.succeed(chalk.green('Project created!'));

        // Auto-install if --install flag
        if (options.install) {
          const installSpinner = ora('Installing dependencies...').start();
          const { execSync } = await import('child_process');
          try {
            execSync('pnpm install', {
              cwd: projectResult.projectDir,
              stdio: 'pipe'
            });
            installSpinner.succeed(chalk.green('Dependencies installed!'));
          } catch {
            installSpinner.warn(chalk.yellow('Install failed - run pnpm install manually'));
          }
        }

        console.log('');
        console.log(chalk.bold('✨ Your new project is ready:'));
        console.log(`  ${chalk.cyan(projectResult.projectDir)}`);
        console.log('');
        console.log(chalk.bold('Next steps:'));
        console.log(`  ${chalk.dim('$')} cd ${name}`);
        if (!options.install) {
          console.log(`  ${chalk.dim('$')} pnpm install`);
        }
        console.log(`  ${chalk.dim('$')} pnpm dev`);
        console.log('');
        console.log(chalk.bold(`Components generated: ${chalk.yellow(projectResult.components.length)}`));
        projectResult.components.forEach(c => {
          console.log(`  ${chalk.dim('•')} ${c}`);
        });
        console.log('');
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
