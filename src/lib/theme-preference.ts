/** localStorage に無いときは OS の配色（prefers-color-scheme）に従う */
export const THEME_STORAGE_KEY = 'atohs-theme';

export type ThemePreference = 'light' | 'dark';

export function readStoredThemePreference(): ThemePreference | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return null;
}

export function resolveSystemTheme(): ThemePreference {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveThemePreference(): ThemePreference {
  return readStoredThemePreference() ?? resolveSystemTheme();
}

export function applyThemePreference(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
}
