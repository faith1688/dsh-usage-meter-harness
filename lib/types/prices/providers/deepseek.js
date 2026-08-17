/**
 * DeepSeek V4 peak/off-peak effective time: 2026-08-17 00:00 Beijing
 * (= 2026-08-16T16:00Z). Peak hours (Beijing) 09:00–12:00, 14:00–18:00
 * = UTC 01:00–04:00 and 06:00–10:00.
 */
export const DEEPSEEK_PEAK_OFF_PEAK_FROM = Date.UTC(2026, 7, 16, 16, 0, 0);
export const deepseekModels = {
    'deepseek-official/deepseek-v4-flash': {
        inputPerM: 1,
        outputPerM: 2,
        cacheReadPerM: 0.02,
        peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 },
        offPeak: { inputPerM: 1.5, outputPerM: 4.5, cacheReadPerM: 0.05 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        currency: 'CNY',
        source: 'bundled',
    },
    'deepseek-official/deepseek-v4-pro': {
        inputPerM: 3,
        outputPerM: 6,
        cacheReadPerM: 0.025,
        peak: { inputPerM: 9, outputPerM: 27, cacheReadPerM: 0.3 },
        offPeak: { inputPerM: 4.5, outputPerM: 13.5, cacheReadPerM: 0.15 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        currency: 'CNY',
        source: 'bundled',
    },
    // Legacy DeepSeek ids (aliases of the V4 line).
    'deepseek-official/deepseek-chat': {
        inputPerM: 1,
        outputPerM: 2,
        cacheReadPerM: 0.02,
        peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 },
        offPeak: { inputPerM: 1.5, outputPerM: 4.5, cacheReadPerM: 0.05 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        currency: 'CNY',
        source: 'bundled',
    },
    'deepseek-official/deepseek-reasoner': {
        inputPerM: 3,
        outputPerM: 6,
        cacheReadPerM: 0.025,
        peak: { inputPerM: 9, outputPerM: 27, cacheReadPerM: 0.3 },
        offPeak: { inputPerM: 4.5, outputPerM: 13.5, cacheReadPerM: 0.15 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        currency: 'CNY',
        source: 'bundled',
    },
};
//# sourceMappingURL=deepseek.js.map