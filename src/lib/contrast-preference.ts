export const CONTRAST_STORAGE_KEY = 'atohs-contrast';
export const CONTRAST_DEFAULT = 100;
export const CONTRAST_MIN = 75;
export const CONTRAST_MAX = 125;
export const CONTRAST_STEP = 5;

export function clampContrast(value: number): number {
  if (Number.isNaN(value)) return CONTRAST_DEFAULT;
  return Math.min(CONTRAST_MAX, Math.max(CONTRAST_MIN, value));
}

export function readStoredContrast(): number {
  const raw = localStorage.getItem(CONTRAST_STORAGE_KEY);
  if (raw === null) return CONTRAST_DEFAULT;
  return clampContrast(parseInt(raw, 10));
}

/** コントラスト用の CSS 変数（色の mix 比率は main.css） */
export function applyContrastPreference(percent: number) {
  const value = clampContrast(percent);
  const root = document.documentElement;
  root.style.setProperty('--contrast-level', String(value));

  if (value >= CONTRAST_DEFAULT) {
    const towardHigh = (value - CONTRAST_DEFAULT) / (CONTRAST_MAX - CONTRAST_DEFAULT);
    root.style.setProperty('--contrast-toward-high', String(towardHigh));
    root.style.setProperty('--contrast-toward-low', '0');
  } else {
    const towardLow = (CONTRAST_DEFAULT - value) / (CONTRAST_DEFAULT - CONTRAST_MIN);
    root.style.setProperty('--contrast-toward-low', String(towardLow));
    root.style.setProperty('--contrast-toward-high', '0');
  }
}

export function setContrastPreference(percent: number) {
  const value = clampContrast(percent);
  localStorage.setItem(CONTRAST_STORAGE_KEY, String(value));
  applyContrastPreference(value);
}
