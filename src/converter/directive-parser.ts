import { replaceCssVariables, convertTokenToCSS, responsiveStyleMap, pixelProperties, generateClassName, registerKeyframeInitialState } from './css-utils';

interface MediaQuery {
  type: string;
  value?: string;
  query: string;
}

const BREAKPOINTS = {
  mobile: '(max-width: 600px)',
  tablet: '(min-width: 601px) and (max-width: 900px)',
};

function parseMediaQuery(directive: string): MediaQuery | null {
  const mobileMatch = directive.match(/^@mobile/);
  if (mobileMatch) {
    return { type: 'mobile', query: BREAKPOINTS.mobile };
  }

  const tabletMatch = directive.match(/^@tablet/);
  if (tabletMatch) {
    return { type: 'tablet', query: BREAKPOINTS.tablet };
  }

  const maxWidthMatch = directive.match(/^@maxw=(\d+)/);
  if (maxWidthMatch) {
    return {
      type: 'maxWidth',
      value: maxWidthMatch[1],
      query: `(max-width: ${maxWidthMatch[1]}px)`
    };
  }

  const minWidthMatch = directive.match(/^@minw=(\d+)/);
  if (minWidthMatch) {
    return {
      type: 'minWidth',
      value: minWidthMatch[1],
      query: `(min-width: ${minWidthMatch[1]}px)`
    };
  }

  return null;
}

function processSelector(selector: string, parentSelector: string = ''): string {
  if (selector.startsWith('.') || selector.startsWith('#')) {
    return selector;
  }
  // If we have a parent selector and the current selector is not a direct class/id
  if (parentSelector && !selector.startsWith('.') && !selector.startsWith('#')) {
    return `${parentSelector} ${selector.toLowerCase()}`;
  }
  return selector.toLowerCase();
}

function convertToCSS(key: string, value: string, isResponsive: boolean = false): string {
  if (value.endsWith('%')) {
    return isResponsive ? responsiveStyleMap[key]?.(value) || '' : convertTokenToCSS(key, value);
  }

  if (value === 'none' || value === 'inherit' || value === 'initial') {
    return isResponsive ? responsiveStyleMap[key]?.(value) || '' : convertTokenToCSS(key, value);
  }

  const processedValue = pixelProperties.includes(key) && /^\d+$/.test(value) ? `${value}px` : value;
  return isResponsive ? responsiveStyleMap[key]?.(processedValue) || '' : convertTokenToCSS(key, processedValue);
}

