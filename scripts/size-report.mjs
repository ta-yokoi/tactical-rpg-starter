import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = new URL('../dist/', import.meta.url).pathname;
const textExtensions = new Set(['.html', '.js', '.css', '.svg', '.json', '.txt']);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const audioExtensions = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.flac']);
const limits = { total: 2 * 1024 * 1024, images: 500 * 1024, audio: 500 * 1024 };
const totals = { total: 0, images: 0, audio: 0 };

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { await walk(path); continue; }
    const extension = extname(path).toLowerCase();
    const content = await readFile(path);
    const transferBytes = textExtensions.has(extension) ? gzipSync(content, { level: 9 }).length : content.length;
    totals.total += transferBytes;
    if (imageExtensions.has(extension)) totals.images += content.length;
    if (audioExtensions.has(extension)) totals.audio += content.length;
    console.log(`${relative(root, path)}: ${content.length} bytes raw, ${transferBytes} bytes estimated transfer`);
  }
}
await walk(root);
console.log(`TOTAL: ${totals.total} / ${limits.total} bytes estimated transfer`);
console.log(`IMAGES: ${totals.images} / ${limits.images} bytes raw`);
console.log(`AUDIO: ${totals.audio} / ${limits.audio} bytes raw`);
for (const [key, limit] of Object.entries(limits)) {
  if (totals[key] > limit) { console.error(`${key} exceeds its budget`); process.exitCode = 1; }
}
