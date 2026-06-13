import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const IconSun = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const IconMoon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

const IconSystem = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8" />
  </svg>
);

const ThemeToggle = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [announce, setAnnounce] = useState('');

  // Cycle order: light -> dark -> system -> light
  const handleToggle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const label = theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light';

  // Update polite announcement for screen readers when theme changes
  useEffect(() => {
    setAnnounce(`Theme changed to ${label}. Applied: ${resolvedTheme}.`);
    const t = setTimeout(() => setAnnounce(''), 1200);
    return () => clearTimeout(t);
  }, [label, resolvedTheme]);

  // Decide thumb position classes for smoother visual mapping
  const thumbX = resolvedTheme === 'dark' ? 'translate-x-6' : resolvedTheme === 'light' ? 'translate-x-0' : 'translate-x-3';

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={handleToggle}
        className="relative inline-flex items-center h-9 w-16 rounded-full p-1 transition-colors duration-350 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-300"
        aria-pressed={resolvedTheme === 'dark'}
        aria-label={`Toggle theme (current: ${label}, applied: ${resolvedTheme})`}
        title={`Theme: ${label} (applied: ${resolvedTheme})`}
      >
        {/* Track with subtle gradient */}
        <span
          className={`absolute inset-0 rounded-full transition-colors duration-300 
            ${resolvedTheme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-gray-100 to-white'} dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-700`}
          aria-hidden
        />

        {/* Left - sun */}
        <span className="absolute left-2 z-10 text-yellow-400">
          <IconSun />
        </span>

        {/* Right - moon */}
        <span className="absolute right-2 z-10 text-indigo-400">
          <IconMoon />
        </span>

        {/* Thumb with inner changing icon */}
        <span
          className={`relative z-20 inline-flex items-center justify-center h-7 w-7 rounded-full bg-white shadow transform transition-transform duration-300 ${thumbX}`}
        >
          <span className="pointer-events-none text-gray-700 dark:text-gray-900">
            {resolvedTheme === 'dark' ? <IconMoon className="w-4 h-4" /> : resolvedTheme === 'light' ? <IconSun className="w-4 h-4" /> : <IconSystem className="w-4 h-4" />}
          </span>
        </span>
      </button>

      {/* Small label showing the selected theme - hidden on very small screens */}
      <span className="hidden sm:inline-block text-sm font-medium text-gray-700 dark:text-gray-200">
        {label}
      </span>

      {/* ARIA live region for screen reader announcements */}
      <span className="sr-only" aria-live="polite">{announce}</span>
    </div>
  );
};

export default ThemeToggle;