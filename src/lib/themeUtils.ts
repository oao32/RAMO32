import { useCallback, useEffect, useState } from 'react';
import { Theme } from '../types';

const THEME_STORAGE_KEY = 'oao_theme';
const THEME_EVENT_NAME = 'oao_theme_changed';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyThemeToDocument(theme);
    window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT_NAME, { detail: theme }));
  }
}

export function toggleStoredTheme(): Theme {
  const next: Theme = getStoredTheme() === 'dark' ? 'light' : 'dark';
  setStoredTheme(next);
  return next;
}

export function useOaoTheme(): {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
} {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<Theme | undefined>).detail;
      const next = detail === 'light' || detail === 'dark' ? detail : getStoredTheme();
      setThemeState(next);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        setThemeState(event.newValue === 'light' ? 'light' : 'dark');
      }
    };

    window.addEventListener(THEME_EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(THEME_EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    setStoredTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      setStoredTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
