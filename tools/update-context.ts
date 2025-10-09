import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface ContextEntry {
  ts: string;
  task: string;
  commits: string[];
  links: string[];
  validation: string;
  next: string;
}

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index >= 0) {
    return args[index + 1];
  }
  return undefined;
}

function parseList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const task = getFlag('--task');
if (!task) {
  console.error('Missing required --task argument');
  process.exit(1);
}

const entry: ContextEntry = {
  ts: new Date().toISOString(),
  task,
  commits: parseList(getFlag('--commits')),
  links: parseList(getFlag('--links')),
  validation: getFlag('--validation') ?? '',
  next: getFlag('--next') ?? '',
};

const logPath = resolve(process.cwd(), 'tools', 'context-log.json');
let log: ContextEntry[] = [];

try {
  const existing = readFileSync(logPath, 'utf8');
  log = existing ? (JSON.parse(existing) as ContextEntry[]) : [];
} catch (error) {
  log = [];
}

log.push(entry);
writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n', 'utf8');
console.log(`Context updated with task: ${task}`);
