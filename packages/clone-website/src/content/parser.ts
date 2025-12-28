/**
 * Content configuration parser
 *
 * Parses content.yaml or content.json files for content customization
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type { ContentConfig } from "./types.js";

export interface ParseResult {
  success: boolean;
  config?: ContentConfig;
  error?: string;
}

/**
 * Parse content configuration from file
 */
export async function parseContentConfig(
  filePath: string
): Promise<ParseResult> {
  try {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      return {
        success: false,
        error: `Content file not found: ${absolutePath}`,
      };
    }

    const content = fs.readFileSync(absolutePath, "utf-8");
    const ext = path.extname(filePath).toLowerCase();

    let config: ContentConfig;

    if (ext === ".yaml" || ext === ".yml") {
      config = yaml.load(content) as ContentConfig;
    } else if (ext === ".json") {
      config = JSON.parse(content);
    } else {
      return {
        success: false,
        error: `Unsupported file format: ${ext}. Use .yaml, .yml, or .json`,
      };
    }

    // Validate config structure
    const validation = validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid content config: ${validation.errors.join(", ")}`,
      };
    }

    return {
      success: true,
      config,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse content config: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validate content configuration
 */
function validateConfig(config: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config || typeof config !== "object") {
    errors.push("Config must be an object");
    return { valid: false, errors };
  }

  const cfg = config as Record<string, unknown>;

  // Validate sections
  if (cfg.sections !== undefined) {
    if (!Array.isArray(cfg.sections)) {
      errors.push("sections must be an array");
    } else {
      cfg.sections.forEach((section, i) => {
        if (!section.target && section.target !== 0) {
          errors.push(`sections[${i}].target is required`);
        }
        if (!section.content || typeof section.content !== "object") {
          errors.push(`sections[${i}].content must be an object`);
        }
      });
    }
  }

  // Validate textReplacements
  if (cfg.textReplacements !== undefined) {
    if (!Array.isArray(cfg.textReplacements)) {
      errors.push("textReplacements must be an array");
    } else {
      cfg.textReplacements.forEach((replacement, i) => {
        if (typeof replacement.find !== "string") {
          errors.push(`textReplacements[${i}].find must be a string`);
        }
        if (typeof replacement.replace !== "string") {
          errors.push(`textReplacements[${i}].replace must be a string`);
        }
      });
    }
  }

  // Validate images
  if (cfg.images !== undefined) {
    if (!Array.isArray(cfg.images)) {
      errors.push("images must be an array");
    } else {
      cfg.images.forEach((img, i) => {
        if (img.target === undefined && img.target !== 0) {
          errors.push(`images[${i}].target is required`);
        }
        if (typeof img.src !== "string") {
          errors.push(`images[${i}].src must be a string`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a sample content.yaml file
 */
export function createSampleContentFile(outputPath: string): void {
  const sample = `# Content Configuration
# Use this file to customize the cloned website with your own content

site:
  title: "My Website"
  description: "Welcome to my website"
  brandName: "MyBrand"
  # logo: "./assets/logo.svg"

sections:
  # Hero section
  - target: hero
    content:
      heading: "Your Main Headline Here"
      subheading: "A compelling subheadline that explains your value proposition"
      ctaText: "Get Started"
      ctaLink: "/signup"

  # Features section
  - target: features
    content:
      heading: "Why Choose Us"
      items:
        - title: "Feature One"
          description: "Description of your first key feature"
          icon: "🚀"
        - title: "Feature Two"
          description: "Description of your second key feature"
          icon: "⚡"
        - title: "Feature Three"
          description: "Description of your third key feature"
          icon: "🎯"

  # Footer
  - target: footer
    content:
      body: "© 2024 MyBrand. All rights reserved."

# Global text replacements
textReplacements:
  - find: "Original Brand"
    replace: "MyBrand"
  # Regex example:
  # - find: "\\\\$\\\\d+\\\\.\\\\d{2}"
  #   replace: "$19.99"
  #   regex: true

# Image replacements
# images:
#   - target: 0
#     src: "./assets/hero.png"
#     alt: "Hero image"

# Theme customization
theme:
  primaryColor: "#3b82f6"
  # secondaryColor: "#8b5cf6"
  # backgroundColor: "#ffffff"
  # textColor: "#1f2937"
`;

  fs.writeFileSync(outputPath, sample, "utf-8");
}