export function parseDirectiveRules(lines: string[], isResponsive: boolean = false, parentSelector: string = ''): string {
  const rules: string[] = [];
  let currentSelector = '';
  let currentTokens: string[] = [];
  const styleMap = new Map<string, string>();

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '{' || trimmed === '}') continue;

    const tokens = trimmed.split(/\s+/);
    const rawSelector = tokens[0];
    const selector = processSelector(rawSelector, parentSelector);

    if (currentSelector && rawSelector !== currentSelector) {
      if (currentTokens.length > 0) {
        // For keyframes, use the selector directly
        if (currentSelector.match(/^[0-9%]+$/) || currentSelector === 'from' || currentSelector === 'to') {
          let declarations = '';
          for (const token of currentTokens) {
            const [key, val] = token.split('=');
            const css = convertToCSS(key, val, false);
            if (css) declarations += css;
          }
          rules.push(`  ${currentSelector} { ${declarations} }`);
        } else {
          // Group tokens by their CSS property to prevent duplicates
          const cssDeclarations = new Map<string, string>();

          for (const token of currentTokens) {
            const [key, val] = token.split('=');
            const css = convertToCSS(key, val, isResponsive);
            if (css) {
              const propertyName = css.split(':')[0].trim();
              cssDeclarations.set(propertyName, css);
            }
          }

          // Combine related properties
          const combinedDeclarations = new Map<string, string[]>();

          // Group related properties
          for (const [prop, value] of cssDeclarations) {
            const group = getPropertyGroup(prop);
            const existing = combinedDeclarations.get(group) || [];
            existing.push(value);
            combinedDeclarations.set(group, existing);
          }

          // Generate classes for each property group
          for (const [group, declarations] of combinedDeclarations) {
            const combinedCSS = declarations.join(' ');
            if (combinedCSS) {
              const className = generateClassName(combinedCSS);
              if (!styleMap.has(combinedCSS)) {
                styleMap.set(combinedCSS, className);
                rules.push(`  .${className} { ${combinedCSS} }`);
              }
            }
          }
        }
      }
      currentSelector = rawSelector;
      currentTokens = tokens.slice(1);
    } else if (!currentSelector) {
      currentSelector = rawSelector;
      currentTokens = tokens.slice(1);
    } else {
      currentTokens.push(...tokens.slice(1));
    }
  }

  // Process the last selector
  if (currentSelector && currentTokens.length > 0) {
    if (currentSelector.match(/^[0-9%]+$/) || currentSelector === 'from' || currentSelector === 'to') {
      let declarations = '';
      for (const token of currentTokens) {
        const [key, val] = token.split('=');
        const css = convertToCSS(key, val, false);
        if (css) declarations += css;
      }
      rules.push(`  ${currentSelector} { ${declarations} }`);
    } else {
      const cssDeclarations = new Map<string, string>();

      for (const token of currentTokens) {
        const [key, val] = token.split('=');
        const css = convertToCSS(key, val, isResponsive);
        if (css) {
          const propertyName = css.split(':')[0].trim();
          cssDeclarations.set(propertyName, css);
        }
      }

      // Combine related properties
      const combinedDeclarations = new Map<string, string[]>();

      // Group related properties
      for (const [prop, value] of cssDeclarations) {
        const group = getPropertyGroup(prop);
        const existing = combinedDeclarations.get(group) || [];
        existing.push(value);
        combinedDeclarations.set(group, existing);
      }

      // Generate classes for each property group
      for (const [group, declarations] of combinedDeclarations) {
        const combinedCSS = declarations.join(' ');
        if (combinedCSS) {
          const className = generateClassName(combinedCSS);
          if (!styleMap.has(combinedCSS)) {
            styleMap.set(combinedCSS, className);
            rules.push(`  .${className} { ${combinedCSS} }`);
          }
        }
      }
    }
  }

  return rules.join('\n');
}

// Helper function to group related CSS properties
function getPropertyGroup(property: string): string {
  if (property.includes('flex') || property === 'display') return 'flex';
  if (property.includes('width') || property.includes('height')) return 'size';
  if (property.includes('margin') || property.includes('padding')) return 'spacing';
  if (property.includes('color') || property.includes('background')) return 'color';
  if (property.includes('animation')) return 'animation';
  if (property.includes('border')) return 'border';
  return property;
}

function processKeyframe(lines: string[]): { css: string; initialState: string } {
  const rules: string[] = [];
  let initialState = '';
  let currentSelector = '';
  let currentTokens: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '{' || trimmed === '}') continue;

    const tokens = trimmed.split(/\s+/);
    const selector = tokens[0];

    if (currentSelector && selector !== currentSelector) {
      if (currentTokens.length > 0) {
        let declarations = '';
        for (const token of currentTokens) {
          const [key, val] = token.split('=');
          const css = convertToCSS(key, val, false);
          if (css) declarations += css;
        }
        rules.push(`  ${currentSelector} { ${declarations} }`);

        // Store initial state (0% or from)
        if (currentSelector === '0%' || currentSelector === 'from') {
          initialState = declarations;
        }
      }
      currentSelector = selector;
      currentTokens = tokens.slice(1);
    } else if (!currentSelector) {
      currentSelector = selector;
      currentTokens = tokens.slice(1);
    } else {
      currentTokens.push(...tokens.slice(1));
    }
  }

  // Process the last selector
  if (currentSelector && currentTokens.length > 0) {
    let declarations = '';
    for (const token of currentTokens) {
      const [key, val] = token.split('=');
      const css = convertToCSS(key, val, false);
      if (css) declarations += css;
    }
    rules.push(`  ${currentSelector} { ${declarations} }`);

    // Store initial state (0% or from)
    if (currentSelector === '0%' || currentSelector === 'from') {
      initialState = declarations;
    }
  }

  return {
    css: rules.join('\n'),
    initialState
  };
}

