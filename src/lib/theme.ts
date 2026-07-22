export type Theme = 'light' | 'dark';

// V2 intentionally gives every browser one clean dark-first default. Users can
// still choose light mode and that choice remains persistent afterwards.
export const STORAGE_KEY = 'mechi-theme-v2';
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

  // Next owns viewport metadata. Mutating its attributes is safe; creating,
  // removing, or deduplicating these nodes breaks React's navigation diff.
  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.content = getThemeColor(theme);
  }

  const colorSchemeMeta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.content = theme;
  }
}
