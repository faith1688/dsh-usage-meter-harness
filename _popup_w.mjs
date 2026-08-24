import fs from 'node:fs';
let s = fs.readFileSync('src/client.tsx', 'utf8');
// 1) 弹窗宽度 528 → 620（金额不再挤）
s = s.replace('width: 528,', 'width: 620,');
// 2) BucketRow 与表头的金额/价格列宽 92 → 104
s = s.replaceAll("width: 92, textAlign: 'right', color: t.text3, whiteSpace: 'nowrap'", "width: 104, textAlign: 'right', color: t.text3, whiteSpace: 'nowrap'");
s = s.replaceAll("width: 92, textAlign: 'right', color: props.price !== undefined ? t.text2 : t.text3, whiteSpace: 'nowrap'", "width: 104, textAlign: 'right', color: props.price !== undefined ? t.text2 : t.text3, whiteSpace: 'nowrap'");
s = s.replaceAll("width: 92, textAlign: 'right', fontWeight: 600, color: props.accent ?? t.text, whiteSpace: 'nowrap'", "width: 104, textAlign: 'right', fontWeight: 600, color: props.accent ?? t.text, whiteSpace: 'nowrap'");
// 3) 表头 单价/小计 列加 nowrap、宽度对齐
s = s.replace("{tt('unitCol')}{usage.peakState === 'peak' ? tt('peakTag') : usage.peakState === 'off' ? tt('offTag') : ''}", "{tt('unitCol')}{usage.peakState === 'peak' ? tt('peakTag') : usage.peakState === 'off' ? tt('offTag') : ''}");
// 4) 本次会话费用金额 span：加 nowrap，且金额过大时用等宽小字
s = s.replace("<span style={{ fontWeight: 700, color: p ? t.brand : t.text3 }}>{p ? fmtMoney(usage.estimatedCost, usage.currency, usage) : tt('noPriceData')}</span>", "<span style={{ fontWeight: 700, color: p ? t.brand : t.text3, whiteSpace: 'nowrap' }}>{p ? fmtMoney(usage.estimatedCost, usage.currency, usage) : tt('noPriceData')}</span>");
fs.writeFileSync('src/client.tsx', s);
console.log('layout width/nowrap applied');
