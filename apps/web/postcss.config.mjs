// Tailwind v4 runs as a PostCSS plugin. No tailwind.config needed —
// the design tokens live in app/globals.css under @theme.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
