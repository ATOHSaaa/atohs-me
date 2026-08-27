import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, '..', '..', '..', 'Projects', 'hanoi-clicker');
const targetDir = join(root, 'public', 'works', 'hanoi-clicker');
const files = ['index.html', 'game.js', 'i18n.js', 'styles.css', 'preview.svg'];

mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  copyFileSync(join(sourceDir, file), join(targetDir, file));
}

console.log('Synced hanoi-clicker assets to public/works/hanoi-clicker/');
