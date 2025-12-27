// ESLint Configuration Example for Monet Registry Components
//
// This file demonstrates how to configure ESLint to use the custom
// registry plugin rules for component standardization.
//
// To use this configuration:
// 1. Add the plugin to your .eslintrc.js or eslint.config.js
// 2. Enable the rules you want to enforce
// 3. Adjust severity levels (error/warn/off) as needed

module.exports = {
  plugins: ['./scripts/lint/eslint-plugin-registry'],
  rules: {
    // Error: Block /scraped/ paths completely
    'registry/no-scraped-paths': 'error',

    // Warn: Suggest Tailwind over inline styles
    'registry/prefer-tailwind': 'warn',

    // Warn: Suggest extracting hardcoded text
    'registry/no-hardcoded-text': 'warn',

    // Warn: Recommend CONTENT object pattern
    'registry/require-content-object': 'warn',

    // Warn: Suggest Tailwind animations over style jsx
    'registry/no-style-jsx': 'warn',
  },
};
