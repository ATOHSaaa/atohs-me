function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatCardTitle(title, siteName) {
  if (!title) return siteName ?? '';

  if (siteName && title.includes(' | ')) {
    const [primary] = title.split(' | ');
    return primary.trim() || title;
  }

  return title;
}

/**
 * OGP 風リンクカード HTML。
 * @param {{ url: string; title?: string; description?: string; image?: string; siteName?: string }} metadata
 */
export function renderOgpLinkCardHtml(metadata) {
  const url = metadata.url;
  const siteName = metadata.siteName ?? '';
  const title = formatCardTitle(metadata.title, siteName);
  const description = metadata.description ?? '';
  const image = metadata.image;

  const safeUrl = escapeHtml(url);
  const safeSiteName = escapeHtml(siteName);
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);

  const media = image
    ? `<img class="link-card-ogp-image" src="${escapeHtml(image)}" alt="" width="1200" height="630" loading="lazy" decoding="async" />`
    : `<div class="link-card-ogp-placeholder" aria-hidden="true">
        <span class="link-card-ogp-placeholder-brand">${safeTitle || safeSiteName}</span>
      </div>`;

  const descriptionHtml = description
    ? `<span class="link-card-meta">${safeDescription}</span>`
    : '';

  const labelHtml = siteName
    ? `<span class="link-card-label">${safeSiteName}</span>`
    : '';

  return `<div class="link-card link-card--ogp">
  <a class="link-card-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
    <span class="link-card-ogp-media">${media}</span>
    <span class="link-card-footer">
      <span class="link-card-body">
        ${labelHtml}
        <span class="link-card-title">${safeTitle}</span>
        ${descriptionHtml}
      </span>
      <span class="link-card-arrow" aria-hidden="true">→</span>
    </span>
  </a>
</div>`;
}
