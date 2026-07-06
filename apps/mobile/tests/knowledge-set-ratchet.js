// tests/knowledge-set-ratchet.js — WP-44: the KNOWLEDGE_SET_VERSION ratchet.
//
// The version's own contract says "bump on ANY science change — entries plus the science
// data tables" — yet the governance audit proved three science-table changes shipped
// without a bump, leaving provenance stamps silently stale (a plan stamped 1.1.0 was not
// reproducible from the science 1.1.0 named). This test makes the contract mechanical:
// a content hash of the knowledge set is pinned against the version; any science change
// under the SAME version fails CI. Re-baseline ONLY together with a version bump:
//     UPDATE=1 node tests/knowledge-set-ratchet.js
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import crypto from 'node:crypto';
import { KNOWLEDGE_SET_VERSION } from '@performance-os/engine';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('PASS:', msg);
}
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ENGINE = path.join(__dirname, '..', '..', '..', 'packages', 'engine', 'src');
const SNAP = path.join(__dirname, '__snapshots__', 'knowledge-set-manifest.json');

// The knowledge set = the evidence KB + every science data table the engine reads.
// (Deliberately NOT lib/ logic — logic changes bump ENGINE_VERSION, not this.)
const SET_ROOTS = [path.join(ENGINE, 'data'), path.join(ENGINE, 'lib', 'knowledge', 'entries.js')];

function filesOf(root) {
  const st = fs.statSync(root);
  if (st.isFile()) return [root];
  const out = [];
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) out.push(...filesOf(p));
    else out.push(p);
  }
  return out;
}

const files = SET_ROOTS.flatMap(filesOf).sort();
const h = crypto.createHash('sha256');
for (const f of files) {
  h.update(path.relative(ENGINE, f));
  // The version line itself is excluded from the hash — otherwise every bump would
  // change the hash and the "bump without content change" direction couldn't be seen.
  h.update(fs.readFileSync(f, 'utf8').replace(/^export const KNOWLEDGE_SET_VERSION.*$/m, ''));
}
const digest = h.digest('hex');

if (process.env.UPDATE === '1') {
  fs.mkdirSync(path.dirname(SNAP), { recursive: true });
  fs.writeFileSync(SNAP, JSON.stringify({ version: KNOWLEDGE_SET_VERSION, digest, files: files.length }, null, 1) + '\n');
  console.log(`UPDATED manifest: ${KNOWLEDGE_SET_VERSION} over ${files.length} files.`);
  process.exit(0);
}

assert(fs.existsSync(SNAP), 'manifest exists (first run: UPDATE=1, then commit)');
if (fs.existsSync(SNAP)) {
  const pinned = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  if (pinned.version === KNOWLEDGE_SET_VERSION) {
    assert(pinned.digest === digest,
      `science unchanged under version ${KNOWLEDGE_SET_VERSION} — a data-table or KB edit shipped WITHOUT a version bump; bump KNOWLEDGE_SET_VERSION, then UPDATE=1`);
  } else {
    assert(pinned.digest !== digest,
      `version moved ${pinned.version} → ${KNOWLEDGE_SET_VERSION} but the science content is byte-identical — a bump must carry a change (or the manifest wasn't re-baselined: UPDATE=1)`);
    // A version bump requires the manifest re-baseline in the same change.
    assert(false, `manifest is stale (pinned ${pinned.version}, code ${KNOWLEDGE_SET_VERSION}) — run UPDATE=1 and commit the manifest WITH the bump`);
  }
}
