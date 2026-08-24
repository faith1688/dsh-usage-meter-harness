import fs from 'node:fs';
let s = fs.readFileSync('src/index.ts', 'utf8');
const old = "    const envKey = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DEEPSEEK_API_KEY;\n    const apiKey = (this.cfg.deepseekApiKey as string | undefined) ?? envKey;";
const neu = "    // 只读加密配置里的 Key，不回落 DEEPSEEK_API_KEY 环境变量（避免“没配置也显示已保存”\n    // 以及用错误 Key 打官方余额接口造成 401 刷屏）。\n    const apiKey = this.cfg.deepseekApiKey as string | undefined;";
if (!s.includes(old)) { console.log('MISS anchor'); process.exit(1); }
s = s.split(old).join(neu);
fs.writeFileSync('src/index.ts', s);
console.log('env fallback removed');
