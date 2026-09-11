import { readFileSync } from 'node:fs';
const c = readFileSync('z:/deepseek/dsh-usage-meter/src/client.tsx', 'utf8');
const lines = c.split('\n');
// 设置页区 = 1211..3110
const region = lines.slice(1210, 3110);
const features = [
  ['语言切换(3选项)', '跟随系统', 'langSel'],
  ['全局 API Key', 'deepseekApiKey', 'keySavedChip', 'keyNotSet'],
  ['汇率显示+刷新', 'refresh-rate', 'usdToCny', 'staleOver24h'],
  ['一键同步官方价格', 'syncPrices', 'refresh-official-prices'],
  ['预算', 'budget'],
  ['币种', 'currency'],
  ['供应商选择', 'listProviders', 'provider'],
  ['模型选择', 'listModels', 'modelDir'],
  ['计费模板(6种)', 'billingTemplate', 'BILLING_TYPES', 'templates'],
  ['自定义单价行(≤4)', 'customAddRow', 'customRows'],
  ['峰谷启用+星期+时段', 'peakOn', 'peakDays', 'peakWindows', 'peakHoursLabel'],
  ['基础单价', 'inputPerM', 'outputPerM', 'cacheReadPerM'],
  ['Batch 折扣', 'batchDiscount', 'batch'],
  ['共享余额', 'sharedBalance', '共享余额'],
  ['共享 API Key', 'sharedApiKey', '共享 API Key'],
  ['模型独立 Key', 'apiKeySource', 'DS API Key'],
  ['余额编辑', 'balance', '用户余额'],
  ['官方价预填', 'prefillOfficial', 'officialPreFill'],
  ['保存/已保存/未保存', 'savingUnit', 'savedUnit', '未保存'],
  ['使用中锁定', 'locked', 'activeModel', '使用中'],
  ['重置价格', 'resetPrice', '重置'],
  ['导出计费配置', 'export-config', '导出'],
  ['导入计费配置', 'import-config', 'list-configs', '导入'],
  ['删除计费配置', 'delete-config', '删除'],
  ['目录设置', 'exportDir', '工作目录'],
  ['视觉包装识别', 'wrapper', '包装识别'],
  ['预警阈值', 'alert', '预警', '阈值'],
  ['主题/配色', 'theme', '主题'],
  ['全局共享色', 'globalColors', '共享色'],
  ['字体设置', 'fontMode', 'font'],
  ['用量展板开关', 'showDash', 'um-dash-open'],
  ['刷新间隔', 'refreshIntervalMs'],
  ['价格来源 URL', 'priceSourceUrl'],
];
for (const [name, ...ks] of features) {
  const found = [];
  ks.forEach((k) => {
    let n = 0;
    region.forEach((l) => { if (l.includes(k)) n++; });
    if (n) found.push(`${k}×${n}`);
  });
  console.log(`${found.length ? '✅' : '❌'} ${name}: ${found.join(', ') || '(设置页区无此标记!)'}`);
}
