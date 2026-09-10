import fs from 'node:fs';
const s = fs.readFileSync('c:/users/faith/appdata/roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-cordis-client-runner/lib/client.js', 'utf8');
const i = s.indexOf('key: "conversation.composer.dock"');
console.log('index', i);
console.log(s.slice(i, i + 1600));
