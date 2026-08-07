/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#16362f',
    tint: '#138a68',

    // Core surfaces
    background: '#f6fbf8',
    foreground: '#16362f',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#16362f',

    // Primary action color (buttons, links, active states)
    primary: '#138a68',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e7f4ed',
    secondaryForeground: '#236149',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#e9f2ed',
    mutedForeground: '#6d8279',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#d9f1e5',
    accentForeground: '#236149',

    // Destructive actions (delete, error states)
    destructive: '#d85a50',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#d9e9df',
    input: '#d9e9df',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
