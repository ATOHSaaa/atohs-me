import { config, icon, type IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faAmazon,
  faTiktok,
  faTwitter,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import { faCheck, faLink, faShuffle } from '@fortawesome/free-solid-svg-icons';

/** CDN の all.css を使わず、利用アイコンだけバンドルする */
config.autoAddCss = false;

const ICON_DEFINITIONS = {
  twitter: faTwitter,
  youtube: faYoutube,
  tiktok: faTiktok,
  amazon: faAmazon,
  link: faLink,
  check: faCheck,
  shuffle: faShuffle,
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICON_DEFINITIONS;

export function iconSvg(name: IconName, className = ''): string {
  const rendered = icon(ICON_DEFINITIONS[name]);
  const raw = rendered.html[0];
  if (!raw) return '';

  const classes = ['icon', className].filter(Boolean).join(' ');
  return raw.replace(/\sclass="[^"]*"/, '').replace(/^<svg /, `<svg class="${classes}" aria-hidden="true" `);
}
