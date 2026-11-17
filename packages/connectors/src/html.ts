import {parseHTML} from 'linkedom';
import {normalizeInline} from './text.ts';

// linkedom exposes DOM-like objects; keep the surface we rely on explicit.
export interface DomNode {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<DomNode>;
}
export interface DomElement extends DomNode {
  tagName: string;
  getAttribute(name: string): string | null;
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
  closest(selector: string): DomElement | null;
}
export interface DomDocument {
  documentElement: DomElement;
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
}

export function parseHtmlDocument(html: string): DomDocument {
  return parseHTML(html).document as unknown as DomDocument;
}

export function all(root: DomDocument | DomElement, selector: string): DomElement[] {
  return Array.from(root.querySelectorAll(selector));
}

export function textOf(element: DomElement | null | undefined): string | null {
  if (!element) return null;
  const text = normalizeInline(element.textContent ?? '');
  return text.length ? text : null;
}

const BLOCK_TAGS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'CAPTION', 'DD', 'DIV', 'DL', 'DT', 'FIGCAPTION', 'FIGURE',
  'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'OL', 'P', 'PRE', 'SECTION',
  'TABLE', 'TBODY', 'THEAD', 'TFOOT', 'TR', 'UL',
]);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'SVG', 'BUTTON', 'FORM', 'NAV']);
const CELL_TAGS = new Set(['TD', 'TH']);

/**
 * Extract paragraphs from a content container, preserving the source's own block
 * structure. Table cells on one row are joined with ` | ` so tabular figures stay
 * on one line with their labels.
 */
export function paragraphsOf(root: DomElement): string[] {
  const out: string[] = [];
  let buffer = '';
  const flush = () => {
    const text = normalizeInline(buffer);
    if (text) out.push(text);
    buffer = '';
  };
  const walk = (node: DomNode) => {
    if (node.nodeType === 3) {
      buffer += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.nodeName.toUpperCase();
    if (SKIP_TAGS.has(tag)) return;
    if (tag === 'BR') {
      buffer += '\n';
      return;
    }
    if (CELL_TAGS.has(tag)) {
      if (buffer.trim()) buffer += ' | ';
      for (const child of Array.from(node.childNodes)) walk(child);
      return;
    }
    const block = BLOCK_TAGS.has(tag);
    if (block) flush();
    for (const child of Array.from(node.childNodes)) walk(child);
    if (block) flush();
  };
  walk(root);
  flush();
  return out;
}
