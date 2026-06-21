import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [storedTheme, setStoredTheme] = useLocalStorage('theme', 'system');
  const [theme, setTheme] = useState(storedTheme);
  const [resolvedTheme, setResolvedTheme] = useState('light');

  // Determine the actual theme to apply (handles system preference)
  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (themeToApply) => {
      // Determine actualTheme (handles 'system')
      let actualTheme = themeToApply;
      if (themeToApply === 'system') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      // For Tailwind 'dark:' variants we only need the 'dark' class on the root.
      // First, remove any lingering theme classes from the root to avoid duplicates or stale state.
      try {
        // Remove 'dark' and 'light' tokens safely from className
        root.className = root.className
          .split(/\s+/)
          .filter((c) => c && c !== 'dark' && c !== 'light')
          .join(' ');
      } catch {
        // fallback - best-effort removal
        root.classList.remove('dark');
        root.classList.remove('light');
      }

      if (actualTheme === 'dark') {
        root.classList.add('dark');
        // ensure body doesn't carry a leftover 'dark'/'light'
        window.document.body.classList.remove('dark');
        window.document.body.classList.remove('light');
      } else {
        // Light/system: ensure no 'dark' remains on root or body, and clear inline styles
        root.classList.remove('dark');
        window.document.body.classList.remove('dark');
        window.document.body.classList.remove('light');
        // Clear any inline background or color styles that could force dark appearance
        try {
          window.document.body.style.backgroundColor = '';
          window.document.body.style.color = '';
          window.document.documentElement.style.backgroundColor = '';
          window.document.documentElement.style.color = '';
        } catch {
          // ignore
        }
      }

      // Set a data attribute to help CSS or third-party libs detect current theme if needed
      root.setAttribute('data-theme', actualTheme);

      // Update resolved theme state
      setResolvedTheme(actualTheme);
      // Debug in dev to help diagnose toggling issues
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
        console.debug('[ThemeProvider] applyTheme', { themeToApply, actualTheme, classList: root.className });
      }
    };

    applyTheme(theme);
    setStoredTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, setStoredTheme]);

  const toggleTheme = () => {
    setTheme(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  };

  const setThemeDirect = (newTheme) => {
    setTheme(newTheme);
  };

  const value = {
    theme,
    resolvedTheme,
    toggleTheme,
    setTheme: setThemeDirect,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};