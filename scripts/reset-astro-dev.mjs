import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

for (let port = 4321; port <= 4329; port++) {
  try {
    const pids = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
    if (!pids) continue;
    for (const pid of pids.split('\n')) {
      if (pid) process.kill(Number(pid), 'SIGKILL');
    }
  } catch {
    // nothing listening
  }
}

rmSync(join(root, '.astro'), { recursive: true, force: true });
console.log('Stopped Astro dev servers (4321–4329) and removed .astro cache.');
