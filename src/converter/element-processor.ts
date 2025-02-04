import { ElementMap } from './types';
import { convertTokenToCSS, generateClassName } from './css-utils';

// Semantic element mapping
const elementMap: ElementMap = {
  // Basic elements
  p: 'p',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',

  // Container elements with semantic alternatives
  c: 'div', // Default container
  sec: 'section',
  art: 'article',
  aside: 'aside',
  main: 'main',
  nav: 'nav',
  head: 'header',
  foot: 'footer',

  // Interactive elements
  btn: 'button',

  // List elements
  ul: 'ul',
  ol: 'ol',
  li: 'li',

  // Other semantic elements
  fig: 'figure',
  cap: 'figcaption',
  time: 'time',
  mark: 'mark',
  a: 'a'
};

// Helper to determine if an element should be semantic based on its content and context
function inferSemanticElement(type: string, attributes: Map<string, string>, hasChildren: boolean): string {
  // If it's already a semantic element, use that
  if (elementMap[type] && type !== 'c') {
    return elementMap[type];
  }

  // Only try to infer for generic containers
  if (type !== 'c') {
    return 'div';
  }

  const classes = attributes.get('class') || '';
  const id = attributes.get('id') || '';
  const text = attributes.get('text') || '';

  // Infer based on class names
  if (classes.includes('banner') || classes.includes('header') || id.includes('header')) {
    return 'header';
  }
  if (classes.includes('footer') || id.includes('footer')) {
    return 'footer';
  }
  if (classes.includes('nav') || id.includes('nav')) {
    return 'nav';
  }
  if (classes.includes('aside') || classes.includes('sidebar')) {
    return 'aside';
  }

  // Infer based on content
  if (text.match(/copyright|©/i)) {
    return 'footer';
  }
  if (text.match(/menu|navigation/i)) {
    return 'nav';
  }

  // Infer based on structure and children
  if (hasChildren) {
    if (classes.includes('card') || classes.includes('article')) {
      return 'article';
    }
    if (classes.includes('section') || id.includes('section')) {
      return 'section';
    }
  }

  // Default to section for main content blocks, div for utility containers
  if (hasChildren && !classes.includes('wrapper') && !classes.includes('container')) {
    return 'section';
  }

  return 'div';
}

export function createElementFromType(
  type: string,
  attributes: Map<string, string> = new Map(),
  hasChildren: boolean = false
): HTMLElement {
  // Skip creating elements for class and ID selectors
  if (type.startsWith('.') || type.startsWith('#')) {
    const element = document.createElement('div');
    if (type.startsWith('#')) {
      element.id = type.slice(1);
    } else {
      element.classList.add(type.slice(1));
    }
    return element;
  }

  // Infer the most appropriate semantic element
  const tag = inferSemanticElement(type, attributes, hasChildren);
  return document.createElement(tag);
}

export function processClassAndId(element: HTMLElement, token: string): void {
  if (token.startsWith('#')) {
    element.id = token.slice(1);
  } else if (token.startsWith('.')) {
    element.classList.add(token.slice(1));
  }
}

export function processAttribute(element: HTMLElement, elementType: string, key: string, value: string): void {
  switch (key) {
    case 't':
      element.textContent = value.replace(/^"(.*)"$/, '$1');
      break;
    case 'h':
      if (elementType === 'a') {
        element.setAttribute('href', value);
      }
      break;
    case 'role':
      element.setAttribute('role', value);
      break;
    case 'aria':
      // Handle ARIA attributes (format: aria=label:text)
      const [ariaAttr, ariaValue] = value.split(':');
      if (ariaAttr && ariaValue) {
        element.setAttribute(`aria-${ariaAttr}`, ariaValue);
      }
      break;
    default:
      const css = convertTokenToCSS(key, value);
      if (css) {
        const className = generateClassName(css);
        element.classList.add(className);
      }
  }
}