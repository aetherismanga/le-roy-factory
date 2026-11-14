import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../android/', import.meta.url));
const result = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/d', '/c', 'gradlew.bat', ...process.argv.slice(2), '--no-daemon'], { cwd, stdio: 'inherit' })
  : spawnSync('./gradlew', [...process.argv.slice(2), '--no-daemon'], { cwd, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
