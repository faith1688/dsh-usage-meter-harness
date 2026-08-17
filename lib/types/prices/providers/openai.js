export const openaiModels = {
    // 标准定价（官方，2026-08）
    'openai/gpt-5.5': { inputPerM: 5, outputPerM: 30, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.5-pro': { inputPerM: 30, outputPerM: 180, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4': { inputPerM: 2.5, outputPerM: 15, cacheReadPerM: 0.25, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4-mini': { inputPerM: 0.75, outputPerM: 4.5, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4-nano': { inputPerM: 0.2, outputPerM: 1.25, cacheReadPerM: 0.02, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4-pro': { inputPerM: 30, outputPerM: 180, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.3-codex': { inputPerM: 1.75, outputPerM: 14, currency: 'USD', source: 'bundled' },
    'openai/chat-latest': { inputPerM: 5, outputPerM: 30, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    // 5.6 三档（LiteLLM/wavespeed 2026-07 快照，含缓存写）
    'openai/gpt-5.6-sol': { inputPerM: 5, outputPerM: 30, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.6-terra': { inputPerM: 2, outputPerM: 12, cacheReadPerM: 0.2, cacheWritePerM: 2.5, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.6-luna': { inputPerM: 0.2, outputPerM: 1.2, cacheReadPerM: 0.02, cacheWritePerM: 0.25, currency: 'USD', source: 'bundled' },
    // 5.6 专项变体（Daybreak 网络安全，daybreak-red-latest）
    'openai/gpt-5.6-cyber': { inputPerM: 12.5, outputPerM: 75, cacheReadPerM: 1.25, cacheWritePerM: 15.625, currency: 'USD', source: 'bundled' },
    // 历史/过渡行（⚰️ 部分已退役，价格行保留供核对）
    'openai/gpt-5': { inputPerM: 1.25, outputPerM: 10, cacheReadPerM: 0.125, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.1': { inputPerM: 1.25, outputPerM: 10, cacheReadPerM: 0.125, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.2': { inputPerM: 1.75, outputPerM: 14, cacheReadPerM: 0.175, currency: 'USD', source: 'bundled' },
    'openai/gpt-4o': { inputPerM: 2.5, outputPerM: 10, cacheReadPerM: 1.25, currency: 'USD', source: 'bundled' },
    'openai/gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
    'openai/gpt-4.1': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    'openai/gpt-4.1-mini': { inputPerM: 0.4, outputPerM: 1.6, cacheReadPerM: 0.1, currency: 'USD', source: 'bundled' },
    'openai/gpt-4.1-nano': { inputPerM: 0.1, outputPerM: 0.4, cacheReadPerM: 0.025, currency: 'USD', source: 'bundled' },
    'openai/o3': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    'openai/o3-mini': { inputPerM: 1.1, outputPerM: 4.4, cacheReadPerM: 0.55, currency: 'USD', source: 'bundled' },
    'openai/o4-mini': { inputPerM: 1.1, outputPerM: 4.4, cacheReadPerM: 0.275, currency: 'USD', source: 'bundled' },
};
//# sourceMappingURL=openai.js.map