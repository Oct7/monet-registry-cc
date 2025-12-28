/**
 * Content Applier
 *
 * Applies user-defined content configuration to generated components
 */

import type {
  ContentConfig,
  SectionContent,
  TextReplacement,
  ThemeConfig,
} from "./types.js";

export interface ApplyContentOptions {
  /** The content configuration */
  config: ContentConfig;

  /** Section category (header, hero, features, etc.) */
  sectionCategory?: string;

  /** Section index */
  sectionIndex: number;
}

/**
 * Generate content object for component template
 */
export function generateContentObject(options: ApplyContentOptions): string {
  const { config, sectionCategory, sectionIndex } = options;

  // Find matching section content
  const sectionContent = findSectionContent(
    config,
    sectionCategory,
    sectionIndex
  );

  if (!sectionContent) {
    return ""; // No custom content for this section
  }

  const content = sectionContent.content;
  const lines: string[] = ["export const content = {"];

  if (content.heading) {
    lines.push(`  heading: ${JSON.stringify(content.heading)},`);
  }
  if (content.subheading) {
    lines.push(`  subheading: ${JSON.stringify(content.subheading)},`);
  }
  if (content.body) {
    lines.push(`  body: ${JSON.stringify(content.body)},`);
  }
  if (content.ctaText) {
    lines.push(`  ctaText: ${JSON.stringify(content.ctaText)},`);
  }
  if (content.ctaLink) {
    lines.push(`  ctaLink: ${JSON.stringify(content.ctaLink)},`);
  }
  if (content.items && content.items.length > 0) {
    lines.push("  items: [");
    content.items.forEach((item) => {
      lines.push("    {");
      if (item.title) lines.push(`      title: ${JSON.stringify(item.title)},`);
      if (item.description)
        lines.push(`      description: ${JSON.stringify(item.description)},`);
      if (item.icon) lines.push(`      icon: ${JSON.stringify(item.icon)},`);
      if (item.link) lines.push(`      link: ${JSON.stringify(item.link)},`);
      lines.push("    },");
    });
    lines.push("  ],");
  }
  if (content.backgroundImage) {
    lines.push(`  backgroundImage: ${JSON.stringify(content.backgroundImage)},`);
  }

  lines.push("};");

  return lines.join("\n");
}

/**
 * Find section content by category name or index
 */
function findSectionContent(
  config: ContentConfig,
  category?: string,
  index?: number
): SectionContent | undefined {
  if (!config.sections) return undefined;

  return config.sections.find((section) => {
    if (typeof section.target === "string") {
      return section.target.toLowerCase() === category?.toLowerCase();
    }
    return section.target === index;
  });
}

/**
 * Apply text replacements to content string
 */
export function applyTextReplacements(
  text: string,
  replacements?: TextReplacement[]
): string {
  if (!replacements || replacements.length === 0) return text;

  let result = text;

  for (const replacement of replacements) {
    if (replacement.regex) {
      const flags = replacement.ignoreCase ? "gi" : "g";
      const regex = new RegExp(replacement.find, flags);
      result = result.replace(regex, replacement.replace);
    } else {
      const flags = replacement.ignoreCase ? "gi" : "g";
      const escaped = replacement.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, flags);
      result = result.replace(regex, replacement.replace);
    }
  }

  return result;
}

/**
 * Generate Tailwind theme config from content theme
 */
export function generateThemeConfig(theme?: ThemeConfig): string {
  if (!theme) return "";

  const colors: Record<string, string> = {};

  if (theme.primaryColor) colors.primary = theme.primaryColor;
  if (theme.secondaryColor) colors.secondary = theme.secondaryColor;
  if (theme.backgroundColor) colors.background = theme.backgroundColor;
  if (theme.textColor) colors.foreground = theme.textColor;
  if (theme.accentColor) colors.accent = theme.accentColor;

  if (Object.keys(colors).length === 0 && !theme.fontFamily) {
    return "";
  }

  const lines = ["// Custom theme from content.yaml", "export const theme = {"];

  if (Object.keys(colors).length > 0) {
    lines.push("  colors: {");
    Object.entries(colors).forEach(([key, value]) => {
      lines.push(`    ${key}: "${value}",`);
    });
    lines.push("  },");
  }

  if (theme.fontFamily) {
    lines.push(`  fontFamily: {`);
    lines.push(`    sans: ["${theme.fontFamily}", "system-ui", "sans-serif"],`);
    if (theme.headingFontFamily) {
      lines.push(
        `    heading: ["${theme.headingFontFamily}", "system-ui", "sans-serif"],`
      );
    }
    lines.push(`  },`);
  }

  lines.push("};");

  return lines.join("\n");
}

/**
 * Generate CSS variables from theme config
 */
export function generateThemeCSSVariables(theme?: ThemeConfig): string {
  if (!theme) return "";

  const vars: string[] = [];

  if (theme.primaryColor) vars.push(`  --color-primary: ${theme.primaryColor};`);
  if (theme.secondaryColor)
    vars.push(`  --color-secondary: ${theme.secondaryColor};`);
  if (theme.backgroundColor)
    vars.push(`  --color-background: ${theme.backgroundColor};`);
  if (theme.textColor) vars.push(`  --color-foreground: ${theme.textColor};`);
  if (theme.accentColor) vars.push(`  --color-accent: ${theme.accentColor};`);

  if (vars.length === 0) return "";

  return `:root {\n${vars.join("\n")}\n}`;
}

/**
 * Generate site metadata
 */
export function generateSiteMetadata(config: ContentConfig): string {
  if (!config.site) return "";

  const site = config.site;
  const lines = ["export const siteConfig = {"];

  if (site.title) lines.push(`  title: ${JSON.stringify(site.title)},`);
  if (site.description)
    lines.push(`  description: ${JSON.stringify(site.description)},`);
  if (site.brandName)
    lines.push(`  brandName: ${JSON.stringify(site.brandName)},`);
  if (site.logo) lines.push(`  logo: ${JSON.stringify(site.logo)},`);
  if (site.favicon) lines.push(`  favicon: ${JSON.stringify(site.favicon)},`);

  lines.push("};");

  return lines.join("\n");
}
