import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const stylesDir = join(process.cwd(), 'src/styles');
const main = readFileSync(join(stylesDir, 'main.css'), 'utf8');
const lines = main.split('\n');

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n') + '\n';
}

const core =
  slice(1, 501) +
  slice(731, 1373) +
  slice(2381, 2499) +
  slice(2595, lines.length);

const home = slice(502, 730);
const blog = slice(1374, 2379) + slice(2500, 2594);

writeFileSync(join(stylesDir, 'core.css'), core);
writeFileSync(join(stylesDir, 'home.css'), home);
writeFileSync(join(stylesDir, 'blog.css'), blog);
