export type Theme = 'light' | 'dark';

export const STORAGE_KEY = 'mechi-theme';
export const DEFAULT_THEME: Theme = 'dark';
export const LIGHT_THEME_COLOR = '#F8FBFD';
export const DARK_THEME_COLOR = '#0B1121';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function resolveTheme(value: string | null): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

export function getThemeColor(theme: Theme) {
  return theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
}

export function applyThemeToDocument(theme: Theme) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const themeMetaTags = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  const primaryThemeMeta = themeMetaTags[0] ?? document.createElement('meta');

  if (themeMetaTags.length === 0) {
    primaryThemeMeta.name = 'theme-color';
    document.head.appendChild(primaryThemeMeta);
  }

  primaryThemeMeta.content = getThemeColor(theme);
  primaryThemeMeta.removeAttribute('media');
  themeMetaTags.slice(1).forEach((meta) => meta.remove());

  let colorSchemeMeta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!colorSchemeMeta) {
    colorSchemeMeta = document.createElement('meta');
    colorSchemeMeta.name = 'color-scheme';
    document.head.appendChild(colorSchemeMeta);
  }

  colorSchemeMeta.content = theme;
}
