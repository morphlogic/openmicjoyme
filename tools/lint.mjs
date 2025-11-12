#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const lintRoots = [path.join(repoRoot, 'src')];
const trackedExtensions = new Set(['.ts', '.html', '.scss']);

const consolePattern = /\bconsole\.(log|info|debug|warn|trace)\s*\(/;
const debuggerPattern = /\bdebugger\b/;
const todoPattern = /\bTODO\b/i;
const doubleQuoteModulePattern = /\b(from|import)\b[^;"]*"(.*?)"/;
const requireDoubleQuotePattern = /\brequire\(".*?"\)/;
const trailingWhitespacePattern = /[ \t]+$/;

const violations = [];

for (const root of lintRoots) {
  collectFiles(root).forEach((file) => lintFile(file));
}

if (violations.length > 0) {
  console.error(`Lint failed with ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(` - ${violation.file}:${violation.line} ${violation.message}`);
  }
  process.exitCode = 1;
} else {
  console.log('Lint passed with no violations.');
}

function collectFiles(dir) {
  const files = [];
  if (!safeStat(dir)?.isDirectory()) {
    return files;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath));
    } else if (trackedExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
}

function lintFile(file) {
  const relativePath = path.relative(repoRoot, file);
  const ext = path.extname(file);
  const contents = readFileSync(file, 'utf8');
  const lines = contents.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (line.includes('\t')) {
      addViolation(relativePath, lineNumber, 'Tab character found; use two-space indentation.');
    }

    if (trailingWhitespacePattern.test(line)) {
      addViolation(relativePath, lineNumber, 'Trailing whitespace detected.');
    }

    if (todoPattern.test(line)) {
      addViolation(relativePath, lineNumber, 'TODO markers must be resolved or migrated to Kanboard.');
    }
  });

  if (ext === '.ts') {
    lintTsFile(relativePath, lines);
  } else if (ext === '.html') {
    lintHtmlFile(relativePath, lines);
  }
}

function lintTsFile(relativePath, lines) {
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (consolePattern.test(line) && !line.includes('[OMJ]')) {
      addViolation(relativePath, lineNumber, 'Console statements require an [OMJ] tag or should be removed.');
    }

    if (debuggerPattern.test(line)) {
      addViolation(relativePath, lineNumber, 'Remove debugger statements.');
    }

    if (doubleQuoteModulePattern.test(line) || requireDoubleQuotePattern.test(line)) {
      addViolation(relativePath, lineNumber, 'Use single quotes for module specifiers.');
    }
  });
}

function lintHtmlFile(relativePath, lines) {
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.includes(' style=')) {
      addViolation(relativePath, lineNumber, 'Inline style attributes are not allowed; move styles to SCSS.');
    }
  });
}

function addViolation(file, line, message) {
  violations.push({ file, line, message });
}

function safeStat(targetPath) {
  try {
    return statSync(targetPath);
  } catch {
    return null;
  }
}
