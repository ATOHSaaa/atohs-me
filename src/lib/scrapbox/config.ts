/** Scrapbox / Cosense の API 連携設定（ビルド時のみ） */
const SCRAPBOX_PROJECT_DEFAULT = 'atohs-memo';

/** Cosense / Scrapbox のプロジェクト名（`SCRAPBOX_PROJECT` を都度参照） */
export function getScrapboxProject(): string {
  const raw =
    typeof process !== 'undefined' ? process.env.SCRAPBOX_PROJECT : undefined;
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : SCRAPBOX_PROJECT_DEFAULT;
}

/** @deprecated {@link getScrapboxProject} を使う */
export const SCRAPBOX_PROJECT = getScrapboxProject();

/** connect.sid クッキー値。非公開プロジェクト取得時に必要。ログに出さないこと。 */
export function getScrapboxSid(): string | undefined {
  const raw =
    typeof process !== 'undefined' ? process.env.SCRAPBOX_SID : undefined;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * 設定時はこのハッシュタグを含むページだけ公開（例: `publish` → 行内の `#publish`）。
 * 非公開プロジェクトを SID で取り込むときの公開範囲制限用。
 */
export function getScrapboxPublishTag(): string | undefined {
  const raw =
    typeof process !== 'undefined'
      ? process.env.SCRAPBOX_PUBLISH_TAG
      : undefined;
  if (!raw) return undefined;
  const tag = raw.trim().replace(/^#/, '');
  return tag.length > 0 ? tag : undefined;
}

export const SCRAPBOX_API_BASE = 'https://scrapbox.io/api';

/** `1` / `true` でキャッシュを無視し全ページ詳細を再取得 */
export function scrapboxForceRefresh(): boolean {
  const raw =
    typeof process !== 'undefined'
      ? process.env.SCRAPBOX_FORCE_REFRESH
      : undefined;
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
