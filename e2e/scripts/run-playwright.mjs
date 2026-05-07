import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const playwrightCliPath = require.resolve('@playwright/test/cli');

const rawArgs = process.argv.slice(2);
const providerModeArg = rawArgs.find((arg) => arg.startsWith('--provider-mode='));
const providerMode =
  providerModeArg?.split('=')[1] || process.env.E2E_PROVIDER_MODE || 'mock';

const forwardedArgs = rawArgs.filter((arg) => !arg.startsWith('--provider-mode='));
const child = spawn(process.execPath, [playwrightCliPath, 'test', ...forwardedArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'test',
    E2E_PROVIDER_MODE: providerMode,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
