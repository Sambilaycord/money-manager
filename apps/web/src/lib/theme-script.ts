// Not a client module: the root layout (a Server Component) inlines this
// string, and a 'use client' export would reach it as a reference instead.

export const THEME_STORAGE_KEY = "theme";

/**
 * Runs inline in <head> before first paint, so a saved dark theme never
 * flashes light. It mirrors applyTheme in theme.ts. Storage can throw
 * (private windows, blocked site data), and then the system setting applies.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
