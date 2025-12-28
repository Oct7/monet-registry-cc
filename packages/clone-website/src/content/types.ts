/**
 * Content customization types
 *
 * Allows users to provide their own content while using
 * a reference website's design/layout
 */

export interface ContentConfig {
  /** Site metadata */
  site?: SiteContent;

  /** Section-specific content overrides */
  sections?: SectionContent[];

  /** Global text replacements */
  textReplacements?: TextReplacement[];

  /** Image replacements */
  images?: ImageReplacement[];

  /** Link replacements */
  links?: LinkReplacement[];

  /** Color theme overrides */
  theme?: ThemeConfig;
}

export interface SiteContent {
  /** Site title */
  title?: string;

  /** Site description */
  description?: string;

  /** Favicon URL */
  favicon?: string;

  /** Brand name */
  brandName?: string;

  /** Logo URL */
  logo?: string;
}

export interface SectionContent {
  /** Section index or semantic name (header, hero, features, footer) */
  target: string | number;

  /** Override content */
  content: {
    /** Main heading */
    heading?: string;

    /** Subheading */
    subheading?: string;

    /** Body text */
    body?: string;

    /** CTA button text */
    ctaText?: string;

    /** CTA button link */
    ctaLink?: string;

    /** List items (for features, benefits, etc.) */
    items?: ContentItem[];

    /** Background image */
    backgroundImage?: string;
  };
}

export interface ContentItem {
  /** Item title */
  title?: string;

  /** Item description */
  description?: string;

  /** Item icon or image */
  icon?: string;

  /** Item link */
  link?: string;
}

export interface TextReplacement {
  /** Original text to find (exact match or regex pattern) */
  find: string;

  /** Replacement text */
  replace: string;

  /** Use regex matching */
  regex?: boolean;

  /** Case insensitive matching */
  ignoreCase?: boolean;
}

export interface ImageReplacement {
  /** Original image URL pattern or index */
  target: string | number;

  /** New image URL */
  src: string;

  /** Alt text */
  alt?: string;
}

export interface LinkReplacement {
  /** Original link pattern */
  find: string;

  /** New link URL */
  replace: string;
}

export interface ThemeConfig {
  /** Primary brand color */
  primaryColor?: string;

  /** Secondary color */
  secondaryColor?: string;

  /** Background color */
  backgroundColor?: string;

  /** Text color */
  textColor?: string;

  /** Accent color */
  accentColor?: string;

  /** Font family */
  fontFamily?: string;

  /** Heading font family */
  headingFontFamily?: string;
}

/**
 * Example content.yaml:
 *
 * ```yaml
 * site:
 *   title: "My SaaS Product"
 *   description: "The best solution for your business"
 *   brandName: "MySaaS"
 *   logo: "./assets/logo.svg"
 *
 * sections:
 *   - target: hero
 *     content:
 *       heading: "Build faster with MySaaS"
 *       subheading: "The all-in-one platform for modern teams"
 *       ctaText: "Start Free Trial"
 *       ctaLink: "/signup"
 *
 *   - target: features
 *     content:
 *       heading: "Why choose us?"
 *       items:
 *         - title: "Lightning Fast"
 *           description: "Built for speed from the ground up"
 *           icon: "⚡"
 *         - title: "Secure"
 *           description: "Enterprise-grade security"
 *           icon: "🔒"
 *
 * textReplacements:
 *   - find: "Stripe"
 *     replace: "MySaaS"
 *   - find: "\\$\\d+/month"
 *     replace: "$29/month"
 *     regex: true
 *
 * images:
 *   - target: 0
 *     src: "./assets/hero-image.png"
 *     alt: "MySaaS Dashboard"
 *
 * theme:
 *   primaryColor: "#6366f1"
 *   secondaryColor: "#8b5cf6"
 * ```
 */
