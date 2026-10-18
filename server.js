// MasjidLedger Pro v2.6 - Universal Production Server Entry Point
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distServer = path.join(__dirname, 'dist', 'server.js');

if (fs.existsSync(distServer)) {
  await import(pathToFileURL(distServer).href);
} else {
  const { spawn } = await import('child_process');
  const child = spawn('npx', ['tsx', 'server.ts'], { stdio: 'inherit', env: process.env });
  child.on('exit', (code) => process.exit(code || 0));
}
