export interface ElementWithDepth {
  element: HTMLElement;
  indent: number;
}

export interface StackItem {
  node: HTMLElement;
  depth: number;
}

export interface ElementMap {
  [key: string]: string;
}

export type StyleFunction = (val: string) => string;
export type StyleMap = Record<string, StyleFunction>;