import { visit } from 'unist-util-visit';

const TWITTER_STATUS_URL =
  /^https?:\/\/(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/\d+(?:\?.*)?$/;

function normalizeTwitterUrl(url) {
  const match = url.match(
    /^(https?:\/\/(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/\d+)/
  );
  return match?.[1] ?? null;
}

function getStandaloneTwitterUrl(paragraph) {
  const children = paragraph.children.filter(
    (child) => !(child.type === 'text' && !child.value.trim())
  );

  if (children.length !== 1) {
    return null;
  }

  const child = children[0];

  if (child.type === 'link') {
    return normalizeTwitterUrl(child.url);
  }

  if (child.type === 'text') {
    return normalizeTwitterUrl(child.value.trim());
  }

  return null;
}

function createTwitterEmbed(url) {
  return {
    type: 'html',
    value: `<div class="twitter-embed"><blockquote class="twitter-tweet"><a href="${url}"></a></blockquote></div>`,
  };
}

/**
 * 段落内に単独で書かれた Twitter / X の投稿 URL を埋め込みに変換する remark プラグイン。
 */
export function remarkTwitterEmbeds() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (index == null || !parent) return;

      const url = getStandaloneTwitterUrl(node);
      if (!url || !TWITTER_STATUS_URL.test(url)) return;

      parent.children[index] = createTwitterEmbed(url);
    });
  };
}
