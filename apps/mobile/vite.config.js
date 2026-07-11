import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Build identity, injected via `define` below and shown in Settings — so "which version is this
// device running?" is answerable at a glance (the question that made a stale-cache report slow to
// diagnose). Version from package.json; commit from CI's GITHUB_SHA or local git (best-effort).
const APP_VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
const APP_COMMIT = (() => {
  try {
    const sha = process.env.GITHUB_SHA || execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return sha.trim().slice(0, 7);
  } catch { return ''; }
})();

// Set base path here when deploying to a GitHub Pages subdirectory.
// E.g. if your URL is https://yourname.github.io/hybrid-react/
// set base: '/hybrid-react/'
// For a custom domain or yourname.github.io root, use base: '/'
const REPO_NAME = 'hybrid-react';

// Content-Security-Policy, injected as a <meta> tag at BUILD time only (GitHub
// Pages can't set response headers, and a meta CSP must not run in dev where
// Vite's HMR uses inline scripts + eval + a websocket). Notes:
//  - style-src needs 'unsafe-inline' because the UI uses inline style={{…}}.
//  - connect-src allows Supabase REST/Edge-Functions (https) + realtime (wss).
//  - img-src allows the public avatars bucket + data:/blob: previews.
//  - frame-ancestors is intentionally omitted — it is ignored in a meta CSP.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'"
].join('; ');

function cspMetaPlugin() {
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '</title>',
        `</title>\n<meta http-equiv="Content-Security-Policy" content="${CSP}">`
      );
    }
  };
}

export default defineConfig({
  base: `/${REPO_NAME}/`,
  plugins: [
    cspMetaPlugin(),
    react(),
    VitePWA({
      // 'prompt' (not 'autoUpdate'): a new service worker WAITS and the app surfaces a visible
      // "Update available — Reload" toast (src/components/UpdatePrompt.jsx) instead of swapping the
      // bundle silently. Silent autoUpdate let installed iOS PWAs keep serving the old cached build
      // with no signal — the root cause of "I still see the old bug after it was fixed" reports.
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        // One brand across mobile app, coach dashboard and website.
        name: 'Performance OS',
        short_name: 'Performance OS',
        description: 'Sport-specific training that adapts to your recovery, workload and goals.',
        // Midnight dark, matching the web app (#0d1016) for a seamless install + splash.
        theme_color: '#0d1016',
        background_color: '#0d1016',
        display: 'standalone',
        orientation: 'portrait',
        scope: `/${REPO_NAME}/`,
        start_url: `/${REPO_NAME}/`,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
          }
        }]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_COMMIT__: JSON.stringify(APP_COMMIT)
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
