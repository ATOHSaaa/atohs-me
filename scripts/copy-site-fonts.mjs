import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const weights = [500, 700, 900];
const fromDir = join(process.cwd(), 'node_modules/@fontsource/roboto/files');
const toDir = join(process.cwd(), 'public/fonts');

mkdirSync(toDir, { recursive: true });

for (const weight of weights) {
  const name = `roboto-latin-${weight}-normal.woff2`;
  copyFileSync(join(fromDir, name), join(toDir, name));
}
