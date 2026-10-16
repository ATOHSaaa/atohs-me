import { visitParents } from 'unist-util-visit-parents';

/**
 * 引用ブロック内の入れ子引用 `> > 出典テキスト` を出典行（.quote-source）に変換する。
 *
 * ```md
 * > 引用文
 * >
 * > > 著者『作品名』「篇名」
 * ```
 */
const SOURCE_LINE_PATTERN = /^(?:——|―|—|–|-)\s*(.+)$/u;

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function paragraphPlainText(paragraph) {
  return paragraph.children
    .map((child) => {
      if (child.type === 'text') {
        return child.value;
      }
      if (child.type === 'link') {
        return child.children
          .filter((node) => node.type === 'text')
          .map((node) => node.value)
          .join('');
      }
      return '';
    })
    .join('');
}

function blockquotePlainText(blockquote) {
  return blockquote.children
    .map((child) => {
      if (child.type === 'paragraph') {
        return paragraphPlainText(child);
      }
      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function normalizeSourceText(text) {
  const trimmed = text.trim();
  const match = trimmed.match(SOURCE_LINE_PATTERN);
  return match ? match[1].trim() : trimmed;
}

function createQuoteSourceHtml(text) {
  return {
    type: 'html',
    value: `<p class="quote-source">${escapeHtml(text)}</p>`,
  };
}

function trimEmptyTrailingParagraphs(blockquote) {
  while (blockquote.children.length > 0) {
    const last = blockquote.children[blockquote.children.length - 1];
    if (last.type === 'paragraph' && !paragraphPlainText(last).trim()) {
      blockquote.children.pop();
      continue;
    }
    break;
  }
}

export function remarkQuoteSource() {
  return (tree) => {
    visitParents(tree, 'blockquote', (blockquote, ancestors) => {
      const parent = ancestors[ancestors.length - 1];
      if (!parent?.children) return;

      const index = parent.children.indexOf(blockquote);
      if (index === -1) return;

      const lastChild = blockquote.children[blockquote.children.length - 1];
      if (lastChild?.type !== 'blockquote') return;

      const nestedText = blockquotePlainText(lastChild);
      if (!nestedText) return;

      blockquote.children.pop();
      trimEmptyTrailingParagraphs(blockquote);
      parent.children.splice(
        index + 1,
        0,
        createQuoteSourceHtml(normalizeSourceText(nestedText))
      );
    });
  };
}
