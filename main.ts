// STARFORGE entrypoint: hands the game in to make.fun.
// It copies the game's static files and the screenshots into the output
// directory and writes the dossier the scorer rebuilds and compares.
// Runs on Node 22 with the standard library only; nothing is installed.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

function freshDir(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function copyTree(name) {
  const from = join(here, name);
  const to = join(outDir, name);
  if (!existsSync(from)) throw new Error(`missing ${name}/ in the repository`);
  cpSync(from, to, { recursive: true });
}

freshDir(outDir);
copyTree('game');
copyTree('screenshots');
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`STARFORGE handed in: ${dossier.length} dossier bytes in ${outDir}`);
