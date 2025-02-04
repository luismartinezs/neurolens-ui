interface ElementWithDepth {
  element: HTMLElement;
  indent: number;
}

interface StackItem {
  node: HTMLElement;
  depth: number;
}

interface ElementMap {
  [key: string]: string;
}

export function parseDSL(dslString: string): string {
  // Helper function to replace $variables with CSS variable syntax
  function replaceCssVariables(val: string): string {
    return val.replace(/\$([a-zA-Z0-9]+)/g, "var(--$1)");
  }

  // Helper to convert DSL style tokens to CSS declarations
  function convertTokenToCSS(key: string, value: string): string {
    switch(key) {
      case 's': return `font-size: ${(/^\d+$/.test(value) ? value + 'px' : value)};`;
      case 'tc': return `color: ${value};`;
      case 'bg': return `background: ${value};`;
      case 'pad': return `padding: ${(/^\d+$/.test(value) ? value + 'px' : value)};`;
      case 'br': return `border-radius: ${(/^\d+$/.test(value) ? value + 'px' : value)};`;
      case 'op': return `opacity: ${value};`;
      case 'maxw': return `max-width: ${(/^\d+$/.test(value) ? value + 'px' : value)};`;
      case 'gap': return `gap: ${(/^\d+$/.test(value) ? value + 'px' : value)};`;
      case 'dir': return (value === 'col') ? 'display: flex; flex-direction: column;' : (value === 'row' ? 'display: flex; flex-direction: row;' : '');
      case 'align': return (value === 'c') ? 'align-items: center; justify-content: center;' : `align-items: ${value};`;
      case 'anim': return `animation: ${value};`;
      default: return ``;
    }
  }

  // Simplified parser for directive rules (only one level, no nested blocks support)
  function parseDirectiveRules(lines: string[]): string {
    const rules: string[] = [];
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // For simplicity, ignore lines with nested braces
      if (trimmed.includes("{") || trimmed.includes("}")) {
        continue;
      }
      const tokens = trimmed.split(/\s+/);
      const selector = tokens[0];
      let declarations = "";
      for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];
        const match = token.match(/^([a-zA-Z0-9]+)=(.+)$/);
        if (match) {
          const key = match[1];
          const rawVal = match[2];
          const val = replaceCssVariables(rawVal);
          declarations += convertTokenToCSS(key, val);
        }
      }
      if(declarations) {
        rules.push(`${selector} { ${declarations} }`);
      }
    }
    return rules.join("\n");
  }

  // Parser for directive blocks (currently only supports @mobile with maxw condition)
  function parseDirectiveBlock(directives: string): string {
    const lines = directives.split("\n");
    let output = "";
    let i = 0;
    while (i < lines.length) {
      let line = lines[i].trim();
      if (line.startsWith("@mobile")) {
        const headerMatch = line.match(/@mobile\s+maxw=(\d+)/);
        if (headerMatch) {
          const maxWidth = headerMatch[1] + "px";
          i++;
          const blockLines: string[] = [];
          while (i < lines.length && !lines[i].includes("}")) {
            blockLines.push(lines[i]);
            i++;
          }
          i++; // skip closing '}'
          const cssRules = parseDirectiveRules(blockLines);
          output += `@media (max-width: ${maxWidth}) {\n${cssRules}\n}\n`;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
    return output;
  }

  // Separate DSL into style-related lines and markup lines
  const allLines: string[] = dslString.replace(/\r\n/g, '\n').split('\n');
  const markupLines: string[] = [];
  let cssVariables = "";
  let cssDirectives = "";

  allLines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("$")) {
      // CSS variable declaration, e.g. "$primary=#2196f3"
      const parts = trimmed.split("=");
      const varName = parts[0].substring(1).trim();
      const varValue = parts.slice(1).join("=").trim();
      cssVariables += `--${varName}: ${varValue}; `;
    } else if (trimmed.startsWith("@")) {
      // Collect directive lines (e.g. responsive directives or keyframes)
      cssDirectives += line + "\n";
    } else {
      markupLines.push(line);
    }
  });

  // Combine markup lines back into a DSL string for normal processing
  const markupDSL = markupLines.join("\n");

  // Use the markupDSL for further processing instead of the original DSL
  const lines: string[] = markupDSL.split("\n");

  const htmlElements: ElementWithDepth[] = [];

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine === '{' || trimmedLine === '}') return;
    // Get indentation level from the original line (to preserve nesting)
    const indent = line.match(/^\s*/)?.[0].length || 0;

    // Parse the line while preserving quoted strings
    const matches = trimmedLine.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (!matches || matches.length === 0) return;

    // First match is the element type
    const elementType = matches[0];

    // Update the elementMap to include additional DSL elements
    const elementMap: ElementMap = {
      p: 'p',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
      c: 'div',
      btn: 'button',
      ul: 'ul',
      ol: 'ol',
      li: 'li',
      a: 'a',
      footer: 'footer'
    };

    const tag = elementMap[elementType] || 'div';
    const element = document.createElement(tag);

    // Process attributes and additional tokens (starting from index 1)
    for (let i = 1; i < matches.length; i++) {
      const token = matches[i];

      // Skip tokens that are simply '{' or '}'
      if (token === '{' || token === '}') continue;

      // Handle ID and class tokens
      if (token.startsWith('#')) {
        // Token may include an ID and additional classes separated by '.' e.g. "#submit.primary"
        const parts = token.split('.');
        const idValue = parts[0].substring(1);
        if (idValue) {
          element.id = idValue;
        }
        // Any remaining parts are classes
        for (let j = 1; j < parts.length; j++) {
          if (parts[j]) {
            element.classList.add(parts[j]);
          }
        }
        continue;
      } else if (token.startsWith('.')) {
        // Token starting with '.' denotes one or more classes e.g. ".card.primary"
        const classNames = token.split('.').filter(cls => cls !== '');
        classNames.forEach(cls => element.classList.add(cls));
        continue;
      } else {
        // Process key=value tokens
        const attrMatch = token.match(/^([a-zA-Z0-9]+)=(.+)$/);
        if (!attrMatch) continue;
        let key = attrMatch[1];
        const rawValue = attrMatch[2];
        if (!rawValue) continue;
        const value = rawValue.startsWith('"') && rawValue.endsWith('"') ? rawValue.slice(1, -1) : rawValue;

        // If token key is 'c', treat it as a class name instead of an attribute
        if (key === 'c') {
          element.classList.add(value);
          continue;
        }

        // Special case: for link elements, map 'h' to 'href'
        if (elementType === 'a' && key === 'h') {
          key = 'href';
        }

        // Handle text content
        if (key === 't') {
          element.textContent = value;
          continue;
        }

        // Prepare to accumulate inline styles
        // Define style keys that should be converted to CSS
        const styleKeys = ['s', 'tc', 'bg', 'pad', 'br', 'op', 'maxw', 'gap', 'dir', 'align', 'anim', 'w', 'h', 'flex'];
        if (!element.hasOwnProperty('__inlineStyle')) {
          // We'll use a temporary property to accumulate styles
          (element as any).__inlineStyle = '';
        }

        if (styleKeys.includes(key)) {
          switch(key) {
            case 's': // font-size
              (element as any).__inlineStyle += `font-size: ${(/^\d+$/.test(value) ? value + 'px' : replaceCssVariables(value))};`;
              break;
            case 'tc': // text color
              (element as any).__inlineStyle += `color: ${replaceCssVariables(value)};`;
              break;
            case 'bg': // background
              (element as any).__inlineStyle += `background: ${replaceCssVariables(value)};`;
              break;
            case 'pad': // padding
              (element as any).__inlineStyle += `padding: ${(/^\d+$/.test(value) ? value + 'px' : replaceCssVariables(value))};`;
              break;
            case 'br': // border-radius
              (element as any).__inlineStyle += `border-radius: ${(/^\d+$/.test(value) ? value + 'px' : replaceCssVariables(value))};`;
              break;
            case 'op': // opacity
              (element as any).__inlineStyle += `opacity: ${value};`;
              break;
            case 'maxw': // max-width
              (element as any).__inlineStyle += `max-width: ${(/^\d+$/.test(value) ? value + 'px' : replaceCssVariables(value))};`;
              break;
            case 'gap':
              (element as any).__inlineStyle += `gap: ${(/^\d+$/.test(value) ? value + 'px' : replaceCssVariables(value))};`;
              break;
            case 'dir':
              if (value === 'col') {
                (element as any).__inlineStyle += 'display: flex; flex-direction: column;';
              } else if (value === 'row') {
                (element as any).__inlineStyle += 'display: flex; flex-direction: row;';
              }
              break;
            case 'align':
              if (value === 'c') {
                (element as any).__inlineStyle += 'align-items: center; justify-content: center;';
              } else {
                (element as any).__inlineStyle += `align-items: ${replaceCssVariables(value)};`;
              }
              break;
            case 'anim':
              {
                let animationVal = value;
                // Look ahead for a duration token if it exists and does not have an '=' sign
                if (i + 1 < matches.length && !/^[a-zA-Z0-9]+=/.test(matches[i+1])) {
                  animationVal += ' ' + matches[i+1];
                  i++; // skip the duration token
                }
                (element as any).__inlineStyle += `animation: ${animationVal};`;
              }
              break;
            case 'w': // width
              (element as any).__inlineStyle += `width: ${(/^[0-9]+$/.test(value) ? value + 'px' : replaceCssVariables(value))};`;
              break;
            case 'h': // height
              (element as any).__inlineStyle += `height: ${(/^[0-9]+$/.test(value) ? value + 'px' : replaceCssVariables(value))};`;
              break;
            case 'flex': // flex
              (element as any).__inlineStyle += `flex: ${value};`;
              break;
          }
        } else {
          // Not a style key, set as a regular attribute
          element.setAttribute(key, value);
        }
      }
    }

    // After processing all tokens for this element, if inline styles were accumulated, set them
    if ((element as any).__inlineStyle) {
      element.setAttribute('style', (element as any).__inlineStyle);
    }

    htmlElements.push({ element, indent });
  });

  // Build nested structure based on indentation
  const root: HTMLDivElement = document.createElement('div');
  const stack: { node: HTMLElement; depth: number }[] = [{ node: root, depth: -1 }];

  htmlElements.forEach(({ element, indent }) => {
    const depth = indent / 2; // 2 spaces per indent
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    parent.appendChild(element);
    stack.push({ node: element, depth });
  });

  // Create a <style> element with CSS variables, processed directives, and a default fadeIn keyframes if not provided
  const styleBlock = document.createElement('style');
  let styleContent = '';
  if (cssVariables) {
    styleContent += `:root { ${cssVariables} }\n`;
  }
  const processedDirectives = parseDirectiveBlock(cssDirectives);
  styleContent += processedDirectives;
  if (!styleContent.includes('@keyframes fadeIn')) {
    styleContent += `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }\n`;
  }
  styleBlock.textContent = styleContent;
  document.head.appendChild(styleBlock);

  return root.innerHTML;
}