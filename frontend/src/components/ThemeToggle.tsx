'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

interface ThemeToggleProps {
  /** "icon" = single round pill button (default); "labeled" = pill with text label */
  variant?: 'icon' | 'labeled';
  className?: string;
}

export default function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';
  const next = isDark ? 'light' : 'dark';

  // Avoid hydration mismatch: render a neutral placeholder until mounted.
  const icon = !mounted ? <SunIcon /> : isDark ? <MoonIcon /> : <SunIcon />;
  const label = !mounted ? 'Theme' : isDark ? 'Dark' : 'Light';

  if (variant === 'labeled') {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`Switch to ${next} theme`}
        suppressHydrationWarning
        className={`flex items-center gap-2 h-9 px-3 rounded-full text-xs font-medium transition-colors duration-150 ${className ?? ''}`}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--fg-muted)',
          boxShadow: 'var(--shadow-soft)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      suppressHydrationWarning
      className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors duration-150 ${className ?? ''}`}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        color: 'var(--fg-muted)',
        boxShadow: 'var(--shadow-soft)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)'; }}
    >
      {icon}
    </motion.button>
  );
}
