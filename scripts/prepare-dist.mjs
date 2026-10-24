import fs from 'fs';
import path from 'path';

const frontendDist = path.resolve(process.cwd(), 'frontend/dist');
const rootDist = path.resolve(process.cwd(), 'dist');

if (fs.existsSync(frontendDist)) {
  fs.mkdirSync(rootDist, { recursive: true });
  fs.cpSync(frontendDist, rootDist, { recursive: true, force: true });
  console.log(`[prepare-dist] Successfully copied frontend/dist to root dist (${rootDist})`);
} else {
  console.warn(`[prepare-dist] frontend/dist not found at ${frontendDist}`);
}

