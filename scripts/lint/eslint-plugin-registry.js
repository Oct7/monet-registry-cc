/**
 * ESLint Plugin for Monet Registry Components
 */

module.exports = {
  rules: {
    /**
     * 1. /scraped/ 경로 사용 금지
     */
    'no-scraped-paths': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow /scraped/ paths in component code',
        },
        fixable: null,
        schema: [],
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string' && node.value.includes('/scraped/')) {
              context.report({
                node,
                message: 'Avoid using /scraped/ paths. Move assets to /registry/{component}/',
              });
            }
          },
          TemplateElement(node) {
            if (node.value.raw.includes('/scraped/')) {
              context.report({
                node,
                message: 'Avoid using /scraped/ paths in template literals.',
              });
            }
          },
        };
      },
    },

    /**
     * 2. 인라인 스타일 대신 Tailwind 권장
     */
    'prefer-tailwind': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Prefer Tailwind classes over inline styles',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name.name === 'style' && node.value?.expression?.type === 'ObjectExpression') {
              const props = node.value.expression.properties;
              const convertibleProps = ['backgroundColor', 'color', 'padding', 'margin', 'fontSize'];
              const hasConvertible = props.some(p =>
                p.key && convertibleProps.includes(p.key.name || p.key.value)
              );

              if (hasConvertible) {
                context.report({
                  node,
                  message: 'Consider using Tailwind classes instead of inline styles for common CSS properties.',
                });
              }
            }
          },
        };
      },
    },

    /**
     * 3. 하드코딩된 텍스트 경고
     */
    'no-hardcoded-text': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Warn about hardcoded text in JSX',
        },
        schema: [],
      },
      create(context) {
        const MIN_LENGTH = 20; // 20자 이상인 경우만 경고

        return {
          JSXText(node) {
            const text = node.value.trim();
            if (text.length > MIN_LENGTH && /[a-zA-Z]/.test(text)) {
              context.report({
                node,
                message: `Consider extracting long text to a CONTENT constant: "${text.substring(0, 30)}..."`,
              });
            }
          },
        };
      },
    },

    /**
     * 4. CONTENT 객체 구조 권장
     */
    'require-content-object': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Recommend CONTENT object pattern for customization',
        },
        schema: [],
      },
      create(context) {
        let hasContentObject = false;

        return {
          VariableDeclaration(node) {
            if (node.declarations.some(d =>
              d.id.name === 'CONTENT' || d.id.name === 'COLORS' || d.id.name === 'IMAGES'
            )) {
              hasContentObject = true;
            }
          },
          'Program:exit'(node) {
            const filename = context.getFilename();
            if (filename.includes('/registry/') && filename.endsWith('index.tsx') && !hasContentObject) {
              context.report({
                node,
                message: 'Registry components should define CONTENT, COLORS, or IMAGES constants for easy customization.',
                loc: { line: 1, column: 0 },
              });
            }
          },
        };
      },
    },

    /**
     * 5. style jsx 대신 Tailwind @keyframes 권장
     */
    'no-style-jsx': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Prefer Tailwind animations over style jsx',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXElement(node) {
            if (node.openingElement.name.name === 'style' &&
                node.openingElement.attributes.some(attr =>
                  attr.name?.name === 'jsx'
                )) {
              context.report({
                node,
                message: 'Consider using Tailwind @keyframes in tailwind.config.ts instead of style jsx.',
              });
            }
          },
        };
      },
    },
  },
};
