// ESLint floor (governance sprint roadmap I3, debt TD-02). Deliberately MINIMAL:
// a small, high-signal correctness set — not a style regime (no formatting rules,
// no mass reformat). The important part is the ENGINE PURITY overlay below: the
// Constitution's Art 18 (pure, deterministic reasoning core) was previously held
// only by convention + a grep-style test; now the linter holds it too.
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**', '**/dist/**', '**/.next/**',
      'apps/web/**',            // TypeScript — gated by tsc in web-ci
      'supabase/functions/**',  // Deno runtime, its own conventions
      'docs/**', 'memory/**',
      // DEAD FILE (debt TD-22): imported nowhere and carries a duplicate-declaration
      // syntax error — it cannot ever have compiled into the app. Excluded rather than
      // polished; deleting it is a separate cleanup (Simon's nod).
      'apps/mobile/src/components/TrainingCalendar.jsx',
    ],
  },

  // ── Base: correctness-only, everywhere we lint ────────────────────────────
  {
    files: ['apps/mobile/src/**/*.{js,jsx}', 'apps/mobile/tests/**/*.{js,mjs}', 'packages/engine/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',   // the SKB uses import attributes (`with { type: 'json' }`)
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      // JSX wiring so component references count as "used".
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      // Hooks discipline: rule-of-hooks violations are real bugs; dep-array gaps warn
      // (the codebase already carries deliberate, commented exhaustive-deps disables).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Signal, not ceremony: unused vars warn (underscore-prefix to silence);
      // everything stylistic stays off.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // The codebase legitimately uses empty catch for storage/JSON fallbacks.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // ── Engine purity overlay (Constitution Art 18; TAS L1) ──────────────────
  // The pure core: no clock, no randomness, no I/O, no DOM, no app-layer imports.
  // Mirrors the ratchet tests (determinism-clock.js, ai-seam.js purity greps) so
  // the invariant is caught at edit time, not test time.
  {
    files: ['packages/engine/src/**/*.js'],
    rules: {
      'no-restricted-properties': ['error',
        { object: 'Date', property: 'now', message: 'Engine is pure (Art 18): no clock. Thread asOf/today in as an argument.' },
        { object: 'Math', property: 'random', message: 'Engine is pure (Art 18): no randomness. Derive deterministic jitter from stable ids.' },
      ],
      'no-restricted-globals': ['error',
        { name: 'fetch', message: 'Engine does no I/O (Art 18).' },
        { name: 'XMLHttpRequest', message: 'Engine does no I/O (Art 18).' },
        { name: 'localStorage', message: 'Engine does no storage I/O (Art 18) — persistence lives app-side.' },
        { name: 'window', message: 'Engine is DOM-free (Art 18).' },
        { name: 'document', message: 'Engine is DOM-free (Art 18).' },
      ],
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/apps/**'], message: 'The engine never imports from the app layer (TAS L1 boundary).' },
          { group: ['@supabase/*'], message: 'The engine never talks to the backend (Art 18).' },
        ],
      }],
    },
  },
];
