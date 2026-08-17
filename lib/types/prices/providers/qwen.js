export const qwenModels = {
    'qwen/qwen3.8-max': { inputPerM: 12, outputPerM: 36, cacheReadPerM: 1.2, cacheWritePerM: 15, currency: 'CNY', source: 'bundled' },
    // 国际部署（新加坡等区域，同一模型 ID 的区域价）
    'qwen/qwen3.8-max-intl': { inputPerM: 14.988, outputPerM: 44.965, cacheReadPerM: 1.4988, cacheWritePerM: 18.735, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3.7-max': { inputPerM: 12, outputPerM: 36, cacheReadPerM: 1.2, cacheWritePerM: 15, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3-max': { inputPerM: 2.5, outputPerM: 10, cacheReadPerM: 0.25, cacheWritePerM: 3.125, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-max': { inputPerM: 2.4, outputPerM: 9.6, cacheReadPerM: 0.24, cacheWritePerM: 3, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-plus': { inputPerM: 0.8, outputPerM: 2, cacheReadPerM: 0.08, cacheWritePerM: 1, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-flash': { inputPerM: 0.15, outputPerM: 1.5, cacheReadPerM: 0.015, cacheWritePerM: 0.1875, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-turbo': { inputPerM: 0.3, outputPerM: 0.6, cacheReadPerM: 0.03, cacheWritePerM: 0.375, currency: 'CNY', source: 'bundled' },
    // 思考模式：思维链+回答均按输出价 ¥3.00/1M
    'qwen/qwen-turbo-thinking': { inputPerM: 0.3, outputPerM: 3, cacheReadPerM: 0.03, cacheWritePerM: 0.375, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3-coder-plus': { inputPerM: 4, outputPerM: 16, cacheReadPerM: 0.4, cacheWritePerM: 5, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3-coder-flash': { inputPerM: 1, outputPerM: 4, cacheReadPerM: 0.1, cacheWritePerM: 1.25, currency: 'CNY', source: 'bundled' },
};
//# sourceMappingURL=qwen.js.map