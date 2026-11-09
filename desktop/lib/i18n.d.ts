/** Minimal bilingual UI strings for dsh-usage-meter (zh default / en).
 *  Language follows the DSH shell locale (ctx.locale, 'zh'|'en'): the client
 *  plugin injects a provider (setShellLocaleProvider) and bridges the shell's
 *  'locale/change' event to the 'um-lang-change' window event, which the
 *  settings page and the popup readout listen to for a live re-render. */
export type Lang = 'zh' | 'en';
export declare function setShellLocaleProvider(p: (() => Lang) | null): void;
/** Manual override from the settings-page language select; null = follow shell. */
export declare function setManualLang(l: Lang | null): void;
export declare function getLang(): Lang;
declare const zh: {
    subtitle: string;
    language: string;
    apiKey: string;
    apiKeyTip: string;
    keySavedChip: string;
    keyNotSet: string;
    keyPlaceholderSaved: string;
    keyPlaceholderNew: string;
    rate: string;
    notFetched: string;
    fetchedAt: string;
    staleOver24h: string;
    officialPrices: string;
    save: string;
    saved: string;
    saveFailed: string;
    globalSection: string;
    currency: string;
    balance: string;
    balanceTip: string;
    billingTemplate: string;
    templateTip: string;
    customTemplate: string;
    basePrice: string;
    unitPrice: string;
    inputMiss: string;
    cacheHit: string;
    output: string;
    peakPrice: string;
    offPrice: string;
    peakDaysLabel: string;
    uncheckIsOff: string;
    peakHoursLabel: string;
    addPeriod: string;
    del: string;
    start: string;
    end: string;
    hourUnit: string;
    batchDiscount: string;
    discountNote: string;
    customAddRow: string;
    peakToggle: string;
    saveUnit: string;
    resetPrice: string;
    savingUnit: string;
    savedUnit: string;
    saveFailedUnit: string;
    resetToSaved: string;
    resetToOfficial: string;
    lockedBadge: string;
    lockedHint: string;
    lockedSaveMsg: string;
    sharedBalanceLockHint: string;
    prefillOfficial: string;
    noSavedPrice: string;
    sharedBalNote: string;
    officialPreFillHint: string;
    yuanPerM: string;
    peakBadge: string;
    sessionCost: string;
    noPriceData: string;
    turnUsage: string;
    turnSubtotal: string;
    unitCol: string;
    peakTag: string;
    offTag: string;
    subtotalCol: string;
    reasoningIncluded: string;
    includedInOut: string;
    batchHalfNote: string;
    reqOk: string;
    reqTry: string;
    cacheHitPct: string;
    perTurnCosts: string;
    turnsTotal: string;
    speed: string;
    sourceUser: string;
    sourceRemote: string;
    sourceBuiltin: string;
};
type TKey = keyof typeof zh;
/** t('key') — falls back to Chinese when an English string is missing. */
export declare function tt(key: TKey): string;
/** 按中文原文取英文（英文模式返回译文；中文模式原样）。 */
export declare function L(zhText: string): string;
export {};
