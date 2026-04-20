import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const libphonenumberDir = path.join(repoRoot, 'third_party', 'libphonenumber');
const marker = path.join(
  libphonenumberDir,
  'javascript',
  'i18n',
  'phonenumbers',
  'phonenumberutil.js',
);
const cloneUrl = 'https://github.com/google/libphonenumber';

function run(command, args, cwd = repoRoot, allowFailure = false) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });

  if (!allowFailure && result.status !== 0) {
    const joined = [command, ...args].join(' ');
    throw new Error(`Command failed (${result.status}): ${joined}`);
  }

  return result.status ?? 1;
}

function ensureParentDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

if (fs.existsSync(marker)) {
  console.log(`Found libphonenumber source: ${marker}`);
  process.exit(0);
}

// Try submodule init/update first (works when the gitlink exists in HEAD).
run('git', ['-C', repoRoot, 'submodule', 'update', '--init', '--recursive'], repoRoot, true);

if (fs.existsSync(marker)) {
  console.log(`Initialized libphonenumber via submodule: ${marker}`);
  process.exit(0);
}

// Fallback for checkouts where .gitmodules exists but the submodule gitlink is missing from HEAD.
ensureParentDirectory(path.dirname(libphonenumberDir));
if (!fs.existsSync(libphonenumberDir) || !fs.existsSync(path.join(libphonenumberDir, '.git'))) {
  if (fs.existsSync(libphonenumberDir)) {
    fs.rmSync(libphonenumberDir, { recursive: true, force: true });
  }

  run('git', ['clone', '--depth', '1', cloneUrl, libphonenumberDir], repoRoot);
}

if (!fs.existsSync(marker)) {
  throw new Error(
    `Missing required libphonenumber source after bootstrap: ${marker}.`,
  );
}

console.log(`libphonenumber ready: ${marker}`);
