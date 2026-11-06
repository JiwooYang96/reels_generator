#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const HOOKS_NAMES = ['HOOKS.md', 'Hooks.md', 'hooks.md'];
const FALLBACK_DIRS = ['.', '.hooksmith', 'docs', 'content', 'reels'];

function firstExisting(dir, names) {
  for (const name of names) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findHooks(cwd) {
  const envPath = process.env.HOOKSMITH_CONTEXT;
  if (envPath && envPath.trim()) {
    const resolved = path.isAbsolute(envPath) ? envPath : path.resolve(cwd, envPath);
    if (fs.existsSync(resolved)) return resolved;
  }

  for (const rel of FALLBACK_DIRS) {
    const dir = path.resolve(cwd, rel);
    const found = firstExisting(dir, HOOKS_NAMES);
    if (found) return found;
  }

  let current = cwd;
  for (let i = 0; i < 3; i += 1) {
    const found = firstExisting(current, HOOKS_NAMES);
    if (found) return found;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return null;
}

const cwd = process.cwd();
const hooksPath = findHooks(cwd);
let hooks = null;
if (hooksPath) {
  hooks = fs.readFileSync(hooksPath, 'utf8');
}

console.log(JSON.stringify({
  hasHooks: Boolean(hooksPath),
  hooksPath: hooksPath ? path.relative(cwd, hooksPath) || 'HOOKS.md' : null,
  hooks,
  cwd
}, null, 2));

