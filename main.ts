// Vice City Nights — the hand-in program (Node 22, standard library only).
// The entry is the static app/ folder beside this file plus screenshots/.
// This program copies both into the output directory and writes
// dossier.json there, using buildDossier from the vendored make.fun library
// (vendor/makefun-app.ts, unchanged). The grader runs it twice and expects
// identical bytes both times; outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's own limits, so a build that passes here is one
// the gate accepts: at most 4 screenshots, each at most 256 KiB; app/ at
// most 993 files and 48 MiB in all, no path over 1000 bytes; the dossier
// text capped at 160 KiB. /output itself caps at 1000 entries and 64 MiB,
// shared by app/, screenshots/ and dossier.json.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
