import { visit } from 'unist-util-visit';

const BRACKET_URL_PATTERN = /\[([^\]\n]+?)\s+(https?:\/\/[^\s\]]+)\]/g;

function rewriteBracketUrlText(value) {
  if (!/\[[^\]]+\s+https?:\/\//.test(value)) {
    return null;
  }

  const nodes = [];
  let lastIndex = 0;

  BRACKET_URL_PATTERN.lastIndex = 0;
  for (const match of value.matchAll(BRACKET_URL_PATTERN)) {
    if (match.index > lastIndex) {
      nodes.push({
        type: 'text',
        value: value.slice(lastIndex, match.index),
      });
    }

    nodes.push({
      type: 'link',
      url: match[2],
      title: null,
      children: [{ type: 'text', value: match[1] }],
    });

    lastIndex = match.index + match[0].length;
  }

  if (nodes.length === 0) {
    return null;
  }

  if (lastIndex < value.length) {
    nodes.push({
      type: 'text',
      value: value.slice(lastIndex),
    });
  }

  return nodes;
}

/** autolink で壊れた link ノードは表示テキスト（URL ごと）をそのまま連結する */
function phrasingNodeToRecoverableText(node) {
  if (node.type === 'text') {
    return node.value;
  }

  if (node.type === 'link') {
    const label = node.children?.map((child) => child.value).join('') ?? '';

    if (/^https?:\/\//.test(label) || /(?:%5D|\])/.test(node.url)) {
      return label || node.url;
    }

    return label;
  }

  return '';
}

function rewriteParagraphBracketUrls(children) {
  const flattened = children.map(phrasingNodeToRecoverableText).join('');

  if (!/\[[^\]\n]+\s+https?:\/\//.test(flattened)) {
    return children;
  }

  const nodes = rewriteBracketUrlText(flattened);
  return nodes ?? children;
}

/**
 * [リンクテキスト https://example.com] を Markdown リンクに変換する remark プラグイン。
 * GFM autolink が `]` 以降まで URL に含めてしまうケースも段落単位で復元する。
 */
export function remarkBracketUrlLinks() {
  return (tree) => {
    visit(tree, 'paragraph', (node) => {
      node.children = rewriteParagraphBracketUrls(node.children);
    });

    visit(tree, 'text', (node, index, parent) => {
      if (index == null || !parent) return;

      const nodes = rewriteBracketUrlText(node.value);
      if (!nodes) return;

      parent.children.splice(index, 1, ...nodes);
    });
  };
}
