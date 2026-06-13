/* eslint-disable react-refresh/only-export-components */
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
      // Remove all theme classes
      root.classList.remove('light', 'dark');
      
      let actualTheme = themeToApply;
      
      if (themeToApply === 'system') {
        // Check system preference
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      // Apply the actual theme class
      root.classList.add(actualTheme);
      setResolvedTheme(actualTheme);
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