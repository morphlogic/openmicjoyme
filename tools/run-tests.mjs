#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, 'out-tsc/spec');
const require = createRequire(import.meta.url);

rmSync(outDir, { recursive: true, force: true });

const tscResult = spawnSync('npx', ['tsc', '-p', 'tsconfig.spec.json'], {
  stdio: 'inherit',
  cwd: repoRoot
});

if (tscResult.status !== 0) {
  process.exit(tscResult.status ?? 1);
}

const setupFile = path.join(outDir, 'src/testing/test-setup.js');
if (existsSync(setupFile)) {
  require(setupFile);
}

const specFiles = collectSpecFiles(outDir);

if (!specFiles.length) {
  console.warn('No compiled spec files found under', outDir);
  process.exit(0);
}

const testCases = [];
for (const file of specFiles) {
  const mod = require(file);
  const candidates = Array.isArray(mod.tests)
    ? mod.tests
    : Array.isArray(mod.default)
      ? mod.default
      : [];

  for (const candidate of candidates) {
    if (candidate && typeof candidate.name === 'string' && typeof candidate.run === 'function') {
      testCases.push({ ...candidate, file });
    }
  }
}

if (!testCases.length) {
  console.warn('No runnable tests exported from discovered specs.');
  process.exit(0);
}

let failures = 0;
for (const testCase of testCases) {
  process.stdout.write(`• ${testCase.name} ... `);
  try {
    await Promise.resolve(testCase.run());
    console.log('ok');
  } catch (err) {
    failures += 1;
    console.log('FAILED');
    console.error(`  ↳ ${path.relative(repoRoot, testCase.file)}`);
    console.error(`    ${err instanceof Error ? err.stack ?? err.message : err}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} of ${testCases.length} test(s) failed.`);
  process.exit(1);
} else {
  console.log(`\nAll ${testCases.length} test(s) passed.`);
}

function collectSpecFiles(dir) {
  const files = [];
  if (!safeStat(dir)?.isDirectory()) {
    return files;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSpecFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.spec.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function safeStat(target) {
  try {
    return statSync(target);
  } catch {
    return null;
  }
}
