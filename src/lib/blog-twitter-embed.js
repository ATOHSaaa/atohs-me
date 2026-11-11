/** 記事本文に単独行の X/Twitter 投稿 URL があるか（remark-twitter-embeds と同条件） */
export const TWITTER_STATUS_IN_BODY =
  /^https?:\/\/(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/\d+/m;

export function postHasTwitterEmbed(body) {
  return TWITTER_STATUS_IN_BODY.test(body ?? '');
}
