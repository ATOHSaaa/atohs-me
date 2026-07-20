import { visit } from 'unist-util-visit';

const BRACKET_URL_PATTERN = /\[([^\]\n]+?)\s+(https?:\/\/[^\s\]]+)\]/g;

function rewriteBracketUrlChildren(children) {
  const result = [];
  let index = 0;

  while (index < children.length) {
    const current = children[index];
    const next = children[index + 1];
    const afterNext = children[index + 2];

    if (
      current?.type === 'text' &&
      next?.type === 'link' &&
      afterNext?.type === 'text'
    ) {
      const openMatch = current.value.match(/^(.*?)\[([^\[\]]+)\s+$/);

      if (openMatch && afterNext.value.startsWith(']')) {
        const [, prefix, linkText] = openMatch;
        const suffix = afterNext.value.slice(1);

        if (prefix) {
          result.push({ type: 'text', value: prefix });
        }

        result.push({
          type: 'link',
          url: next.url,
          title: next.title ?? null,
          children: [{ type: 'text', value: linkText }],
        });

        if (suffix) {
          result.push({ type: 'text', value: suffix });
        }

        index += 3;
        continue;
      }
    }

    result.push(current);
    index += 1;
  }

  return result;
}

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

/**
 * [リンクテキスト https://example.com] を Markdown リンクに変換する remark プラグイン。
 */
export function remarkBracketUrlLinks() {
  return (tree) => {
    visit(tree, 'paragraph', (node) => {
      node.children = rewriteBracketUrlChildren(node.children);
    });

    visit(tree, 'text', (node, index, parent) => {
      if (index == null || !parent) return;

      const nodes = rewriteBracketUrlText(node.value);
      if (!nodes) return;

      parent.children.splice(index, 1, ...nodes);
    });
  };
}
