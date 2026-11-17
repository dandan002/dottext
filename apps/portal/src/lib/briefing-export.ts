// Turns a rendered briefing into portable text: Markdown for notes and wikis,
// plain text for chat and terminals, and HTML that keeps headings when pasted
// into email or Word. All three come from one structure so they never differ
// in content.

export interface BriefingSection {
  heading: string;
  paragraphs: string[];
  sources: string[];
}

export interface BriefingDocument {
  title: string;
  /** e.g. "Briefing" or "Macro outlook". */
  view: string;
  meta: {label: string; value: string}[];
  notice?: string;
  overview: string;
  sections: BriefingSection[];
}

export type ExportFormat = 'markdown' | 'text' | 'html';

export const EXPORT_FORMATS: Record<
  ExportFormat,
  {label: string; extension: string; mime: string}
> = {
  markdown: {label: 'Markdown (.md)', extension: 'md', mime: 'text/markdown'},
  text: {label: 'Plain text (.txt)', extension: 'txt', mime: 'text/plain'},
  html: {label: 'Web page (.html)', extension: 'html', mime: 'text/html'},
};

export function toMarkdown(doc: BriefingDocument): string {
  const lines = [`# ${doc.title}`, '', `**${doc.view}**`, ''];
  for (const {label, value} of doc.meta) {
    lines.push(`- ${label}: ${value}`);
  }
  if (doc.notice != null) {
    lines.push('', `> ${doc.notice}`);
  }
  lines.push('', doc.overview);
  for (const section of doc.sections) {
    lines.push('', `## ${section.heading}`, '');
    lines.push(section.paragraphs.join('\n\n'));
    if (section.sources.length > 0) {
      lines.push('', `_Sources: ${section.sources.join(' · ')}_`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export function toPlainText(doc: BriefingDocument): string {
  const lines = [doc.title.toUpperCase(), doc.view, ''];
  for (const {label, value} of doc.meta) {
    lines.push(`${label}: ${value}`);
  }
  if (doc.notice != null) {
    lines.push('', doc.notice);
  }
  lines.push('', doc.overview);
  for (const section of doc.sections) {
    lines.push('', section.heading.toUpperCase(), '');
    lines.push(section.paragraphs.join('\n\n'));
    if (section.sources.length > 0) {
      lines.push('', `Sources: ${section.sources.join(' · ')}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Body markup only; used for rich clipboard paste. */
export function toHtmlFragment(doc: BriefingDocument): string {
  const parts = [
    `<h1>${escapeHtml(doc.title)}</h1>`,
    `<p><strong>${escapeHtml(doc.view)}</strong></p>`,
    `<ul>${doc.meta
      .map(({label, value}) => `<li>${escapeHtml(label)}: ${escapeHtml(value)}</li>`)
      .join('')}</ul>`,
  ];
  if (doc.notice != null) {
    parts.push(`<p><em>${escapeHtml(doc.notice)}</em></p>`);
  }
  parts.push(`<p>${escapeHtml(doc.overview)}</p>`);
  for (const section of doc.sections) {
    parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    parts.push(...section.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`));
    if (section.sources.length > 0) {
      parts.push(
        `<p><small>Sources: ${escapeHtml(section.sources.join(' · '))}</small></p>`,
      );
    }
  }
  return parts.join('\n');
}

/** A standalone, readable document for download. */
export function toHtmlDocument(doc: BriefingDocument): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.title)}</title>
<style>
body{font:16px/1.6 system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1.5rem;color:#1a1a1a}
h1{font-size:1.75rem;margin-bottom:.25rem}h2{font-size:1.25rem;margin-top:2rem}
ul{padding:0;list-style:none;color:#4b4b4b}small,em{color:#4b4b4b}
</style>
</head>
<body>
${toHtmlFragment(doc)}
</body>
</html>
`;
}

export function render(doc: BriefingDocument, format: ExportFormat): string {
  switch (format) {
    case 'markdown':
      return toMarkdown(doc);
    case 'text':
      return toPlainText(doc);
    case 'html':
      return toHtmlDocument(doc);
  }
}

export function downloadBriefing(
  doc: BriefingDocument,
  format: ExportFormat,
  fileStem: string,
) {
  const {extension, mime} = EXPORT_FORMATS[format];
  const blob = new Blob([render(doc, format)], {type: `${mime};charset=utf-8`});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileStem}.${extension}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Copies rich HTML (keeps headings in email and Word) with a plain-text
 * fallback for chat and terminals. Falls back to text-only where the browser
 * lacks ClipboardItem.
 */
export async function copyBriefing(doc: BriefingDocument): Promise<void> {
  const text = toPlainText(doc);
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([toHtmlFragment(doc)], {type: 'text/html'}),
        'text/plain': new Blob([text], {type: 'text/plain'}),
      }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(text);
}
