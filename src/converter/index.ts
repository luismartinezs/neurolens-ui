import { ElementWithDepth, StackItem } from './types';
import { processCssVariableDeclaration, defaultTheme, generateClassName } from './css-utils';
import { parseDirectiveBlock, processDirectiveStyles } from './directive-parser';
import { createElementFromType, processClassAndId, processAttribute } from './element-processor';

function collectDirectives(lines: string[]): string {
  let directives = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('@')) {
      directives += line + '\n';

      // If this is a block directive (media query or keyframes)
      if (line.includes('{')) {
        i++;
        let braceCount = 1;

        // Collect everything until matching closing brace
        while (i < lines.length && braceCount > 0) {
          const currentLine = lines[i].trim();
          if (currentLine.includes('{')) braceCount++;
          if (currentLine.includes('}')) braceCount--;
          directives += currentLine + '\n';
          i++;
        }
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return directives;
}

// Updated processInlineDirectiveBlock function
function processInlineDirectiveBlock(lines: string[], startIndex: number): { generatedClassName?: string, endIndex: number } {
  let collectedLines: string[] = [];
  let i = startIndex;
  const headerLine = lines[i].trim();
  // Ensure this is a block directive (should contain '{')
  if (!headerLine.includes('{')) {
    return { endIndex: i + 1 };
  }
  i++; // move past the directive header
  let braceCount = 1;
  while (i < lines.length && braceCount > 0) {
    const currentLine = lines[i].trim();
    collectedLines.push(currentLine);
    if (currentLine.includes('{')) braceCount++;
    if (currentLine.includes('}')) braceCount--;
    i++;
  }
  // Find the first content line that is meant for the inline element (i.e. does not start with '.' or '#' and contains '=' )
  for (const cline of collectedLines) {
    if (cline === '{' || cline === '}') continue;
    if (!cline.startsWith('.') && !cline.startsWith('#') && cline.indexOf('=') >= 0) {
      const tokens = cline.split(/\s+/);
      // Use the responsive style map processing
      const inlineCSS = processDirectiveStyles(tokens, true);
      if (inlineCSS) {
        const genClass = generateClassName(inlineCSS);
        return { generatedClassName: genClass, endIndex: i };
      }
    }
  }
  return { endIndex: i };
}

// Modify parseBlock to process inline directive blocks
function parseBlock(lines: string[], startIndex: number): { elements: ElementWithDepth[], endIndex: number } {
  const elements: ElementWithDepth[] = [];
  let i = startIndex;
  let currentIndent = lines[startIndex].match(/^\s*/)?.[0].length || 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.match(/^\s*/)?.[0].length || 0;

    // Exit if we're back to a lower indentation level
    if (indent < currentIndent) {
      break;
    }

    // If the line is a directive block, process it inline and attach class to the last element
    if (trimmed.startsWith('@')) {
      const result = processInlineDirectiveBlock(lines, i);
      i = result.endIndex;
      if (result.generatedClassName && elements.length > 0) {
        // Append the generated responsive class to the last element's class attribute
        const lastElem = elements[elements.length - 1].element;
        const existingClass = lastElem.getAttribute('class') || '';
        lastElem.setAttribute('class', (existingClass + ' ' + result.generatedClassName).trim());
      }
      continue;
    }

    // Skip empty lines, comments, and brace-only lines
    if (!trimmed || trimmed.startsWith('#') || trimmed === '{' || trimmed === '}') {
      i++;
      continue;
    }

    if (trimmed.startsWith('@')) {
      // (This branch is now handled above.)
      i++;
      continue;
    }

    const matches = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (!matches || matches.length === 0) {
      i++;
      continue;
    }

    const elementType = matches[0];

    // Skip if this is just a selector without any attributes
    if (matches.length === 1 && (elementType.startsWith('.') || elementType.startsWith('#'))) {
      i++;
      continue;
    }

    // Collect attributes before creating the element
    const attributes = new Map<string, string>();
    let hasContent = false;

    // Process attributes and classes
    for (let j = 1; j < matches.length; j++) {
      const token = matches[j];
      if (token === '{' || token === '}') continue;

      if (token.startsWith('#')) {
        attributes.set('id', token.slice(1));
        hasContent = true;
      } else if (token.startsWith('.')) {
        const existingClasses = attributes.get('class') || '';
        attributes.set('class', existingClasses ? `${existingClasses} ${token.slice(1)}` : token.slice(1));
        hasContent = true;
      } else {
        const attrMatch = token.match(/^([a-zA-Z0-9]+)=(.+)$/);
        if (attrMatch) {
          const [, key, value] = attrMatch;
          attributes.set(key, value);
          if (key === 't') {
            attributes.set('text', value.replace(/^"(.*)"$/, '$1'));
          }
          hasContent = true;
        }
      }
    }

    // Check if this element will have children
    let hasChildren = false;
    if (trimmed.endsWith('{')) {
      const nextLine = lines[i + 1];
      hasChildren = Boolean(nextLine && nextLine.trim() && !nextLine.trim().startsWith('@'));
    }

    // Create element with collected attributes and children info
    const element = createElementFromType(elementType, attributes, hasChildren);

    // Apply collected attributes
    attributes.forEach((value, key) => {
      if (key === 'class' || key === 'id' || key === 'text') return; // Already handled
      processAttribute(element, elementType, key, value);
    });

    // Only add the element if it has content or is explicitly needed
    if (hasContent || elementType === 'c' || !elementType.startsWith('.')) {
      elements.push({ element, indent });
    }

    // If this line ends with {, parse the nested block
    if (trimmed.endsWith('{')) {
      const { elements: children, endIndex } = parseBlock(lines, i + 1);
      // Only add children that have content
      children.forEach(child => {
        if (child.element.hasChildNodes() || child.element.hasAttributes()) {
          element.appendChild(child.element);
        }
      });
      i = endIndex;
    } else {
      i++;
    }
  }

  return { elements, endIndex: i };
}

export function parseDSL(dslString: string): string {
  const allLines: string[] = dslString.replace(/\r\n/g, '\n').split('\n');
  let cssVariables = "";

  // First pass: collect CSS variables
  allLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("$")) {
      cssVariables += processCssVariableDeclaration(trimmed);
    }
  });

  // Second pass: collect all directives (media queries and keyframes)
  const cssDirectives = parseDirectiveBlock(collectDirectives(allLines));

  // Third pass: parse the markup
  const { elements } = parseBlock(allLines, 0);

  // Create root element and append children
  const root = document.createElement('div');
  root.id = 'app';

  // Only append children that have content
  elements.forEach(({ element }) => {
    if (element.hasChildNodes() || element.hasAttributes()) {
      root.appendChild(element);
    }
  });

  // Add styles
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    :root {
      ${cssVariables ? cssVariables : defaultTheme}
    }
    body {
      background-color: var(--background);
      color: var(--text);
      margin: 0;
      padding: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
    }
    ${cssDirectives}
  `;
  root.insertBefore(styleElement, root.firstChild);

  return root.innerHTML;
}