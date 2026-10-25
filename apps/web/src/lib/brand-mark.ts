// The sprout's shape on a 24×24 grid, shared by the in-app logo and the
// generated icons and preview images. app/icon.svg draws the same paths as a
// static file, since browsers fetch it directly; keep the two in step.

export const MARK_STEM = "M12 21.5v-9.5";
export const MARK_LEAF_RIGHT = "M12 12c0-4.4 2.7-7.1 7.6-7.6 0 4.9-2.7 7.6-7.6 7.6Z";
export const MARK_LEAF_LEFT = "M12 14.8c0-3.6-2.2-5.9-6.5-6.3 0 4 2.3 6.3 6.5 6.3Z";

/**
 * The mark's colours outside the page's theme (icons and preview images
 * render on their own): the day theme's mint ink, with two leaf greens.
 */
export const MARK_COLORS = { outline: "#1d6b4a", leafRight: "#3fae78", leafLeft: "#7fd3a8" } as const;
