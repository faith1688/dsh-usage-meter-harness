const line = "  keyPlaceholderNew: 'e.g. sk-…',";
const re = /(?:^|\n)\s{2}([A-Za-z_$][\w$]*):\s*['"]((?:[^'\\]|\\.)*)['"]/;
console.log('plain test:', re.test('\n' + line));
const re2 = /(?:^|\n)\s{2}([A-Za-z_$][\w$]*):\s*['"]((?:[^'\\]|\\.)*)['"]/g;
const m = ('\n' + line).match(re2);
console.log('match:', m && m[1], m && JSON.stringify(m[2]));
// 逐字符
for (const ch of line) console.log(ch.charCodeAt(0).toString(16), JSON.stringify(ch));