export function parseDirectiveBlock(directives: string): string {
  if (!directives.trim()) return '';

  const lines = directives.split('\n');
  let output = '';
  let currentBlock: { type: string; query?: string; name?: string; rules: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('@')) {
      // Close previous block if exists
      if (currentBlock) {
        if (currentBlock.type === 'media') {
          output += `@media ${currentBlock.query} {\n${currentBlock.rules.join('\n')}\n}\n\n`;
        } else if (currentBlock.type === 'keyframes') {
          output += `@keyframes ${currentBlock.name} {\n${currentBlock.rules.join('\n')}\n}\n\n`;
        }
      }

      // Start new block
      if (line.startsWith('@keyframes')) {
        const name = line.split(' ')[1];
        currentBlock = { type: 'keyframes', name, rules: [] };
      } else {
        const mediaQuery = parseMediaQuery(line);
        if (mediaQuery) {
          currentBlock = { type: 'media', query: mediaQuery.query, rules: [] };
        }
      }
    } else if (line !== '{' && line !== '}') {
      if (!currentBlock) continue;
      const parts = line.split(/\s+/);
      let styles: string;
      // If the first token contains '=', then no explicit selector is provided
      if (parts[0].includes('=')) {
        // Process the entire line as style tokens
        styles = processDirectiveStyles(parts, true);
        if (styles) {
          const className = generateClassName(styles);
          currentBlock.rules.push(`  .${className} { ${styles} }`);
        }
      } else {
        // Use the first token as the selector
        const selector = parts[0];
        const tokens = parts.slice(1);
        if (currentBlock.type === 'media') {
          styles = processDirectiveStyles(tokens, true);
          if (styles) {
            currentBlock.rules.push(`  ${selector} { ${styles} }`);
          }
        } else if (currentBlock.type === 'keyframes') {
          styles = processKeyframeStyles(tokens);
          if (styles) {
            currentBlock.rules.push(`  ${selector} { ${styles} }`);
            if (selector === '0%' || selector === 'from') {
              registerKeyframeInitialState(currentBlock.name!, styles);
            }
          }
        }
      }
    } else if (line === '}' && currentBlock) {
      if (currentBlock.type === 'media') {
        output += `@media ${currentBlock.query} {\n${currentBlock.rules.join('\n')}\n}\n\n`;
      } else if (currentBlock.type === 'keyframes') {
        output += `@keyframes ${currentBlock.name} {\n${currentBlock.rules.join('\n')}\n}\n\n`;
      }
      currentBlock = null;
    }
  }

  return output;
}

export function processDirectiveStyles(tokens: string[], isResponsive: boolean = false): string {
  const styles = new Map<string, string>();

  for (const token of tokens) {
    const [key, value] = token.split('=');
    if (!key || !value) continue;

    let css: string;
    if (isResponsive) {
      css = responsiveStyleMap[key]?.(value) || '';
    } else {
      css = convertTokenToCSS(key, value);
    }

    if (css) {
      const property = css.split(':')[0].trim();
      styles.set(property, css);
    }
  }

  return Array.from(styles.values()).join(' ');
}

function processKeyframeStyles(tokens: string[]): string {
  const styles = new Map<string, string>();

  for (const token of tokens) {
    const [key, value] = token.split('=');
    if (!key || !value) continue;

    const css = convertTokenToCSS(key, value);
    if (css) {
      const property = css.split(':')[0].trim();
      styles.set(property, css);
    }
  }

  return Array.from(styles.values()).join(' ');
}