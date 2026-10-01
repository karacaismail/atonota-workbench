// Valid saved theme before first paint; app initialization enables controls.
try {
  const theme = localStorage.getItem('wb:theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch { /* System palette remains the fallback when storage is unavailable. */ }
