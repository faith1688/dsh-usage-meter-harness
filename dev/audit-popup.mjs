import { readFileSync } from 'node:fs';
const c = readFileSync('z:/deepseek/dsh-usage-meter/src/client.tsx', 'utf8');
const lines = c.split('\n');
// 弹窗区 = UsageReadout (430) 到 UsageMeterSettingsSection (1211)
const region = lines.slice(429, 1211);
const keys = [
  ['实时费用/币种切换', 'currency', 'CNY', 'USD', 'toDisplay'],
  ['Token 明细桶', '缓存命中', '缓存写入', 'bucketCost', 'bucketTokens'],
  ['本轮用量面板', 'turnTokensText', '本轮'],
  ['Token 速度', 'tokenRateOf', 'tokens/s', 'tok/s'],
  ['缓存命中率', '命中率', 'hitRate'],
  ['账户余额', '余额', 'balance', '钱包'],
  ['预算与剩余', '预算', 'budget', '剩余', '超支'],
  ['峰谷胶囊', 'peak', '胶囊', '呼吸'],
  ['会话看板', '当前会话', 'Current session', '每轮'],
  ['本对话费用', 'sessionCost'],
  ['语言 tick', 'langTick', 'um-lang-change'],
];
for (const [name, ...ks] of keys) {
  const found = [];
  ks.forEach((k) => {
    let n = 0;
    region.forEach((l) => { if (l.includes(k)) n++; });
    if (n) found.push(`${k}×${n}`);
  });
  console.log(`${found.length ? '✅' : '❌'} ${name}: ${found.join(', ') || '(弹窗区无此标记)'}`);
}
