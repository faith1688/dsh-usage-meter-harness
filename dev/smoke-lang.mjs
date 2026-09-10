import { readFileSync } from 'node:fs';
const c = readFileSync('z:/deepseek/dsh-usage-meter/lib/client.js', 'utf8');
const d = c.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
const i = d.indexOf('language:');
console.log('language dict entry:', i >= 0 ? JSON.stringify(d.slice(i, i + 30)) : 'NOT FOUND');
console.log('language en entry:', /language\s*:\s*"Language"/.test(d) || /language\s*:\s*'Language'/.test(d));
