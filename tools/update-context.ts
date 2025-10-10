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
let entries: ContextEntry[] = [];
let writeAsObject = true;

try {
  const existingRaw = readFileSync(logPath, 'utf8');
  if (existingRaw) {
    const parsed = JSON.parse(existingRaw) as ContextEntry[] | { entries: ContextEntry[] };
    if (Array.isArray(parsed)) {
      entries = parsed;
      writeAsObject = false;
    } else if (Array.isArray(parsed.entries)) {
      entries = parsed.entries;
      writeAsObject = true;
    }
  }
} catch {
  entries = [];
  writeAsObject = true;
}

entries.push(entry);
const payload = writeAsObject ? { entries } : entries;
writeFileSync(logPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Context updated with task: ${task}`);
