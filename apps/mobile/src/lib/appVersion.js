// appVersion — the build identity shown in Settings, so "which version is this device running?"
// is answerable at a glance (the question that made the triathlon stale-cache report slow to diagnose).
// formatVersion is PURE and unit-tested; getAppVersion reads globals injected by vite `define` at
// build time and must only run in the browser/build (never imported by the node test suite).

/** Format a build stamp. `commit` optional. e.g. formatVersion('2.0.0','a1b2c3d') → 'v2.0.0 · a1b2c3d'. */
export function formatVersion(version, commit) {
  const v = `v${version || '?'}`;
  return commit ? `${v} · ${commit}` : v;
}

// The current build's stamp, read from the values vite injects via `define` at build time
// (see vite.config.js). Guarded so a stray reference in a non-build context can't throw.
export function getAppVersion() {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
  const commit = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : '';
  return formatVersion(version, commit);
}
