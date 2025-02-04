import { StyleMap } from './types';

// Add color value mapping
const colorMap: Record<string, string> = {
  '#fff': 'white',
  '#ffffff': 'white',
  '#000': 'black',
  '#000000': 'black',
  'white': 'white',
  'black': 'black',
  'transparent': 'transparent'
};

// Update property name map with more specific color mappings
const propertyNameMap: Record<string, string> = {
  'font-size': 'text',
  'color': 'color',
  'background': 'bg',
  'background-color': 'bg',
  'padding': 'pad',
  'border-radius': 'rounded',
  'opacity': 'opacity',
  'max-width': 'maxw',
  'min-width': 'minw',
  'width': 'w',
  'height': 'h',
  'gap': 'gap',
  'display': 'disp',
  'flex-direction': 'flex',
  'align-items': 'align',
  'justify-content': 'justify',
  'animation': 'anim',
  'flex-wrap': 'wrap',
  'transform': 'transform'
};

// Update value name map with more semantic values
const valueNameMap: Record<string, string> = {
  'center': 'center',
  'flex': 'flex',
  'none': 'none',
  'column': 'col',
  'row': 'row',
  'wrap': 'wrap',
  'hidden': 'hidden',
  'transparent': 'transparent'
};

function normalizeColor(color: string): string {
  // Convert 3-digit hex to 6-digit hex
  if (color.match(/^#[0-9a-f]{3}$/i)) {
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return color.toLowerCase();
}

function getSemanticValue(value: string, property: string): string {
  // Handle pixel values
  if (value.endsWith('px')) {
    return value.replace('px', '');
  }
  // Handle percentage values
  if (value.endsWith('%')) {
    return value.replace('%', 'pct');
  }
  // Handle colors
  if (property.includes('color') || property.includes('background')) {
    const normalizedColor = normalizeColor(value);
    // Check if it's a CSS variable
    if (value.startsWith('var(--')) {
      const varName = value.match(/var\(--([^)]+)\)/)?.[1];
      return varName || 'var';
    }
    // Check if it's a mapped color
    if (colorMap[normalizedColor]) {
      return colorMap[normalizedColor];
    }
    // If it's a hex color, create a semantic name
    if (normalizedColor.startsWith('#')) {
      return normalizedColor.slice(1);
    }
  }
  // Handle animation values
  if (value.includes('forwards')) {
    return value.split(' ')[0];
  }
  return valueNameMap[value] || value;
}

function getSemanticClassName(property: string, value: string): string {
  const propName = propertyNameMap[property] || property.replace(/[^a-z]/g, '');
  const semanticValue = getSemanticValue(value, property);
  return `n-${propName}-${semanticValue}`;
}

// Utility to generate unique class names
const generatedClasses = new Map<string, string>();

export function generateClassName(styles: string): string {
  // Remove " !important" and extra whitespace for normalization
  const cleaned = styles.replace(/\s*!important/g, '').trim();
  // Split into individual declarations, filter out empties, and sort alphabetically
  const declarations = cleaned.split(';')
    .map(decl => decl.trim())
    .filter(decl => decl.length > 0)
    .sort();

  const normalized = declarations.join('; ');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Convert hash to a base36 string and ensure it's positive
  return `n-${Math.abs(hash).toString(36)}`;
}

export function replaceCssVariables(val: string): string {
  // If already a CSS variable, return as is
  if (val.startsWith('var(--')) {
    return val;
  }
  // Handle hex colors and other values
  if (val.startsWith('$')) {
    return `var(--${val.substring(1)})`;
  }
  // Handle mapped colors
  const normalizedColor = normalizeColor(val);
  if (colorMap[normalizedColor]) {
    return normalizedColor;
  }
  return val;
}

export function processCssVariableDeclaration(line: string): string {
  const parts = line.split("=");
  const varName = parts[0].substring(1).trim();
  const varValue = parts.slice(1).join("=").trim();
  // Remove any existing variable declaration to prevent duplicates
  return `--${varName}: ${varValue.replace(/var\(--[^)]+\)/, '')}; `;
}

export const pixelProperties = ['s', 'pad', 'br', 'maxw', 'minw', 'gap', 'w', 'h'];

// Add animation state tracking
interface AnimationState {
  name: string;
  duration: string;
  initialState: string;
}

function parseAnimation(value: string): AnimationState {
  const parts = value.split(/\s+/);
  return {
    name: parts[0],
    duration: parts[1] || '1s',
    initialState: parts[2] || ''
  };
}

export const styleMap: StyleMap = {
  s: (val) => `font-size: ${val};`,
  tc: (val) => `color: ${replaceCssVariables(val)};`,
  bg: (val) => `background-color: ${replaceCssVariables(val)};`,
  pad: (val) => {
    // Handle shorthand padding
    const parts = val.split(' ');
    if (parts.length === 1) {
      return `padding: ${val};`;
    }
    return `padding: ${parts.join(' ')};`;
  },
  br: (val) => `border-radius: ${val};`,
  op: (val) => `opacity: ${val};`,
  maxw: (val) => `max-width: ${val};`,
  minw: (val) => `min-width: ${val};`,
  w: (val) => `width: ${val};`,
  h: (val) => `height: ${val};`,
  gap: (val) => `gap: ${val};`,
  dir: (val) => {
    switch (val) {
      case 'col':
        return 'display: flex; flex-direction: column;';
      case 'row':
        return 'display: flex; flex-direction: row;';
      default:
        return '';
    }
  },
  align: (val) => {
    if (val === 'c') {
      return 'align-items: center; justify-content: center;';
    }
    return `align-items: ${val};`;
  },
  anim: (val) => {
    const { name, duration } = parseAnimation(val);
    return `animation: ${name} ${duration} ease-in-out forwards;`;
  },
  disp: (val) => val === 'none' ? 'display: none;' : `display: ${val};`,
  wrap: (val) => val === 'wrap' ? 'flex-wrap: wrap;' : '',
  trf: (val) => `transform: ${val};`,
};

// Create a version of the style map for responsive styles (with !important)
export const responsiveStyleMap: StyleMap = {
  s: (val) => `font-size: ${val} !important;`,
  tc: (val) => `color: ${replaceCssVariables(val)} !important;`,
  bg: (val) => `background-color: ${replaceCssVariables(val)} !important;`,
  pad: (val) => {
    const parts = val.split(' ');
    if (parts.length === 1) {
      return `padding: ${val} !important;`;
    }
    return `padding: ${parts.join(' ')} !important;`;
  },
  br: (val) => `border-radius: ${val} !important;`,
  op: (val) => `opacity: ${val} !important;`,
  maxw: (val) => `max-width: ${val} !important;`,
  minw: (val) => `min-width: ${val} !important;`,
  w: (val) => `width: ${val} !important;`,
  h: (val) => `height: ${val} !important;`,
  gap: (val) => `gap: ${val} !important;`,
  dir: (val) => {
    switch (val) {
      case 'col':
        return 'display: flex !important; flex-direction: column !important;';
      case 'row':
        return 'display: flex !important; flex-direction: row !important;';
      default:
        return '';
    }
  },
  align: (val) => {
    if (val === 'c') {
      return 'align-items: center !important; justify-content: center !important;';
    }
    return `align-items: ${val} !important;`;
  },
  anim: (val) => {
    const { name, duration } = parseAnimation(val);
    return `animation: ${name} ${duration} ease-in-out forwards !important;`;
  },
  disp: (val) => val === 'none' ? 'display: none !important;' : `display: ${val} !important;`,
  wrap: (val) => val === 'wrap' ? 'flex-wrap: wrap !important;' : '',
  trf: (val) => `transform: ${val} !important;`,
};

export function convertTokenToCSS(key: string, value: string): string {
  // Special handling for animations to set initial state
  if (key === 'anim') {
    const { name, duration, initialState } = parseAnimation(value);
    if (initialState) {
      const initialProps = getInitialKeyframeState(name);
      if (initialProps) {
        return initialProps + styleMap[key](value);
      }
    }
  }

  // Handle percentage values
  if (value.endsWith('%')) {
    return styleMap[key] ? styleMap[key](value) : '';
  }

  // Handle special values
  if (value === 'none' || value === 'inherit' || value === 'initial') {
    return styleMap[key] ? styleMap[key](value) : '';
  }

  // Handle pixel values
  const processedValue = pixelProperties.includes(key) && /^\d+$/.test(value) ? `${value}px` : value;

  // Get the CSS declaration
  const css = styleMap[key] ? styleMap[key](processedValue) : '';

  // Clean up any double spaces or unnecessary whitespace
  return css.replace(/\s+/g, ' ').trim();
}

// Cache for storing keyframe initial states
const keyframeInitialStates = new Map<string, string>();

export function registerKeyframeInitialState(name: string, properties: string) {
  keyframeInitialStates.set(name, properties);
}

function getInitialKeyframeState(name: string): string {
  return keyframeInitialStates.get(name) || '';
}

export const defaultTheme = `
  --background: #1a1a1a;
  --text: #ffffff;
  --primary: #9333ea;
  --secondary: #4f46e5;
  --accent: #06b6d4;
`;