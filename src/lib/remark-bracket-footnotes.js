import { visit } from 'unist-util-visit';
import { BRACKET_FOOTNOTE_PATTERN } from './blog-footnotes.js';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function createFootnoteRefHtml(text, index) {
  const label = escapeHtml(text);
  const refId = `quote-ref-${index}`;
  const footnoteId = `quote-footnote-${index}`;
  const num = String(index);
  return (
    `<sup class="quote-ref"><a href="#${footnoteId}" id="${refId}" class="quote-ref-link">` +
    `<span class="quote-ref-wrap" tabindex="0">` +
    `<span class="quote-ref-num" aria-describedby="${refId}-tooltip">${num}</span>` +
    `<span class="quote-ref-tooltip" id="${refId}-tooltip" role="tooltip">${label}</span>` +
    `</span></a></sup>`
  );
}

function shouldSkipFootnoteParent(parent) {
  if (!parent) return true;
  return parent.type === 'code' || parent.type === 'inlineCode';
}

function splitTextWithFootnotes(value, getNextIndex) {
  if (!value.includes('[[')) return null;

  const pattern = new RegExp(BRACKET_FOOTNOTE_PATTERN.source, 'g');
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    }

    const body = match[1].trim();
    if (body) {
      const index = getNextIndex();
      parts.push({
        type: 'html',
        value: createFootnoteRefHtml(body, index),
      });
    }

    lastIndex = pattern.lastIndex;
  }

  if (parts.length === 0) return null;

  if (lastIndex < value.length) {
    parts.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return parts;
}

export function remarkBracketFootnotes() {
  let footnoteIndex = 0;

  return (tree) => {
    footnoteIndex = 0;

    visit(tree, 'text', (node, index, parent) => {
      if (shouldSkipFootnoteParent(parent)) return;

      const parts = splitTextWithFootnotes(node.value, () => {
        footnoteIndex += 1;
        return footnoteIndex;
      });

      if (!parts) return;

      parent.children.splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
}
