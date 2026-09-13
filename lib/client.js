window.__ModuleLoader__.load({id:"@faith1688/dsh-usage-meter-harness",factory:(require)=>{var module={exports:{}};var exports=module.exports;Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.tsx
var client_exports = {};
__export(client_exports, {
  UsageReadout: () => UsageReadout,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");

// src/i18n.ts
var shellLocale = null;
var manualLang = null;
function setShellLocaleProvider(p) {
  shellLocale = p;
}
function setManualLang(l) {
  manualLang = l;
}
function getLang() {
  if (manualLang) return manualLang;
  if (shellLocale) {
    try {
      const v = shellLocale();
      if (v === "en" || v === "zh") return v;
    } catch {
    }
  }
  return "zh";
}
var zh = {
  // 设置页
  subtitle: "DeepSeek \u7528\u91CF\u8BA1\u91CF \xB7 \u5168\u5C40\u8BBE\u7F6E\u3002\u5355\u4EF7\u4E0E\u5CF0\u8C37\u8BA1\u8D39\u8BF7\u5728\u300C\u4F1A\u8BDD \xB7 \u7528\u91CF\u5361\u7247 \u2192 \u7528\u6237\u81EA\u5B9A\u4E49\u8BBE\u7F6E\u300D\u4E2D\u7F16\u8F91\u3002",
  language: "\u8BED\u8A00",
  apiKey: "\u5B98\u65B9\u6A21\u578B API Key",
  apiKeyTip: "\u4EC5 DeepSeek \u5B98\u65B9\u6A21\u578B\uFF08deepseek-official\uFF09\u4F7F\u7528\u6B64 Key \u67E5\u8BE2\u5B98\u65B9\u4F59\u989D\uFF1B\u5176\u4ED6\u81EA\u5B9A\u4E49\u6A21\u578B\u8BF7\u5404\u81EA\u586B\u5199\u72EC\u7ACB Key\u3002",
  keySavedChip: "\u5DF2\u4FDD\u5B58",
  keyNotSet: "\u672A\u914D\u7F6E",
  keyPlaceholderSaved: "\u5DF2\u586B\u5165 API Key\uFF0C\u81EA\u52A8\u9690\u85CF",
  keyPlaceholderNew: "\u5982 sk-\u2026",
  rate: "\u5F53\u524D\u6C47\u7387\uFF081 USD \u2248\uFF09",
  notFetched: "\u672A\u83B7\u53D6",
  fetchedAt: "\u83B7\u53D6\u4E8E",
  staleOver24h: "\xB7 \u5DF2\u8D8524h\uFF0C\u5C06\u81EA\u52A8\u5237\u65B0",
  officialPrices: "\u5B98\u65B9\u4EF7\u683C",
  save: "\u4FDD\u5B58",
  saved: "\u5DF2\u4FDD\u5B58",
  saveFailed: "\u4FDD\u5B58\u5931\u8D25",
  globalSection: "\u5168\u5C40\u8BBE\u7F6E",
  // 模型编辑
  currency: "\u5E01\u79CD",
  balance: "\u7528\u6237\u4F59\u989D",
  balanceTip: "\u6BCF\u8F6E\u7528\u91CF\u5B9E\u65F6\u6263\u51CF\uFF1B\u65B0\u6A21\u578B\u4ECE 0 \u5F00\u59CB\u3002",
  billingTemplate: "\u8BA1\u8D39\u6A21\u677F",
  templateTip: "\u9009\u6A21\u677F\u540E\uFF0C\u5F39\u7A97\u4E0E\u6B64\u5904\u9010\u683C\u4E00\u81F4\u3002",
  customTemplate: "\uFF08\u81EA\u5B9A\u4E49\uFF09",
  basePrice: "\u57FA\u7840\u5355\u4EF7\uFF08\u5143/M \u6216 $/M\uFF09",
  unitPrice: "\u5355\u4EF7",
  inputMiss: "\u8F93\u5165(\u672A\u547D\u4E2D)",
  cacheHit: "\u7F13\u5B58\u547D\u4E2D",
  output: "\u8F93\u51FA",
  peakPrice: "\u5CF0\u4EF7",
  offPrice: "\u8C37\u4EF7",
  peakDaysLabel: "\u5CF0\u8C37\u661F\u671F:",
  uncheckIsOff: "\u672A\u52FE\u9009\u661F\u671F = \u8C37\u4EF7",
  peakHoursLabel: "\u9AD8\u5CF0\u65F6\u6BB5\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09:",
  addPeriod: "+ \u6DFB\u52A0\u65F6\u6BB5",
  del: "\u5220",
  start: "\u8D77",
  end: "\u6B62",
  hourUnit: "\u65F6",
  batchDiscount: "Batch \u6298\u6263",
  discountNote: "\u5408\u5E76\u8BA1\u4EF7\uFF1A\u8F93\u5165\u5355\u4EF7\u5373\u5BF9\u5168\u90E8 token \u7EDF\u4E00\u8BA1\u8D39\uFF08\u7F13\u5B58/\u8F93\u51FA\u5408\u5E76\uFF09\u3002",
  customAddRow: "+ \u6DFB\u52A0\u5355\u4EF7\u9879\uFF08\u6700\u591A 4 \u9879\uFF09",
  peakToggle: "\u542F\u7528\u5CF0\u8C37\u8BA1\u8D39",
  saveUnit: "\u4FDD\u5B58\u5355\u4EF7",
  resetPrice: "\u91CD\u7F6E\u4EF7\u683C",
  savingUnit: "\u4FDD\u5B58\u4E2D\u2026",
  savedUnit: "\u5DF2\u4FDD\u5B58",
  saveFailedUnit: "\u4FDD\u5B58\u5931\u8D25",
  resetToSaved: "\u5DF2\u91CD\u7F6E\u4E3A\u8BE5\u6A21\u578B\u5DF2\u4FDD\u5B58\u7684\u4EF7\u683C",
  resetToOfficial: "\u5DF2\u91CD\u7F6E\u4E3A\u5B98\u65B9\u4EF7",
  lockedBadge: "\u4F7F\u7528\u4E2D",
  lockedHint: "\u6A21\u578B\u4F7F\u7528\u4E2D\uFF0C\u5DF2\u9501\u5B9A\u7F16\u8F91\u3002",
  lockedSaveMsg: "\u6A21\u578B\u4F7F\u7528\u4E2D\uFF0C\u65E0\u6CD5\u4FDD\u5B58",
  sharedBalanceLockHint: "\u8BE5\u4F9B\u5E94\u5546\u5DF2\u5F00\u542F\u5171\u4EAB\u4F59\u989D\uFF0C\u4E14\u6B64\u7EC4\u5185\u6709\u6A21\u578B\u6B63\u5728\u8FD0\u884C\u2014\u2014\u5171\u4EAB\u4F59\u989D\u5DF2\u9501\u5B9A\uFF0C\u8BF7\u5728\u8F6E\u6B21\u7ED3\u675F\u540E\u518D\u4FEE\u6539\u4F59\u989D\u3002",
  prefillOfficial: "\u5DF2\u6309 DeepSeek \u5B98\u65B9\u4EF7\u9884\u586B\uFF0C\u53EF\u4FEE\u6539\u540E\u4FDD\u5B58\u3002",
  noSavedPrice: "\u8BE5\u6A21\u578B\u5C1A\u672A\u914D\u7F6E\u4EF7\u683C\uFF0C\u91D1\u989D\u53EF\u80FD\u6309 0 \u8BA1\u3002",
  sharedBalNote: "\u4F59\u989D\u6765\u81EA\u8BE5\u4F9B\u5E94\u5546\u7684\u5171\u4EAB\u94B1\u5305\uFF0C\u65E0\u9700\u91CD\u590D\u586B\u5199\uFF1B\u8BF7\u8BBE\u7F6E\u5355\u4EF7\u540E\u70B9\u300C\u4FDD\u5B58\u5355\u4EF7\u300D\u3002",
  officialPreFillHint: "\u5DF2\u6309\u5B98\u65B9\u4EF7\u9884\u586B\uFF0C\u53EF\u4FEE\u6539\u540E\u4FDD\u5B58\u3002",
  yuanPerM: "\u5143/M",
  peakBadge: "\u5CF0\u8C37",
  // 弹窗
  sessionCost: "\u672C\u5BF9\u8BDD\u8D39\u7528",
  noPriceData: "\u65E0\u4EF7\u683C\u6570\u636E",
  turnUsage: "\u672C\u8F6E\u7528\u91CF",
  turnSubtotal: "\u672C\u8F6E\u5C0F\u8BA1",
  unitCol: "\u5355\u4EF7",
  peakTag: "\uFF08\u5CF0\uFF09",
  offTag: "\uFF08\u8C37\uFF09",
  subtotalCol: "\u5C0F\u8BA1",
  reasoningIncluded: "\u63A8\u7406",
  includedInOut: "\uFF08\u5DF2\u542B\u5728\u8F93\u51FA\u5185\uFF09",
  batchHalfNote: "Batch \u534A\u4EF7\uFF1A\u5C0F\u8BA1\u5DF2\u6309\u6298\u6263\u8BA1\u7B97\uFF08\u5355\u4EF7\u5217\u4ECD\u4E3A\u6807\u51C6\u4EF7\uFF09",
  reqOk: "\u6B21\u6210\u529F \xB7",
  reqTry: "\u6B21\u5C1D\u8BD5",
  cacheHitPct: "\u7F13\u5B58\u547D\u4E2D",
  perTurnCosts: "\u6BCF\u8F6E\u8D39\u7528\uFF08\u5171",
  turnsTotal: "\u8F6E\uFF09",
  speed: "\u901F\u5EA6",
  sourceUser: "\u81EA\u5B9A\u4E49",
  sourceRemote: "\u8FDC\u7AEF",
  sourceBuiltin: "\u5185\u7F6E"
};
var en = {
  subtitle: "DeepSeek usage meter \xB7 Global settings. Edit unit prices & peak/off-peak in the conversation usage card.",
  language: "Language",
  apiKey: "Official-model API Key",
  apiKeyTip: "Only DeepSeek official models (deepseek-official) use this Key to query the official balance; set your own Key per custom model.",
  keySavedChip: "Saved",
  keyNotSet: "Not set",
  keyPlaceholderSaved: "Key set \xB7 auto-hidden",
  keyPlaceholderNew: "e.g. sk-\u2026",
  rate: "Exchange rate (1 USD \u2248)",
  notFetched: "Not fetched",
  fetchedAt: "Updated",
  staleOver24h: "\xB7 over 24h, auto refresh",
  officialPrices: "Official prices",
  save: "Save",
  saved: "Saved",
  saveFailed: "Save failed",
  globalSection: "Global settings",
  currency: "Currency",
  balance: "Balance",
  balanceTip: "Deducted per turn; new models start at 0.",
  billingTemplate: "Billing template",
  templateTip: "Popup rows mirror these cells exactly.",
  customTemplate: "(Custom)",
  basePrice: "Base price (per M)",
  unitPrice: "Unit price",
  inputMiss: "Input (miss)",
  cacheHit: "Cache hit",
  output: "Output",
  peakPrice: "Peak",
  offPrice: "Off-peak",
  peakDaysLabel: "Peak days:",
  uncheckIsOff: "Unchecked days = off-peak",
  peakHoursLabel: "Peak hours (Beijing time):",
  addPeriod: "+ Add period",
  del: "Del",
  start: "From",
  end: "To",
  hourUnit: "h",
  batchDiscount: "Batch discount",
  discountNote: "Combined pricing: one rate for all tokens.",
  customAddRow: "+ Add price row (max 4)",
  peakToggle: "Enable peak/off-peak",
  saveUnit: "Save prices",
  resetPrice: "Reset",
  savingUnit: "Saving\u2026",
  savedUnit: "Saved",
  saveFailedUnit: "Save failed",
  resetToSaved: "Reset to saved prices",
  resetToOfficial: "Reset to official prices",
  lockedBadge: "In use",
  lockedHint: "Model in use \u2014 editing locked.",
  lockedSaveMsg: "Model in use, cannot save",
  sharedBalanceLockHint: "Shared balance is enabled and a model in this group is running \u2014 the shared balance is locked; edit it after the turn ends.",
  prefillOfficial: "Prefilled with official DeepSeek prices; edit if needed.",
  noSavedPrice: "No price configured yet; cost may count as 0.",
  sharedBalNote: "Balance comes from the shared provider wallet - no need to re-enter it; just set unit prices and save.",
  officialPreFillHint: "Prefilled with official prices; edit if needed.",
  yuanPerM: "per M",
  peakBadge: "Peak",
  sessionCost: "Conversation cost",
  noPriceData: "No price data",
  turnUsage: "Turn usage",
  turnSubtotal: "Turn subtotal",
  unitCol: "Unit",
  peakTag: " (peak)",
  offTag: " (off)",
  subtotalCol: "Subtotal",
  reasoningIncluded: "Reasoning",
  includedInOut: " (included in output)",
  batchHalfNote: "Batch half-price: subtotals already discounted (unit column shows standard price)",
  reqOk: " ok \xB7",
  reqTry: " attempted",
  cacheHitPct: "cache hit",
  perTurnCosts: "Per-turn costs (",
  turnsTotal: " turns)",
  speed: "speed",
  sourceUser: "Custom",
  sourceRemote: "Remote",
  sourceBuiltin: "Built-in"
};
var dicts = { zh, en };
function tt(key) {
  const l = getLang();
  return dicts[l][key] ?? zh[key];
}
var EN_BY_ZH = {
  "\u7528\u6237\u81EA\u5B9A\u4E49\u8BBE\u7F6E": "Custom settings",
  "\u7528\u91CF\u8BA1\u91CF": "Usage meter",
  "\u5BF9\u8BDD\u88AB\u505C\u6B62": "Conversation stopped",
  "\u5CF0\u8C37\u4EF7\u672A\u751F\u6548": "Peak/off-peak not active",
  "\u9AD8\u5CF0": "Peak",
  "\u4F4E\u8C37": "Off-peak",
  "\u7528\u91CF / \u8D39\u7528\u8BE6\u60C5": "Usage / cost details",
  "\u672A\u9009\u62E9\u6A21\u578B": "No model selected",
  "\u65E0\u4EF7\u683C": "No price",
  "\u8BA1\u7B97": "Calculating",
  "\u66F4\u65B0": "Updated",
  "\u66F4\u65B0\u4E8E": "Updated at",
  "\u5B98\u7F51\u4F59\u989D\u5237\u65B0\u6709\u5EF6\u8FDF\uFF09\uFF1A": "official balance refresh lags): ",
  "\u6C47\u7387 1USD": "Rate 1USD",
  "\u7B49\u5F85\u4F59\u989D\u914D\u7F6E\u2026": "Waiting for balance setup\u2026",
  "\u4F59\u989D \u672A\u914D\u7F6EKey": "Balance \xB7 key not set",
  "\u4F59\u989D \u83B7\u53D6\u4E2D\u2026": "Balance \xB7 fetching\u2026",
  "\u900F\u652F": "overdrawn",
  "\u4F59\u989D": "Balance",
  "\u4EF7\u683C\u6765\u6E90": "Price source",
  "\u8D26\u6237\u4F59\u989D": "Account balance",
  "\u83B7\u53D6\u4E2D\u2026": "Fetching\u2026",
  "\u672C\u5730\u6D88\u8D39": "local spend",
  "\u5B9E\u65F6\u8BA1\u7B97": "live estimate",
  "\u7D2F\u8BA1\u6D88\u8D39\uFF08\u5168\u5C40\u8D26\u672C\uFF09": "Total spend (global ledger)",
  "\u5B98\u7F51\u5237\u65B0\u6709\u5EF6\u8FDF": "official refresh lags",
  "\u9884\u7B97": "Budget",
  "\u5DF2\u7528": "Used",
  "\u8D85\u652F": "Over budget",
  "\u5269\u4F59": "Remaining",
  "\u6B21\u5C1D\u8BD5": " attempted",
  "\u8F6E \xB7 ": "turn \xB7 ",
  "\u8BBE\u7F6E": "Settings",
  "\u8F93\u5165(\u672A\u547D\u4E2D)": "Input (miss)",
  "\u7F13\u5B58\u547D\u4E2D": "Cache hit",
  "\u7F13\u5B58\u5199\u5165": "Cache write",
  "\u8F93\u51FA": "Output",
  "\u8F93\u5165": "Input",
  "\u5E01\u79CD": "Currency",
  "\u7528\u6237\u4F59\u989D": "Balance",
  "\u52A0\u8F7D\u5931\u8D25": "Load failed",
  "\u5DF2\u4FDD\u5B58": "Saved",
  "\u4FDD\u5B58\u5931\u8D25": "Save failed",
  "\u672A\u4FDD\u5B58": "Unsaved",
  "\u4FDD\u5B58\u5931\u8D25 (": "Save failed (",
  "\u4FDD\u5B58\u5355\u4EF7": "Save prices",
  "\u91CD\u7F6E\u4EF7\u683C": "Reset",
  "\u4E2D\u6587": "\u4E2D\u6587",
  "\u8DDF\u968F\u7CFB\u7EDF": "Follow system",
  "\u52A0\u8F7D\u5168\u5C40\u914D\u7F6E\u2026": "Loading global settings\u2026",
  "\u5237\u65B0\u6C47\u7387": "Refresh rate",
  "\u5DF2\u66F4\u65B0 API Key": "API key updated",
  "\u7528\u91CF\u8BA1\u91CF \xB7 \u6A21\u578B\u914D\u7F6E": "Usage meter \xB7 Model pricing",
  "\u4E00\u952E\u4FDD\u5B58\u5168\u90E8": "Save all",
  "\u52A0\u8F7D\u6A21\u578B\u76EE\u5F55\u2026": "Loading model catalog\u2026",
  "\u8BF7\u9009\u62E9\u4F9B\u5E94\u5546": "Select a provider",
  "\u8BE5\u4F9B\u5E94\u5546\u4E0B\u6682\u65E0\u6A21\u578B": "No models under this provider",
  "\u5982 100": "e.g. 100",
  "\u5982 0": "e.g. 0",
  "\u5982 20": "e.g. 20",
  "\u4EBA\u6C11\u5E01\uFF09": "CNY)",
  "\u7F8E\u5143\uFF09": "USD)",
  "\u53EF\u8D1F\uFF09": "may be negative)",
  "\u9700\u6362\u7B97\uFF09": "converted)",
  "\u5408\u5E76\u8BA1\u4EF7": "Combined pricing",
  "\u534A\u4EF7": "half price",
  "\u8BA1\u8D39\u65B9\u5F0F": "Billing method",
  "\u9009\u62E9\u8BA1\u8D39\u65B9\u5F0F\u9884\u586B\uFF09": "prefill via billing method)",
  "\u7528\u91CF\u540D\u79F0\uFF08\u53EF\u6539\uFF09": "Row name (editable)",
  "\u9AD8\u5CF0\u4EF7\uFF08\u53EF\u6539\uFF09": "Peak price (editable)",
  "\u5355\u4EF7\uFF08\u53EF\u6539\uFF09": "Flat price (editable)",
  "\u8C37\u4EF7\uFF08\u53EF\u6539\uFF09": "Off-peak price (editable)",
  "\u8C37\u4EF7\u7559\u7A7A": "leave off-peak blank",
  "\u9AD8\u5CF0\u65F6\u6BB5\u9ED8\u8BA4\u5468\u4E00\u5230\u5468\u4E94 9-12 / 14-18\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09\uFF0C\u53EF\u5728\u4E0B\u65B9\u4FEE\u6539": "Default peak hours Mon\u2013Fri 9-12 / 14-18 (Beijing); edit below.",
  "\u5468\u516D\u5468\u65E5\u5168\u5929\u6309\u8C37\u4EF7": "Sat/Sun billed off-peak all day",
  "\u5206\u5CF0\u8C37\u7684\u661F\u671F\uFF08\u4E0D\u52FE": "Peak days (unchecked",
  "\u5168\u5929\u6309\u8C37\u4EF7": "= off-peak all day",
  "\u5468\u516D\u5468\u65E5\u9ED8\u8BA4\u4E0D\u52FE\uFF09": "Sat/Sun unchecked by default)",
  "\u9AD8\u5CF0\u65F6\u6BB5\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09": "Peak hours (Beijing time)",
  "\u5DF2\u542F\u7528 Batch \u534A\u4EF7\uFF08": "Batch half-price enabled (",
  "\u53EF\u4FEE\u6539\u540E\u4FDD\u5B58": "; edit if needed.",
  "\u5DF2\u8F7D\u5165": "loaded",
  "\u8BA1\u8D39\u65B9\u5F0F\uFF0C\u53EF\u4FEE\u6539\u540E\u4FDD\u5B58": " billing method loaded; edit if needed.",
  "\u5DF2\u4FDD\u5B58\uFF0C\u4F59\u989D\u5DF2\u66F4\u65B0": "Saved; balance updated",
  "\u4FDD\u5B58\u540E\u4F59\u989D\u7ACB\u5373\u751F\u6548": "Balance takes effect immediately after save",
  "\u6A21\u677F\u4FEE\u6539\u9700\u5237\u65B0\u6D4F\u89C8\u5668\u751F\u6548": "Template change needs a browser refresh",
  "\u5DF2\u4FDD\u5B58\uFF0C\u8BF7\u5237\u65B0\u6D4F\u89C8\u5668\u540E\u751F\u6548": "Saved; refresh browser to apply",
  "\u5DF2\u91CD\u7F6E\u4E3A\u8BE5\u6A21\u578B\u5B98\u65B9\u4EF7\u683C\uFF0C\u8BF7\u5237\u65B0\u6D4F\u89C8\u5668\u540E\u751F\u6548": "Reset to official prices; refresh browser to apply",
  "\u91CD\u7F6E\u5931\u8D25": "Reset failed",
  "\u5DF2\u91CD\u7F6E\u4E3A\u8BE5\u8BA1\u8D39\u65B9\u5F0F\u7ED3\u6784\uFF0C\u8BF7\u6838\u5BF9\u5355\u4EF7\u540E\u70B9\u4FDD\u5B58\u5355\u4EF7\u751F\u6548": "Reset to template structure; check prices then save.",
  "\u4F1A\u8BDD\u7EA7\u5355\u4EF7\u3001\u8BA1\u8D39\u65B9\u5F0F\u4E0E\u5CF0\u8C37\u4EF7\u5728": "Session-level prices live in",
  "\u5BF9\u8BDD \xB7 \u7528\u91CF\u5361\u7247": "conversation usage card",
  "\u4E2D\u7F16\u8F91\u3002": ".",
  "\u6A21\u578B\u5355\u4EF7\u7F16\u8F91\uFF08": "Model price editor (",
  "\u5355\u4F4D\uFF1A\u6BCF\u767E\u4E07tokens": "Unit: per million tokens",
  "\u4F9B\u5E94\u5546": "Provider",
  "\u5171\u4EAB\u4F59\u989D\uFF08\u8BE5\u4F9B\u5E94\u5546\u6240\u6709\u6A21\u578B\u5171\u7528\u4E00\u4E2A\u4F59\u989D\uFF09": "Shared balance (all models under this provider share one wallet)",
  "\u672A\u4ECE\u6A21\u578B\u76EE\u5F55\u83B7\u53D6\u5230\u6A21\u578B\u3002\u8BF7\u786E\u8BA4\u5F53\u524D\u7EC4\u5408\u5DF2\u6CE8\u518C LLM \u9002\u914D\uFF08": "No models from catalog. Ensure the current combo registers an LLM adapter (",
  "\u57FA\u7840\u8BA1\u8D39\uFF08\u8F93\u5165+\u8F93\u51FA\uFF09": "Basic (input + output)",
  "\u7F13\u5B58\u547D\u4E2D/\u672A\u547D\u4E2D": "Cache hit / miss",
  "\u5CF0\u8C37\u5206\u65F6\u5B9A\u4EF7\uFF08DeepSeek\uFF09": "Peak/off-peak (DeepSeek)",
  "\u7F13\u5B58\u5199\u5165+\u547D\u4E2D": "Cache write + hit",
  "\u8F93\u5165+\u8F93\u51FA\u5408\u5E76": "Combined input + output",
  "Batch \u534A\u4EF7\uFF08\xD70.5\uFF09": "Batch half price (\xD70.5)",
  "\u8F93\u5165\u4E0E\u8F93\u51FA\u5206\u5F00\u8BA1\u4EF7\uFF08\u65E0\u7F13\u5B58\u673A\u5236\uFF09\u3002": "Input and output priced separately (no cache).",
  "\u547D\u4E2D\u6309\u7F13\u5B58\u4EF7\uFF08\u7EA6 0.1\xD7\u8F93\u5165\u4EF7\uFF09\uFF0C\u672A\u547D\u4E2D\u6309\u8F93\u5165\u4EF7\u3002": "Hits at cache price (~0.1\xD7 input); misses at input price.",
  "\u9AD8\u5CF0\u65F6\u6BB5\uFF08\u5317\u4EAC\u65F6\u95F4 9:00-12:00\u300114:00-18:00\uFF09\u6309\u9AD8\u5CF0\u5355\u4EF7\uFF1B\u95F2\u65F6\u5355\u4EF7\u81EA\u52A8 = \u9AD8\u5CF0 \xD70.5\uFF08DeepSeek 2026-08-17 \u8D77\u751F\u6548\uFF09\u3002": "Peak hours (Beijing 9:00-12:00, 14:00-18:00) at peak price; off-peak = peak \xD70.5.",
  "\u9996\u6B21\u5199\u5165\u7EA6 1.25\xD7\u8F93\u5165\u4EF7\u3001\u547D\u4E2D\u7EA6 0.1\xD7\u8F93\u5165\u4EF7\uFF08Anthropic 1h \u5199\u5165\u4E3A 2\xD7\uFF09\u3002": "Write ~1.25\xD7 input; hit ~0.1\xD7 input (Anthropic 1h write = 2\xD7).",
  "\u8F93\u5165+\u8F93\u51FA\u6309\u7EDF\u4E00\u5355\u4EF7\uFF08\u8BAF\u98DE/\u767E\u5DDD\uFF09\u3002": "One unified rate for all tokens (iFlytek/Baichuan).",
  "\u6574\u5355\u8D39\u7528 \xD70.5\uFF08Batch \u8C03\u7528\uFF1BOpenAI/Anthropic/Gemini/Mistral/Qwen\uFF09\u3002": "Total \xD70.5 (Batch; OpenAI/Anthropic/Gemini/Mistral/Qwen).",
  "\u8F93\u5165\uFF08\u7F13\u5B58\u547D\u4E2D\uFF09": "Input (cache hit)",
  "\u8F93\u5165\uFF08\u7F13\u5B58\u672A\u547D\u4E2D\uFF09": "Input (cache miss)",
  "\u8F93\u5165+\u8F93\u51FA\uFF08\u5408\u5E76\u8BA1\u4EF7\uFF09": "Input + output (combined)",
  "\u6C47\u7387 1USD\u2248": "Rate 1USD\u2248",
  "\u6C47\u7387 1USD=": "Rate 1USD=",
  "\u8BF7\u6C42": "Requests",
  "\u5929": "d",
  "\u5C0F\u65F6": "h",
  "\u5206\u949F": "m",
  "\u79D2": "s",
  "\u81EA\u5B9A\u4E49\u5355\u4EF7\u9879\uFF08\u6BCF\u884C = \u5355\u4EF7 \xD7 \u8BE5\u884C token \u6570\uFF1B\u5CF0/\u8C37\u4EF7\u5728\u4E0B\u65B9 peakOn \u65F6\u586B\uFF09": "Custom rows (each row = unit price \xD7 its tokens; peak prices below when enabled)",
  "\u5DF2\u8F7D\u5165\u300C": 'Loaded "',
  "\u8D77": "From",
  "\u6B62": "To",
  "\u65F6": "h",
  "\u900F\u652F ": "overdrawn ",
  "\u5269\u4F59 ": "Remaining ",
  "\u672A\u914D\u7F6EKey": "Key not set",
  "\u672A\u914D\u7F6E": "Not set",
  "\u5B98\u7F51\u4F59\u989D\u5237\u65B0\u53EF\u80FD\u6709\u5EF6\u8FDF\uFF0C\u4F59\u989D\u6309\u300C\u951A\u70B9 \u2212 \u672C\u5730\u6D88\u8D39\u300D\u5B9E\u65F6\u8BA1\u7B97": "Official balance refresh may lag; balance = anchor \u2212 local spend (live)",
  "\u4F59\u989D = \u8D26\u6237\u4F59\u989D \u2212 \u7D2F\u8BA1\u6D88\u8D39\uFF08\u5168\u5C40\u8D26\u672C\uFF09": "Balance = account balance \u2212 total spend (global ledger)",
  " \xB7 \u5B98\u7F51\u5237\u65B0\u6709\u5EF6\u8FDF": " \xB7 official refresh lags",
  "\u8D85\u652F ": "Over budget ",
  "\u52A0\u8F7D\u5931\u8D25 (": "Load failed (",
  " \xB7 \u5DF2\u66F4\u65B0 API Key": " \xB7 API key updated",
  "\u6309\u4F9B\u5E94\u5546 \u2192 \u6A21\u578B\u4E3A\u6BCF\u4E2A\u6A21\u578B\u5355\u72EC\u8BBE\u7F6E\u5E01\u79CD\u3001\u7528\u6237\u4F59\u989D\u3001\u5355\u4EF7\uFF08\u542B\u5CF0\u8C37\u4EF7\u5BF9\uFF09\u3001\u751F\u6548\u661F\u671F\u4E0E\u9AD8\u5CF0\u65F6\u6BB5\u3002": "Per provider \u2192 model: set currency, balance, unit prices (incl. peak/off-peak), peak days and hours.",
  "\u672A\u4ECE\u6A21\u578B\u76EE\u5F55\u83B7\u53D6\u5230\u6A21\u578B\u3002\u8BF7\u786E\u8BA4\u5F53\u524D\u7EC4\u5408\u5DF2\u6CE8\u518C LLM \u9002\u914D\uFF08ctx.llm\uFF09\u3002": "No models from catalog. Ensure the current combo registers an LLM adapter (ctx.llm).",
  "\uFF08\u81EA\u5B9A\u4E49\uFF09": "(Custom)",
  "\u81EA\u5B9A\u4E49\u5355\u4EF7\u9879\uFF08\u6BCF\u884C = \u5355\u4EF7 \xD7 \u8BE5\u884C token \u6570\uFF1B\u5CF0\u8C37\u4EF7\u5728\u4E0B\u65B9\u300C\u542F\u7528\u5CF0\u8C37\u8BA1\u8D39\u300D\u91CC\u7EDF\u4E00\u586B\uFF09": 'Custom rows (each row = unit price \xD7 its tokens; peak prices filled under "Enable peak/off-peak")',
  "\u5CF0\u8C37\u63A5\u7BA1 \u2192": "Peak/off-peak takes over \u2192",
  "\u4F1A\u8BDD\u7EA7\u5355\u4EF7\u3001\u8BA1\u8D39\u65B9\u5F0F\u4E0E\u5CF0\u8C37\u4EF7\u5728\u300C\u5BF9\u8BDD \xB7 \u7528\u91CF\u5361\u7247 \u2192 \u7528\u6237\u81EA\u5B9A\u4E49\u8BBE\u7F6E\u300D\u4E2D\u7F16\u8F91\u3002": "Session-level prices live in the conversation usage card settings.",
  "\u4FDD\u5B58\u540E\u4F59\u989D\u7ACB\u5373\u751F\u6548\uFF1B\u6A21\u677F\u4FEE\u6539\u9700\u5237\u65B0\u6D4F\u89C8\u5668\u751F\u6548": "Balance applies on save; template changes need a browser refresh.",
  "CNY\uFF08\u4EBA\u6C11\u5E01\uFF09": "CNY",
  "USD\uFF08\u7F8E\u5143\uFF09": "USD",
  "\u8D26\u6237\u4F59\u989D\uFF08": "Account balance (",
  "\u5145\u503C\uFF08": "Top-up (",
  "\uFF0C\u53EF\u8D1F\uFF09": ", may be negative)",
  "\u6C47\u7387\uFF1A1 USD \u2248 ": "Rate: 1 USD \u2248 ",
  "\u5DF2\u542F\u7528 Batch \u534A\u4EF7\uFF08\xD70.5\uFF09\uFF0C\u53EF\u4FEE\u6539\u540E\u4FDD\u5B58": "Batch half-price (\xD70.5) enabled; edit if needed.",
  "\u8C37\u4EF7\u7559\u7A7A = \u9AD8\u5CF0\xD70.5\uFF1B\u9AD8\u5CF0\u65F6\u6BB5\u9ED8\u8BA4\u5468\u4E00\u5230\u4E94 9-12 / 14-18\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09\uFF0C\u53EF\u5728\u4E0B\u65B9\u4FEE\u6539": "Blank off-peak = peak \xD70.5; default peak Mon-Fri 9-12 / 14-18 (Beijing). Edit below.",
  "\u5206\u5CF0\u8C37\u7684\u661F\u671F\uFF08\u4E0D\u52FE = \u5168\u5929\u6309\u8C37\u4EF7\uFF1B\u5468\u516D\u5468\u65E5\u9ED8\u8BA4\u4E0D\u52FE\uFF09": "Peak days (unchecked = off-peak all day; Sat/Sun unchecked by default)",
  "Batch \u534A\u4EF7": "Batch half price",
  "\u5BFC\u51FA\u8BA1\u8D39\u914D\u7F6E": "Export billing config",
  "\u5BFC\u5165\u8BA1\u8D39\u914D\u7F6E": "Import billing config",
  "\u5DF2\u5BFC\u51FA\u8BA1\u8D39\u914D\u7F6E": "Billing config exported",
  "\u5DF2\u5BFC\u5165\u8BA1\u8D39\u914D\u7F6E": "Billing config imported",
  "\u5BFC\u5165\u5931\u8D25": "Import failed",
  "\u5BFC\u51FA\u5931\u8D25": "Export failed",
  "\u5BFC\u5165\u6587\u4EF6\u65E0\u6548": "Invalid config file",
  "\u5DF2\u5BFC\u51FA\u5230\u8BA1\u8D39\u914D\u7F6E\u76EE\u5F55": "Exported to billing config directory",
  "\u8BA1\u8D39\u914D\u7F6E\u76EE\u5F55": "Billing config directory",
  "\u4FDD\u5B58\u76EE\u5F55": "Save directory",
  "\u76EE\u5F55\u5DF2\u4FDD\u5B58": "Directory saved",
  "\u9ED8\u8BA4 $DSH_HOME/usage-meter\uFF08\u7559\u7A7A\u7528\u9ED8\u8BA4\uFF09": "Default $DSH_HOME/usage-meter (empty = default)",
  "\u5BFC\u51FA/\u5BFC\u5165\u5171\u7528\u6B64\u76EE\u5F55\uFF1B\u7559\u7A7A\u5219\u7528\u9ED8\u8BA4\u76EE\u5F55\uFF08\u5728 DSH_HOME \u4E0B\uFF0C\u4E0D\u968F dsh \u5347\u7EA7\u4E22\u5931\uFF09\u3002": "Export/import share this dir; empty = default (under DSH_HOME, survives dsh upgrade).",
  "\u4ECE\u8BA1\u8D39\u914D\u7F6E\u76EE\u5F55\u5BFC\u5165\u5230\u672C\u6A21\u578B\uFF1A": "Import from billing dir to this model: ",
  "\uFF08\u9ED8\u8BA4\u76EE\u5F55\uFF09": "(default dir)",
  "\u76EE\u5F55\u4E3A\u7A7A\uFF0C\u8BF7\u5148\u53BB\u5176\u4ED6\u6A21\u578B\u70B9\u300C\u5BFC\u51FA\u8BA1\u8D39\u914D\u7F6E\u300D": "Dir is empty. Export from another model first.",
  "\u624B\u52A8\u9009\u6587\u4EF6\u2026": "Pick a file\u2026",
  "\uFF08\u8DE8\u673A\u5668\u5BFC\u5165\u7528\uFF09": "(for cross-machine import)",
  "\u5BFC\u5165": "Import",
  "\u5220\u9664": "Delete",
  "\u91CD\u590D": "Duplicate",
  "\u5DF2\u8986\u76D6": "Overwritten",
  "\u5DF2\u5B58\u5728\u76F8\u540C\u914D\u7F6E\uFF0C\u672A\u91CD\u590D\u5BFC\u51FA": "Identical config already exists; not re-exported.",
  "\u5DF2\u5B58\u5728\u540C\u540D\u4F46\u5185\u5BB9\u4E0D\u540C\u7684\u914D\u7F6E\uFF0C\u662F\u5426\u8986\u76D6\uFF1F": "A config with the same name but different content already exists. Overwrite?",
  "\u8BE5\u6587\u4EF6\u540D\u5DF2\u5B58\u5728\uFF0C\u8BF7\u6362\u540D\u91CD\u8BD5": "That filename already exists; pick another name.",
  "\u4E0D\u8986\u76D6\uFF0C\u6539\u7528\u65B0\u6587\u4EF6\u540D\u4FDD\u5B58\uFF1A": "Don't overwrite \u2014 save under a new name:",
  "\u8BE5\u6A21\u578B\u5DF2\u6709\u8BA1\u8D39\u914D\u7F6E\uFF0C\u5BFC\u5165\u5C06\u8986\u76D6\u73B0\u6709\u6A21\u677F\u3002": "This model already has a billing config; importing will overwrite it.",
  "\u8986\u76D6\u73B0\u6709\u6A21\u677F": "Overwrite existing template",
  "\u91CD\u547D\u540D\u4FDD\u5B58": "Save as new name",
  "\u786E\u8BA4\u4FDD\u5B58": "Save",
  "\u5DF2\u5B58\u5728\u540C\u540D\u914D\u7F6E": "A config with this name already exists",
  "\u5185\u5BB9\u76F8\u540C": "same content",
  "\u5185\u5BB9\u4E0D\u540C": "different content",
  "\u8BF7\u9009\u62E9\uFF1A": "Choose:",
  "\u53D6\u6D88": "Cancel",
  "\u786E\u5B9A\u5220\u9664\u8BE5\u8BA1\u8D39\u914D\u7F6E\uFF1F": "Delete this billing config?",
  "\u5DF2\u5220\u9664": "Deleted",
  "\u5220\u9664\u5931\u8D25": "Delete failed",
  "\u89C6\u89C9\u5305\u88C5\u8BC6\u522B\uFF08\u6A21\u578B\u540D\u524D\u7F00/\u540E\u7F00\uFF09": "Vision wrapper recognition (model prefix/suffix)",
  "\u89C6\u89C9\u63D2\u4EF6\u4F1A\u7ED9\u6A21\u578B\u540D\u52A0\u5305\u88C5\u6807\u8BB0\uFF08\u5982 DeepSeek-V4-Flash (modlens vision)\uFF09\u3002\u547D\u4E2D\u65F6\u6309\u53BB\u6389\u5305\u88C5\u540E\u7684\u5E95\u5C42\u6A21\u578B\u8BA1\u8D39\u4E0E\u805A\u5408\uFF0C\u4EF7\u683C/\u7528\u91CF\u4E0E\u5E95\u5C42\u6A21\u578B\u5171\u7528\u3002\u6BCF\u884C\u4E00\u4E2A\u6807\u8BB0\uFF1B\u7559\u7A7A = \u5173\u95ED\u8BC6\u522B\u3002": "Vision plugins wrap model names (e.g. DeepSeek-V4-Flash (modlens vision)). When matched, billing & aggregation use the underlying model, sharing its price/usage. One marker per line; empty = recognition off.",
  "\u4FDD\u5B58\u8BC6\u522B\u6807\u8BB0": "Save recognition markers",
  "\u5DF2\u4FDD\u5B58\u8BC6\u522B\u6807\u8BB0": "Recognition markers saved",
  "\u89C6\u89C9\u5305\u88C5\u8BC6\u522B\uFF08\u63D0\u4F9B\u5546/\u6A21\u578B\u540D\u524D\u7F00\xB7\u540E\u7F00\uFF09": "Vision wrapper recognition (provider/model prefix & suffix)",
  "\u89C6\u89C9\u63D2\u4EF6\u4F1A\u5305\u4E00\u5C42\u300C\u5305\u88C5\u8DEF\u7531\u300D\uFF1A\u63D0\u4F9B\u5546 id \u53D8\u6210 modlens-xxx / xxx-modlens / vision-toolkit-xxx\uFF08\u6A21\u578B id \u4E0D\u53D8\uFF0C\u663E\u793A\u540D\u591A\u4E00\u4E2A (modlens vision)\uFF09\u3002\u547D\u4E2D\u7684\u8DEF\u7531\u6309\u5E95\u5C42\u63D0\u4F9B\u5546/\u6A21\u578B\u8BA1\u8D39\u3001\u67E5\u4F59\u989D\u3001\u805A\u5408\u7EDF\u8BA1\u3002\u6BCF\u884C\u4E00\u4E2A\u6807\u8BB0\uFF0C\u53F3\u4FA7\u5F00\u5173\u63A7\u5236\u8BE5\u884C\u662F\u5426\u53C2\u4E0E\u8BC6\u522B\uFF1B+ \u65B0\u589E\u3001\u2212 \u5220\u9664\u3002": 'Vision plugins add a wrapper route: the provider id becomes modlens-xxx / xxx-modlens / vision-toolkit-xxx (the model id stays the same; the display name just gains "(modlens vision)"). Matched routes bill, check balance and aggregate stats as the underlying provider/model. One marker per row; the switch on the right controls whether that row takes part; + adds, \u2212 removes.',
  "\u5F53\u524D\u6CA1\u6709\u4EFB\u4F55\u6807\u8BB0\uFF1A\u5305\u88C5\u8DEF\u7531\u4E0D\u4F1A\u88AB\u8BC6\u522B\uFF08\u8BC6\u522B\u5DF2\u5173\u95ED\uFF09\u3002\u70B9\u4E0B\u9762\u300C+ \u65B0\u589E\u6807\u8BB0\u300D\u5F00\u59CB\u6DFB\u52A0\u3002": 'No markers configured: wrapper routes are not recognized (recognition off). Click "+ Add marker" below to start.',
  "\u5982 modlens- \u6216 -modlens \u6216 (modlens vision)": "e.g. modlens- or -modlens or (modlens vision)",
  "\u5F00\u542F = \u8BE5\u6807\u8BB0\u53C2\u4E0E\u8BC6\u522B\uFF1B\u5173\u95ED = \u5FFD\u7565\u8BE5\u6807\u8BB0": "On = this marker is recognized; Off = ignored",
  "\u8BC6\u522B": "On",
  "\u5FFD\u7565": "Off",
  "\u5220\u9664\u8FD9\u4E00\u884C": "Remove this row",
  "\u65B0\u589E\u6807\u8BB0": "Add marker",
  "\u5B58\u50A8\u4E0E\u8BC6\u522B\u8BBE\u7F6E": "Storage & recognition settings",
  "\u5176\u4ED6\u8BBE\u7F6E": "Other settings",
  "\u76EE\u5F55\u5BFC\u51FA": "Directory & export",
  "\u89C6\u89C9\u8BC6\u522B": "Vision recognition",
  "\u9884\u8B66": "Alerts",
  "\u8BBE\u7F6E\u9884\u8B66\u9608\u503C\uFF1A\u9884\u7B97\u7528\u5230\u6307\u5B9A\u767E\u5206\u6BD4\u3001\u6216\u5B9E\u65F6\u4F59\u989D\u4F4E\u4E8E\u4E0B\u9650\u65F6\uFF0C\u8F93\u5165\u6846\u65C1\u7684\u91CF\u7528\u836F\u4E38\u4F1A\u547C\u5438\u53D8\u7EA2\u63D0\u9192\u3002\u6A21\u578B/\u4F9B\u5E94\u5546\u53EF\u5404\u81EA\u8986\u76D6\u5168\u5C40\u3002": "Set alert thresholds: when budget usage hits a % or live balance drops below a floor, the usage pill next to the input breathes red. Models/providers can override the global value.",
  "\u5168\u5C40\u9884\u7B97\u9884\u8B66%": "Global budget alert %",
  "\u4F59\u989D\u9884\u8B66\u4E0B\u9650": "Balance alert floor",
  "\u4FDD\u5B58\u5168\u5C40\u9608\u503C": "Save global thresholds",
  "\u5DF2\u4FDD\u5B58\u5168\u5C40\u9608\u503C": "Global thresholds saved",
  "\u5982 80\uFF080=\u5173\u95ED\uFF09": "e.g. 80 (0=off)",
  "\u5982 20\uFF080=\u5173\u95ED\uFF09": "e.g. 20 (0=off)",
  "\u6309\u6A21\u578B/\u4F9B\u5E94\u5546\u5355\u72EC\u8BBE\u7F6E\u9608\u503C\uFF1A\u5728\u6A21\u578B\u5361\u300C\u4F9B\u5E94\u5546\u300D\u4E0B\u62C9\u9009\u597D\u6A21\u578B\u540E\uFF0C\u70B9\u5F00\u300C\u5176\u4ED6\u8BBE\u7F6E \u2192 \u9884\u8B66\u300D\u53EF\u7ED9\u5F53\u524D\u6A21\u578B\u8BBE\u72EC\u7ACB\u9608\u503C\uFF08\u9ED8\u8BA4\u9075\u5FAA\u5168\u5C40\uFF09\u3002": "To set per-model/provider thresholds: pick a model in the provider dropdown, then open Other settings \u2192 Alerts to set its own threshold (defaults to following the global value).",
  "\u7528\u91CF\u5C55\u677F": "Usage dashboard",
  "\u7D2F\u8BA1": "Total",
  "\u5F53\u524D\u4F1A\u8BDD\u7D2F\u8BA1": "Current session total",
  "\u5F53\u524D\u4F1A\u8BDD": "Current session",
  "\u6682\u65E0\u7528\u91CF\u6570\u636E\uFF0C\u5148\u53D1\u51E0\u6761\u6D88\u606F\u518D\u6765\u770B\u3002": "No usage data yet. Send a few messages first.",
  "\u8BE5\u6A21\u578B\u6682\u65E0\u7528\u91CF": "No usage for this model",
  "\u8D39\u7528": "Cost",
  "\u8BA1\u8D39\u914D\u7F6E\u5BFC\u51FA\u76EE\u5F55": "Billing config export directory",
  "\u8BF4\u660E\uFF1A\u4EC5\u5F53\u4F60\u624B\u52A8\u70B9\u300C\u5BFC\u51FA\u8BA1\u8D39\u914D\u7F6E\u300D\u65F6\uFF0C\u914D\u7F6E\u624D\u4F1A\u5199\u5165\u4E0B\u9762\u8FD9\u4E2A\u76EE\u5F55\uFF1B\u6A21\u578B\u672C\u8EAB\u4E0D\u4F1A\u81EA\u52A8\u4FDD\u5B58\u5230\u8FD9\u91CC\u3002\u5BFC\u5165\u65F6\u4E5F\u4ECE\u8FD9\u91CC\u8BFB\u53D6\u3002": 'Only when you click "Export billing config" is a config written to this directory; models are not auto-saved here. Import reads from here too.',
  "\u5DE5\u4F5C\u76EE\u5F55\u8DEF\u5F84": "Working directory path",
  "\u5DE5\u4F5C\u76EE\u5F55\u8BBE\u7F6E": "Working directory setting",
  "\u9ED8\u8BA4 $DSH_HOME/usage-meter/exports\uFF08\u7559\u7A7A\u7528\u9ED8\u8BA4\uFF09": "Default $DSH_HOME/usage-meter/exports (empty = default)",
  "\u63D2\u4EF6\u7EDF\u4E00\u6570\u636E\u76EE\u5F55\uFF1A\u4E0B\u9762\u300C\u5DE5\u4F5C\u76EE\u5F55\u300D\u5B58\u653E\u5BFC\u51FA/\u5BFC\u5165\u7684\u8BA1\u8D39\u914D\u7F6E\uFF08\u9ED8\u8BA4 $DSH_HOME/usage-meter/exports\uFF09\u3002\u4F59\u989D\u3001API \u5BC6\u94A5\u3001\u770B\u677F\u7EDF\u8BA1\u7B49\u5185\u90E8\u6570\u636E\u56FA\u5B9A\u4FDD\u5B58\u5728 $DSH_HOME/usage-meter\uFF08config.json / salt / stats.json / apikeys\uFF09\uFF0C\u4E0D\u968F\u672C\u8BBE\u7F6E\u6539\u53D8\uFF0C\u4E5F\u4E0D\u4F1A\u56E0 DSH \u5347\u7EA7\u4E22\u5931\u3002\u901A\u5E38\u65E0\u9700\u4FEE\u6539\u3002": "Unified data directory: the working directory below holds exported/imported billing configs (default $DSH_HOME/usage-meter/exports). Internal data \u2014 balances, API keys, dashboard stats \u2014 stays fixed under $DSH_HOME/usage-meter (config.json / salt / stats.json / apikeys), unaffected by this setting and safe across DSH upgrades. You normally need not change it.",
  "\u975E\u5CF0\u8C37\u65E5": "non-peak day",
  "\u9884\u8B66\u89C4\u5219\uFF1ADeepSeek \u5B98\u65B9\u6A21\u578B\u7528\u300C\u5B9E\u65F6\u4F59\u989D\u91D1\u989D\u300D\u6BD4\u5BF9\uFF08\u4F59\u989D\u4F4E\u4E8E\u9608\u503C\u2192\u9884\u8B66\uFF09\uFF1B\u5176\u4ED6\u6A21\u578B\u7528\u300C\u9884\u7B97\u767E\u5206\u6BD4\u300D\uFF08\u9884\u7B97\u7528\u5230 X%\u2192\u9884\u8B66\uFF09\u3002\u9009\u4F9B\u5E94\u5546\u2192\u6A21\u578B\u540E\u53EF\u5355\u72EC\u8BBE\u7F6E\uFF0C\u9ED8\u8BA4\u9075\u5FAA\u5168\u5C40\u3002": "Alert rule: DeepSeek-official models compare the live balance amount (below the floor \u2192 alert); other models use budget % (budget used to X% \u2192 alert). Pick provider\u2192model to set per-model; defaults to following global.",
  "\u5168\u5C40\u9608\u503C": "Global threshold",
  "\u6309\u6A21\u578B\u5355\u72EC\u8BBE\u7F6E": "Per-model setting",
  "\u6A21\u578B": "Model",
  "\u9009\u62E9\u4F9B\u5E94\u5546": "Select provider",
  "\u9009\u62E9\u6A21\u578B": "Select model",
  "\u9608\u503C\u7C7B\u578B": "Threshold type",
  "\u6309\u9884\u7B97\u767E\u5206\u6BD4 %": "By budget %",
  "\u6309\u4F59\u989D\u91D1\u989D": "By balance amount",
  "\u5168\u5C40\u5171\u4EAB\u9884\u503C\uFF08\u6309\u4F9B\u5E94\u5546\uFF09": "Shared alert (by provider)",
  "\u6A21\u578B\u72EC\u7ACB\u9884\u503C\uFF08\u6309\u6A21\u578B\uFF09": "Per-model alert (by model)",
  "\u9884\u503C\u7C7B\u578B": "Alert type",
  "\u6309\u767E\u5206\u6BD4 %": "By percent %",
  "\u5982 80": "e.g. 80",
  "\u4FDD\u5B58\u9884\u503C": "Save alert",
  "\u5DF2\u4FDD\u5B58\u9884\u503C": "Alert saved",
  "\u4FDD\u5B58\u6A21\u578B\u9608\u503C": "Save model threshold",
  "\u5DF2\u4FDD\u5B58\u8BE5\u6A21\u578B\u9608\u503C": "Model threshold saved",
  "\u8BF7\u5148\u9009\u62E9\u4F9B\u5E94\u5546\u548C\u6A21\u578B": "Select a provider and model first",
  "\u5CF0": "Peak",
  "\u8C37": "Off",
  "\u4F59\u989D\u6765\u6E90": "Balance source",
  "DeepSeek \u5B98\u65B9": "DeepSeek official",
  "DeepSeek API Key": "DS API Key",
  "DS API Key": "DS API Key",
  "\u5DF2\u586B\u5165 API key": "API key set",
  "\u8BE5\u9009\u9879\u4EC5 DeepSeek \u6A21\u578B\u4F7F\u7528": "This option is only for DeepSeek models",
  "\u5DF2\u586B\u5165 API key\uFF08\u4EC5 DeepSeek \u6A21\u578B\u4F7F\u7528\uFF09": "API key set (DeepSeek models only)",
  "\u5DF2\u586B\u5165 API key\uFF0C\u91CD\u65B0\u8F93\u5165\u4EE5\u8986\u76D6": "API key set \u2014 re-enter to overwrite",
  "\u5982 sk-\u2026": "e.g. sk-\u2026",
  "\u8BE5\u6A21\u578B\u7528\u6B64\u72EC\u7ACB key \u67E5\u8BE2 DeepSeek \u5B98\u65B9\u4F59\u989D\uFF0C\u72EC\u7ACB\u4E8E\u5168\u5C40 key\u3002": "This model queries its DeepSeek official balance with this independent key (separate from the global key).",
  "\u4FDD\u5B58": "Save",
  "DeepSeek \u5B98\u65B9\u6A21\u578B\u9ED8\u8BA4\u7528\u5B98\u65B9\u4F59\u989D\uFF0C\u53EF\u586B\u5165\u72EC\u7ACB key \u8986\u76D6\u5168\u5C40 key\u3002": "DeepSeek-official models use the official balance by default; set an independent key here to override the global key.",
  "\u8BE5\u7EDF\u8BA1\u6765\u81EA\u65E7\u7248\u672C\uFF0C\u65E0\u6309\u7C7B\u522B\u91D1\u989D\u660E\u7EC6\uFF1B\u65B0\u4EA7\u751F\u7684\u7528\u91CF\u5C06\u663E\u793A\u6BCF\u7C7B\u91D1\u989D\u3002": "This stat comes from an older version without per-category amounts; newly generated usage will show each category.",
  "\u8DDF\u968F\u5168\u5C40": "Follow global",
  "\u5185\u7F6E\u5B57\u4F53\u6808": "Built-in font stack",
  "\u9ED8\u8BA4": "Default",
  "\u5DF2\u4FDD\u5B58\u5230\u672C\u673A": "Saved to this device",
  "\u4FDD\u5B58\u914D\u8272": "Save colors",
  "\u5F53\u524D": "Current",
  "\u4ECE\u7CFB\u7EDF\u5B57\u4F53\u5E93\u9009\u62E9\u5B57\u4F53": "Pick a font from the system font library",
  "\u672C\u673A\u68C0\u6D4B\u5230\u8BE5\u5B57\u4F53": "Font detected on this machine",
  "\u672C\u673A\u672A\u68C0\u6D4B\u5230\u8BE5\u5B57\u4F53\uFF0C\u5C06\u56DE\u9000\u5230\u7CFB\u7EDF\u9ED8\u8BA4": "Font not detected on this machine; will fall back to the system default",
  "\u2713 \u53EF\u7528": "\u2713 Available",
  "\u2717 \u672A\u88C5": "\u2717 Not installed",
  "\u5B57\u4F53\u7C97\u7EC6": "Font weight",
  "\u5DF2\u7EC6\u5316": "Refined",
  "\u4E3B\u9898\u5FEB\u5207": "Theme quick switch",
  "\u4E3B\u9898\u5FEB\u5207\uFF08\u8BE6\u7EC6\u914D\u8272\u5728\u8BBE\u7F6E\u9875\uFF09": "Theme quick switch (detailed colors on the settings page)",
  "\u8BE5\u4F9B\u5E94\u5546\u6240\u6709\u6A21\u578B\u5171\u7528\u540C\u4E00\u4E2A\u624B\u52A8\u586B\u5165\u7684\u7528\u6237\u4F59\u989D": "All models of this provider share the same manually entered user balance",
  "\u5171\u4EAB\u4F59\u989D": "Shared balance",
  "\u6240\u6709\u6A21\u578B\u5171\u7528\u4E00\u4E2A\u7528\u6237\u4F59\u989D": "All models share one user balance",
  "\u7EC4\u5185\u9009\u62E9 DeepSeek \u5B98\u65B9\u4F59\u989D\u6765\u6E90\u7684\u6A21\u578B\u5171\u7528\u540C\u4E00\u628A\u5DF2\u586B\u7684 API Key\uFF1B\u67D0\u6A21\u578B\u81EA\u5DF1\u586B\u4E86 Key \u5219\u4F18\u5148\u7528\u81EA\u5DF1\u7684": "Models in this group using the DeepSeek official balance share the same filled-in API key; a model with its own key uses its own first",
  "\u5171\u4EAB API Key": "Shared API key",
  "\u7EC4\u5185 DeepSeek \u6A21\u578B\u5171\u7528\u540C\u4E00\u628A\u5DF2\u586B Key": "DeepSeek models in this group share the same filled-in key",
  "\u5168\u5C40\u5171\u4EAB\u8272\uFF08\u72EC\u7ACB\u4E8E\u4E3B\u9898\uFF0C\u6240\u6709\u4E3B\u9898\u5171\u7528\u4E00\u5957\uFF09": "Global shared colors (independent of theme; one set shared by all themes)",
  "\u9884\u8B66\u989C\u8272\u6309\u4F59\u989D\u4E09\u6863\u663E\u793A\uFF08\u8DB3/\u4E0D\u8DB3/\u900F\u652F\uFF09\uFF1B\u901F\u5EA6\u989C\u8272\u6309\u4E09\u6863\u663E\u793A\uFF080-50 / 51-100 / 101+ tokens/s\uFF09\u3002\u4F60\u9009\u7684\u662F\u300C\u57FA\u7840\u8272\u300D\uFF0C\u5B9E\u9645\u6E32\u67D3\u65F6\u4F1A\u4E0E\u5F53\u524D\u4E3B\u9898\u7684\u54C1\u724C\u8272\u6DF7\u6210\u70AB\u5F69\u6E10\u53D8\uFF0C\u5207\u6362\u4E3B\u9898\u70AB\u5F69\u968F\u4E4B\u53D8\u5316\uFF0C\u57FA\u7840\u8272\u4FDD\u6301\u4E0D\u53D8\u3002": 'Alert colors show in three balance tiers (ok / low / overdrawn); speed colors show in three tiers (0-50 / 51-100 / 101+ tokens/s). You pick the "base color"; when rendered it blends with the current theme brand color into a vivid gradient \u2014 the gradient follows theme switches while the base color stays put.',
  "\u5DF2\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\u8272": "Reset to default colors",
  "\u91CD\u7F6E\u5168\u5C40\u8272": "Reset global colors",
  "\u5B57\u4F53": "Font",
  "\u4E09\u79CD\u6A21\u5F0F\uFF1A\u63D2\u4EF6\u56FA\u5B9A\u5B57\u4F53\uFF08\u8DE8\u5E73\u53F0\u4E00\u81F4\uFF09/ \u8DDF\u968F\u5BBF\u4E3B\u4E3B\u9898\u5B57\u4F53 / \u81EA\u5B9A\u4E49\uFF08\u4ECE\u7CFB\u7EDF\u5B57\u4F53\u5E93\u70B9\u9009\u5168\u5C40\u5B57\u4F53 + \u6A21\u578B\u540D/\u6570\u503C/\u6B63\u6587/\u6B21\u8981\u8BF4\u660E\u9010\u4F4D\u7F6E\u7EC6\u5316 + \u9010\u4F4D\u7F6E\u5B57\u4F53\u7C97\u7EC6 + \u672C\u673A\u53EF\u7528\u6027\u68C0\u6D4B\uFF09\u3002\u5B57\u4F53\u7F3A\u5931\u65F6\u81EA\u52A8\u9010\u7EA7\u56DE\u9000\uFF0C\u4EFB\u4F55\u7535\u8111\u90FD\u4E0D\u4F1A\u663E\u793A\u5F02\u5E38\u3002": "Three modes: plugin-fixed font (consistent across platforms) / follow the host theme font / custom (pick a global font from the system font library + per-position refinement for model name / value / body / secondary text + per-position font weight + availability check on this machine). Missing fonts fall back step by step, so no machine shows broken text.",
  "\u63D2\u4EF6\u56FA\u5B9A\u5B57\u4F53\uFF08\u9ED8\u8BA4\uFF09": "Plugin-fixed font (default)",
  "\u8DDF\u968F\u5BBF\u4E3B\u4E3B\u9898\u5B57\u4F53": "Follow host theme font",
  "\u81EA\u5B9A\u4E49\u5B57\u4F53": "Custom font",
  "\u5168\u5C40\u5B57\u4F53": "Global font",
  "\u9ED8\u8BA4\uFF08\u5185\u7F6E\u5B57\u4F53\u6808\uFF09": "Default (built-in font stack)",
  "\u91CD\u7F6E\u4E3A\u9ED8\u8BA4": "Reset to default",
  "\u6E05\u9664\u8BE5\u4F4D\u7F6E\u7684\u5B57\u4F53\u4E0E\u7C97\u7EC6\uFF0C\u56DE\u5230\u5168\u5C40\u8BBE\u7F6E": "Clear this position font and weight, back to global settings",
  "\u91CD\u7F6E\u4E3A\u5168\u5C40\u5B57\u4F53": "Reset to global font",
  "\u9884\u89C8\u6B63\u6587": "Preview body",
  "\u6A21\u578B\u540D": "Model name",
  "\u6B21\u8981\u8BF4\u660E \xB7 \u521A\u521A": "Secondary text \xB7 just now",
  "\u4E3B\u9898": "Theme",
  "\u9009\u62E9\u914D\u8272\u4E3B\u9898\uFF08\u5F39\u7A97\u53F3\u4E0A\u89D2\u80F6\u56CA + \u7528\u91CF\u5F39\u7A97\u914D\u8272\uFF09\uFF0C\u6D45\u8272\u7CFB\u5728\u524D\u3001\u6DF1\u8272\u7CFB\u5728\u540E\u3002\u6BCF\u4E2A\u4E3B\u9898\u4E0B\u53EF\u81EA\u5B9A\u4E49\u80F6\u56CA\u989C\u8272\u4E0E\u547C\u5438\u989C\u8272\uFF0C\u6539\u52A8\u5373\u65F6\u4FDD\u5B58\u5230\u672C\u673A\u3002": "Pick a color theme (capsule at the popup top-right + the usage popup colors); light themes first, dark themes last. Each theme can customize capsule and breathing colors; changes save to this device immediately.",
  "\u81EA\u5B9A\u4E49\u5F53\u524D\u4E3B\u9898\u7684\u989C\u8272\uFF08\u6BCF\u5957\u4E3B\u9898\u5DF2\u9884\u5236\u80F6\u56CA/\u547C\u5438/\u544A\u8B66/\u5B57\u4F53\u5206\u7C7B\u8272\uFF0C\u672A\u6539\u5219\u7528\u9884\u5236\u503C\uFF1B\u652F\u6301\u70B9\u9009\u8272\u677F\u6216\u624B\u8F93 #rrggbb\uFF09": "Customize the colors of the current theme (each theme ships preset capsule / breathing / alert / font-category colors; unedited ones use the presets; pick from the swatch palette or type #rrggbb)",
  "\u5DF2\u91CD\u7F6E\u4E3A\u9884\u5236\u914D\u8272": "Reset to the preset palette",
  "\u91CD\u7F6E\u8BE5\u4E3B\u9898\u4E3A\u9884\u5236\u914D\u8272": "Reset this theme to its preset palette",
  "\u63D0\u793A\uFF1A\u914D\u8272\u4FDD\u5B58\u5728\u6D4F\u89C8\u5668\u672C\u5730\uFF08localStorage\uFF09\uFF0C\u4E0D\u4F1A\u5199\u5165\u8BA1\u8D39\u6570\u636E\u6587\u4EF6\uFF0CDHS \u5347\u7EA7\u4E5F\u4E0D\u4F1A\u4E22\u5931\u3002": "Note: colors are stored in this browser (localStorage), never written to the billing data file, and survive DSH upgrades.",
  "\u8BBE\u7F6E\u9884\u8B66\uFF1ADeepSeek \u5B98\u65B9\u7528\u300C\u5B9E\u65F6\u4F59\u989D\u91D1\u989D\u300D\u6BD4\u5BF9\uFF1B\u5176\u4ED6\u6A21\u578B\u7528\u300C\u9884\u7B97\u767E\u5206\u6BD4\u300D\u3002": "Set alerts: DeepSeek official compares against the live balance amount; other models use the budget percentage.",
  "\u975B\u84DD\u9ECE\u660E\uFF08\u6D45\u8272\uFF09": "Indigo Dawn (light)",
  "\u78A7\u6D77\u6674\u7A7A\uFF08\u6D45\u8272\uFF09": "Azure Sky (light)",
  "\u7FE1\u7FE0\u9752\u7EFF\uFF08\u6D45\u8272\uFF09": "Jade Green (light)",
  "\u73AB\u7470\u9C9C\u7EA2\uFF08\u6D45\u8272\uFF09": "Rose Red (light)",
  "\u871C\u6843\u6D45\u7C89\uFF08\u6D45\u8272\uFF09": "Peach Pink (light)",
  "\u4E01\u9999\u8584\u96FE\uFF08\u6D45\u8272\uFF09": "Lilac Mist (light)",
  "\u7425\u73C0\u843D\u65E5\uFF08\u6D45\u8272\uFF09": "Amber Sunset (light)",
  "\u7C89\u5F69\u7D2B\u971E\uFF08\u6D45\u8272\uFF09": "Pastel Violet (light)",
  "\u590F\u65E5\u6D77\u6EE9\uFF08\u6D45\u8272\uFF09": "Summer Beach (light)",
  "\u6D77\u6D0B\u6E05\u98CE\uFF08\u6D45\u8272\uFF09": "Ocean Breeze (light)",
  "\u6797\u6EE9\u6653\u8272\uFF08\u9ED8\u8BA4\uFF0C\u6D45\u8272\uFF09": "Forest Shore (default, light)",
  "\u77F3\u677F\u7070\u8C03\uFF08\u4E2D\u6027\uFF09": "Slate Grey (neutral)",
  "\u5348\u591C\u6DF1\u84DD\uFF08\u6697\u9ED1\uFF09": "Midnight Blue (dark)",
  "\u6DF1\u6D77\u5E7D\u84DD\uFF08\u6697\u9ED1\uFF09": "Deep Ocean Blue (dark)",
  "\u68EE\u6797\u591C\u8272\uFF08\u6697\u9ED1\uFF09": "Forest Night (dark)",
  "\u661F\u591C\u7D2B\u5C9A\uFF08\u6697\u9ED1\uFF09": "Starry Night (dark)",
  "\u79D1\u6280\u672A\u6765\uFF08\u6697\u9ED1\uFF09": "Tech Future (dark)",
  "\u70ED\u5E26\u68EE\u6797\uFF08\u6697\u9ED1\uFF09": "Tropical Forest (dark)",
  "\u7ECF\u5178\u7EA2\u84DD\uFF08\u6697\u9ED1\uFF09": "Classic Red-Blue (dark)",
  "\u7D2B\u591C\u66D9\u5149\uFF08\u6697\u9ED1\uFF09": "Violet Dawn (dark)",
  "\u9884\u8B66\u989C\u8272\uFF08\u4F59\u989D\u8DB3\uFF09": "Alert color (balance ok)",
  "\u9884\u8B66\u989C\u8272\uFF08\u4F59\u989D\u4E0D\u8DB3\uFF09": "Alert color (balance low)",
  "\u9884\u8B66\u989C\u8272\uFF08\u900F\u652F\uFF09": "Alert color (overdrawn)",
  "\u80F6\u56CA\u4F59\u989D\u989C\u8272\uFF08\u4F59\u989D\u8DB3\uFF09": "Capsule balance color (sufficient)",
  "\u901F\u5EA6\u989C\u8272\uFF080-50 tokens/s\uFF09": "Speed color (0-50 tokens/s)",
  "\u901F\u5EA6\u989C\u8272\uFF0851-100 tokens/s\uFF09": "Speed color (51-100 tokens/s)",
  "\u901F\u5EA6\u989C\u8272\uFF08101+ tokens/s\uFF09": "Speed color (101+ tokens/s)",
  "\u80F6\u56CA\u989C\u8272\uFF08\u5CF0\u8C37\uFF09": "Capsule color (peak day)",
  "\u80F6\u56CA\u989C\u8272\uFF08\u975E\u5CF0\u8C37\uFF09": "Capsule color (non-peak day)",
  "\u547C\u5438\u989C\u8272\uFF08\u9AD8\u5CF0\uFF09": "Breathing color (peak)",
  "\u547C\u5438\u989C\u8272\uFF08\u4F4E\u8C37\uFF09": "Breathing color (off-peak)",
  "\u547C\u5438\u989C\u8272\uFF08\u975E\u5CF0\u8C37\uFF09": "Breathing color (non-peak)",
  "\u5B57\u4F53\u989C\u8272 \xB7 \u4E3B\u6587\u5B57": "Font color \xB7 main text",
  "\u5B57\u4F53\u989C\u8272 \xB7 \u6A21\u578B\u540D": "Font color \xB7 model name",
  "\u5B57\u4F53\u989C\u8272 \xB7 \u6570\u503C/\u91D1\u989D": "Font color \xB7 value / amount",
  "\u5B57\u4F53\u989C\u8272 \xB7 \u6B21\u8981\u8BF4\u660E": "Font color \xB7 secondary text",
  "\u7EC6\u4F53": "Thin",
  "\u5E38\u89C4": "Regular",
  "\u4E2D\u7B49": "Medium",
  "\u534A\u7C97": "Semi-bold",
  "\u7C97\u4F53": "Bold",
  "\u7279\u7C97": "Extra bold",
  "\u9ED1\u4F53": "Black",
  "\u6A21\u578B\u540D\uFF08\u80F6\u56CA / \u6807\u9898\uFF09": "Model name (capsule / title)",
  "\u6570\u503C / \u91D1\u989D": "Value / amount",
  "\u6B63\u6587\uFF08\u8BF4\u660E\u3001\u5217\u8868\uFF09": "Body (descriptions, lists)",
  "\u6B21\u8981\u8BF4\u660E\uFF08\u65F6\u95F4\u3001\u6765\u6E90\uFF09": "Secondary text (time, source)",
  "\u4F59\u989D\u9884\u8B66": "Balance alerts",
  "\u4E3B\u9898\u8BBE\u7F6E": "Theme settings",
  "\u6A21\u578B\u540E\u7F00\u8BC6\u522B": "Model suffix matching",
  "\u5CF0\u4EF7": "Peak price",
  "\u8C37\u4EF7": "Off-peak price",
  "--\u5E74--\u6708--\u65E5": "--/--/--",
  "YYYY\u5E74M\u6708D\u65E5": "M/D/YYYY",
  "\u65E5": "Sun",
  "\u4E00": "Mon",
  "\u4E8C": "Tue",
  "\u4E09": "Wed",
  "\u56DB": "Thu",
  "\u4E94": "Fri",
  "\u516D": "Sat",
  "\u7B2C {n} \u8F6E": "Round {n}",
  "\uFF08\u2717 \u672C\u673A\u672A\u88C5\uFF0C\u5C06\u56DE\u9000\uFF09": "(\u2717 not installed on this machine; will fall back)",
  "\uFF08\u5B98\u7F51\u4F59\u989D\u5237\u65B0\u6709\u5EF6\u8FDF\uFF09": "(official balance refresh may be delayed)",
  "\u5165": "in",
  "\u51FA": "out",
  "\u5982 0.5": "e.g. 0.5",
  "\u5982 ": "e.g. ",
  "\u9700\u6362\u7B97": "conversion needed",
  "\u4E00\u952E\u540C\u6B65\u5B98\u65B9\u4EF7\u683C": "Sync official prices",
  "\u540C\u6B65\u4E2D\u2026": "Syncing\u2026",
  "\u540C\u6B65\u5931\u8D25": "Sync failed",
  "\u540C\u6B65\u5931\u8D25\uFF1A\u5982\u679C\u521A\u521A\u5B89\u88C5\u6216\u66F4\u65B0\u8FC7\u672C\u63D2\u4EF6\uFF0C\u8BF7\u5148\u91CD\u542F dsh web \u518D\u8BD5": "Sync failed: if you just installed or updated this plugin, restart dsh web first and try again",
  "\u539F\u56E0\uFF1A": "Reason: ",
  "\u5B98\u65B9\u6A21\u578B ": "Official models ",
  " \u4E2A\uFF1A": " \u2014 ",
  "\u5B98\u7F51\u5B9A\u4EF7 ": "Site pricing ",
  "\u5DF2\u66F4\u65B0 ": "Updated ",
  "\u5B98\u7F51\u672A\u5B9A\u4EF7 ": "Not priced on site ",
  " \u6761\u8B66\u544A": " warning(s)",
  "\u8BF7\u5148\u586B\u5199\u4E0A\u65B9\u7684\u5168\u5C40 API Key\uFF0C\u518D\u540C\u6B65\u5B98\u65B9\u4EF7\u683C": "Please enter the global API Key above before syncing official prices",
  "\u4E0A\u6B21\u540C\u6B65 ": "Last synced "
};
function L(zhText) {
  return getLang() === "en" ? EN_BY_ZH[zhText] ?? zhText : zhText;
}

// src/billing.ts
function matchTypeId(p) {
  if (p === null) return "basic";
  if (p.discount !== void 0 && p.discount < 1) return "batch";
  if (p.combinedPerM !== void 0) return "combined";
  if (p.peak !== void 0 && p.offPeak !== void 0) return "peak-off-peak";
  if (p.cacheWritePerM !== void 0 && p.cacheReadPerM !== void 0) return "cache-write";
  if (p.cacheReadPerM !== void 0) return "cache-split";
  return "basic";
}

// src/theme.ts
var DEFAULT_CUSTOM = {
  pillFlat: "",
  pillPeak: "",
  ringFlat: "",
  ringPeak: "",
  ringOff: "",
  alertOk: "",
  alertNear: "",
  alertOver: "",
  textMain: "",
  textModel: "",
  textValue: "",
  textSub: ""
};
var THEMES = [
  // ── 1) 林滩晓色（默认，浅色）
  {
    id: "forest-beach-dawn",
    name: "\u6797\u6EE9\u6653\u8272\uFF08\u9ED8\u8BA4\uFF0C\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #e0f4fb 0%, #eef7fb 45%, #f7fafc 100%)",
    bgSoft: "#eef7fb",
    border: "rgba(56,127,182,0.35)",
    brand: "#387fb6",
    brand2: "#b33647",
    text: "#1f3a52",
    text2: "#4d6579",
    text3: "#8b9aa8",
    textMain: "#1f3a52",
    textModel: "#387fb6",
    textValue: "#b33647",
    textSub: "#8b9aa8",
    accent: "rgba(56,127,182,0.10)",
    card: "#ffffff",
    error: "#b33647",
    ok: "#639a72",
    pill: { flat: "rgba(201,205,208,0.35)", peak: "rgba(179,54,71,0.25)", ringFlat: "rgba(56,127,182,0.55)", ringPeak: "rgba(179,54,71,0.65)", ringOff: "rgba(215,235,206,0.60)" },
    palette: ["#387fb6", "#b33647", "#db7268", "#d7ebce", "#f8efb5", "#d9d5b6", "#c9cdd0", "#e0f4fb"],
    alert: { ok: "#639a72", near: "#db7268", over: "#b33647" },
    customDefault: { pillFlat: "#387fb6", pillPeak: "#7fb069", ringFlat: "#387fb6", ringPeak: "#7fb069", ringOff: "#c9cdd0", alertOk: "#639a72", alertNear: "#db7268", alertOver: "#b33647", textMain: "#1f3a52", textModel: "#387fb6", textValue: "#b33647", textSub: "#8b9aa8" }
  },
  // ── 2) 靛蓝黎明（浅色）
  {
    id: "indigo",
    name: "\u975B\u84DD\u9ECE\u660E\uFF08\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #e2ebff 0%, #f6f8ff 45%, #ffffff 100%)",
    bgSoft: "#f6f8ff",
    border: "rgba(77,107,254,0.35)",
    brand: "#4d6bfe",
    brand2: "#7c5cff",
    text: "#1f2328",
    text2: "#59636e",
    text3: "#8b949e",
    textMain: "#1f2328",
    textModel: "#4d6bfe",
    textValue: "#4d6bfe",
    textSub: "#8b949e",
    accent: "rgba(77,107,254,0.10)",
    card: "#ffffff",
    error: "#d1242f",
    ok: "#16a34a",
    pill: { flat: "rgba(77,107,254,0.18)", peak: "rgba(244,63,94,0.22)", ringFlat: "rgba(77,107,254,0.5)", ringPeak: "rgba(244,63,94,0.65)", ringOff: "rgba(22,163,74,0.60)" },
    palette: ["#4d6bfe", "#7c5cff", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#f97316", "#8b5cf6", "#14b8a6"],
    alert: { ok: "#16a34a", near: "#f59e0b", over: "#d1242f" },
    customDefault: { pillFlat: "#4d6bfe", pillPeak: "#4d6bfe", ringFlat: "#4d6bfe", ringPeak: "#4d6bfe", ringOff: "#7c8cf8", alertOk: "#16a34a", alertNear: "#f59e0b", alertOver: "#d1242f", textMain: "#1f2328", textModel: "#4d6bfe", textValue: "#4d6bfe", textSub: "#8b949e" }
  },
  // ── 3) 碧海晴空（浅色）
  {
    id: "cyan",
    name: "\u78A7\u6D77\u6674\u7A7A\uFF08\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #dcf6f9 0%, #f2fbfc 45%, #ffffff 100%)",
    bgSoft: "#f2fbfc",
    border: "rgba(16,138,172,0.35)",
    brand: "#0e8ba8",
    brand2: "#0ea5b7",
    text: "#10232a",
    text2: "#455a63",
    text3: "#7c9199",
    textMain: "#10232a",
    textModel: "#0e8ba8",
    textValue: "#0e8ba8",
    textSub: "#7c9199",
    accent: "rgba(14,139,168,0.10)",
    card: "#ffffff",
    error: "#d1242f",
    ok: "#0f766e",
    pill: { flat: "rgba(14,139,168,0.20)", peak: "rgba(236,72,153,0.22)", ringFlat: "rgba(14,139,168,0.55)", ringPeak: "rgba(236,72,153,0.65)", ringOff: "rgba(20,184,166,0.60)" },
    palette: ["#0e8ba8", "#0ea5b7", "#14b8a6", "#f59e0b", "#ec4899", "#22d3ee", "#06b6d4", "#f97316", "#6366f1", "#34d399"],
    alert: { ok: "#0f766e", near: "#f59e0b", over: "#d1242f" },
    customDefault: { pillFlat: "#0e8ba8", pillPeak: "#0e8ba8", ringFlat: "#0e8ba8", ringPeak: "#0e8ba8", ringOff: "#22b8cf", alertOk: "#0f766e", alertNear: "#f59e0b", alertOver: "#d1242f", textMain: "#10232a", textModel: "#0e8ba8", textValue: "#0e8ba8", textSub: "#7c9199" }
  },
  // ── 4) 翡翠青绿（浅色）
  {
    id: "emerald",
    name: "\u7FE1\u7FE0\u9752\u7EFF\uFF08\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #d9f2e4 0%, #f0faf4 45%, #ffffff 100%)",
    bgSoft: "#f0faf4",
    border: "rgba(16,149,104,0.35)",
    brand: "#0a9d63",
    brand2: "#10b981",
    text: "#10241c",
    text2: "#40584e",
    text3: "#759387",
    textMain: "#10241c",
    textModel: "#0a9d63",
    textValue: "#0a9d63",
    textSub: "#759387",
    accent: "rgba(10,157,99,0.10)",
    card: "#ffffff",
    error: "#d1242f",
    ok: "#0f766e",
    pill: { flat: "rgba(10,157,99,0.20)", peak: "rgba(217,70,239,0.22)", ringFlat: "rgba(10,157,99,0.55)", ringPeak: "rgba(217,70,239,0.60)", ringOff: "rgba(20,184,166,0.60)" },
    palette: ["#0a9d63", "#10b981", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4", "#ec4899", "#f97316", "#8b5cf6", "#14b8a6"],
    alert: { ok: "#0f766e", near: "#f59e0b", over: "#d1242f" },
    customDefault: { pillFlat: "#0a9d63", pillPeak: "#0a9d63", ringFlat: "#0a9d63", ringPeak: "#0a9d63", ringOff: "#16c878", alertOk: "#0f766e", alertNear: "#f59e0b", alertOver: "#d1242f", textMain: "#10241c", textModel: "#0a9d63", textValue: "#0a9d63", textSub: "#759387" }
  },
  // ── 5) 玫瑰鲜红（浅色）
  {
    id: "rose",
    name: "\u73AB\u7470\u9C9C\u7EA2\uFF08\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #fbe4e6 0%, #fdf2f3 45%, #ffffff 100%)",
    bgSoft: "#fdf2f3",
    border: "rgba(209,60,84,0.35)",
    brand: "#c94056",
    brand2: "#e4576b",
    text: "#2a1418",
    text2: "#5c4044",
    text3: "#8f777b",
    textMain: "#2a1418",
    textModel: "#c94056",
    textValue: "#c94056",
    textSub: "#8f777b",
    accent: "rgba(201,64,86,0.10)",
    card: "#ffffff",
    error: "#b71c2f",
    ok: "#0f766e",
    pill: { flat: "rgba(201,64,86,0.22)", peak: "rgba(124,58,237,0.22)", ringFlat: "rgba(201,64,86,0.55)", ringPeak: "rgba(124,58,237,0.60)", ringOff: "rgba(236,72,153,0.60)" },
    palette: ["#c94056", "#e4576b", "#f59e0b", "#16a34a", "#ef4444", "#06b6d4", "#7c3aed", "#f97316", "#8b5cf6", "#14b8a6"],
    alert: { ok: "#16a34a", near: "#f59e0b", over: "#b71c2f" },
    customDefault: { pillFlat: "#c94056", pillPeak: "#c94056", ringFlat: "#c94056", ringPeak: "#c94056", ringOff: "#e8798a", alertOk: "#16a34a", alertNear: "#f59e0b", alertOver: "#b71c2f", textMain: "#2a1418", textModel: "#c94056", textValue: "#c94056", textSub: "#8f777b" }
  },
  // ── 6) 蜜桃浅粉（浅色）
  {
    id: "peach",
    name: "\u871C\u6843\u6D45\u7C89\uFF08\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #fff1f0 0%, #fff7f5 45%, #ffffff 100%)",
    bgSoft: "#fff7f5",
    border: "rgba(255,138,128,0.35)",
    brand: "#ff6b6b",
    brand2: "#ff8e72",
    text: "#2a1a18",
    text2: "#5c4240",
    text3: "#8a7775",
    textMain: "#2a1a18",
    textModel: "#ff6b6b",
    textValue: "#ff6b6b",
    textSub: "#8a7775",
    accent: "rgba(255,107,107,0.10)",
    card: "#ffffff",
    error: "#d1242f",
    ok: "#16a34a",
    pill: { flat: "rgba(255,107,107,0.18)", peak: "rgba(217,70,239,0.22)", ringFlat: "rgba(255,107,107,0.55)", ringPeak: "rgba(217,70,239,0.65)", ringOff: "rgba(251,146,60,0.60)" },
    palette: ["#ff6b6b", "#ff8e72", "#fbbf24", "#34d399", "#ef4444", "#06b6d4", "#ec4899", "#f97316", "#a78bfa", "#14b8a6"],
    alert: { ok: "#16a34a", near: "#f59e0b", over: "#d1242f" },
    customDefault: { pillFlat: "#ff6b6b", pillPeak: "#ff6b6b", ringFlat: "#ff6b6b", ringPeak: "#ff6b6b", ringOff: "#ffa94d", alertOk: "#16a34a", alertNear: "#f59e0b", alertOver: "#d1242f", textMain: "#2a1a18", textModel: "#ff6b6b", textValue: "#ff6b6b", textSub: "#8a7775" }
  },
  // ── 7) 丁香薄雾（浅色）
  {
    id: "lavender",
    name: "\u4E01\u9999\u8584\u96FE\uFF08\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #efe9fd 0%, #f8f5ff 45%, #ffffff 100%)",
    bgSoft: "#f8f5ff",
    border: "rgba(146,116,225,0.35)",
    brand: "#8b6ce7",
    brand2: "#a78bfa",
    text: "#221a33",
    text2: "#4f4468",
    text3: "#837a9b",
    textMain: "#221a33",
    textModel: "#8b6ce7",
    textValue: "#8b6ce7",
    textSub: "#837a9b",
    accent: "rgba(139,108,231,0.10)",
    card: "#ffffff",
    error: "#d1242f",
    ok: "#16a34a",
    pill: { flat: "rgba(139,108,231,0.18)", peak: "rgba(236,72,153,0.22)", ringFlat: "rgba(139,108,231,0.55)", ringPeak: "rgba(236,72,153,0.65)", ringOff: "rgba(96,165,250,0.60)" },
    palette: ["#8b6ce7", "#a78bfa", "#fbbf24", "#34d399", "#f87171", "#22d3ee", "#f472b6", "#fb923c", "#60a5fa", "#2dd4bf"],
    alert: { ok: "#16a34a", near: "#f59e0b", over: "#d1242f" },
    customDefault: { pillFlat: "#8b6ce7", pillPeak: "#8b6ce7", ringFlat: "#8b6ce7", ringPeak: "#8b6ce7", ringOff: "#a78bfa", alertOk: "#16a34a", alertNear: "#f59e0b", alertOver: "#d1242f", textMain: "#221a33", textModel: "#8b6ce7", textValue: "#8b6ce7", textSub: "#837a9b" }
  },
  // ── 8) 琥珀落日（浅色）
  {
    id: "amber",
    name: "\u7425\u73C0\u843D\u65E5\uFF08\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #fbead7 0%, #fdf6ec 45%, #ffffff 100%)",
    bgSoft: "#fdf6ec",
    border: "rgba(190,132,52,0.35)",
    brand: "#b07817",
    brand2: "#d99c20",
    text: "#2a2113",
    text2: "#5f5340",
    text3: "#92876f",
    textMain: "#2a2113",
    textModel: "#b07817",
    textValue: "#b07817",
    textSub: "#92876f",
    accent: "rgba(176,120,23,0.10)",
    card: "#ffffff",
    error: "#b71c2f",
    ok: "#0f766e",
    pill: { flat: "rgba(190,132,52,0.22)", peak: "rgba(217,70,239,0.22)", ringFlat: "rgba(190,132,52,0.55)", ringPeak: "rgba(217,70,239,0.60)", ringOff: "rgba(176,120,23,0.65)" },
    palette: ["#b07817", "#d99c20", "#f59e0b", "#16a34a", "#ef4444", "#06b6d4", "#ec4899", "#dc2626", "#8b5cf6", "#14b8a6"],
    alert: { ok: "#0f766e", near: "#b45309", over: "#b71c2f" },
    customDefault: { pillFlat: "#b07817", pillPeak: "#b07817", ringFlat: "#b07817", ringPeak: "#b07817", ringOff: "#d99a2b", alertOk: "#0f766e", alertNear: "#b45309", alertOver: "#b71c2f", textMain: "#2a2113", textModel: "#b07817", textValue: "#b07817", textSub: "#92876f" }
  },
  // ── 9) 粉彩紫霞（浅色）
  {
    id: "pastel-purple-haze",
    name: "\u7C89\u5F69\u7D2B\u971E\uFF08\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #f7dfd7 0%, #f9e8e3 45%, #fdf6f4 100%)",
    bgSoft: "#f9e8e3",
    border: "rgba(235,104,123,0.35)",
    brand: "#eb687b",
    brand2: "#f1837b",
    text: "#4a4458",
    text2: "#7a7488",
    text3: "#9d97ae",
    textMain: "#4a4458",
    textModel: "#eb687b",
    textValue: "#c5304a",
    textSub: "#9d97ae",
    accent: "rgba(235,104,123,0.10)",
    card: "#ffffff",
    error: "#c5304a",
    ok: "#6b5f7a",
    pill: { flat: "rgba(182,179,214,0.28)", peak: "rgba(235,104,123,0.22)", ringFlat: "rgba(182,179,214,0.60)", ringPeak: "rgba(235,104,123,0.65)", ringOff: "rgba(246,179,160,0.60)" },
    palette: ["#eb687b", "#f1837b", "#f6b3a0", "#b6b3d6", "#d0cce5", "#f7dfd7", "#d5d3df", "#d6d1d1"],
    alert: { ok: "#6b5f7a", near: "#f6b3a0", over: "#c5304a" },
    customDefault: { pillFlat: "#eb687b", pillPeak: "#c5304a", ringFlat: "#eb687b", ringPeak: "#c5304a", ringOff: "#f1837b", alertOk: "#6b5f7a", alertNear: "#f6b3a0", alertOver: "#c5304a", textMain: "#4a4458", textModel: "#eb687b", textValue: "#c5304a", textSub: "#9d97ae" }
  },
  // ── 10) 夏日海滩（浅色）
  {
    id: "summer-beach",
    name: "\u590F\u65E5\u6D77\u6EE9\uFF08\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #ffcd92 0%, #fff0d9 45%, #fffaf3 100%)",
    bgSoft: "#fff0d9",
    border: "rgba(59,156,200,0.35)",
    brand: "#3b9cc8",
    brand2: "#65bddf",
    text: "#27404a",
    text2: "#55707b",
    text3: "#86a2ad",
    textMain: "#27404a",
    textModel: "#3b9cc8",
    textValue: "#d94f55",
    textSub: "#86a2ad",
    accent: "rgba(59,156,200,0.10)",
    card: "#ffffff",
    error: "#d94f55",
    ok: "#4d9b6e",
    pill: { flat: "rgba(101,189,223,0.28)", peak: "rgba(253,117,122,0.22)", ringFlat: "rgba(59,156,200,0.55)", ringPeak: "rgba(253,117,122,0.65)", ringOff: "rgba(176,215,170,0.60)" },
    palette: ["#3b9cc8", "#65bddf", "#fd757a", "#fa805e", "#fba270", "#ffcd92", "#b0d7aa", "#fce198"],
    alert: { ok: "#4d9b6e", near: "#fba270", over: "#fd757a" },
    customDefault: { pillFlat: "#3b9cc8", pillPeak: "#3b9cc8", ringFlat: "#3b9cc8", ringPeak: "#3b9cc8", ringOff: "#65bddf", alertOk: "#4d9b6e", alertNear: "#fba270", alertOver: "#fd757a", textMain: "#27404a", textModel: "#3b9cc8", textValue: "#d94f55", textSub: "#86a2ad" }
  },
  // ── 11) 海洋清风（浅色）
  {
    id: "ocean-breeze",
    name: "\u6D77\u6D0B\u6E05\u98CE\uFF08\u6D45\u8272\uFF09",
    bg: "linear-gradient(180deg, #bfdfd2 0%, #e4f2ec 45%, #f7fbf8 100%)",
    bgSoft: "#e4f2ec",
    border: "rgba(64,152,172,0.35)",
    brand: "#4098ac",
    brand2: "#7cc0ce",
    text: "#21444a",
    text2: "#4f6f75",
    text3: "#84a0a6",
    textMain: "#21444a",
    textModel: "#4098ac",
    textValue: "#c9552e",
    textSub: "#84a0a6",
    accent: "rgba(64,152,172,0.10)",
    card: "#ffffff",
    error: "#c9552e",
    ok: "#53999d",
    pill: { flat: "rgba(124,192,206,0.30)", peak: "rgba(236,142,90,0.22)", ringFlat: "rgba(64,152,172,0.55)", ringPeak: "rgba(236,142,90,0.65)", ringOff: "rgba(220,201,146,0.60)" },
    palette: ["#4098ac", "#7cc0ce", "#53999d", "#ec8e5a", "#ec9e59", "#ecb66b", "#dcc992", "#bfdfd2"],
    alert: { ok: "#53999d", near: "#ecb66b", over: "#ec8e5a" },
    customDefault: { pillFlat: "#4098ac", pillPeak: "#4098ac", ringFlat: "#4098ac", ringPeak: "#4098ac", ringOff: "#7cc0ce", alertOk: "#53999d", alertNear: "#ecb66b", alertOver: "#ec8e5a", textMain: "#21444a", textModel: "#4098ac", textValue: "#c9552e", textSub: "#84a0a6" }
  },
  // ── 12) 石板灰调（中性）
  {
    id: "slate",
    name: "\u77F3\u677F\u7070\u8C03\uFF08\u4E2D\u6027\uFF09",
    bg: "linear-gradient(180deg, #e7e9ed 0%, #f6f7f9 45%, #ffffff 100%)",
    bgSoft: "#f6f7f9",
    border: "rgba(100,116,139,0.35)",
    brand: "#5b6b7f",
    brand2: "#8294ab",
    text: "#1c2127",
    text2: "#5a636e",
    text3: "#8a929c",
    textMain: "#1c2127",
    textModel: "#5b6b7f",
    textValue: "#5b6b7f",
    textSub: "#8a929c",
    accent: "rgba(91,107,127,0.10)",
    card: "#ffffff",
    error: "#b91c1c",
    ok: "#15803d",
    pill: { flat: "rgba(100,116,139,0.20)", peak: "rgba(220,38,38,0.22)", ringFlat: "rgba(100,116,139,0.55)", ringPeak: "rgba(220,38,38,0.60)", ringOff: "rgba(100,116,139,0.65)" },
    palette: ["#5b6b7f", "#8294ab", "#f59e0b", "#16a34a", "#ef4444", "#06b6d4", "#ec4899", "#dc2626", "#8b5cf6", "#14b8a6"],
    alert: { ok: "#15803d", near: "#f59e0b", over: "#b91c1c" },
    customDefault: { pillFlat: "#5b6b7f", pillPeak: "#5b6b7f", ringFlat: "#5b6b7f", ringPeak: "#5b6b7f", ringOff: "#94a3b8", alertOk: "#15803d", alertNear: "#f59e0b", alertOver: "#b91c1c", textMain: "#1c2127", textModel: "#5b6b7f", textValue: "#5b6b7f", textSub: "#8a929c" }
  },
  // ── 13) 午夜深蓝（暗黑）
  {
    id: "midnight",
    name: "\u5348\u591C\u6DF1\u84DD\uFF08\u6697\u9ED1\uFF09",
    bg: "linear-gradient(180deg, #141a2b 0%, #1b2236 45%, #232a42 100%)",
    bgSoft: "#1b2236",
    border: "rgba(129,140,248,0.35)",
    brand: "#7c8cf8",
    brand2: "#a78bfa",
    text: "#e8ecf6",
    text2: "#aab3cf",
    text3: "#7c86a6",
    textMain: "#e8ecf6",
    textModel: "#7c8cf8",
    textValue: "#7c8cf8",
    textSub: "#7c86a6",
    accent: "rgba(124,140,248,0.12)",
    card: "#232a42",
    error: "#f87171",
    ok: "#34d399",
    pill: { flat: "rgba(124,140,248,0.20)", peak: "rgba(244,114,182,0.22)", ringFlat: "rgba(124,140,248,0.55)", ringPeak: "rgba(244,114,182,0.65)", ringOff: "rgba(52,211,153,0.60)" },
    palette: ["#7c8cf8", "#a78bfa", "#fbbf24", "#34d399", "#f87171", "#22d3ee", "#f472b6", "#fb923c", "#c4b5fd", "#2dd4bf"],
    alert: { ok: "#34d399", near: "#fbbf24", over: "#f87171" },
    customDefault: { pillFlat: "#7c8cf8", pillPeak: "#7c8cf8", ringFlat: "#7c8cf8", ringPeak: "#7c8cf8", ringOff: "#a5b4fc", alertOk: "#34d399", alertNear: "#fbbf24", alertOver: "#f87171", textMain: "#e8ecf6", textModel: "#7c8cf8", textValue: "#7c8cf8", textSub: "#7c86a6" }
  },
  // ── 14) 深海幽蓝（暗黑）
  {
    id: "ocean",
    name: "\u6DF1\u6D77\u5E7D\u84DD\uFF08\u6697\u9ED1\uFF09",
    bg: "linear-gradient(180deg, #0e1a26 0%, #14252f 45%, #1c2f3a 100%)",
    bgSoft: "#14252f",
    border: "rgba(56,189,248,0.35)",
    brand: "#38bdf8",
    brand2: "#22d3ee",
    text: "#e2f1f8",
    text2: "#9fc3d3",
    text3: "#6f93a4",
    textMain: "#e2f1f8",
    textModel: "#38bdf8",
    textValue: "#38bdf8",
    textSub: "#6f93a4",
    accent: "rgba(56,189,248,0.12)",
    card: "#1c2f3a",
    error: "#fb7185",
    ok: "#2dd4bf",
    pill: { flat: "rgba(56,189,248,0.22)", peak: "rgba(244,114,182,0.24)", ringFlat: "rgba(56,189,248,0.55)", ringPeak: "rgba(244,114,182,0.65)", ringOff: "rgba(45,212,191,0.60)" },
    palette: ["#38bdf8", "#22d3ee", "#fbbf24", "#2dd4bf", "#fb7185", "#60a5fa", "#f472b6", "#fb923c", "#a78bfa", "#34d399"],
    alert: { ok: "#2dd4bf", near: "#fbbf24", over: "#fb7185" },
    customDefault: { pillFlat: "#38bdf8", pillPeak: "#38bdf8", ringFlat: "#38bdf8", ringPeak: "#38bdf8", ringOff: "#7dd3fc", alertOk: "#2dd4bf", alertNear: "#fbbf24", alertOver: "#fb7185", textMain: "#e2f1f8", textModel: "#38bdf8", textValue: "#38bdf8", textSub: "#6f93a4" }
  },
  // ── 15) 森林夜色（暗黑）
  {
    id: "forest",
    name: "\u68EE\u6797\u591C\u8272\uFF08\u6697\u9ED1\uFF09",
    bg: "linear-gradient(180deg, #0f1f16 0%, #16291e 45%, #1f3527 100%)",
    bgSoft: "#16291e",
    border: "rgba(52,211,153,0.35)",
    brand: "#34d399",
    brand2: "#6ee7b7",
    text: "#e3f4ec",
    text2: "#9fc9b2",
    text3: "#6e9480",
    textMain: "#e3f4ec",
    textModel: "#34d399",
    textValue: "#34d399",
    textSub: "#6e9480",
    accent: "rgba(52,211,153,0.12)",
    card: "#1f3527",
    error: "#fb7185",
    ok: "#4ade80",
    pill: { flat: "rgba(52,211,153,0.22)", peak: "rgba(244,114,182,0.24)", ringFlat: "rgba(52,211,153,0.55)", ringPeak: "rgba(244,114,182,0.65)", ringOff: "rgba(74,222,128,0.60)" },
    palette: ["#34d399", "#6ee7b7", "#fbbf24", "#4ade80", "#fb7185", "#22d3ee", "#f472b6", "#fb923c", "#86efac", "#2dd4bf"],
    alert: { ok: "#4ade80", near: "#fbbf24", over: "#fb7185" },
    customDefault: { pillFlat: "#34d399", pillPeak: "#34d399", ringFlat: "#34d399", ringPeak: "#34d399", ringOff: "#6ee7b7", alertOk: "#4ade80", alertNear: "#fbbf24", alertOver: "#fb7185", textMain: "#e3f4ec", textModel: "#34d399", textValue: "#34d399", textSub: "#6e9480" }
  },
  // ── 16) 星夜紫岚（暗黑）
  {
    id: "grape",
    name: "\u661F\u591C\u7D2B\u5C9A\uFF08\u6697\u9ED1\uFF09",
    bg: "linear-gradient(180deg, #1c1530 0%, #241a3c 45%, #2d2249 100%)",
    bgSoft: "#241a3c",
    border: "rgba(196,181,253,0.35)",
    brand: "#a78bfa",
    brand2: "#c4b5fd",
    text: "#eee9fb",
    text2: "#b6aad6",
    text3: "#8a7cb2",
    textMain: "#eee9fb",
    textModel: "#a78bfa",
    textValue: "#a78bfa",
    textSub: "#8a7cb2",
    accent: "rgba(167,139,250,0.14)",
    card: "#2d2249",
    error: "#f87171",
    ok: "#34d399",
    pill: { flat: "rgba(167,139,250,0.22)", peak: "rgba(244,114,182,0.24)", ringFlat: "rgba(167,139,250,0.55)", ringPeak: "rgba(244,114,182,0.65)", ringOff: "rgba(52,211,153,0.60)" },
    palette: ["#a78bfa", "#c4b5fd", "#fbbf24", "#34d399", "#f87171", "#22d3ee", "#f472b6", "#fb923c", "#818cf8", "#2dd4bf"],
    alert: { ok: "#34d399", near: "#fbbf24", over: "#f87171" },
    customDefault: { pillFlat: "#a78bfa", pillPeak: "#a78bfa", ringFlat: "#a78bfa", ringPeak: "#a78bfa", ringOff: "#c4b5fd", alertOk: "#34d399", alertNear: "#fbbf24", alertOver: "#f87171", textMain: "#eee9fb", textModel: "#a78bfa", textValue: "#a78bfa", textSub: "#8a7cb2" }
  },
  // ══ 以下 8 套主题来自 palettes.json 提取配色（开发者本地开发产物，8 组，2026-07 新增）。
  //    身份色（胶囊/呼吸/品牌/字体分类）= 每组配色的原色；中性色 = 同色系深浅变体。
  // ── 17) 科技未来（暗黑）
  {
    id: "tech-future",
    name: "\u79D1\u6280\u672A\u6765\uFF08\u6697\u9ED1\uFF09",
    bg: "linear-gradient(180deg, #25012e 0%, #2c0a3d 45%, #1e1236 100%)",
    bgSoft: "#2c0a3d",
    border: "rgba(48,160,131,0.40)",
    brand: "#30a083",
    brand2: "#51be64",
    text: "#d9f2e4",
    text2: "#9fc4b4",
    text3: "#7fa398",
    textMain: "#d9f2e4",
    textModel: "#51be64",
    textValue: "#f8e520",
    textSub: "#7fa398",
    accent: "rgba(48,160,131,0.14)",
    card: "#33114a",
    error: "#f8e520",
    ok: "#51be64",
    pill: { flat: "rgba(43,125,143,0.30)", peak: "rgba(248,229,32,0.22)", ringFlat: "rgba(48,160,131,0.60)", ringPeak: "rgba(248,229,32,0.70)", ringOff: "rgba(81,190,100,0.60)" },
    palette: ["#30a083", "#51be64", "#9ed73f", "#f8e520", "#2b7d8f", "#365d8d", "#3f387e", "#430258"],
    alert: { ok: "#51be64", near: "#9ed73f", over: "#f8e520" },
    customDefault: { pillFlat: "#30a083", pillPeak: "#f8e520", ringFlat: "#30a083", ringPeak: "#f8e520", ringOff: "#51be64", alertOk: "#51be64", alertNear: "#9ed73f", alertOver: "#f8e520", textMain: "#d9f2e4", textModel: "#51be64", textValue: "#f8e520", textSub: "#7fa398" }
  },
  // ── 18) 热带森林（暗黑）
  {
    id: "tropical-forest",
    name: "\u70ED\u5E26\u68EE\u6797\uFF08\u6697\u9ED1\uFF09",
    bg: "linear-gradient(180deg, #16303a 0%, #1d3d45 45%, #24464b 100%)",
    bgSoft: "#1d3d45",
    border: "rgba(96,170,132,0.40)",
    brand: "#248d82",
    brand2: "#60aa84",
    text: "#e0efe6",
    text2: "#a3c2b3",
    text3: "#7f9c93",
    textMain: "#e0efe6",
    textModel: "#60aa84",
    textValue: "#f1a464",
    textSub: "#7f9c93",
    accent: "rgba(36,141,130,0.14)",
    card: "#24464b",
    error: "#e56d4e",
    ok: "#60aa84",
    pill: { flat: "rgba(96,170,132,0.25)", peak: "rgba(229,109,78,0.25)", ringFlat: "rgba(36,141,130,0.60)", ringPeak: "rgba(229,109,78,0.65)", ringOff: "rgba(180,184,127,0.60)" },
    palette: ["#248d82", "#60aa84", "#e56d4e", "#f1a464", "#eabc6b", "#b4b87f", "#407a7f", "#264a56"],
    alert: { ok: "#60aa84", near: "#eabc6b", over: "#e56d4e" },
    customDefault: { pillFlat: "#60aa84", pillPeak: "#e56d4e", ringFlat: "#248d82", ringPeak: "#e56d4e", ringOff: "#4a9e8c", alertOk: "#60aa84", alertNear: "#eabc6b", alertOver: "#e56d4e", textMain: "#e0efe6", textModel: "#60aa84", textValue: "#f1a464", textSub: "#7f9c93" }
  },
  // ── 19) 经典红蓝（暗黑）
  {
    id: "classic-redblue",
    name: "\u7ECF\u5178\u7EA2\u84DD\uFF08\u6697\u9ED1\uFF09",
    bg: "linear-gradient(180deg, #152e38 0%, #1a3a48 45%, #1f4353 100%)",
    bgSoft: "#1a3a48",
    border: "rgba(81,149,194,0.40)",
    brand: "#5195c2",
    brand2: "#2d5a74",
    text: "#e6eef4",
    text2: "#a9bfcf",
    text3: "#7f95a3",
    textMain: "#e6eef4",
    textModel: "#5195c2",
    textValue: "#eab3a4",
    textSub: "#7f95a3",
    accent: "rgba(81,149,194,0.14)",
    card: "#1f4353",
    error: "#c3333b",
    ok: "#b6b6b2",
    pill: { flat: "rgba(45,90,116,0.35)", peak: "rgba(195,51,59,0.30)", ringFlat: "rgba(81,149,194,0.60)", ringPeak: "rgba(195,51,59,0.70)", ringOff: "rgba(234,179,164,0.55)" },
    palette: ["#5195c2", "#2d5a74", "#c3333b", "#a00514", "#7c0302", "#eab3a4", "#b6b6b2", "#224e5d"],
    alert: { ok: "#b6b6b2", near: "#eab3a4", over: "#c3333b" },
    customDefault: { pillFlat: "#5195c2", pillPeak: "#c3333b", ringFlat: "#5195c2", ringPeak: "#c3333b", ringOff: "#6fb3d6", alertOk: "#b6b6b2", alertNear: "#eab3a4", alertOver: "#c3333b", textMain: "#e6eef4", textModel: "#5195c2", textValue: "#eab3a4", textSub: "#7f95a3" }
  },
  // ── 20) 紫夜曙光（暗黑）
  {
    id: "purple-night-dawn",
    name: "\u7D2B\u591C\u66D9\u5149\uFF08\u6697\u9ED1\uFF09",
    bg: "linear-gradient(180deg, #0d0238 0%, #1a0554 45%, #26086b 100%)",
    bgSoft: "#1a0554",
    border: "rgba(252,180,51,0.35)",
    brand: "#f08946",
    brand2: "#c5437a",
    text: "#efe6f7",
    text2: "#bda8d4",
    text3: "#907aa8",
    textMain: "#efe6f7",
    textModel: "#f08946",
    textValue: "#fcb433",
    textSub: "#907aa8",
    accent: "rgba(252,180,51,0.12)",
    card: "#26086b",
    error: "#dd6462",
    ok: "#fcb433",
    pill: { flat: "rgba(163,31,151,0.30)", peak: "rgba(240,137,70,0.25)", ringFlat: "rgba(163,31,151,0.60)", ringPeak: "rgba(240,137,70,0.70)", ringOff: "rgba(252,180,51,0.55)" },
    palette: ["#f08946", "#fcb433", "#c5437a", "#dd6462", "#a31f97", "#7907a8", "#4b03a1", "#170489"],
    alert: { ok: "#fcb433", near: "#f08946", over: "#dd6462" },
    customDefault: { pillFlat: "#8a5cf5", pillPeak: "#f08946", ringFlat: "#8a5cf5", ringPeak: "#f08946", ringOff: "#fcb433", alertOk: "#fcb433", alertNear: "#f08946", alertOver: "#dd6462", textMain: "#efe6f7", textModel: "#f08946", textValue: "#fcb433", textSub: "#907aa8" }
  }
];
function withAlpha(color, alpha) {
  const c = (color ?? "").trim();
  const a = Math.max(0, Math.min(1, alpha));
  const hex = /^#([0-9a-f]{6})$/i.exec(c);
  if (hex !== null) {
    const n = parseInt(hex[1], 16);
    return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${a})`;
  }
  const short = /^#([0-9a-f]{3})$/i.exec(c);
  if (short !== null) {
    const r = parseInt(short[1][0] + short[1][0], 16);
    const g = parseInt(short[1][1] + short[1][1], 16);
    const b = parseInt(short[1][2] + short[1][2], 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(c);
  if (rgba !== null) {
    const parts = rgba[1].split(",").map((s) => s.trim());
    if (parts.length >= 3) return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
  }
  return c;
}
function resolveTheme(theme, custom) {
  const fallback = theme.customDefault;
  const pick = (val, defaultVal, ultimateFallback) => val && val.trim() !== "" ? val : defaultVal && defaultVal.trim() !== "" ? defaultVal : ultimateFallback;
  return {
    ...theme,
    pill: {
      flat: pick(custom.pillFlat, fallback.pillFlat, theme.pill.flat),
      peak: pick(custom.pillPeak, fallback.pillPeak, theme.pill.peak),
      ringFlat: pick(custom.ringFlat, fallback.ringFlat, theme.pill.ringFlat),
      ringPeak: pick(custom.ringPeak, fallback.ringPeak, theme.pill.ringPeak),
      ringOff: pick(custom.ringOff, fallback.ringOff, theme.pill.ringOff)
    },
    alert: {
      ok: pick(custom.alertOk, fallback.alertOk, theme.alert.ok),
      near: pick(custom.alertNear, fallback.alertNear, theme.alert.near),
      over: pick(custom.alertOver, fallback.alertOver, theme.alert.over)
    },
    // 字体四分类：用户自定义 → 主题预制 → 主题基础文字色
    textMain: pick(custom.textMain, fallback.textMain, theme.textMain),
    textModel: pick(custom.textModel, fallback.textModel, theme.textModel),
    textValue: pick(custom.textValue, fallback.textValue, theme.textValue),
    textSub: pick(custom.textSub, fallback.textSub, theme.textSub)
  };
}
function themeOf(id) {
  const found = THEMES.find((t2) => t2.id === id);
  return found ?? THEMES[0];
}
var THEME_KEY = "um-theme";
var THEME_CHANGE_EVENT = "um-theme-change";
function defaultThemeState() {
  return { id: THEMES[0].id, custom: {} };
}
function getThemeState() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === null) return defaultThemeState();
    const d = JSON.parse(raw);
    return { id: themeOf(d?.id).id, custom: d?.custom && typeof d.custom === "object" ? d.custom : {} };
  } catch {
    return defaultThemeState();
  }
}
function setThemeState(state) {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(state));
  } catch {
  }
  try {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
  } catch {
  }
}
var THEME_CHANGE = THEME_CHANGE_EVENT;

// src/globals.ts
var DEFAULT_GLOBAL_COLORS = {
  alertOk: "#16a34a",
  alertNear: "#f59e0b",
  alertOver: "#d1242f",
  balanceOk: "#22c55e",
  speedLow: "#e5ad1f",
  speedMid: "#0ac749",
  speedHi: "#6d3be3"
};
var KEY = "um-global-colors";
var CHANGE = "um-global-colors-change";
function getGlobalColors() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return { ...DEFAULT_GLOBAL_COLORS };
    const d = JSON.parse(raw);
    return { ...DEFAULT_GLOBAL_COLORS, ...d ?? {} };
  } catch {
    return { ...DEFAULT_GLOBAL_COLORS };
  }
}
function setGlobalColors(g) {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE));
  } catch {
  }
}
var GLOBAL_COLORS_CHANGE = CHANGE;
function lightenHex(color, factor) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (m === null) return color;
  const hex = m[1];
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const num = parseInt(full, 16);
  const mix = (v) => Math.max(0, Math.min(255, Math.round(v + (255 - v) * factor)));
  const r = mix(num >> 16 & 255);
  const g = mix(num >> 8 & 255);
  const b = mix(num & 255);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}
var PLUGIN_FONT_STACK = '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", "WenQuanYi Micro Hei", system-ui, -apple-system, sans-serif';
var HOST_FONT_STACK = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
var FONT_CUSTOM_DEFAULT = {
  global: "",
  model: "",
  value: "",
  body: "",
  sub: "",
  weightGlobal: "",
  weightModel: "",
  weightValue: "",
  weightBody: "",
  weightSub: ""
};
var FONT_KEY = "um-font-mode";
var FONT_CUSTOM_KEY = "um-font-custom";
var FONT_CHANGE = "um-font-change";
function getFontMode() {
  try {
    const v = localStorage.getItem(FONT_KEY);
    return v === "host" ? "host" : v === "custom" ? "custom" : "plugin";
  } catch {
    return "plugin";
  }
}
function setFontMode(m) {
  try {
    localStorage.setItem(FONT_KEY, m);
  } catch {
  }
  try {
    window.dispatchEvent(new CustomEvent(FONT_CHANGE));
  } catch {
  }
}
function getFontCustom() {
  try {
    const raw = localStorage.getItem(FONT_CUSTOM_KEY);
    if (!raw) return { ...FONT_CUSTOM_DEFAULT };
    const p = JSON.parse(raw);
    const s = (v) => typeof v === "string" ? v : "";
    return {
      global: s(p.global),
      model: s(p.model),
      value: s(p.value),
      body: s(p.body),
      sub: s(p.sub),
      weightGlobal: s(p.weightGlobal),
      weightModel: s(p.weightModel),
      weightValue: s(p.weightValue),
      weightBody: s(p.weightBody),
      weightSub: s(p.weightSub)
    };
  } catch {
    return { ...FONT_CUSTOM_DEFAULT };
  }
}
function setFontCustom(c) {
  try {
    localStorage.setItem(FONT_CUSTOM_KEY, JSON.stringify(c));
  } catch {
  }
  try {
    window.dispatchEvent(new CustomEvent(FONT_CHANGE));
  } catch {
  }
}
function fontStackOf(mode, custom) {
  if (mode === "custom") return (custom?.global || "").trim() || PLUGIN_FONT_STACK;
  return mode === "host" ? HOST_FONT_STACK : PLUGIN_FONT_STACK;
}
function fontStackForCategory(mode, custom, cat) {
  if (mode === "custom") {
    const pos = (custom[cat] || "").trim();
    if (pos) return pos;
    const g = (custom.global || "").trim();
    if (g) return g;
  }
  return fontStackOf(mode);
}
var FONT_WEIGHT_OPTIONS = [
  ["", "\u9ED8\u8BA4"],
  ["300", "\u7EC6\u4F53"],
  ["400", "\u5E38\u89C4"],
  ["500", "\u4E2D\u7B49"],
  ["600", "\u534A\u7C97"],
  ["700", "\u7C97\u4F53"],
  ["800", "\u7279\u7C97"],
  ["900", "\u9ED1\u4F53"]
];
function fontWeightForCategory(mode, custom, cat) {
  if (mode !== "custom") return "";
  const w = (cat === "model" ? custom.weightModel : cat === "value" ? custom.weightValue : cat === "body" ? custom.weightBody : custom.weightSub) || "";
  const t2 = w.trim();
  if (t2) return t2;
  return (custom.weightGlobal || "").trim();
}
var COMMON_SYSTEM_FONTS = [
  "Segoe UI",
  "Microsoft YaHei",
  "Microsoft YaHei UI",
  "DengXian",
  "SimSun",
  "SimHei",
  "KaiTi",
  "FangSong",
  "Noto Sans SC",
  "Source Han Sans SC",
  "PingFang SC",
  "Hiragino Sans GB",
  "STSong",
  "STHeiti",
  "Arial",
  "Helvetica Neue",
  "Verdana",
  "Tahoma",
  "Calibri",
  "Cambria",
  "Georgia",
  "Times New Roman",
  "Trebuchet MS",
  "Consolas",
  "Courier New",
  "Monaco",
  "Menlo",
  "SF Mono",
  "Meiryo",
  "Yu Gothic"
];
function isFontAvailable(stack) {
  try {
    const first = (stack || "").trim().split(",")[0].trim();
    const name = first.replace(/^"(.*)"$/, "$1");
    if (!name) return false;
    return document.fonts?.check?.(`12px "${name}"`) === true;
  } catch {
    return false;
  }
}
function normalizeHex(raw) {
  let s = raw.trim().toLowerCase();
  if (s.startsWith("#")) s = s.slice(1);
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`;
  if (/^[0-9a-f]{3}$/.test(s)) return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  return null;
}
var FONT_MODE_CHANGE = FONT_CHANGE;
function estTokens(text) {
  let cjk = 0;
  let other = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 12288 && cp <= 40959 || cp >= 63744 && cp <= 64255 || cp >= 65281 && cp <= 65376) cjk += 1;
    else other += 1;
  }
  return Math.ceil(cjk + other / 4);
}
var RATE_WINDOW_MS = 3e3;
function tokenRateOf(samples, now) {
  while (samples.length > 0 && now - samples[0].at > RATE_WINDOW_MS) samples.shift();
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const elapsed = (last.at - first.at) / 1e3;
  const tokens = last.total - first.total;
  return elapsed >= 0.3 && tokens > 0 ? tokens / elapsed : null;
}
function liveOutputRate(client, server, now) {
  return tokenRateOf(client, now) ?? tokenRateOf(server, now);
}

// src/client.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var inject = ["slots"];
var NOOP_USE_CHAT = (sel) => sel({});
var NOOP_USE_PROJECTION = (_key) => void 0;
function readOptionalService(ctx, name) {
  const c = ctx;
  if (typeof c.get === "function") {
    try {
      return c.get(name);
    } catch {
    }
  }
  try {
    return c[name];
  } catch {
    return void 0;
  }
}
function apply(ctx) {
  ctx.slots.inject(
    "conversation.composer.dock",
    () => ctx.slots.register(
      { name: "conversation.composer.dock", id: "usage-meter.readout", order: 20 },
      UsageReadout
    )
  );
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      { name: "settings.section", id: "usage-meter", order: 20, label: () => L("\u7528\u91CF\u8BA1\u91CF") },
      UsageMeterSettingsSection
    )
  );
  const shellLocaleService = readOptionalService(ctx, "locale");
  if (shellLocaleService) {
    setShellLocaleProvider(() => shellLocaleService.getLocale().active === "en" ? "en" : "zh");
    ctx.on("locale/change", () => {
      try {
        window.dispatchEvent(new CustomEvent("um-lang-change"));
      } catch {
      }
    });
  }
}
var t = {
  // 字体四分类：主文字 / 模型名 / 数值金额 / 次要说明（每类可由主题或用户自定义覆盖）
  text: "var(--um-textMain, var(--dsw-alias-label-primary, #1f2328))",
  text2: "var(--um-text2, var(--dsw-alias-label-secondary, #59636e))",
  text3: "var(--um-textSub, var(--dsw-alias-label-tertiary, #8b949e))",
  model: "var(--um-textModel, var(--dsw-alias-brand-primary, #4d6bfe))",
  value: "var(--um-textValue, var(--dsw-alias-brand-primary, #4d6bfe))",
  brand: "var(--um-brand, var(--dsw-alias-brand-primary, #4d6bfe))",
  error: "var(--um-error, var(--dsw-alias-label-error, #d1242f))",
  ok: "var(--um-ok, var(--dsw-alias-label-success, #16a34a))",
  border: "var(--um-border, var(--dsw-alias-border-l2, rgba(31, 35, 40, 0.12)))",
  borderSoft: "var(--um-borderSoft, var(--dsw-alias-border-l1, rgba(31, 35, 40, 0.06)))",
  card: "var(--um-card, var(--dsw-alias-bg-layer-3, #ffffff))",
  accent: "var(--um-accent, var(--dsw-alias-brand-subtle, rgba(77, 107, 254, 0.1)))"
};
function ColorInput(props) {
  const effective = normalizeHex(props.value !== "" ? props.value : props.fallback) ?? props.fallback;
  const [text, setText] = (0, import_react.useState)(effective);
  const [bad, setBad] = (0, import_react.useState)(false);
  const timerRef = (0, import_react.useRef)(null);
  const onChangeRef = (0, import_react.useRef)(props.onChange);
  onChangeRef.current = props.onChange;
  (0, import_react.useEffect)(() => {
    setText(effective);
    setBad(false);
  }, [effective]);
  (0, import_react.useEffect)(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);
  const commitNow = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const v = normalizeHex(text);
    if (v !== null) {
      setText(v);
      if (v !== effective) onChangeRef.current(v);
    } else {
      setText(effective);
    }
    setBad(false);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "color",
        value: effective,
        onChange: (ev) => {
          if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          onChangeRef.current(ev.target.value);
        },
        style: { width: 34, height: 24, border: "1px solid rgba(77,107,254,0.35)", borderRadius: 6, background: t.card, cursor: "pointer", padding: 0 }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "text",
        value: text,
        spellCheck: false,
        onChange: (ev) => {
          const raw = ev.target.value;
          setText(raw);
          const clean = raw.trim().toLowerCase().replace(/^#/, "");
          setBad(clean !== "" && (!/^[0-9a-f]*$/.test(clean) || clean.length > 6));
          const v = normalizeHex(raw);
          if (v === null) return;
          if (clean.length === 6) setText(v);
          if (v !== effective) {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => {
              timerRef.current = null;
              onChangeRef.current(v);
            }, 300);
          }
        },
        onKeyDown: (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            commitNow();
          }
        },
        onBlur: commitNow,
        style: { width: 80, fontSize: 11, fontFamily: "ui-monospace, Consolas, monospace", color: bad ? t.error : t.text2, border: `1px solid ${bad ? t.error : "rgba(77,107,254,0.25)"}`, borderRadius: 6, background: t.card, padding: "3px 6px", boxSizing: "border-box" }
      }
    )
  ] });
}
function FontPick(props) {
  const { value, onChange, emptyLabel } = props;
  const v = (value || "").trim();
  const available = v !== "" ? isFontAvailable(v) : null;
  const extra = v !== "" && !COMMON_SYSTEM_FONTS.includes(v) ? [v] : [];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, flex: "1 1 240px", minWidth: 200 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "select",
      {
        value: v,
        onChange: (e) => onChange(e.target.value),
        title: L("\u4ECE\u7CFB\u7EDF\u5B57\u4F53\u5E93\u9009\u62E9\u5B57\u4F53"),
        style: { flex: 1, fontSize: 12, color: available === false ? t.error : t.text2, border: `1px solid ${available === false ? t.error : "rgba(77,107,254,0.25)"}`, borderRadius: 6, background: t.card, padding: "3px 6px", boxSizing: "border-box", outline: "none", cursor: "pointer" },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: emptyLabel }),
          [...COMMON_SYSTEM_FONTS, ...extra].map((f) => {
            const ok = isFontAvailable(f);
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: f, style: ok ? void 0 : { color: "#999" }, children: [
              f,
              ok ? "" : L("\uFF08\u2717 \u672C\u673A\u672A\u88C5\uFF0C\u5C06\u56DE\u9000\uFF09")
            ] }, f);
          })
        ]
      }
    ),
    available !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: available ? L("\u672C\u673A\u68C0\u6D4B\u5230\u8BE5\u5B57\u4F53") : L("\u672C\u673A\u672A\u68C0\u6D4B\u5230\u8BE5\u5B57\u4F53\uFF0C\u5C06\u56DE\u9000\u5230\u7CFB\u7EDF\u9ED8\u8BA4"), style: { fontSize: 11, color: available ? t.ok : t.error, whiteSpace: "nowrap" }, children: available ? L("\u2713 \u53EF\u7528") : L("\u2717 \u672A\u88C5") })
  ] });
}
function WeightPick(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "select",
    {
      value: props.value,
      onChange: (e) => props.onChange(e.target.value),
      title: L("\u5B57\u4F53\u7C97\u7EC6"),
      style: { fontSize: 11, color: t.text2, border: "1px solid rgba(77,107,254,0.25)", borderRadius: 6, background: t.card, padding: "3px 6px", boxSizing: "border-box", outline: "none", cursor: "pointer" },
      children: FONT_WEIGHT_OPTIONS.map(([w, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: w, children: L(label) }, w))
    }
  );
}
var currentFontOf = (c, cat) => {
  const pos = (c[cat] || "").trim();
  if (pos) return `${pos}\uFF08${L("\u5DF2\u7EC6\u5316")}\uFF09`;
  const g = (c.global || "").trim();
  if (g) return `${g}\uFF08${L("\u8DDF\u968F\u5168\u5C40")}\uFF09`;
  return L("\u5185\u7F6E\u5B57\u4F53\u6808");
};
var FONT_CAT_ROWS = [
  ["\u6A21\u578B\u540D\uFF08\u80F6\u56CA / \u6807\u9898\uFF09", "model", "weightModel"],
  ["\u6570\u503C / \u91D1\u989D", "value", "weightValue"],
  ["\u6B63\u6587\uFF08\u8BF4\u660E\u3001\u5217\u8868\uFF09", "body", "weightBody"],
  ["\u6B21\u8981\u8BF4\u660E\uFF08\u65F6\u95F4\u3001\u6765\u6E90\uFF09", "sub", "weightSub"]
];
var row = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "4px 0",
  lineHeight: "18px"
};
var dateSep = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: t.text3,
  fontSize: 11,
  margin: "4px 0"
};
var RATE_TICK_MS = 500;
function formatTokens(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function toDisplay(amount, native, display, usdToCny) {
  if (native === display) return amount;
  if (native === "USD" && display === "CNY") return amount * usdToCny;
  if (native === "CNY" && display === "USD") return amount / usdToCny;
  return amount;
}
function fmtMoney(amount, native, usage) {
  const v = toDisplay(amount, native, usage.currency, usage.usdToCny);
  const symbol = usage.currency === "USD" ? "$" : "\xA5";
  const decimals = Math.abs(v) > 0 && Math.abs(v) < 0.01 ? 4 : 2;
  let s = v.toFixed(decimals);
  if (v !== 0 && Number(s) === 0) s = v.toFixed(6);
  return `${symbol} ${s}`;
}
function fmtPrice(amountPerM, native, usage) {
  const v = toDisplay(amountPerM, native, usage.currency, usage.usdToCny);
  const symbol = usage.currency === "USD" ? "$" : "\xA5";
  return `${symbol} ${v.toFixed(v < 1 ? 3 : 2)}/M`;
}
function fmtBalance(balance, usage) {
  const v = toDisplay(balance.totalBalance, balance.currency, usage.currency, usage.usdToCny);
  const symbol = usage.currency === "USD" ? "$" : "\xA5";
  return `${symbol} ${v.toFixed(2)}`;
}
function fmtTime(ms) {
  if (!ms) return "--:--:--";
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDate(ms) {
  if (!ms) return L("--\u5E74--\u6708--\u65E5");
  const d = new Date(ms);
  return L("YYYY\u5E74M\u6708D\u65E5").replace("YYYY", String(d.getFullYear())).replace("M", String(d.getMonth() + 1)).replace("D", String(d.getDate()));
}
function sameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
function turnTokensText(turn) {
  const total = turn.inputTokens + turn.cacheReadTokens + turn.cacheWriteTokens + turn.outputTokens;
  const stopped = total === 0 && turn.endedAt > 0 && (turn.endReason === "aborted" || turn.endReason === "interrupted");
  return stopped ? L("\u5BF9\u8BDD\u88AB\u505C\u6B62") : `${formatTokens(total - turn.outputTokens)} ${L("\u5165")} / ${formatTokens(turn.outputTokens)} ${L("\u51FA")}`;
}
function bucketTokens(u, b) {
  switch (b) {
    case "input":
      return u.inputTokens;
    case "cacheRead":
      return u.cacheReadTokens;
    case "cacheWrite":
      return u.cacheWriteTokens;
    case "output":
      return u.outputTokens;
  }
}
function bucketPricePerM(p, b) {
  if (p === null) return void 0;
  if (p.combinedPerM !== void 0) return p.combinedPerM;
  switch (b) {
    case "input":
      return p.inputPerM;
    case "cacheRead":
      return p.cacheReadPerM ?? p.inputPerM;
    case "cacheWrite":
      return p.cacheWritePerM ?? p.inputPerM;
    case "output":
      return p.outputPerM;
  }
}
function peakActiveNow(p) {
  const hasLegacy = p.peak !== void 0 && p.offPeak !== void 0;
  const hasRow = (p.customRows ?? []).some((r) => r.peakPerM !== void 0 || r.offPerM !== void 0);
  if (!hasLegacy && !hasRow) return null;
  if (p.peakOffPeakFrom !== void 0 && Date.now() < p.peakOffPeakFrom) return null;
  const b = new Date(Date.now() + 8 * 3600 * 1e3);
  const day = b.getUTCDay();
  const min = b.getUTCHours() * 60 + b.getUTCMinutes();
  const days = p.peakDays ?? [0, 1, 2, 3, 4, 5, 6];
  const wins = p.peakWindows ?? [{ start: 540, end: 720 }, { start: 840, end: 1080 }];
  return wins.some((w) => {
    if (w.start < w.end) return days.includes(day) && min >= w.start && min < w.end;
    if (min >= w.start) return days.includes(day);
    if (min < w.end) return days.includes((day + 6) % 7);
    return false;
  });
}
function todayIsPeakDay(p) {
  const b = new Date(Date.now() + 8 * 3600 * 1e3);
  return (p.peakDays ?? [0, 1, 2, 3, 4, 5, 6]).includes(b.getUTCDay());
}
function peakLabel(p) {
  if (p === null) return null;
  const active = peakActiveNow(p);
  if (active === null) return null;
  if (active === false && !todayIsPeakDay(p)) return `${L("\u4F4E\u8C37")}\uFF08${L("\u975E\u5CF0\u8C37\u65E5")}\uFF09`;
  return active ? L("\u9AD8\u5CF0") : L("\u4F4E\u8C37");
}
function UsageReadout({ useProjection, useChat }) {
  const readProjection = useProjection ?? NOOP_USE_PROJECTION;
  const usage = readProjection("usageCost");
  const livePartial = (useChat ?? NOOP_USE_CHAT)((s) => s.legacy?.partial ?? null);
  const [, setLangTick] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    const h = () => setLangTick((v) => v + 1);
    window.addEventListener("um-lang-change", h);
    return () => window.removeEventListener("um-lang-change", h);
  }, []);
  const [open, setOpen] = (0, import_react.useState)(false);
  const rootRef = (0, import_react.useRef)(null);
  const [rate, setRate] = (0, import_react.useState)(null);
  const rateSamplesRef = (0, import_react.useRef)([]);
  const usageRef = (0, import_react.useRef)(void 0);
  const [showDash, setShowDash] = (0, import_react.useState)(() => {
    try {
      return localStorage.getItem("um-dash-open") !== "0";
    } catch {
      return true;
    }
  });
  const [dashStats, setDashStats] = (0, import_react.useState)([]);
  const [themeState, setThemeStateLocal] = (0, import_react.useState)(() => getThemeState());
  (0, import_react.useEffect)(() => {
    const refresh = () => {
      setThemeStateLocal(getThemeState());
    };
    window.addEventListener(THEME_CHANGE, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(THEME_CHANGE, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const [globalColors, setGlobalColorsLocal] = (0, import_react.useState)(() => getGlobalColors());
  (0, import_react.useEffect)(() => {
    const refresh = () => {
      setGlobalColorsLocal(getGlobalColors());
    };
    window.addEventListener(GLOBAL_COLORS_CHANGE, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(GLOBAL_COLORS_CHANGE, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const [fontMode, setFontModeLocal] = (0, import_react.useState)(() => getFontMode());
  const [fontCustom, setFontCustomLocal] = (0, import_react.useState)(() => getFontCustom());
  (0, import_react.useEffect)(() => {
    const refresh = () => {
      setFontModeLocal(getFontMode());
      setFontCustomLocal(getFontCustom());
    };
    window.addEventListener(FONT_MODE_CHANGE, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FONT_MODE_CHANGE, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const theme = resolveTheme(themeOf(themeState.id), themeState.custom[themeState.id] ?? DEFAULT_CUSTOM);
  const themeVars = {
    "--um-text": theme.text,
    "--um-text2": theme.text2,
    "--um-text3": theme.text3,
    // 字体四分类（主文字/模型名/数值金额/次要说明）
    "--um-textMain": theme.textMain,
    "--um-textModel": theme.textModel,
    "--um-textValue": theme.textValue,
    "--um-textSub": theme.textSub,
    "--um-brand": theme.brand,
    "--um-brand2": theme.brand2,
    "--um-error": theme.error,
    "--um-ok": theme.ok,
    "--um-border": theme.border,
    "--um-borderSoft": theme.bgSoft,
    "--um-card": theme.card,
    "--um-accent": theme.accent,
    "--um-pill-flat": theme.pill.flat,
    "--um-pill-peak": theme.pill.peak,
    "--um-ring-flat": theme.pill.ringFlat,
    "--um-ring-peak": theme.pill.ringPeak,
    "--um-ring-off": theme.pill.ringOff,
    "--um-alert-ok": theme.alert.ok,
    "--um-alert-near": theme.alert.near,
    "--um-alert-over": theme.alert.over
  };
  const [dashView, setDashView] = (0, import_react.useState)("all");
  const [dashProv, setDashProv] = (0, import_react.useState)("");
  const [dashModel, setDashModel] = (0, import_react.useState)("");
  const [modelDir, setModelDir] = (0, import_react.useState)([]);
  (0, import_react.useEffect)(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/usage-meter/models");
        if (!res.ok) return;
        const doc = await res.json();
        if (alive) setModelDir(doc.providers ?? []);
      } catch {
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const displayNameOf = (provider, model) => {
    if (!model) return "";
    const pv = provider ?? "";
    return modelDir.find((p2) => p2.provider === pv)?.models.find((x) => x.model === model)?.label ?? model;
  };
  (0, import_react.useEffect)(() => {
    usageRef.current = usage;
  }, [usage]);
  const liveStepRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    const samples = rateSamplesRef.current;
    if (livePartial === null) {
      liveStepRef.current = null;
      return;
    }
    let total = 0;
    for (const block of livePartial.blocks) {
      if ((block.kind === "text" || block.kind === "reasoning") && typeof block.text === "string") total += estTokens(block.text);
    }
    const key = livePartial.turn + ":" + livePartial.step;
    if (liveStepRef.current !== key) {
      liveStepRef.current = key;
      samples.length = 0;
    }
    const last = samples[samples.length - 1];
    if (last !== void 0 && (total < last.total || Date.now() - last.at > 5e3)) samples.length = 0;
    if (last === void 0 || last.total !== total) samples.push({ at: Date.now(), total });
  }, [livePartial]);
  const srvStampRef = (0, import_react.useRef)(0);
  const srvSamplesRef = (0, import_react.useRef)([]);
  (0, import_react.useEffect)(() => {
    if (usage === void 0) return;
    const stamp = usage.realtimeUpdatedAt;
    if (stamp <= 0 || stamp === srvStampRef.current) return;
    srvStampRef.current = stamp;
    const s = srvSamplesRef.current;
    const last = s[s.length - 1];
    if (last !== void 0 && (usage.realtimeOutputTokens < last.total || Date.now() - last.at > 5e3)) s.length = 0;
    if (s.length === 0 || s[s.length - 1].total !== usage.realtimeOutputTokens) s.push({ at: Date.now(), total: usage.realtimeOutputTokens });
  }, [usage]);
  (0, import_react.useEffect)(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  (0, import_react.useEffect)(() => {
    const id = setInterval(() => {
      const u = usageRef.current;
      if (u === void 0) return;
      setRate(liveOutputRate(rateSamplesRef.current, srvSamplesRef.current, Date.now()));
    }, RATE_TICK_MS);
    return () => clearInterval(id);
  }, []);
  if (usage === void 0) return null;
  const p = usage.pricing;
  const native = p?.currency ?? "CNY";
  const billedInput = usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
  const hitRate = billedInput > 0 ? Math.round(usage.cacheReadTokens / billedInput * 1e3) / 10 : null;
  const peak = peakLabel(p);
  const accountBalance = usage.accountBalance;
  const isDeepSeek = usage.provider === "deepseek-official" || usage.provider === "deepseek";
  const balanceKind = accountBalance !== null ? "account" : "none";
  const balanceNegative = balanceKind === "account" && (accountBalance?.totalBalance ?? 0) < 0;
  const pricesConverted = native !== usage.currency;
  const turns = [...usage.turns].reverse();
  const remaining = usage.remainingBudget;
  const overBudget = remaining !== null && remaining < 0;
  const budgetRatio = usage.budget !== null && usage.budget > 0 ? Math.max(0, Math.min(1, (remaining ?? 0) / usage.budget)) : null;
  const bal = usage.accountBalance !== null ? usage.accountBalance.totalBalance : null;
  const balOver = bal !== null && bal <= 0;
  const balNear = bal !== null && !balOver && usage.alertBalanceFloor > 0 && bal < usage.alertBalanceFloor;
  const balColor = bal === null ? t.text3 : balOver ? theme.alert.over : balNear ? theme.alert.near : globalColors.balanceOk;
  const billingActive = rate !== null;
  const peakNow = usage.peakState;
  const fmtCost = (v) => Number.isFinite(v) ? `${usage.currency === "USD" ? "$" : "\xA5"}${v.toFixed(3)}` : "\u2014";
  const loadDash = async () => {
    try {
      const res = await fetch("/api/usage-meter/stats");
      if (!res.ok) return;
      const doc = await res.json();
      setDashStats(doc.stats ?? []);
    } catch {
    }
  };
  const effectiveStats = (() => {
    if (usage === void 0) return [];
    const byModel = /* @__PURE__ */ new Map();
    for (const t2 of usage.turns) {
      const m = t2.model ?? "";
      const p2 = t2.provider ?? "";
      const key = `${p2}/${m}`;
      const e = byModel.get(key) ?? { provider: p2, model: m, requestCount: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, cost: 0, inputCost: 0, cacheReadCost: 0, cacheWriteCost: 0, outputCost: 0, currency: usage.currency };
      const c = toDisplay(t2.cost, t2.currency ?? usage.currency, usage.currency, usage.usdToCny);
      e.cost += c;
      e.inputTokens += t2.inputTokens;
      e.outputTokens += t2.outputTokens;
      e.cacheReadTokens += t2.cacheReadTokens;
      e.cacheWriteTokens += t2.cacheWriteTokens;
      e.reasoningTokens += t2.reasoningTokens;
      e.inputCost += toDisplay(t2.inputCost, t2.currency ?? usage.currency, usage.currency, usage.usdToCny);
      e.cacheReadCost += toDisplay(t2.cacheReadCost, t2.currency ?? usage.currency, usage.currency, usage.usdToCny);
      e.cacheWriteCost += toDisplay(t2.cacheWriteCost, t2.currency ?? usage.currency, usage.currency, usage.usdToCny);
      e.outputCost += toDisplay(t2.outputCost, t2.currency ?? usage.currency, usage.currency, usage.usdToCny);
      e.requestCount += 1;
      byModel.set(key, e);
    }
    return [...byModel.values()].sort((a, b) => b.cost - a.cost);
  })();
  const provList = Array.from(new Set(effectiveStats.map((s) => s.provider)));
  const modelList = dashProv !== "" ? effectiveStats.filter((s) => s.provider === dashProv) : effectiveStats;
  const totalCost = effectiveStats.reduce((a, s) => a + s.cost, 0);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { ref: rootRef, style: { position: "relative", display: "inline-flex", marginTop: 6, fontFamily: fontStackForCategory(fontMode, fontCustom, "body"), fontWeight: Number(fontWeightForCategory(fontMode, fontCustom, "body")) || void 0, ...themeVars }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `@keyframes um-ring-peak { 0%,100% { box-shadow: 0 0 6px var(--um-ring-peak), 0 0 0 1px var(--um-ring-peak); } 50% { box-shadow: 0 0 10px var(--um-ring-peak), 0 0 0 1.5px var(--um-ring-peak); } } @keyframes um-ring-off { 0%,100% { box-shadow: 0 0 6px var(--um-ring-off), 0 0 0 1px rgba(255,255,255,0.35); } 50% { box-shadow: 0 0 10px var(--um-ring-off), 0 0 0 1.5px rgba(255,255,255,0.12); } } @keyframes um-ring-flat { 0%,100% { box-shadow: 0 0 6px var(--um-ring-flat), 0 0 0 1px var(--um-ring-flat); } 50% { box-shadow: 0 0 10px var(--um-ring-flat), 0 0 0 1.5px var(--um-ring-flat); } }` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => setOpen((o) => !o),
        "aria-expanded": open,
        title: L("\u7528\u91CF / \u8D39\u7528\u8BE6\u60C5"),
        style: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          minWidth: "min(84vw, 540px)",
          padding: "3px 16px",
          border: `1px solid ${peakNow === "peak" ? withAlpha(theme.pill.peak, 0.55) : peakNow === "off" ? withAlpha(theme.pill.ringOff, 0.55) : withAlpha(theme.pill.ringFlat, 0.5)}`,
          borderRadius: 999,
          boxShadow: peakNow === "peak" ? `inset 0 1px 0 rgba(255,255,255,0.25), 0 0 10px ${withAlpha(theme.pill.ringPeak, 0.18)}` : peakNow === "off" ? `inset 0 1px 0 rgba(255,255,255,0.25), 0 0 10px ${withAlpha(theme.pill.ringOff, 0.18)}` : `inset 0 1px 0 rgba(255,255,255,0.20), 0 0 8px ${withAlpha(theme.pill.ringFlat, 0.15)}`,
          background: peakNow === "peak" ? withAlpha(theme.pill.peak, 0.16) : peakNow === "off" ? withAlpha(theme.pill.ringOff, 0.1) : withAlpha(theme.pill.flat, 0.11),
          color: peakNow === "peak" ? theme.alert.over : peakNow === "off" ? theme.alert.ok : t.text2,
          fontSize: 11,
          lineHeight: "16px",
          fontVariantNumeric: "tabular-nums",
          cursor: "pointer",
          transition: "background .12s ease, border-color .12s ease",
          ...billingActive && peakNow === "peak" ? { animation: "um-ring-peak 3s ease-in-out infinite" } : {},
          ...billingActive && peakNow === "off" ? { animation: "um-ring-off 3s ease-in-out infinite" } : {},
          ...billingActive && peakNow === null ? { animation: "um-ring-flat 3s ease-in-out infinite" } : {}
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: Number(fontWeightForCategory(fontMode, fontCustom, "model")) || 700, fontFamily: fontStackForCategory(fontMode, fontCustom, "model"), flex: 1, minWidth: 0, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: `linear-gradient(90deg, ${theme.textModel}, ${theme.brand2})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: theme.textModel }, children: usage.provider ? `${usage.provider} \xB7 ${displayNameOf(usage.provider, usage.model) || L("\u672A\u9009\u62E9\u6A21\u578B")}` : displayNameOf(usage.provider, usage.model) || L("\u672A\u9009\u62E9\u6A21\u578B") }, theme.id),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3, whiteSpace: "nowrap" }, children: "\xB7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: Number(fontWeightForCategory(fontMode, fontCustom, "value")) || 700, fontFamily: fontStackForCategory(fontMode, fontCustom, "value"), color: p ? t.value : t.text3, whiteSpace: "nowrap" }, children: p ? fmtMoney(usage.estimatedCost, usage.currency, usage) : L("\u65E0\u4EF7\u683C") }),
          (balanceKind !== "none" || isDeepSeek && accountBalance === null) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "span",
            {
              title: accountBalance !== null ? `${accountBalance.source === "computed" ? L("\u8BA1\u7B97") : L("\u66F4\u65B0")}${L("\u66F4\u65B0\u4E8E")} ${fmtTime(accountBalance.updatedAt)}${isDeepSeek ? "\uFF08\u5B98\u7F51\u4F59\u989D\u5237\u65B0\u6709\u5EF6\u8FDF\uFF09" : ""}${pricesConverted ? ` \xB7 ${L("\u6C47\u7387 1USD\u2248")}${usage.usdToCny.toFixed(4)}CNY${usage.rateUpdatedAt > 0 ? ` \xB7 ${L("\u66F4\u65B0\u4E8E")} ${fmtTime(usage.rateUpdatedAt)}` : ""}` : ""}` : L("\u7B49\u5F85\u4F59\u989D\u914D\u7F6E\u2026"),
              style: {
                fontWeight: 600,
                color: balColor,
                background: accountBalance === null ? "rgba(139, 148, 158, 0.10)" : balOver ? withAlpha(theme.alert.over, 0.1) : balNear ? withAlpha(theme.alert.near, 0.12) : withAlpha(globalColors.balanceOk, 0.1),
                borderRadius: 999,
                padding: "0 6px",
                whiteSpace: "nowrap"
              },
              children: accountBalance === null ? usage.balanceNeedsKey ? L("\u4F59\u989D \u672A\u914D\u7F6EKey") : L("\u4F59\u989D \u83B7\u53D6\u4E2D\u2026") : `${balanceNegative ? L("\u900F\u652F ") : L("\u5269\u4F59 ")}${fmtBalance(accountBalance, usage)}`
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text3, whiteSpace: "nowrap" }, children: [
            usage.requestCount,
            " \u6B21"
          ] }),
          (() => {
            const r = rate ?? 0;
            const tier = r > 100 ? "hi" : r > 50 ? "mid" : "low";
            const lo = globalColors.speedLow;
            const md = globalColors.speedMid;
            const hi = globalColors.speedHi;
            const mdPale = lightenHex(md, 0.4);
            const loPale = lightenHex(lo, 0.4);
            const grad = tier === "hi" ? `linear-gradient(90deg, ${hi}, ${hi} 50%, ${mdPale} 80%, ${loPale})` : null;
            const sp = grad === null ? { color: tier === "mid" ? md : lo, fontWeight: 700 } : { display: "inline-block", overflow: "hidden", background: grad, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: hi, fontWeight: 700 };
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { whiteSpace: "nowrap", ...sp }, children: [
              "\xB7 ",
              tt("speed"),
              " ",
              r.toFixed(1),
              " tokens/s"
            ] }, `${tier}:${lo}:${md}:${hi}`);
          })(),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3, transform: open ? "rotate(180deg)" : "none", transition: "transform .12s ease", fontSize: 9 }, children: "\u25BC" })
        ]
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        style: {
          position: "absolute",
          bottom: "calc(100% + 8px)",
          // 以触发条为锚水平居中（而非左对齐向右展开），视觉上与下方文字整体对齐。
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 40,
          width: 744,
          maxWidth: "calc(100vw - 32px)",
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          boxShadow: `0 12px 32px rgba(31, 35, 40, 0.18), 0 0 26px ${theme.brand}29`,
          padding: "12px 14px",
          fontSize: 12,
          color: t.text,
          fontVariantNumeric: "tabular-nums"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: Number(fontWeightForCategory(fontMode, fontCustom, "model")) || 700, fontSize: 13, fontFamily: fontStackForCategory(fontMode, fontCustom, "model"), background: `linear-gradient(90deg, ${theme.textModel}, ${theme.brand2})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: theme.textModel }, children: usage.provider ? `${usage.provider} \xB7 ${displayNameOf(usage.provider, usage.model) || L("\u672A\u9009\u62E9\u6A21\u578B")}` : displayNameOf(usage.provider, usage.model) || L("\u672A\u9009\u62E9\u6A21\u578B") }, `title-${theme.id}`),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 8 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: L("\u4E3B\u9898\u5FEB\u5207"), style: { color: t.brand, fontSize: 13, lineHeight: 1 }, children: "\u21C4" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "select",
                {
                  value: themeState.id,
                  onChange: (e) => {
                    setThemeState({ ...themeState, id: e.target.value });
                  },
                  title: L("\u4E3B\u9898\u5FEB\u5207\uFF08\u8BE6\u7EC6\u914D\u8272\u5728\u8BBE\u7F6E\u9875\uFF09"),
                  style: { height: 22, padding: "0 4px", fontSize: 11, borderRadius: 6, border: "1px solid rgba(77,107,254,0.35)", background: "rgba(77,107,254,0.08)", color: t.brand, cursor: "pointer", maxWidth: 120 },
                  children: THEMES.map((th) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: th.id, children: L(th.name) }, th.id))
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3, fontSize: 11 }, children: usage.provider ?? "" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setShowDash((o) => {
                      const n = !o;
                      try {
                        localStorage.setItem("um-dash-open", n ? "1" : "0");
                      } catch {
                      }
                      return n;
                    });
                    if (!showDash) {
                      setDashView("all");
                      void loadDash();
                    }
                  },
                  title: L("\u7528\u91CF\u5C55\u677F"),
                  style: { fontSize: 13, lineHeight: 1, padding: "2px 6px", borderRadius: 6, border: "1px solid rgba(77,107,254,0.35)", background: showDash ? "linear-gradient(90deg, #4d6bfe, #7c5cff)" : "rgba(77,107,254,0.08)", color: showDash ? "#fff" : t.brand, cursor: "pointer" },
                  children: "\u25A6"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: t.text3, fontSize: 11, marginTop: 2, fontWeight: Number(fontWeightForCategory(fontMode, fontCustom, "sub")) || void 0, fontFamily: fontStackForCategory(fontMode, fontCustom, "sub") }, children: [
            L("\u4EF7\u683C\u6765\u6E90"),
            " ",
            p?.source === "remote" ? tt("sourceRemote") : p?.source === "user" ? tt("sourceUser") : tt("sourceBuiltin"),
            " \xB7 ",
            L("\u66F4\u65B0\u4E8E"),
            " ",
            p?.updatedAt ? new Date(p.updatedAt).toLocaleString() : "\u2014",
            peak !== null ? ` \xB7 ${peak}` : "",
            pricesConverted ? ` \xB7 ${L("\u6C47\u7387 1USD=")}${usage.usdToCny.toFixed(4)}CNY` : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, borderBottom: "1px solid rgba(77,107,254,0.12)", paddingTop: 8, paddingBottom: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text2, fontSize: 13, fontWeight: 600 }, children: balanceKind === "account" ? L("\u8D26\u6237\u4F59\u989D") : L("\u4F59\u989D") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 800, fontSize: 16, color: balanceKind === "none" ? t.text3 : balanceNegative ? t.error : t.ok }, children: balanceKind === "none" ? isDeepSeek ? usage.balanceNeedsKey ? L("\u672A\u914D\u7F6EKey") : L("\u83B7\u53D6\u4E2D\u2026") : L("\u672A\u914D\u7F6E") : accountBalance !== null ? fmtBalance(accountBalance, usage) : "\u2014" }),
              accountBalance !== null && accountBalance.updatedAt > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { title: isDeepSeek ? L("\u5B98\u7F51\u4F59\u989D\u5237\u65B0\u53EF\u80FD\u6709\u5EF6\u8FDF\uFF0C\u4F59\u989D\u6309\u300C\u951A\u70B9 \u2212 \u672C\u5730\u6D88\u8D39\u300D\u5B9E\u65F6\u8BA1\u7B97") : L("\u4F59\u989D = \u8D26\u6237\u4F59\u989D \u2212 \u7D2F\u8BA1\u6D88\u8D39\uFF08\u5168\u5C40\u8D26\u672C\uFF09"), style: { color: t.text3, fontSize: 10, whiteSpace: "nowrap" }, children: [
                accountBalance.source === "computed" ? L("\u8BA1\u7B97") : L("\u66F4\u65B0"),
                L("\u66F4\u65B0\u4E8E"),
                " ",
                fmtTime(accountBalance.updatedAt),
                isDeepSeek ? L(" \xB7 \u5B98\u7F51\u5237\u65B0\u6709\u5EF6\u8FDF") : ""
              ] }),
              pricesConverted && balanceKind !== "none" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text3, fontSize: 10, whiteSpace: "nowrap" }, children: [
                L("\u6C47\u7387 1USD\u2248"),
                usage.usdToCny.toFixed(4),
                "CNY",
                usage.rateUpdatedAt > 0 ? ` \xB7 ${L("\u66F4\u65B0\u4E8E")} ${fmtTime(usage.rateUpdatedAt)}` : ""
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, paddingTop: 6, paddingBottom: 2 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 13, fontWeight: 700, background: `linear-gradient(90deg, ${theme.brand}, ${theme.brand2})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: theme.brand }, children: tt("sessionCost") }, `sc-label-${theme.id}`),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 700, fontSize: 13, background: `linear-gradient(90deg, ${theme.textValue}, ${theme.brand2})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: theme.textValue, whiteSpace: "nowrap" }, children: p ? fmtMoney(usage.estimatedCost, usage.currency, usage) : tt("noPriceData") }, `sc-val-${theme.id}`)
          ] }),
          showDash && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginTop: 6, borderTop: "1px solid rgba(77,107,254,0.25)", paddingTop: 10 }, children: effectiveStats.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 11, marginTop: 10 }, children: L("\u6682\u65E0\u7528\u91CF\u6570\u636E\uFF0C\u5148\u53D1\u51E0\u6761\u6D88\u606F\u518D\u6765\u770B\u3002") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginTop: 8, display: "flex", alignItems: "center", gap: 16 }, children: (() => {
            const R = 52, C = 2 * Math.PI * R, SZ = 150;
            const palette = theme.palette;
            let acc = 0;
            const segs = effectiveStats.map((s, i) => {
              const f = totalCost > 0 ? Math.max(0.012, s.cost / totalCost) : 0;
              const color = palette[i % palette.length];
              const off = acc * C;
              acc += f;
              return { s, color, dip: f * C, offset: off };
            });
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { position: "relative", width: SZ, height: SZ, flex: "none" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: SZ, height: SZ, viewBox: `0 0 ${SZ} ${SZ}`, children: segs.map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "circle",
                  {
                    cx: SZ / 2,
                    cy: SZ / 2,
                    r: R,
                    fill: "none",
                    stroke: x.color,
                    strokeWidth: 16,
                    strokeDasharray: `${x.dip} ${C - x.dip}`,
                    strokeDashoffset: -x.offset,
                    transform: `rotate(-90 ${SZ / 2} ${SZ / 2})`,
                    style: { transition: "stroke-dasharray .4s ease, stroke-dashoffset .4s ease" }
                  },
                  i
                )) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, padding: "0 14px", boxSizing: "border-box", overflow: "hidden" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 9, color: t.text3 }, children: L("\u7D2F\u8BA1") }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: Math.max(9, Math.min(15, Math.round(78 / Math.max(4, fmtCost(totalCost).length)))), lineHeight: 1.1, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 800, background: `linear-gradient(90deg, ${theme.textValue}, ${theme.brand2})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: theme.textValue }, children: fmtCost(totalCost) }, `total-${theme.id}`)
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1, minWidth: 0 }, children: segs.map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 8, height: 8, borderRadius: 999, background: x.color, flex: "none", boxShadow: `0 0 6px ${x.color}` } }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, color: t.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
                  x.s.provider,
                  " \xB7 ",
                  displayNameOf(x.s.provider, x.s.model)
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, fontWeight: 700, color: t.value, whiteSpace: "nowrap" }, children: fmtCost(x.s.cost) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 10, color: t.text3, whiteSpace: "nowrap", width: 30, textAlign: "right" }, children: [
                  totalCost > 0 ? (x.s.cost / totalCost * 100).toFixed(0) : 0,
                  "%"
                ] })
              ] }, `${x.s.provider}/${x.s.model}`)) })
            ] });
          })() }) }),
          usage.budget !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { borderTop: "1px solid rgba(77,107,254,0.12)", marginTop: 4, paddingTop: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, paddingTop: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text2 }, children: [
                L("\u9884\u7B97"),
                " ",
                fmtMoney(usage.budget, usage.currency, usage)
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text3 }, children: [
                L("\u5DF2\u7528"),
                " ",
                fmtMoney(usage.estimatedCost, usage.currency, usage)
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1, height: 6, borderRadius: 999, background: t.borderSoft, overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: `${Math.round((budgetRatio ?? 0) * 100)}%`, height: "100%", borderRadius: 999, background: overBudget ? t.error : t.brand, transition: "width .2s ease" } }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 700, color: overBudget ? t.error : t.text, whiteSpace: "nowrap" }, children: [
                overBudget ? L("\u8D85\u652F ") : L("\u5269\u4F59 "),
                fmtMoney(Math.abs(remaining ?? 0), usage.currency, usage)
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, paddingBottom: 2, color: t.text3, fontSize: 11 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1 }, children: tt("turnUsage") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { width: 92, textAlign: "right", color: usage.peakState === "peak" ? t.error : usage.peakState === "off" ? t.ok : void 0 }, children: [
                tt("unitCol"),
                usage.peakState === "peak" ? tt("peakTag") : usage.peakState === "off" ? tt("offTag") : ""
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 92, textAlign: "right" }, children: tt("turnSubtotal") })
            ] }),
            (() => {
              const lt = usage.lastTurn;
              const tu = lt != null ? { inputTokens: lt.inputTokens, cacheReadTokens: lt.cacheReadTokens, cacheWriteTokens: lt.cacheWriteTokens, outputTokens: lt.outputTokens } : usage;
              const disc = p !== null && p.discount !== void 0 && p.discount < 1 ? p.discount : 1;
              return usage.priceRows.map((r) => {
                const primary = r.buckets[0] ?? "input";
                const tokens = r.buckets.reduce((s, b) => s + bucketTokens(tu, b), 0);
                const price = r.perM ?? bucketPricePerM(p, primary);
                const cost = price !== void 0 ? tokens * (price / 1e6) * disc : 0;
                return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BucketRow, { label: L(r.label), tokens, price, cost, native, usage, accent: primary === "cacheRead" ? t.ok : void 0 }, r.label + r.buckets.join(","));
              });
            })(),
            (usage.lastTurn != null ? usage.lastTurn.reasoningTokens : usage.reasoningTokens) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...row, color: t.text3, fontSize: 11, paddingTop: 1 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              " ",
              tt("reasoningIncluded"),
              " ",
              formatTokens(usage.lastTurn != null ? usage.lastTurn.reasoningTokens : usage.reasoningTokens),
              tt("includedInOut")
            ] }) }),
            p !== null && p.discount !== void 0 && p.discount < 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.brand, fontSize: 10, paddingTop: 2 }, children: tt("batchHalfNote") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, color: t.text2, fontSize: 11, borderTop: "1px solid rgba(77,107,254,0.12)", marginTop: 4, paddingTop: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              L("\u8BF7\u6C42"),
              " ",
              usage.requestCount,
              " ",
              tt("reqOk"),
              " ",
              usage.stepCount,
              " ",
              tt("reqTry")
            ] }),
            hitRate !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text3 }, children: [
              tt("cacheHitPct"),
              " ",
              hitRate,
              "%"
            ] })
          ] }),
          turns.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { borderTop: "1px solid rgba(77,107,254,0.12)", marginTop: 6, paddingTop: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: t.text3, fontSize: 11, marginBottom: 2 }, children: [
              tt("perTurnCosts"),
              turns.length,
              tt("turnsTotal")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { maxHeight: 280, overflowY: "auto", overscrollBehavior: "contain" }, children: turns.map((turn, i) => {
              const prev = i > 0 ? turns[i - 1] : void 0;
              const newDay = prev === void 0 || !sameDay(prev.startedAt, turn.startedAt);
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [
                newDay && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: dateSep, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1, height: 1, background: "rgba(77,107,254,0.12)" } }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmtDate(turn.startedAt) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1, height: 1, background: "rgba(77,107,254,0.12)" } })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, padding: "2px 0", gap: 10 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text2, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6, flex: 0.8, minWidth: 0, overflow: "hidden" }, children: [
                    usage.peakState !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 18,
                      height: 18,
                      padding: "0 4px",
                      borderRadius: 4,
                      border: "1px solid",
                      boxSizing: "border-box",
                      borderColor: turn.peak ? "rgba(209,36,47,0.55)" : "rgba(22,163,74,0.55)",
                      color: turn.peak ? t.error : t.ok,
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1,
                      flex: "none"
                    }, children: L(turn.peak ? "\u5CF0" : "\u8C37") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { flex: "none" }, children: [
                      L("\u7B2C {n} \u8F6E").replace("{n}", String(turn.turn)),
                      " \xB7 ",
                      fmtTime(turn.startedAt),
                      turn.endedAt > 0 ? `\u2013${fmtTime(turn.endedAt)}` : ""
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, color: t.brand }, children: [
                      turn.provider ? `${turn.provider} \xB7 ` : "",
                      turn.model ? displayNameOf(turn.provider, turn.model) : ""
                    ] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3, whiteSpace: "nowrap", flex: "none", width: 85, textAlign: "center" }, children: turnTokensText(turn) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 600, color: t.error, whiteSpace: "nowrap", flex: "none", minWidth: 51, textAlign: "center" }, children: [
                    turn.cost === 0 ? "" : "-",
                    fmtMoney(turn.cost, turn.currency, usage)
                  ] })
                ] })
              ] }, turn.turn);
            }) })
          ] })
        ]
      }
    )
  ] });
}
function draftKeyOf(provider, model) {
  return `${provider}/${model}`;
}
function versionSuffixOf(name) {
  const m = /#(\d+)\b/.exec(name);
  return m !== null ? m[1] : null;
}
function fmtListTime(ms) {
  if (ms <= 0) return "";
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function isDeepseekRoute(provider) {
  return provider === "deepseek-official";
}
function modelSourceKeyClient(provider, model) {
  return `m:${provider}/${model}`;
}
var DAY_LABELS = [[0, "\u65E5"], [1, "\u4E00"], [2, "\u4E8C"], [3, "\u4E09"], [4, "\u56DB"], [5, "\u4E94"], [6, "\u516D"]];
var NUM_PRICE_FIELDS = ["input", "cache", "cacheWrite", "output", "inputPeak", "inputOff", "cachePeak", "cacheOff", "outPeak", "outOff", "balance"];
var FIELD_LABEL = {
  input: L("\u8F93\u5165(\u672A\u547D\u4E2D)"),
  cache: L("\u7F13\u5B58\u547D\u4E2D"),
  cacheWrite: L("\u7F13\u5B58\u5199\u5165"),
  output: L("\u8F93\u51FA")
};
var CUSTOM_BUCKETS = ["input", "cacheRead", "cacheWrite", "output"];
var CUSTOM_BUCKET_LABEL = { input: "\u8F93\u5165", cacheRead: "\u7F13\u5B58\u547D\u4E2D", cacheWrite: "\u7F13\u5B58\u5199\u5165", output: "\u8F93\u51FA" };
function columnsForTemplate(templateId, templates) {
  if (templateId === "") return ["input", "cache", "cacheWrite", "output"];
  const tpl = templates.find((t2) => t2.id === templateId);
  if (!tpl || !tpl.rows || tpl.rows.length === 0) return ["input", "cache", "output"];
  const seen = [];
  for (const row2 of tpl.rows) {
    const b = row2.buckets ?? [];
    let f;
    if (b.includes("input")) f = "input";
    else if (b.includes("cacheRead")) f = "cache";
    else if (b.includes("cacheWrite")) f = "cacheWrite";
    else if (b.includes("output")) f = "output";
    if (f !== void 0 && !seen.includes(f)) seen.push(f);
  }
  return seen.length > 0 ? seen : ["input", "cache", "output"];
}
function padPick(field, value) {
  return field === "sm" || field === "em" ? value.padStart(2, "0") : value;
}
function windowsToPeriods(wins) {
  return wins.map((w) => ({
    sh: String(Math.floor(w.start / 60)),
    sm: String(w.start % 60).padStart(2, "0"),
    eh: String(Math.floor(w.end / 60)),
    em: String(w.end % 60).padStart(2, "0")
  }));
}
function periodsToWindows(ps) {
  const out = [];
  for (const p of ps) {
    const sh = Number(p.sh), sm = Number(p.sm), eh = Number(p.eh), em = Number(p.em);
    if (![sh, sm, eh, em].every((v) => Number.isInteger(v) && v >= 0)) continue;
    if (sh > 23 || eh > 23 || sm > 59 || em > 59) continue;
    const start = sh * 60 + sm, end = eh * 60 + em;
    if (end > start) out.push({ start, end });
  }
  return out;
}
function convertAmount(amount, from, to, usdToCny) {
  if (from === to) return amount;
  if (from === "USD" && to === "CNY") return amount * usdToCny;
  if (from === "CNY" && to === "USD") return usdToCny > 0 ? amount / usdToCny : amount;
  return amount;
}
var OFFICIAL = {
  "deepseek-v4-flash": { inputPerM: 1, cacheReadPerM: 0.02, outputPerM: 2, peak: { inputPerM: 3, cacheReadPerM: 0.1, outputPerM: 9 }, offPeak: { inputPerM: 1.5, cacheReadPerM: 0.05, outputPerM: 4.5 } },
  "deepseek-v4-flash-vision-exp": { inputPerM: 1, cacheReadPerM: 0.02, outputPerM: 2, peak: { inputPerM: 3, cacheReadPerM: 0.1, outputPerM: 9 }, offPeak: { inputPerM: 1.5, cacheReadPerM: 0.05, outputPerM: 4.5 } },
  "deepseek-v4-pro": { inputPerM: 3, cacheReadPerM: 0.025, outputPerM: 6, peak: { inputPerM: 9, cacheReadPerM: 0.3, outputPerM: 27 }, offPeak: { inputPerM: 4.5, cacheReadPerM: 0.15, outputPerM: 13.5 } },
  "deepseek-chat": { inputPerM: 1, cacheReadPerM: 0.02, outputPerM: 2, peak: { inputPerM: 3, cacheReadPerM: 0.1, outputPerM: 9 }, offPeak: { inputPerM: 1.5, cacheReadPerM: 0.05, outputPerM: 4.5 } },
  "deepseek-reasoner": { inputPerM: 3, cacheReadPerM: 0.1, outputPerM: 6, peak: { inputPerM: 9, cacheReadPerM: 0.3, outputPerM: 27 }, offPeak: { inputPerM: 4.5, cacheReadPerM: 0.15, outputPerM: 13.5 } }
};
var OFFICIAL_DAYS = [1, 2, 3, 4, 5];
var OFFICIAL_WINDOWS = [{ start: 540, end: 720 }, { start: 840, end: 1080 }];
function seedEntry(key, ov, bals) {
  const provider = key.split("/")[0];
  const model = key.slice(provider.length + 1);
  const official = isDeepseekRoute(provider) ? OFFICIAL[model] : void 0;
  const savedPe = ov[key]?.prices;
  const pe = savedPe ?? (official ?? void 0);
  const n = (v) => typeof v === "number" && Number.isFinite(v) ? String(v) : "";
  const tier = (v) => {
    if (v === null || typeof v !== "object") return { ip: "", cp: "", op: "" };
    const o = v;
    return { ip: n(o.inputPerM), cp: n(o.cacheReadPerM), op: n(o.outputPerM) };
  };
  const flatInput = n(pe?.inputPerM);
  const flatCache = n(pe?.cacheReadPerM);
  const flatCacheWrite = n(pe?.cacheWritePerM);
  const flatOutput = n(pe?.outputPerM);
  const peak = tier(pe?.peak);
  const off = tier(pe?.offPeak);
  const hasBal = (v) => v !== void 0 && typeof v.balance === "number";
  const bal = hasBal(bals[`m:${provider}/${model}`]) ? bals[`m:${provider}/${model}`] : hasBal(bals[`p:${provider}`]) ? bals[`p:${provider}`] : void 0;
  const savedOverride = ov[key]?.prices !== void 0;
  const rawCustom = Array.isArray(pe?.customRows) ? pe.customRows ?? [] : void 0;
  const isCustom = rawCustom !== void 0 && rawCustom.length > 0;
  const customRows = (rawCustom ?? []).map((r) => ({
    bucket: Array.isArray(r?.buckets) && (r.buckets[0] === "cacheRead" || r.buckets[0] === "cacheWrite" || r.buckets[0] === "output") ? r.buckets[0] : "input",
    perM: typeof r?.perM === "number" ? n(r.perM) : "",
    peakPerM: typeof r?.peakPerM === "number" ? n(r.peakPerM) : "",
    offPerM: typeof r?.offPerM === "number" ? n(r.offPerM) : ""
  }));
  const savedTpl = typeof ov[key]?.templateId === "string" ? ov[key].templateId : void 0;
  const hasRowPeak = (rawCustom ?? []).some((r) => r?.peakPerM !== void 0 || r?.offPerM !== void 0);
  return {
    input: flatInput,
    cache: flatCache,
    cacheWrite: flatCacheWrite,
    output: flatOutput,
    inputPeak: peak.ip || flatInput,
    inputOff: off.ip || flatInput,
    cachePeak: peak.cp || flatCache,
    cacheOff: off.cp || flatCache,
    outPeak: peak.op || flatOutput,
    outOff: off.op || flatOutput,
    currency: typeof pe?.currency === "string" && pe.currency !== "" ? pe.currency : "CNY",
    baseCurrency: typeof pe?.currency === "string" && pe.currency !== "" ? pe.currency : "CNY",
    balance: bal !== void 0 && typeof bal.balance === "number" ? String(bal.balance) : "",
    base: {
      input: flatInput,
      cache: flatCache,
      cacheWrite: flatCacheWrite,
      output: flatOutput,
      inputPeak: peak.ip || flatInput,
      inputOff: off.ip || flatInput,
      cachePeak: peak.cp || flatCache,
      cacheOff: off.cp || flatCache,
      outPeak: peak.op || flatOutput,
      outOff: off.op || flatOutput,
      balance: bal !== void 0 && typeof bal.balance === "number" ? String(bal.balance) : ""
    },
    peakOn: pe !== void 0 && (pe.peak !== void 0 || pe.offPeak !== void 0 || hasRowPeak),
    days: Array.isArray(pe?.peakDays) ? pe.peakDays : OFFICIAL_DAYS,
    windows: windowsToPeriods(Array.isArray(pe?.peakWindows) ? pe.peakWindows : OFFICIAL_WINDOWS),
    // 模板选择持久化：优先用上次保存时显式选择的模板（savedTpl 见上方声明），
    // 绝不让 matchTypeId 的结构猜测改写用户的选择。
    templateId: isCustom ? "" : savedTpl !== void 0 && savedTpl !== "" ? savedTpl : pe !== void 0 ? matchTypeId(pe) : "",
    customRows,
    baseCustomRows: customRows,
    combined: pe?.combinedPerM !== void 0,
    discount: typeof pe?.discount === "number" && pe.discount < 1 ? String(pe.discount) : "",
    // whether this is a fresh official model shown with known defaults (→ show
    // a friendly "已按官方价预填，可修改后保存" hint) vs a non-official model
    // with no saved price (→ prompt the user to fill it in).
    prefillOfficial: official !== void 0 && !savedOverride,
    noSavedPrice: !savedOverride && official === void 0 && !hasBal(bals[`p:${provider}`]),
    usesSharedBalance: hasBal(bals[`p:${provider}`])
  };
}
function UsageMeterSettingsSection(_props) {
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [loadError, setLoadError] = (0, import_react.useState)("");
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [saveMsg, setSaveMsg] = (0, import_react.useState)("");
  const [saveOk, setSaveOk] = (0, import_react.useState)(false);
  const rateRef = (0, import_react.useRef)(7.2);
  const [apiKey, setApiKey] = (0, import_react.useState)("");
  const [keySaved, setKeySaved] = (0, import_react.useState)(false);
  const [pageRate, setPageRate] = (0, import_react.useState)({ usdToCny: 0, updatedAt: 0 });
  const [syncingPrices, setSyncingPrices] = (0, import_react.useState)(false);
  const [syncPricesMsg, setSyncPricesMsg] = (0, import_react.useState)("");
  const [syncPricesOk, setSyncPricesOk] = (0, import_react.useState)(false);
  const [officialSyncLast, setOfficialSyncLast] = (0, import_react.useState)(null);
  const [modelDir, setModelDir] = (0, import_react.useState)([]);
  const [modelsLoading, setModelsLoading] = (0, import_react.useState)(true);
  const [selProvider, setSelProvider] = (0, import_react.useState)("");
  const [overrides, setOverrides] = (0, import_react.useState)({});
  const [balances, setBalances] = (0, import_react.useState)({});
  const [edits, setEdits] = (0, import_react.useState)({});
  const balanceDirtyRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
  const dirtyRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
  const markDirty = (k) => {
    dirtyRef.current.add(k);
  };
  const [expanded, setExpanded] = (0, import_react.useState)({});
  const [saveStates, setSaveStates] = (0, import_react.useState)({});
  const [savingAll, setSavingAll] = (0, import_react.useState)(false);
  const [, setForce] = (0, import_react.useState)(0);
  const [langSel, setLangSel] = (0, import_react.useState)(() => {
    try {
      const v = localStorage.getItem("um-lang-sel");
      return v === "zh" || v === "en" ? v : "auto";
    } catch {
      return "auto";
    }
  });
  (0, import_react.useEffect)(() => {
    try {
      const v = localStorage.getItem("um-lang-sel");
      setManualLang(v === "zh" || v === "en" ? v : null);
    } catch {
    }
  }, []);
  (0, import_react.useEffect)(() => {
    const h = () => setForce((v) => v + 1);
    window.addEventListener("um-lang-change", h);
    return () => window.removeEventListener("um-lang-change", h);
  }, []);
  const [sharedBalances, setSharedBalances] = (0, import_react.useState)({});
  const [sharedApiKeys, setSharedApiKeys] = (0, import_react.useState)({});
  const [balanceSources, setBalanceSources] = (0, import_react.useState)({});
  const [modelApiKeyFlags, setModelApiKeyFlags] = (0, import_react.useState)({});
  const [modelKeyDrafts, setModelKeyDrafts] = (0, import_react.useState)({});
  const [templates, setTemplates] = (0, import_react.useState)([]);
  const [activeKey, setActiveKey] = (0, import_react.useState)("");
  const activeKeyRef = (0, import_react.useRef)("");
  const importTargetRef = (0, import_react.useRef)(null);
  const fileInputRef = (0, import_react.useRef)(null);
  const [importPickerKey, setImportPickerKey] = (0, import_react.useState)("");
  const [dirConfigs, setDirConfigs] = (0, import_react.useState)([]);
  const [configDir, setConfigDir] = (0, import_react.useState)("");
  const [configDirInput, setConfigDirInput] = (0, import_react.useState)("");
  const [wrapperMarkerRows, setWrapperMarkerRows] = (0, import_react.useState)([]);
  const [wmMsg, setWmMsg] = (0, import_react.useState)("");
  const [dirMsg, setDirMsg] = (0, import_react.useState)("");
  const [themeMsg, setThemeMsg] = (0, import_react.useState)("");
  const [openStorage, setOpenStorage] = (0, import_react.useState)(false);
  const [storageTab, setStorageTab] = (0, import_react.useState)("alert");
  const [themeState, setThemeStateLocal] = (0, import_react.useState)(() => getThemeState());
  const theme = resolveTheme(themeOf(themeState.id), themeState.custom[themeState.id] ?? DEFAULT_CUSTOM);
  const applyTheme = (next) => {
    setThemeStateLocal(next);
    setThemeState(next);
  };
  const [globalColors, setGlobalColorsLocal] = (0, import_react.useState)(() => getGlobalColors());
  const applyGlobalColors = (next) => {
    setGlobalColorsLocal(next);
    setGlobalColors(next);
  };
  const [fontMode, setFontModeLocal] = (0, import_react.useState)(() => getFontMode());
  const applyFontMode = (m) => {
    setFontModeLocal(m);
    setFontMode(m);
  };
  const [fontCustom, setFontCustomLocal] = (0, import_react.useState)(() => getFontCustom());
  const applyFontCustom = (c) => {
    setFontCustomLocal(c);
    setFontCustom(c);
  };
  const [thresholds, setThresholds] = (0, import_react.useState)({});
  const [thrProvider, setThrProvider] = (0, import_react.useState)("");
  const [thrModel, setThrModel] = (0, import_react.useState)("");
  const [thrType, setThrType] = (0, import_react.useState)("pct");
  const [thrMode, setThrMode] = (0, import_react.useState)("global");
  const [thrPctM, setThrPctM] = (0, import_react.useState)("");
  const [thrAmt, setThrAmt] = (0, import_react.useState)("");
  const [thrCur, setThrCur] = (0, import_react.useState)("CNY");
  const [thrModelMsg, setThrModelMsg] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    const key = thrMode === "global" ? `p:${thrProvider}` : `m:${thrProvider}/${thrModel}`;
    const t2 = thresholds[key];
    if (t2 === void 0) return;
    if (typeof t2.budgetAlertPct === "number" && t2.budgetAlertPct > 0) {
      setThrType("pct");
      setThrPctM(String(t2.budgetAlertPct));
      setThrAmt("");
    } else if (typeof t2.balanceAlertFloor === "number" && t2.balanceAlertFloor > 0) {
      setThrType("amt");
      setThrAmt(String(t2.balanceAlertFloor));
      setThrPctM("");
    }
  }, [thrMode, thrProvider, thrModel, thresholds]);
  const [dirDelMsg, setDirDelMsg] = (0, import_react.useState)(null);
  const [exportConflict, setExportConflict] = (0, import_react.useState)(null);
  const [renameMode, setRenameMode] = (0, import_react.useState)(false);
  const [renameName, setRenameName] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    void (async () => {
      try {
        const res = await fetch("/api/usage-meter/templates");
        if (!res.ok) return;
        const doc = await res.json();
        if (doc.types) setTemplates(doc.types);
      } catch {
      }
    })();
  }, []);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/usage-meter/config");
        if (!res.ok) {
          setLoadError(L("\u52A0\u8F7D\u5931\u8D25 (") + `${res.status})`);
          return;
        }
        const doc = await res.json();
        if (doc.rate && typeof doc.rate.usdToCny === "number") {
          setPageRate({ usdToCny: doc.rate.usdToCny, updatedAt: typeof doc.rate.rateUpdatedAt === "number" ? doc.rate.rateUpdatedAt : 0 });
        }
        if (cancelled) return;
        const c = doc.config ?? {};
        const get = (v) => v === null || v === void 0 ? "" : String(v);
        setKeySaved(c.deepseekApiKey === "***");
        setConfigDirInput(typeof c.billingConfigDir === "string" && String(c.billingConfigDir) !== "" ? String(c.billingConfigDir) : "");
        const wmRaw = c.wrapperMarkers;
        setWrapperMarkerRows(
          Array.isArray(wmRaw) ? wmRaw.filter((x) => x !== null && typeof x === "object").map((x) => {
            const o = x;
            return { pattern: typeof o.pattern === "string" ? o.pattern : "", enabled: o.enabled !== false };
          }) : typeof wmRaw === "string" ? wmRaw.split(/[\n,]/).map((s) => s.trim()).filter((s) => s !== "").map((pattern) => ({ pattern, enabled: true })) : []
        );
        setThresholds(doc.thresholds ?? {});
        setOverrides(doc.priceOverrides ?? {});
        setBalances(doc.balances ?? {});
        setBalanceSources(doc.balanceSources ?? {});
        setModelApiKeyFlags(doc.modelApiKeyFlags ?? {});
        const sb = {};
        const sk = {};
        for (const [pv, pc] of Object.entries(doc.providers ?? {})) {
          if (pc.sharedBalance === true) sb[pv] = true;
          if (pc.sharedApiKey === true) sk[pv] = true;
        }
        setSharedBalances(sb);
        setSharedApiKeys(sk);
      } catch (err) {
        if (!cancelled) {
          console.warn("[usage-meter] load config failed", err);
          setLoadError(L("\u52A0\u8F7D\u5931\u8D25"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/usage-meter/models");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const doc = await res.json();
        if (cancelled) return;
        const providers = doc.providers ?? [];
        setModelDir(providers);
        const first = providers[0];
        if (first !== void 0) setSelProvider(first.provider);
      } catch (err) {
        if (!cancelled) {
          console.warn("[usage-meter] load models failed", err);
          setModelDir([]);
        }
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/usage-meter/config");
        if (!res.ok) return;
        const doc = await res.json();
        const bals = doc.balances ?? {};
        if (cancelled) return;
        setEdits((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            const provider = k.split("/")[0];
            const b = bals[`m:${k}`] ?? bals[`p:${provider}`];
            if (b !== void 0 && typeof b.balance === "number") {
              const cur = next[k];
              const walletCur = typeof b.currency === "string" && b.currency !== "" ? b.currency : "CNY";
              const converted = cur !== void 0 && cur.currency !== walletCur ? convertAmount(b.balance, walletCur, cur.currency, rateRef.current) : b.balance;
              if (cur !== void 0 && !balanceDirtyRef.current.has(k)) next[k] = { ...cur, balance: String(Math.round(converted * 1e6) / 1e6) };
            }
          }
          return next;
        });
      } catch {
      }
    };
    const id = setInterval(() => void poll(), 5e3);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  const draftSigsRef = (0, import_react.useRef)({});
  (0, import_react.useEffect)(() => {
    const sigOf = (k) => {
      const o = overrides[k];
      const bm = balances[`m:${k}`];
      const pv = k.split("/")[0];
      const bp = balances[`p:${pv}`];
      return JSON.stringify([o?.prices ?? null, o?.rows ?? null, o?.templateId ?? null, bm ?? bp ?? null]);
    };
    setEdits((prev) => {
      const d = {};
      const sigs = {};
      for (const p of modelDir) {
        for (const m of p.models) {
          const k = draftKeyOf(p.provider, m.model);
          sigs[k] = sigOf(k);
          d[k] = prev[k] !== void 0 && draftSigsRef.current[k] === sigs[k] ? prev[k] : seedEntry(k, overrides, balances);
        }
      }
      draftSigsRef.current = sigs;
      return d;
    });
  }, [modelDir, overrides, balances]);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/usage-meter/active");
        if (!res.ok) return;
        const doc = await res.json();
        if (cancelled) return;
        const a = doc.active ?? null;
        const key = a !== null ? `${a.provider}/${a.model}` : "";
        activeKeyRef.current = key;
        setActiveKey(key);
      } catch {
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 3e3);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  const buildModelBody = (provider, model) => {
    const e = edits[draftKeyOf(provider, model)];
    if (e === void 0) return null;
    const num = (s) => {
      const t2 = s.trim();
      if (t2 === "") return void 0;
      const n = Number(t2);
      return Number.isFinite(n) && n >= 0 ? n : void 0;
    };
    const prices = {};
    const input2 = num(e.input);
    const output = num(e.output);
    const cache = num(e.cache);
    const cacheWrite = num(e.cacheWrite);
    if (e.templateId === "") {
    } else {
      const cols = columnsForTemplate(e.templateId, templates);
      if (cols.includes("input") && input2 !== void 0) prices.inputPerM = input2;
      if (cols.includes("output") && output !== void 0) prices.outputPerM = output;
      if (cols.includes("cache") && cache !== void 0) prices.cacheReadPerM = cache;
      if (cols.includes("cacheWrite") && cacheWrite !== void 0) prices.cacheWritePerM = cacheWrite;
    }
    if (e.peakOn) {
      const days = e.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort((a, b) => a - b);
      if (days.length > 0) prices.peakDays = days;
      const wins = periodsToWindows(e.windows);
      if (wins.length > 0) prices.peakWindows = wins;
      if (e.templateId !== "") {
        const tier = (ip, cp, op) => {
          const o = {};
          const a = num(ip);
          if (a !== void 0) o.inputPerM = a;
          const b = num(cp);
          if (b !== void 0) o.cacheReadPerM = b;
          const c = num(op);
          if (c !== void 0) o.outputPerM = c;
          return o;
        };
        const peak = tier(e.inputPeak, e.cachePeak, e.outPeak);
        const off = tier(e.inputOff, e.cacheOff, e.outOff);
        if (Object.keys(peak).length > 0) prices.peak = peak;
        if (Object.keys(off).length > 0) prices.offPeak = off;
      }
    }
    if (e.combined) {
      const c = num(e.input);
      if (c !== void 0) {
        prices.combinedPerM = c;
        prices.inputPerM = c;
        prices.outputPerM = c;
      }
    }
    if (e.templateId === "" && e.customRows.length > 0) {
      const rows = e.customRows.map((r) => e.peakOn && num(r.perM) === void 0 ? { ...r, perM: r.offPerM.trim() !== "" ? r.offPerM : r.peakPerM } : r).filter((r) => num(r.perM) !== void 0).map((r) => ({
        label: CUSTOM_BUCKET_LABEL[r.bucket],
        buckets: [r.bucket],
        perM: num(r.perM),
        ...num(r.peakPerM) !== void 0 ? { peakPerM: num(r.peakPerM) } : {},
        ...num(r.offPerM) !== void 0 ? { offPerM: num(r.offPerM) } : {}
      }));
      if (rows.length > 0) prices.customRows = rows;
    }
    const disc = num(e.discount);
    if (disc !== void 0 && disc > 0 && disc < 1) prices.discount = disc;
    if (e.currency !== "") prices.currency = e.currency;
    const body = { provider, model, prices, displayCurrency: e.currency, templateId: e.templateId };
    const balSrc = balanceSources[modelSourceKeyClient(provider, model)] ?? (isDeepseekRoute(provider) ? "deepseek" : "manual");
    if (balSrc === "manual") {
      const bal = num(e.balance);
      if (bal !== void 0) {
        body.balance = bal;
        body.balanceCurrency = e.currency === "" ? "CNY" : e.currency;
      }
    }
    if (e.templateId !== "") {
      const pkF = { input: ["inputPeak", "inputOff"], cache: ["cachePeak", "cacheOff"], cacheWrite: ["cachePeak", "cacheOff"], output: ["outPeak", "outOff"] };
      const fieldOfBucket = { input: "input", cacheRead: "cache", cacheWrite: "cacheWrite", output: "output" };
      const tplDef2 = templates.find((tp) => tp.id === e.templateId);
      const rowDefs = tplDef2 !== void 0 && Array.isArray(tplDef2.rows) && tplDef2.rows.length > 0 ? tplDef2.rows.map((tr) => ({ label: tr.label, buckets: tr.buckets ?? [], f: fieldOfBucket[tr.buckets?.[0] ?? "input"] })) : columnsForTemplate(e.templateId, templates).map((f) => ({ label: FIELD_LABEL[f], buckets: [{ input: "input", cache: "cacheRead", cacheWrite: "cacheWrite", output: "output" }[f]], f }));
      const dispRows = rowDefs.map((rd) => {
        const row2 = { label: rd.label, buckets: rd.buckets };
        if (!e.peakOn) {
          row2.perM = num(e[rd.f]);
        } else {
          row2.perM = num(e[rd.f]);
          row2.peakPerM = num(e[pkF[rd.f][0]]);
          row2.offPerM = num(e[pkF[rd.f][1]]);
        }
        return row2;
      }).filter((r) => r.perM !== void 0 || r.peakPerM !== void 0 || r.offPerM !== void 0);
      if (dispRows.length > 0) body.rows = dispRows;
    }
    return body;
  };
  const syncFailMsg = (detail) => {
    const hint2 = L("\u540C\u6B65\u5931\u8D25\uFF1A\u5982\u679C\u521A\u521A\u5B89\u88C5\u6216\u66F4\u65B0\u8FC7\u672C\u63D2\u4EF6\uFF0C\u8BF7\u5148\u91CD\u542F dsh web \u518D\u8BD5");
    return detail === "" ? hint2 : `${hint2}
${L("\u539F\u56E0\uFF1A")}${detail}`;
  };
  const onSyncOfficialPrices = async () => {
    if (syncingPrices) return;
    if (keySaved === false && apiKey.trim() === "") {
      setSyncPricesMsg(L("\u8BF7\u5148\u586B\u5199\u4E0A\u65B9\u7684\u5168\u5C40 API Key\uFF0C\u518D\u540C\u6B65\u5B98\u65B9\u4EF7\u683C"));
      return;
    }
    setSyncingPrices(true);
    setSyncPricesMsg("");
    setSyncPricesOk(false);
    try {
      const res = await fetch("/api/usage-meter/refresh-official-prices", { method: "POST" });
      const raw = await res.text();
      let doc = null;
      try {
        doc = JSON.parse(raw);
      } catch {
        doc = null;
      }
      if (doc === null) {
        const snippet = raw.trim().slice(0, 120);
        setSyncPricesMsg(syncFailMsg(`HTTP ${res.status}${snippet === "" ? "" : ` \xB7 ${snippet}`}`));
      } else if (!res.ok || doc.ok === false) {
        setSyncPricesMsg(syncFailMsg(doc.error ?? ""));
      } else {
        const n = doc.updated?.length ?? 0;
        const localOfficial = modelDir.find((p) => p.provider === "deepseek-official")?.models ?? [];
        const labelOf = new Map(localOfficial.map((m) => [m.model, m.label]));
        const syncedArr = (doc.updated ?? []).map((u) => labelOf.get(u.model) ?? u.model);
        const unlistedArr = (doc.retired ?? []).map((r) => labelOf.get(r) ?? r);
        const pageModels = doc.pageModels ?? [];
        const warn = doc.warnings?.length ?? 0;
        const lines = [];
        if (localOfficial.length > 0) lines.push(`${L("\u5B98\u65B9\u6A21\u578B ")}${localOfficial.length}${L(" \u4E2A\uFF1A")}${localOfficial.map((m) => m.label).join("\u3001")}`);
        if (pageModels.length > 0) lines.push(`${L("\u5B98\u7F51\u5B9A\u4EF7 ")}${pageModels.length}${L(" \u4E2A\uFF1A")}${pageModels.join("\u3001")}`);
        if (syncedArr.length > 0) lines.push(`${L("\u5DF2\u66F4\u65B0 ")}${n}${L(" \u4E2A\uFF1A")}${syncedArr.join("\u3001")}`);
        if (unlistedArr.length > 0) lines.push(`${L("\u5B98\u7F51\u672A\u5B9A\u4EF7 ")}${unlistedArr.length}${L(" \u4E2A\uFF1A")}${unlistedArr.join("\u3001")}`);
        if (warn > 0) lines.push(`${warn}${L(" \u6761\u8B66\u544A")}`);
        setSyncPricesMsg(lines.join("\n"));
        setSyncPricesOk(true);
        if (n > 0) setOfficialSyncLast({ at: Date.now(), count: n });
        await reloadConfig();
      }
    } catch (err) {
      setSyncPricesMsg(syncFailMsg(String(err)));
    }
    setSyncingPrices(false);
  };
  const switchCurrency = async (key, newCur) => {
    const cur = edits[key];
    if (cur === void 0 || cur.currency === newCur) return;
    let rate = 1;
    if (newCur !== cur.baseCurrency) {
      try {
        const r = await fetch("/api/usage-meter/refresh-rate", { method: "POST" });
        if (r.ok) {
          const d = await r.json();
          rate = typeof d.usdToCny === "number" && d.usdToCny > 0 ? d.usdToCny : 1;
          rateRef.current = rate;
        }
      } catch {
        rate = 1;
      }
    }
    const scale = (v) => {
      const n = Number(v);
      if (v.trim() === "" || Number.isNaN(n)) return "";
      const converted = newCur === cur.baseCurrency ? n : convertAmount(n, cur.baseCurrency, newCur, rate);
      return String(Math.round(converted * 1e6) / 1e6);
    };
    setEdits((s) => {
      const base = s[key];
      if (base === void 0) return s;
      const next = { ...base, currency: newCur };
      for (const f of NUM_PRICE_FIELDS) next[f] = scale(base.base[f] ?? "");
      next.customRows = base.baseCustomRows.map((r) => ({ ...r, perM: scale(r.perM), peakPerM: scale(r.peakPerM), offPerM: scale(r.offPerM) }));
      if (newCur === base.baseCurrency) next.balance = base.base["balance"] ?? "";
      else {
        const origin = Number(base.base["balance"] ?? "");
        if (base.base["balance"] !== void 0 && base.base["balance"] !== "" && !Number.isNaN(origin)) {
          next.balance = String(Math.round(convertAmount(origin, base.baseCurrency, newCur, rateRef.current) * 1e6) / 1e6);
        }
      }
      return { ...s, [key]: next };
    });
    markDirty(key);
  };
  const editNum = (key, fld, val) => {
    if (fld === "balance") balanceDirtyRef.current.add(key);
    markDirty(key);
    setEdits((s) => {
      const cur = s[key];
      if (cur === void 0) return s;
      return cur.currency === cur.baseCurrency ? { ...s, [key]: { ...cur, [fld]: val, base: { ...cur.base, [fld]: val } } } : { ...s, [key]: { ...cur, [fld]: val } };
    });
  };
  const editCustomRow = (key, ri, updater) => {
    setEdits((s) => {
      const cur = s[key];
      if (cur === void 0) return s;
      const inBase = cur.currency === cur.baseCurrency;
      let rows = cur.customRows.map((x, i) => i === ri ? updater(x) : x);
      const picked = rows[ri]?.bucket;
      if (picked !== void 0) {
        const owner = rows.findIndex((x, i) => i !== ri && x.bucket === picked);
        if (owner >= 0) {
          const prev = cur.customRows[ri].bucket;
          rows = rows.map((x, i) => i === owner ? { ...x, bucket: prev } : x);
        }
      }
      return { ...s, [key]: { ...cur, customRows: rows, baseCustomRows: inBase ? rows : cur.baseCustomRows } };
    });
  };
  const addCustomRow = (key) => {
    setEdits((s) => {
      const cur = s[key];
      if (cur === void 0) return s;
      if (cur.customRows.length >= CUSTOM_BUCKETS.length) return s;
      const used = new Set(cur.customRows.map((r) => r.bucket));
      const bucket = CUSTOM_BUCKETS.find((b) => !used.has(b)) ?? "input";
      const inBase = cur.currency === cur.baseCurrency;
      const row2 = { bucket, perM: "", peakPerM: "", offPerM: "" };
      return { ...s, [key]: { ...cur, customRows: [...cur.customRows, row2], baseCustomRows: inBase ? [...cur.baseCustomRows, row2] : cur.baseCustomRows } };
    });
  };
  const delCustomRow = (key, ri) => {
    setEdits((s) => {
      const cur = s[key];
      if (cur === void 0) return s;
      const inBase = cur.currency === cur.baseCurrency;
      return { ...s, [key]: { ...cur, customRows: cur.customRows.filter((_, i) => i !== ri), baseCustomRows: inBase ? cur.baseCustomRows.filter((_, i) => i !== ri) : cur.baseCustomRows } };
    });
  };
  const toggleSharedBalance = async (provider, on) => {
    setSharedBalances((s) => ({ ...s, [provider]: on }));
    try {
      const res = await fetch("/api/usage-meter/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, sharedBalance: on })
      });
      if (!res.ok) setSharedBalances((s) => ({ ...s, [provider]: !on }));
    } catch {
      setSharedBalances((s) => ({ ...s, [provider]: !on }));
    }
  };
  const toggleSharedApiKey = async (provider, on) => {
    setSharedApiKeys((s) => ({ ...s, [provider]: on }));
    try {
      const res = await fetch("/api/usage-meter/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, sharedApiKey: on })
      });
      if (!res.ok) setSharedApiKeys((s) => ({ ...s, [provider]: !on }));
    } catch {
      setSharedApiKeys((s) => ({ ...s, [provider]: !on }));
    }
  };
  const setModelBalanceSource = async (provider, model, source) => {
    const sk = modelSourceKeyClient(provider, model);
    setBalanceSources((s) => ({ ...s, [sk]: source }));
    try {
      const res = await fetch("/api/usage-meter/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, model, balanceSource: source })
      });
      if (!res.ok) setBalanceSources((s) => {
        const n = { ...s };
        delete n[sk];
        return n;
      });
    } catch {
      setBalanceSources((s) => {
        const n = { ...s };
        delete n[sk];
        return n;
      });
    }
  };
  const saveModelApiKey = async (provider, model, plain) => {
    const k = draftKeyOf(provider, model);
    const sk = modelSourceKeyClient(provider, model);
    try {
      const res = await fetch("/api/usage-meter/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, model, modelApiKey: plain })
      });
      if (res.ok) {
        setModelApiKeyFlags((s) => plain.trim() === "" ? (() => {
          const n = { ...s };
          delete n[sk];
          return n;
        })() : { ...s, [sk]: true });
        setModelKeyDrafts((s) => ({ ...s, [k]: "" }));
      }
    } catch {
    }
  };
  const persistModel = async (provider, model, body) => {
    const k = draftKeyOf(provider, model);
    const res = await fetch("/api/usage-meter/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      balanceDirtyRef.current.delete(k);
      if (body.balance !== void 0) {
        setBalances((b) => ({ ...b, [`m:${provider}/${model}`]: { balance: Number(body.balance), currency: typeof body.balanceCurrency === "string" ? body.balanceCurrency : "CNY" } }));
      }
      setOverrides((o) => ({ ...o, [k]: {
        prices: body.prices,
        ...Array.isArray(body.rows) ? { rows: body.rows } : {},
        ...typeof body.templateId === "string" ? { templateId: body.templateId } : {}
      } }));
      setEdits((s) => {
        const cur = s[k];
        if (cur === void 0) return s;
        const base = { ...cur.base };
        for (const f of NUM_PRICE_FIELDS) base[f] = cur[f];
        return { ...s, [k]: { ...cur, baseCurrency: cur.currency, base, baseCustomRows: cur.customRows } };
      });
    }
    return res.ok;
  };
  const saveModelPrice = async (provider, model) => {
    const k = draftKeyOf(provider, model);
    if (k === activeKeyRef.current) {
      setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: tt("lockedSaveMsg") } }));
      window.setTimeout(() => setSaveStates((s) => {
        const n = { ...s };
        delete n[k];
        return n;
      }), 3500);
      return;
    }
    const body = buildModelBody(provider, model);
    if (body === null) return;
    let ok = false;
    try {
      ok = await persistModel(provider, model, body);
    } catch (err) {
      console.warn("[usage-meter] save model price failed", err);
    }
    if (ok) dirtyRef.current.delete(k);
    setSaveStates((s) => ({ ...s, [k]: { ok, msg: ok ? tt("savedUnit") : tt("saveFailedUnit") } }));
    window.setTimeout(() => setSaveStates((s) => {
      const n = { ...s };
      delete n[k];
      return n;
    }), 2500);
  };
  const resetModelPrice = (provider, model) => {
    const k = draftKeyOf(provider, model);
    if (k === activeKeyRef.current) {
      setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: tt("lockedSaveMsg") } }));
      window.setTimeout(() => setSaveStates((s) => {
        const n = { ...s };
        delete n[k];
        return n;
      }), 3500);
      return;
    }
    setEdits((s) => ({ ...s, [k]: seedEntry(k, overrides, balances) }));
    const official = isDeepseekRoute(provider);
    setSaveStates((s) => ({ ...s, [k]: { ok: true, msg: official ? tt("resetToOfficial") : tt("resetToSaved") } }));
    window.setTimeout(() => setSaveStates((s) => {
      const n = { ...s };
      delete n[k];
      return n;
    }), 2500);
  };
  const saveAllModels = async () => {
    const prov = modelDir.find((p) => p.provider === selProvider);
    if (prov === void 0) return;
    setSavingAll(true);
    await Promise.all(prov.models.map(async (m) => {
      const k = draftKeyOf(prov.provider, m.model);
      const body = buildModelBody(prov.provider, m.model);
      if (body === null) return;
      let ok = false;
      try {
        ok = await persistModel(prov.provider, m.model, body);
      } catch (err) {
        console.warn("[usage-meter] save all: failed", err);
      }
      setSaveStates((s) => ({ ...s, [k]: { ok, msg: ok ? tt("savedUnit") : tt("saveFailedUnit") } }));
    }));
    setSavingAll(false);
  };
  const [barMsg, setBarMsg] = (0, import_react.useState)({});
  const barStatus = (k, ok, msg) => {
    setBarMsg((s) => ({ ...s, [k]: { ok, msg } }));
    window.setTimeout(() => setBarMsg((s) => {
      const n = { ...s };
      delete n[k];
      return n;
    }), 3500);
  };
  const exportModelConfig = async (provider, model) => {
    const k = draftKeyOf(provider, model);
    const probe = await runExport(provider, model, {});
    if (!probe.ok) {
      barStatus(k, false, L("\u5BFC\u51FA\u5931\u8D25"));
      return;
    }
    if (probe.created === true) {
      barStatus(k, true, L("\u5DF2\u5BFC\u51FA\u5230\u8BA1\u8D39\u914D\u7F6E\u76EE\u5F55"));
      return;
    }
    setExportConflict({ provider, model, identical: probe.identical === true });
    setRenameMode(false);
    const ts = (() => {
      const d = /* @__PURE__ */ new Date();
      const p = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
    })();
    setRenameName(`dsh-billing-${provider.replace(/[^\w.-]+/g, "_")}-${model.replace(/[^\w.-]+/g, "_")} #1-${ts}.json`);
  };
  const exportBodyFor = (provider, model) => {
    const body = buildModelBody(provider, model);
    if (body === null) return null;
    return {
      templateId: body.templateId,
      displayCurrency: body.displayCurrency,
      prices: body.prices ?? {},
      ...Array.isArray(body.rows) ? { rows: body.rows } : {}
    };
  };
  const runExport = async (provider, model, extra) => {
    const doc = exportBodyFor(provider, model);
    if (doc === null) return { ok: false };
    try {
      const res = await fetch("/api/usage-meter/export-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, model, ...doc, ...extra })
      });
      if (!res.ok) return { ok: false };
      return await res.json().catch(() => ({}));
    } catch (err) {
      console.warn("[usage-meter] export failed", err);
      return { ok: false };
    }
  };
  const closeExportConflict = () => {
    setExportConflict(null);
    setRenameMode(false);
  };
  const confirmOverwriteExport = async () => {
    const c = exportConflict;
    if (c === null) return;
    const r = await runExport(c.provider, c.model, { force: true });
    barStatus(draftKeyOf(c.provider, c.model), r.ok === true, r.ok === true ? L("\u5DF2\u8986\u76D6") : L("\u5BFC\u51FA\u5931\u8D25"));
    closeExportConflict();
  };
  const confirmRenameExport = async () => {
    const c = exportConflict;
    if (c === null) return;
    const fname = renameName.trim().endsWith(".json") ? renameName.trim() : `${renameName.trim()}.json`;
    const r = await runExport(c.provider, c.model, { fileName: fname });
    const k = draftKeyOf(c.provider, c.model);
    if (r.ok === true && r.created === true) {
      barStatus(k, true, L("\u5DF2\u5BFC\u51FA\u5230\u8BA1\u8D39\u914D\u7F6E\u76EE\u5F55"));
      closeExportConflict();
      return;
    }
    if (r.exists === true) {
      barStatus(k, false, L("\u8BE5\u6587\u4EF6\u540D\u5DF2\u5B58\u5728\uFF0C\u8BF7\u6362\u540D\u91CD\u8BD5"));
      return;
    }
    barStatus(k, r.ok === true, r.ok === true ? L("\u5DF2\u5BFC\u51FA\u5230\u8BA1\u8D39\u914D\u7F6E\u76EE\u5F55") : L("\u5BFC\u51FA\u5931\u8D25"));
    closeExportConflict();
  };
  const triggerImport = async (provider, model) => {
    const k = draftKeyOf(provider, model);
    if (k === activeKeyRef.current) {
      setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: tt("lockedSaveMsg") } }));
      window.setTimeout(() => setSaveStates((s) => {
        const n = { ...s };
        delete n[k];
        return n;
      }), 3500);
      return;
    }
    try {
      const res = await fetch("/api/usage-meter/list-configs");
      if (res.ok) {
        const d = await res.json();
        setDirConfigs(d.files ?? []);
        setConfigDir(typeof d.dir === "string" ? d.dir : "");
      }
    } catch {
    }
    setImportPickerKey((prev) => prev === k ? "" : k);
  };
  const importFromDir = async (targetProvider, targetModel, fileName) => {
    const k = draftKeyOf(targetProvider, targetModel);
    setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: tt("savingUnit") } }));
    let ok = false;
    try {
      const res = await fetch("/api/usage-meter/import-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: targetProvider, model: targetModel, fileName })
      });
      ok = res.ok;
      if (res.ok) await reloadConfig();
    } catch (err) {
      console.warn("[usage-meter] import-from-dir failed", err);
    }
    barStatus(k, ok, ok ? L("\u5DF2\u5BFC\u5165\u8BA1\u8D39\u914D\u7F6E") : L("\u5BFC\u5165\u5931\u8D25"));
    setImportPickerKey("");
  };
  const reloadConfig = async () => {
    try {
      const res = await fetch("/api/usage-meter/config");
      if (!res.ok) return;
      const doc = await res.json();
      setOverrides(doc.priceOverrides ?? {});
      setBalances(doc.balances ?? {});
      const sb = {};
      const sk2 = {};
      for (const [pv, pc] of Object.entries(doc.providers ?? {})) {
        if (pc.sharedBalance === true) sb[pv] = true;
        if (pc.sharedApiKey === true) sk2[pv] = true;
      }
      setSharedBalances(sb);
      setSharedApiKeys(sk2);
    } catch {
    }
  };
  const saveBillingConfigDir = async () => {
    setDirMsg("");
    try {
      const res = await fetch("/api/usage-meter/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ billingConfigDir: configDirInput.trim() })
      });
      if (res.ok) {
        const lr = await fetch("/api/usage-meter/list-configs");
        if (lr.ok) {
          const d = await lr.json();
          setConfigDir(typeof d.dir === "string" ? d.dir : "");
        }
        setDirMsg(L("\u76EE\u5F55\u5DF2\u4FDD\u5B58"));
      } else {
        setDirMsg(L("\u4FDD\u5B58\u5931\u8D25"));
      }
    } catch (err) {
      console.warn("[usage-meter] save billingConfigDir failed", err);
      setDirMsg(L("\u4FDD\u5B58\u5931\u8D25"));
    }
    window.setTimeout(() => setDirMsg(""), 3e3);
  };
  const saveWrapperMarkers = async () => {
    setWmMsg("");
    try {
      const rows = wrapperMarkerRows.map((r) => ({ pattern: r.pattern.trim(), enabled: r.enabled })).filter((r) => r.pattern !== "");
      const res = await fetch("/api/usage-meter/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wrapperMarkers: rows })
      });
      setWmMsg(res.ok ? L("\u5DF2\u4FDD\u5B58\u8BC6\u522B\u6807\u8BB0") : L("\u4FDD\u5B58\u5931\u8D25"));
    } catch (err) {
      console.warn("[usage-meter] save wrapperMarkers failed", err);
      setWmMsg(L("\u4FDD\u5B58\u5931\u8D25"));
    }
    window.setTimeout(() => setWmMsg(""), 3e3);
  };
  const saveModelThreshold = async () => {
    setThrModelMsg("");
    if (thrProvider === "" || thrMode === "model" && thrModel === "") {
      setThrModelMsg(L("\u8BF7\u5148\u9009\u62E9\u4F9B\u5E94\u5546\u548C\u6A21\u578B"));
      window.setTimeout(() => setThrModelMsg(""), 3e3);
      return;
    }
    const key = thrMode === "global" ? `p:${thrProvider}` : `m:${thrProvider}/${thrModel}`;
    const def = {};
    if (thrType === "pct") {
      const pct = Number(thrPctM);
      def.budgetAlertPct = !Number.isNaN(pct) && pct >= 0 ? pct : 0;
      def.balanceAlertFloor = 0;
      def.followProvider = false;
    } else {
      const amt = Number(thrAmt);
      def.balanceAlertFloor = !Number.isNaN(amt) && amt >= 0 ? amt : 0;
      def.budgetAlertPct = 0;
      def.followProvider = false;
    }
    try {
      const res = await fetch("/api/usage-meter/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ thresholds: { [key]: def } })
      });
      if (res.ok) {
        setThresholds((s) => ({ ...s, [key]: def }));
        setThrModelMsg(L("\u5DF2\u4FDD\u5B58\u9884\u503C"));
      } else setThrModelMsg(L("\u4FDD\u5B58\u5931\u8D25"));
    } catch (err) {
      console.warn("[usage-meter] save model threshold failed", err);
      setThrModelMsg(L("\u4FDD\u5B58\u5931\u8D25"));
    }
    window.setTimeout(() => setThrModelMsg(""), 3e3);
  };
  const deleteConfig = async (fileName) => {
    if (!window.confirm(L("\u786E\u5B9A\u5220\u9664\u8BE5\u8BA1\u8D39\u914D\u7F6E\uFF1F"))) return;
    let ok = false;
    try {
      const res = await fetch("/api/usage-meter/delete-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName })
      });
      ok = res.ok;
    } catch (err) {
      console.warn("[usage-meter] delete config failed", err);
    }
    if (ok) {
      setDirConfigs((s) => s.filter((c) => c.name !== fileName));
      setDirDelMsg({ ok: true, msg: L("\u5DF2\u5220\u9664") });
    } else {
      setDirDelMsg({ ok: false, msg: L("\u5220\u9664\u5931\u8D25") });
    }
    window.setTimeout(() => setDirDelMsg(null), 3500);
  };
  const handleImportFile = async (ev) => {
    const t2 = importTargetRef.current;
    importTargetRef.current = null;
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (t2 === null || file === void 0) return;
    const k = draftKeyOf(t2.provider, t2.model);
    let doc;
    try {
      doc = JSON.parse(await file.text());
    } catch {
      setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: L("\u5BFC\u5165\u5931\u8D25") } }));
      window.setTimeout(() => setSaveStates((s) => {
        const n = { ...s };
        delete n[k];
        return n;
      }), 2500);
      return;
    }
    if (doc === null || typeof doc !== "object" || doc.__dshUsageMeter !== 1 || typeof doc.prices !== "object" || doc.prices === null) {
      setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: L("\u5BFC\u5165\u6587\u4EF6\u65E0\u6548") } }));
      window.setTimeout(() => setSaveStates((s) => {
        const n = { ...s };
        delete n[k];
        return n;
      }), 2500);
      return;
    }
    const body = {
      provider: t2.provider,
      model: t2.model,
      prices: doc.prices,
      displayCurrency: typeof doc.displayCurrency === "string" && doc.displayCurrency !== "" ? doc.displayCurrency : "CNY",
      templateId: typeof doc.templateId === "string" ? doc.templateId : ""
    };
    if (Array.isArray(doc.rows)) body.rows = doc.rows;
    let ok = false;
    try {
      ok = await persistModel(t2.provider, t2.model, body);
    } catch (err) {
      console.warn("[usage-meter] import billing config failed", err);
    }
    barStatus(k, ok, ok ? L("\u5DF2\u5BFC\u5165\u8BA1\u8D39\u914D\u7F6E") : L("\u5BFC\u5165\u5931\u8D25"));
  };
  const field = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "8px 0" };
  const label = { width: 132, minWidth: 132, fontSize: 13, color: t.brand, whiteSpace: "nowrap" };
  const input = { flex: 1, maxWidth: 320, padding: "6px 8px", border: "1px solid rgba(77,107,254,0.35)", borderRadius: 6, fontSize: 13, background: t.card, color: t.text };
  const select = { padding: "6px 8px", border: "1px solid rgba(77,107,254,0.35)", borderRadius: 6, fontSize: 13, background: t.card, color: t.text };
  const LABEL_W = 96;
  const CTL_H = 30;
  const ctl = (extra) => ({
    height: CTL_H,
    boxSizing: "border-box",
    padding: "0 8px",
    border: "1px solid rgba(77,107,254,0.35)",
    borderRadius: 6,
    fontSize: 13,
    background: t.card,
    color: t.text,
    ...extra
  });
  const formLabel = { width: LABEL_W, minWidth: LABEL_W, fontSize: 13, color: t.brand, textAlign: "right", whiteSpace: "nowrap" };
  const sectTitle = { fontSize: 12, fontWeight: 600, color: t.brand, margin: "0 0 6px" };
  const hint = { fontSize: 11, color: t.text3, lineHeight: 1.5 };
  const btnPrimary = { height: 30, padding: "0 20px", borderRadius: 6, border: "none", background: "linear-gradient(90deg, #4d6bfe 0%, #7c5cff 100%)", color: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(31,35,40,0.15), 0 0 12px rgba(77,107,254,0.35)" };
  const btnGhost = { height: 30, padding: "0 20px", borderRadius: 6, border: "1px solid rgba(77,107,254,0.35)", background: "transparent", color: t.text2, fontSize: 13, cursor: "pointer" };
  const btnSmall = { height: 26, padding: "0 12px", borderRadius: 6, border: "1px solid rgba(77,107,254,0.35)", background: "transparent", color: t.text2, fontSize: 12, cursor: "pointer" };
  const msToReadable = (ms) => {
    const n = Number(ms);
    if (Number.isNaN(n) || n <= 0) return ms;
    return n >= 864e5 ? `${Math.round(n / 864e5)}${L("\u5929")}` : n >= 36e5 ? `${Math.round(n / 36e5)}${L("\u5C0F\u65F6")}` : n >= 6e4 ? `${Math.round(n / 6e4)}${L("\u5206\u949F")}` : `${Math.round(n / 1e3)}${L("\u79D2")}`;
  };
  const readableToMs = (s) => {
    const m = /^\s*(\d+)\s*(秒|分钟|小时|天)\s*$/.exec(s);
    if (m) {
      const k = Number(m[1]);
      const [unit] = m.slice(2);
      const mult = unit === "\u79D2" ? 1e3 : unit === "\u5206\u949F" ? 6e4 : unit === "\u5C0F\u65F6" ? 36e5 : 864e5;
      return k * mult;
    }
    const n = Number(s);
    return Number.isNaN(n) ? 0 : n;
  };
  const save = async () => {
    setSaving(true);
    try {
      const patch = {};
      if (apiKey.trim() !== "" && apiKey !== "***") patch.deepseekApiKey = apiKey.trim();
      patch.provider = "*";
      const res = await fetch("/api/usage-meter/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      if (res.ok) {
        setSaveOk(true);
        setSaveMsg(L("\u5DF2\u4FDD\u5B58"));
        if (apiKey.trim() !== "" && apiKey !== "***") {
          setKeySaved(true);
          setApiKey("");
        }
      } else {
        setSaveOk(false);
        setSaveMsg(L("\u4FDD\u5B58\u5931\u8D25 (") + `${res.status})`);
      }
    } catch (err) {
      console.warn("[usage-meter] save config failed", err);
      setSaveOk(false);
      setSaveMsg(L("\u4FDD\u5B58\u5931\u8D25"));
    }
    setSaving(false);
    window.setTimeout(() => {
      setSaveMsg("");
      setSaveOk(false);
    }, 2500);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "16px 24px 24px", fontSize: 13, color: t.text, fontFamily: fontStackOf(fontMode, fontCustom), fontWeight: Number(fontWeightForCategory(fontMode, fontCustom, "body")) || void 0 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: 0.8, color: t.brand, background: "linear-gradient(90deg, #4d6bfe 0%, #7c5cff 55%, #38bdf8 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }, children: L("\u7528\u91CF\u8BA1\u91CF") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: 6 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3 }, children: tt("language") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "select",
          {
            value: langSel,
            onChange: (ev) => {
              const v = ev.target.value;
              setLangSel(v);
              setManualLang(v === "auto" ? null : v);
              try {
                localStorage.setItem("um-lang-sel", v);
              } catch {
              }
              try {
                window.dispatchEvent(new CustomEvent("um-lang-change"));
              } catch {
              }
              setForce((x) => x + 1);
            },
            style: { padding: "2px 6px", border: "1px solid rgba(77,107,254,0.35)", borderRadius: 5, background: t.card, color: t.text, fontSize: 12 },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "auto", children: L("\u8DDF\u968F\u7CFB\u7EDF") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "zh", children: L("\u4E2D\u6587") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "en", children: "English" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { color: t.text3, fontSize: 12, margin: "0 0 12px" }, children: tt("subtitle") }),
    loadError !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginBottom: 12, padding: "8px 10px", border: `1px solid ${t.error}`, borderRadius: 6, color: t.error, fontSize: 12 }, children: loadError }),
    loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 13 }, children: L("\u52A0\u8F7D\u5168\u5C40\u914D\u7F6E\u2026") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: field, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: label, htmlFor: "um-key", children: tt("apiKey") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, display: "flex", gap: 8, maxWidth: 360, alignItems: "center" }, children: [
          keySaved ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { padding: "4px 8px", borderRadius: 6, background: "rgba(22, 163, 74, 0.10)", color: t.ok, fontSize: 12, whiteSpace: "nowrap" }, children: tt("keySavedChip") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3, fontSize: 12, whiteSpace: "nowrap" }, children: tt("keyNotSet") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: "um-key",
              value: apiKey,
              onChange: (e) => {
                setApiKey(e.target.value);
              },
              placeholder: keySaved ? tt("keyPlaceholderSaved") : tt("keyPlaceholderNew"),
              autoComplete: "off",
              style: { ...input, maxWidth: 200 }
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: field, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: label, htmlFor: "um-rate", children: tt("rate") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, display: "flex", gap: 8, maxWidth: 360, alignItems: "center" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 13, color: t.text }, children: [
            pageRate.usdToCny > 0 ? pageRate.usdToCny.toFixed(4) : tt("notFetched"),
            " CNY"
          ] }),
          pageRate.updatedAt > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, color: Date.now() - pageRate.updatedAt > 24 * 3600 * 1e3 ? t.error : t.text3, whiteSpace: "nowrap" }, children: [
            tt("fetchedAt"),
            " ",
            fmtTime(pageRate.updatedAt),
            Date.now() - pageRate.updatedAt > 24 * 3600 * 1e3 ? tt("staleOver24h") : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => void (async () => {
            try {
              const r = await fetch("/api/usage-meter/refresh-rate", { method: "POST" });
              if (r.ok) {
                const d = await r.json();
                setPageRate({ usdToCny: typeof d.usdToCny === "number" ? d.usdToCny : pageRate.usdToCny, updatedAt: typeof d.rateUpdatedAt === "number" ? d.rateUpdatedAt : Date.now() });
              }
            } catch {
            }
          })(), style: { fontSize: 12, padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(77,107,254,0.45)", background: "rgba(77,107,254,0.08)", color: t.brand, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }, children: L("\u5237\u65B0\u6C47\u7387") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: field, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: label, children: tt("officialPrices") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, display: "flex", gap: 8, maxWidth: 420, alignItems: "center", flexWrap: "wrap" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: () => void onSyncOfficialPrices(),
              disabled: syncingPrices,
              style: { fontSize: 12, padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(77,107,254,0.45)", background: "rgba(77,107,254,0.08)", color: t.brand, fontWeight: 600, cursor: syncingPrices ? "wait" : "pointer", opacity: syncingPrices ? 0.6 : 1, whiteSpace: "nowrap" },
              children: syncingPrices ? L("\u540C\u6B65\u4E2D\u2026") : L("\u4E00\u952E\u540C\u6B65\u5B98\u65B9\u4EF7\u683C")
            }
          ),
          officialSyncLast !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, color: t.text3 }, children: [
            L("\u4E0A\u6B21\u540C\u6B65 "),
            new Date(officialSyncLast.at).toLocaleString()
          ] }),
          syncPricesMsg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: syncPricesOk ? t.ok : t.text3, maxWidth: "100%", whiteSpace: "pre-line" }, children: syncPricesMsg })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 16, display: "flex", alignItems: "center", gap: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: save, disabled: saving, style: { fontSize: 13, padding: "6px 18px", borderRadius: 6, border: "none", background: saving ? "rgba(139,148,158,0.45)" : "linear-gradient(90deg, #4d6bfe, #7c5cff)", color: "#ffffff", fontWeight: 600, cursor: saving ? "default" : "pointer" }, children: saving ? tt("savingUnit") : tt("save") }),
        "            ",
        saveMsg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 12, color: saveOk ? t.ok : t.error }, children: [
          saveMsg,
          saveOk && apiKey.trim() !== "" ? L(" \xB7 \u5DF2\u66F4\u65B0 API Key") : ""
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 16, paddingTop: 12, borderTop: `1px solid ${t.borderSoft}` }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 700, fontSize: 13, marginBottom: 2, background: "linear-gradient(90deg, #4d6bfe, #7c5cff)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }, children: L("\u7528\u91CF\u8BA1\u91CF \xB7 \u6A21\u578B\u914D\u7F6E") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 11, marginBottom: 0 }, children: L("\u6309\u4F9B\u5E94\u5546 \u2192 \u6A21\u578B\u4E3A\u6BCF\u4E2A\u6A21\u578B\u5355\u72EC\u8BBE\u7F6E\u5E01\u79CD\u3001\u7528\u6237\u4F59\u989D\u3001\u5355\u4EF7\uFF08\u542B\u5CF0\u8C37\u4EF7\u5BF9\uFF09\u3001\u751F\u6548\u661F\u671F\u4E0E\u9AD8\u5CF0\u65F6\u6BB5\u3002") })
          ] }),
          (() => {
            const prov = modelDir.find((p) => p.provider === selProvider);
            if (prov === void 0 || prov.models.length === 0) return null;
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: () => void saveAllModels(),
                disabled: savingAll,
                style: { fontSize: 12, padding: "5px 14px", borderRadius: 6, border: "none", background: savingAll ? "rgba(139,148,158,0.45)" : "linear-gradient(90deg, #4d6bfe, #7c5cff)", color: "#ffffff", fontWeight: 600, cursor: savingAll ? "default" : "pointer", whiteSpace: "nowrap" },
                children: savingAll ? "saving" : L("\u4E00\u952E\u4FDD\u5B58\u5168\u90E8")
              }
            );
          })()
        ] }),
        modelsLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 12, marginTop: 8 }, children: L("\u52A0\u8F7D\u6A21\u578B\u76EE\u5F55\u2026") }) : modelDir.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 12, marginTop: 8 }, children: L("\u672A\u4ECE\u6A21\u578B\u76EE\u5F55\u83B7\u53D6\u5230\u6A21\u578B\u3002\u8BF7\u786E\u8BA4\u5F53\u524D\u7EC4\u5408\u5DF2\u6CE8\u518C LLM \u9002\u914D\uFF08ctx.llm\uFF09\u3002") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { fontSize: 12, color: t.brand }, htmlFor: "um-provider", children: L("\u4F9B\u5E94\u5546") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "select",
              {
                id: "um-provider",
                value: selProvider,
                onChange: (e) => setSelProvider(e.target.value),
                style: select,
                children: modelDir.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: p.provider, children: p.label }, p.provider))
              }
            )
          ] }),
          !isDeepseekRoute(selProvider) && selProvider !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flex: "none" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { title: L("\u8BE5\u4F9B\u5E94\u5546\u6240\u6709\u6A21\u578B\u5171\u7528\u540C\u4E00\u4E2A\u624B\u52A8\u586B\u5165\u7684\u7528\u6237\u4F59\u989D"), style: { display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    checked: sharedBalances[selProvider] === true,
                    onChange: (ev) => void toggleSharedBalance(selProvider, ev.target.checked),
                    style: { accentColor: t.accent }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.brand }, children: L("\u5171\u4EAB\u4F59\u989D") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 }, children: L("\u6240\u6709\u6A21\u578B\u5171\u7528\u4E00\u4E2A\u7528\u6237\u4F59\u989D") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flex: "none" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { title: L("\u7EC4\u5185\u9009\u62E9 DeepSeek \u5B98\u65B9\u4F59\u989D\u6765\u6E90\u7684\u6A21\u578B\u5171\u7528\u540C\u4E00\u628A\u5DF2\u586B\u7684 API Key\uFF1B\u67D0\u6A21\u578B\u81EA\u5DF1\u586B\u4E86 Key \u5219\u4F18\u5148\u7528\u81EA\u5DF1\u7684"), style: { display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    checked: sharedApiKeys[selProvider] === true,
                    onChange: (ev) => void toggleSharedApiKey(selProvider, ev.target.checked),
                    style: { accentColor: t.accent }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.brand }, children: L("\u5171\u4EAB API Key") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 }, children: L("\u7EC4\u5185 DeepSeek \u6A21\u578B\u5171\u7528\u540C\u4E00\u628A\u5DF2\u586B Key") })
            ] })
          ] }),
          (() => {
            const active = modelDir.find((p) => p.provider === selProvider);
            if (active === void 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 12 }, children: L("\u8BF7\u9009\u62E9\u4F9B\u5E94\u5546") });
            if (active.models.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 12 }, children: L("\u8BE5\u4F9B\u5E94\u5546\u4E0B\u6682\u65E0\u6A21\u578B") });
            const deep = isDeepseekRoute(active.provider);
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: active.models.map((m) => {
              const k = draftKeyOf(active.provider, m.model);
              const e = edits[k];
              if (e === void 0) return null;
              const srcKey = modelSourceKeyClient(active.provider, m.model);
              const src = deep ? "deepseek" : balanceSources[srcKey] ?? "manual";
              const providerSharedKey = sharedApiKeys[active.provider] === true && Object.keys(modelApiKeyFlags).some((k2) => k2.startsWith(`m:${active.provider}/`) && modelApiKeyFlags[k2] === true);
              const hasModelKey = modelApiKeyFlags[srcKey] === true || providerSharedKey;
              const isOpen = expanded[k] === true;
              const st = saveStates[k];
              const locked = k === activeKey;
              const sharedBalanceLocked = sharedBalances[selProvider] === true && activeKey !== "" && activeKey.split("/")[0] === selProvider;
              const cell = { width: "100%", minWidth: 80, boxSizing: "border-box", textAlign: "right", height: CTL_H, padding: "0 8px", border: "1px solid rgba(77,107,254,0.35)", borderRadius: 6, fontSize: 13, background: t.card, color: t.text };
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { border: "1px solid rgba(77,107,254,0.35)", borderRadius: 8, overflow: "hidden", boxShadow: "0 0 0 1px rgba(77,107,254,0.06), 0 2px 12px rgba(31,35,40,0.08), 0 0 20px rgba(77,107,254,0.12)", background: "linear-gradient(180deg, rgba(77,107,254,0.08), rgba(124,92,255,0.02))" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      if (isOpen) {
                        if (importPickerKey === k) setImportPickerKey("");
                        if (exportConflict !== null && exportConflict.provider === active.provider && exportConflict.model === m.model) closeExportConflict();
                      }
                      setExpanded((s) => ({ ...s, [k]: !isOpen }));
                    },
                    style: { display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, fontWeight: 600, border: "none", background: isOpen ? "linear-gradient(90deg, rgba(77,107,254,0.22), rgba(124,92,255,0.08))" : "rgba(77,107,254,0.05)", color: t.text, cursor: "pointer", borderBottom: isOpen ? "1px solid rgba(77,107,254,0.15)" : "none" },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.brand }, children: isOpen ? "\u25BC" : "\u25B6" }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.brand, fontWeight: 600 }, children: m.label }),
                      e.peakOn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "rgba(77,107,254,0.12)", color: t.brand, whiteSpace: "nowrap" }, children: tt("peakBadge") }),
                      locked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "rgba(220,38,38,0.12)", color: t.error, whiteSpace: "nowrap" }, children: tt("lockedBadge") }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.brand, fontWeight: 600 }, children: e.currency })
                    ]
                  }
                ),
                isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("fieldset", { disabled: locked, style: { border: "none", margin: 0, padding: 0, minWidth: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 10, opacity: locked ? 0.75 : void 0, background: "linear-gradient(180deg, rgba(77,107,254,0.06), rgba(124,92,255,0.015))" }, children: [
                    locked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.error, fontSize: 11, lineHeight: 1.4 }, children: tt("lockedHint") }),
                    e.noSavedPrice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.error, fontSize: 11, lineHeight: 1.4 }, children: tt("noSavedPrice") }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 4 }, children: [
                      barMsg[k] !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginRight: "auto", fontSize: 11, fontWeight: 600, color: barMsg[k].ok ? t.ok : t.error, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: barMsg[k].msg }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: () => void exportModelConfig(active.provider, m.model),
                          disabled: locked,
                          style: { ...btnSmall, opacity: locked ? 0.5 : 1, cursor: locked ? "not-allowed" : "pointer" },
                          children: L("\u5BFC\u51FA\u8BA1\u8D39\u914D\u7F6E")
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: () => void triggerImport(active.provider, m.model),
                          disabled: locked,
                          style: { ...btnSmall, opacity: locked ? 0.5 : 1, cursor: locked ? "not-allowed" : "pointer" },
                          children: L("\u5BFC\u5165\u8BA1\u8D39\u914D\u7F6E")
                        }
                      )
                    ] }),
                    exportConflict !== null && exportConflict.provider === active.provider && exportConflict.model === m.model && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { border: "1px solid rgba(240, 68, 68, 0.4)", borderRadius: 8, padding: 8, marginBottom: 8, background: "rgba(240, 68, 68, 0.05)" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 11, color: t.error, marginBottom: 6, fontWeight: 600 }, children: [
                        L("\u5DF2\u5B58\u5728\u540C\u540D\u914D\u7F6E"),
                        "\uFF08",
                        exportConflict.identical ? L("\u5185\u5BB9\u76F8\u540C") : L("\u5185\u5BB9\u4E0D\u540C"),
                        "\uFF09\u2014 ",
                        L("\u8BF7\u9009\u62E9\uFF1A")
                      ] }),
                      !renameMode ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "button",
                          {
                            type: "button",
                            onClick: () => void confirmOverwriteExport(),
                            style: { ...btnSmall, background: "linear-gradient(90deg, #4d6bfe, #7c5cff)", color: "#ffffff", border: "none", fontWeight: 600 },
                            children: L("\u8986\u76D6\u73B0\u6709\u6A21\u677F")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setRenameMode(true), style: { ...btnSmall }, children: L("\u91CD\u547D\u540D\u4FDD\u5B58") }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: closeExportConflict, title: L("\u53D6\u6D88"), style: { ...btnSmall, color: t.text3 }, children: "\u2715" })
                      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "input",
                          {
                            value: renameName,
                            onChange: (ev) => setRenameName(ev.target.value),
                            autoFocus: true,
                            style: { flex: 1, minWidth: 200, padding: "6px 8px", border: "1px solid rgba(77,107,254,0.35)", borderRadius: 6, fontSize: 12, background: t.card, color: t.text, boxSizing: "border-box" }
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "button",
                          {
                            type: "button",
                            onClick: () => void confirmRenameExport(),
                            style: { ...btnSmall, background: "linear-gradient(90deg, #4d6bfe, #7c5cff)", color: "#ffffff", border: "none", fontWeight: 600 },
                            children: L("\u786E\u8BA4\u4FDD\u5B58")
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: closeExportConflict, title: L("\u53D6\u6D88"), style: { ...btnSmall, color: t.text3 }, children: "\u2715" })
                      ] })
                    ] }),
                    importPickerKey === k && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { border: "1px solid rgba(77,107,254,0.35)", borderRadius: 8, padding: 8, marginBottom: 8, background: "rgba(77,107,254,0.05)" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 11, color: t.brand, marginBottom: 6 }, children: [
                        L("\u4ECE\u8BA1\u8D39\u914D\u7F6E\u76EE\u5F55\u5BFC\u5165\u5230\u672C\u6A21\u578B\uFF1A"),
                        configDir !== "" ? configDir : L("\uFF08\u9ED8\u8BA4\u76EE\u5F55\uFF09")
                      ] }),
                      overrides[draftKeyOf(active.provider, m.model)] !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.error, marginBottom: 6, fontWeight: 600 }, children: L("\u8BE5\u6A21\u578B\u5DF2\u6709\u8BA1\u8D39\u914D\u7F6E\uFF0C\u5BFC\u5165\u5C06\u8986\u76D6\u73B0\u6709\u6A21\u677F\u3002") }),
                      dirDelMsg !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: dirDelMsg.ok ? t.ok : t.error, marginBottom: 6 }, children: dirDelMsg.msg }),
                      dirConfigs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text3, marginBottom: 6 }, children: L("\u76EE\u5F55\u4E3A\u7A7A\uFF0C\u8BF7\u5148\u53BB\u5176\u4ED6\u6A21\u578B\u70B9\u300C\u5BFC\u51FA\u8BA1\u8D39\u914D\u7F6E\u300D") }),
                      dirConfigs.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 0" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3, fontWeight: 600 }, children: fmtListTime(c.mtime) }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3, fontSize: 10 }, children: "\xB7" }),
                          c.provider,
                          " \xB7 ",
                          c.model,
                          versionSuffixOf(c.name) !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 10, padding: "0 5px", borderRadius: 4, background: "rgba(124,92,255,0.14)", color: "#7c5cff", fontWeight: 600 }, children: [
                            "#",
                            versionSuffixOf(c.name)
                          ] })
                        ] }) }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "flex", gap: 6 }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => void importFromDir(active.provider, m.model, c.name), style: { ...btnSmall }, children: L("\u5BFC\u5165") }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => void deleteConfig(c.name), style: { ...btnSmall, color: t.error }, children: L("\u5220\u9664") })
                        ] })
                      ] }, c.name)),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 6, display: "flex", alignItems: "center", gap: 8 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
                          importTargetRef.current = { provider: active.provider, model: m.model };
                          fileInputRef.current?.click();
                          setImportPickerKey("");
                        }, style: { ...btnSmall }, children: L("\u624B\u52A8\u9009\u6587\u4EF6\u2026") }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3 }, children: L("\uFF08\u8DE8\u673A\u5668\u5BFC\u5165\u7528\uFF09") })
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "92px 340px", columnGap: 10, rowGap: 10, alignItems: "center", width: "fit-content", margin: "0 auto" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: formLabel, children: tt("currency") }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                        "select",
                        {
                          id: `um-cur-${k}`,
                          value: e.currency,
                          onChange: (ev) => void switchCurrency(k, ev.target.value),
                          style: ctl({ width: "100%" }),
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "CNY", children: "CNY (\xA5)" }),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "USD", children: "USD ($)" })
                          ]
                        }
                      ),
                      !deep && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: formLabel, children: L("\u4F59\u989D\u6765\u6E90") }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { fontSize: 12, color: t.text2, display: "inline-flex", alignItems: "center", gap: 4, cursor: locked ? "default" : "pointer" }, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              "input",
                              {
                                type: "radio",
                                name: `um-bs-${k}`,
                                checked: src === "manual",
                                disabled: locked,
                                onChange: () => void setModelBalanceSource(active.provider, m.model, "manual")
                              }
                            ),
                            L("\u7528\u6237\u4F59\u989D")
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { fontSize: 12, color: t.text2, display: "inline-flex", alignItems: "center", gap: 4, cursor: locked ? "default" : "pointer" }, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              "input",
                              {
                                type: "radio",
                                name: `um-bs-${k}`,
                                checked: src === "deepseek",
                                disabled: locked,
                                onChange: () => void setModelBalanceSource(active.provider, m.model, "deepseek")
                              }
                            ),
                            L("DeepSeek \u5B98\u65B9")
                          ] })
                        ] })
                      ] }),
                      !deep && src === "manual" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: formLabel, children: tt("balance") }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "input",
                          {
                            id: `um-bal-${k}`,
                            value: e.balance,
                            disabled: locked || sharedBalanceLocked,
                            title: sharedBalanceLocked ? tt("sharedBalanceLockHint") : void 0,
                            onChange: (ev) => editNum(k, "balance", ev.target.value),
                            placeholder: "\u5982 100",
                            style: ctl({ width: "100%" })
                          }
                        ) }),
                        sharedBalanceLocked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.error, fontSize: 11, lineHeight: 1.4, gridColumn: "2" }, children: tt("sharedBalanceLockHint") })
                      ] }),
                      !deep && src === "deepseek" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: formLabel, children: L("DS API Key") }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "input",
                            {
                              type: "password",
                              value: modelKeyDrafts[k] ?? "",
                              disabled: locked,
                              onChange: (ev) => setModelKeyDrafts((s) => ({ ...s, [k]: ev.target.value })),
                              placeholder: hasModelKey ? L("\u5DF2\u586B\u5165 API key\uFF0C\u91CD\u65B0\u8F93\u5165\u4EE5\u8986\u76D6") : L("\u5982 sk-\u2026"),
                              style: { ...ctl({ flex: 1 }), minWidth: 0 }
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "button",
                            {
                              type: "button",
                              disabled: locked || (modelKeyDrafts[k] ?? "").trim() === "",
                              onClick: () => void saveModelApiKey(active.provider, m.model, (modelKeyDrafts[k] ?? "").trim()),
                              style: { ...btnSmall, whiteSpace: "nowrap" },
                              children: L("\u4FDD\u5B58")
                            }
                          )
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: hasModelKey ? t.ok : t.text3, lineHeight: 1.4, gridColumn: "1 / -1", textAlign: "center" }, children: hasModelKey ? L("\u5DF2\u586B\u5165 API key\uFF08\u4EC5 DeepSeek \u6A21\u578B\u4F7F\u7528\uFF09") : L("\u8BE5\u9009\u9879\u4EC5 DeepSeek \u6A21\u578B\u4F7F\u7528") })
                      ] }),
                      templates.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: formLabel, children: tt("billingTemplate") }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                          "select",
                          {
                            id: `um-tpl-${k}`,
                            value: e.templateId,
                            onChange: (ev) => {
                              const tpl = templates.find((tp) => tp.id === ev.target.value);
                              const v = ev.target.value;
                              setEdits((s) => ({ ...s, [k]: {
                                ...e,
                                templateId: v,
                                combined: tpl?.mode === "combined",
                                discount: tpl?.mode === "keep" ? "0.5" : "",
                                peakOn: tpl?.peak === true,
                                // 自定义：给一组默认单价项（输入/输出），用户可增删。
                                // 选命名模板：清空 customRows（宿主以模板/固定格计价）。
                                customRows: v === "" ? e.customRows.length > 0 ? e.customRows : [{ bucket: "input", perM: "", peakPerM: "", offPerM: "" }, { bucket: "output", perM: "", peakPerM: "", offPerM: "" }] : []
                              } }));
                            },
                            style: ctl({ width: "100%" }),
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: L("\uFF08\u81EA\u5B9A\u4E49\uFF09") }),
                              templates.map((tp) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: tp.id, children: L(tp.label) }, tp.id))
                            ]
                          }
                        ) })
                      ] }),
                      e.combined && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text2, gridColumn: "1 / -1" }, children: tt("discountNote") }),
                      e.discount !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: formLabel, children: tt("batchDiscount") }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "input",
                          {
                            id: `um-disc-${k}`,
                            value: e.discount,
                            onChange: (ev) => setEdits((s) => ({ ...s, [k]: { ...e, discount: ev.target.value } })),
                            placeholder: L("\u5982 0.5"),
                            style: ctl({ maxWidth: 90, justifySelf: "start" })
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { borderTop: `1px solid ${t.borderSoft}`, margin: "12px 0 10px" } }),
                    e.templateId === "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: sectTitle, children: L("\u81EA\u5B9A\u4E49\u5355\u4EF7\u9879\uFF08\u6BCF\u884C = \u5355\u4EF7 \xD7 \u8BE5\u884C token \u6570\uFF1B\u5CF0\u8C37\u4EF7\u5728\u4E0B\u65B9\u300C\u542F\u7528\u5CF0\u8C37\u8BA1\u8D39\u300D\u91CC\u7EDF\u4E00\u586B\uFF09") }),
                      e.customRows.map((r, ri) => {
                        const usedElsewhere = new Set(e.customRows.map((x) => x.bucket));
                        usedElsewhere.delete(r.bucket);
                        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }, children: [
                          CUSTOM_BUCKETS.map((b) => {
                            const disabled = usedElsewhere.has(b);
                            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: 3, cursor: disabled ? "not-allowed" : "pointer", fontSize: 11, color: disabled ? t.text3 : t.text }, children: [
                              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                                "input",
                                {
                                  type: "radio",
                                  name: `um-cb-${k}-${ri}`,
                                  checked: r.bucket === b,
                                  disabled,
                                  onChange: () => editCustomRow(k, ri, (x) => ({ ...x, bucket: b })),
                                  style: { accentColor: t.accent }
                                }
                              ),
                              L(CUSTOM_BUCKET_LABEL[b])
                            ] }, b);
                          }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, color: t.brand, minWidth: 56, fontWeight: 600 }, children: [
                            "\uFF1D ",
                            L(CUSTOM_BUCKET_LABEL[r.bucket])
                          ] }),
                          e.peakOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3, minWidth: 80, textAlign: "right" }, children: L("\u5CF0\u8C37\u63A5\u7BA1 \u2192") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "input",
                            {
                              value: r.perM,
                              placeholder: tt("yuanPerM"),
                              onChange: (ev) => editCustomRow(k, ri, (x) => ({ ...x, perM: ev.target.value })),
                              style: ctl({ maxWidth: 80 })
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "button",
                            {
                              type: "button",
                              onClick: () => delCustomRow(k, ri),
                              style: { fontSize: 11, padding: "2px 8px", borderRadius: 6, border: `1px solid ${t.borderSoft}`, background: "transparent", color: t.text2, cursor: "pointer" },
                              children: tt("del")
                            }
                          )
                        ] }, ri);
                      }),
                      e.customRows.length < CUSTOM_BUCKETS.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "button",
                        {
                          type: "button",
                          onClick: () => addCustomRow(k),
                          style: { fontSize: 11, padding: "2px 10px", borderRadius: 6, border: "1px solid rgba(77,107,254,0.35)", background: t.accent, color: t.text, cursor: "pointer" },
                          children: tt("customAddRow")
                        }
                      )
                    ] }),
                    e.templateId !== "" && !(deep || e.templateId === "peak-off-peak" || e.peakOn) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: sectTitle, children: tt("basePrice") }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 8 }, children: columnsForTemplate(e.templateId, templates).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3 }, children: FIELD_LABEL[f] }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "input",
                          {
                            id: `um-${f}-${k}`,
                            value: e[f],
                            onChange: (ev) => editNum(k, f, ev.target.value),
                            placeholder: tt("yuanPerM"),
                            style: cell
                          }
                        )
                      ] }, f)) })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }, children: (deep || e.templateId === "peak-off-peak" || e.templateId === "" || e.peakOn) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "input",
                            {
                              type: "checkbox",
                              checked: e.peakOn,
                              onChange: (ev) => {
                                const on = ev.target.checked;
                                setEdits((s) => {
                                  const cur = s[k];
                                  if (cur === void 0) return s;
                                  if (cur.templateId !== "") return { ...s, [k]: { ...cur, peakOn: on } };
                                  const rows = on ? cur.customRows.map((r) => ({ ...r, offPerM: r.offPerM.trim() === "" ? r.perM : r.offPerM })) : cur.customRows.map((r) => ({ ...r, perM: r.offPerM.trim() !== "" ? r.offPerM : r.perM.trim() !== "" ? r.perM : r.peakPerM, peakPerM: "", offPerM: "" }));
                                  const inBase = cur.currency === cur.baseCurrency;
                                  return { ...s, [k]: { ...cur, peakOn: on, customRows: rows, baseCustomRows: inBase ? rows : cur.baseCustomRows } };
                                });
                              },
                              style: { accentColor: t.accent }
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.text2 }, children: tt("peakToggle") })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: hint, children: [
                          "\u5CF0: \u9AD8; \u8C37: \u4F4E; ",
                          tt("uncheckIsOff")
                        ] })
                      ] }) }),
                      e.peakOn && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6, padding: "6px 8px", background: "rgba(77,107,254,0.07)", borderRadius: 4 }, children: [
                        e.templateId === "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: e.customRows.map((r, ri) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text2, width: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: CUSTOM_BUCKET_LABEL[r.bucket] }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3 }, children: tt("peakPrice") }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "input",
                            {
                              value: r.peakPerM,
                              placeholder: tt("yuanPerM"),
                              onChange: (ev) => editCustomRow(k, ri, (x) => ({ ...x, peakPerM: ev.target.value })),
                              style: ctl({ maxWidth: 90 })
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3 }, children: tt("offPrice") }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "input",
                            {
                              value: r.offPerM,
                              placeholder: tt("yuanPerM"),
                              onChange: (ev) => editCustomRow(k, ri, (x) => ({ ...x, offPerM: ev.target.value })),
                              style: ctl({ maxWidth: 90 })
                            }
                          )
                        ] }, ri)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 8 }, children: [[L("\u8F93\u5165(\u672A\u547D\u4E2D)"), "inputPeak", "inputOff"], [L("\u7F13\u5B58\u547D\u4E2D"), "cachePeak", "cacheOff"], [L("\u8F93\u51FA"), "outPeak", "outOff"]].map(([lab, pk, off]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3 }, children: lab }),
                          [[pk, "\u5CF0\u4EF7"], [off, "\u8C37\u4EF7"]].map(([fld, tag]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3, whiteSpace: "nowrap" }, children: tt(tag === "\u5CF0\u4EF7" ? "peakPrice" : "offPrice") }),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              "input",
                              {
                                id: `um-${fld}-${k}`,
                                value: e[fld],
                                onChange: (ev) => editNum(k, fld, ev.target.value),
                                placeholder: tt("yuanPerM"),
                                style: { ...cell, flex: 1, minWidth: 0 }
                              }
                            )
                          ] }, fld))
                        ] }, pk)) }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text2, whiteSpace: "nowrap" }, children: tt("peakDaysLabel") }),
                          DAY_LABELS.map(([d, lbl]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: 3, cursor: "pointer" }, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              "input",
                              {
                                type: "checkbox",
                                checked: e.days.includes(d),
                                onChange: (ev) => setEdits((s) => {
                                  const prev = e.days;
                                  const next = ev.target.checked ? [...prev, d].sort((a, b) => a - b) : prev.filter((x) => x !== d);
                                  return { ...s, [k]: { ...e, days: next } };
                                }),
                                style: { accentColor: t.accent }
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text }, children: L(lbl) })
                          ] }, d))
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text2, marginBottom: 3 }, children: tt("peakHoursLabel") }),
                          e.windows.map((p, pi) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 4, marginBottom: 4, flexWrap: "wrap" }, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, color: t.text3 }, children: [
                              pi + 1,
                              "."
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3 }, children: tt("start") }),
                            [["sh", 23], ["sm", 59]].map(([f, max]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              "select",
                              {
                                value: p[f],
                                "aria-label": `${f}-${pi}`,
                                onChange: (ev) => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.map((x, xi) => xi === pi ? { ...x, [f]: ev.target.value } : x) } })),
                                style: ctl({ height: 26, padding: "0 4px", fontSize: 12, borderRadius: 5 }),
                                children: Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: v, children: v }, v))
                              },
                              f
                            )),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3 }, children: tt("hourUnit") }),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3 }, children: tt("end") }),
                            [["eh", 23], ["em", 59]].map(([f, max]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              "select",
                              {
                                value: p[f],
                                "aria-label": `${f}-${pi}`,
                                onChange: (ev) => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.map((x, xi) => xi === pi ? { ...x, [f]: ev.target.value } : x) } })),
                                style: ctl({ height: 26, padding: "0 4px", fontSize: 12, borderRadius: 5 }),
                                children: Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: v, children: v }, v))
                              },
                              f
                            )),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                              "button",
                              {
                                type: "button",
                                onClick: () => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.filter((_, xi) => xi !== pi) } })),
                                disabled: e.windows.length <= 1,
                                style: { fontSize: 11, padding: "2px 8px", borderRadius: 6, border: `1px solid ${t.borderSoft}`, background: "transparent", color: t.text2, cursor: "pointer" },
                                children: tt("del")
                              }
                            )
                          ] }, pi)),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "button",
                            {
                              type: "button",
                              onClick: () => setEdits((s) => ({ ...s, [k]: { ...e, windows: [...e.windows, { sh: "9", sm: "00", eh: "12", em: "00" }] } })),
                              style: { fontSize: 11, padding: "2px 10px", borderRadius: 6, border: "1px solid rgba(77,107,254,0.35)", background: t.accent, color: t.text, cursor: "pointer" },
                              children: tt("addPeriod")
                            }
                          )
                        ] })
                      ] })
                    ] })
                  ] }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: "2px 0 12px" }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        type: "button",
                        onClick: () => void saveModelPrice(active.provider, m.model),
                        disabled: locked,
                        style: { ...btnPrimary, opacity: locked ? 0.5 : 1, cursor: locked ? "not-allowed" : "pointer" },
                        children: tt("saveUnit")
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        type: "button",
                        onClick: () => void resetModelPrice(active.provider, m.model),
                        disabled: locked,
                        style: { ...btnGhost, opacity: locked ? 0.5 : 1, cursor: locked ? "not-allowed" : "pointer" },
                        children: tt("resetPrice")
                      }
                    ),
                    dirtyRef.current.has(k) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: "#f59e0b", whiteSpace: "nowrap", fontWeight: 600 }, children: L("\u672A\u4FDD\u5B58") }) : st !== void 0 && st.msg !== tt("savingUnit") ? (
                      // 「保存中…」（进行中提示）不在这里显示（v2.0.14 按用户要求移除），
                      // 只保留结果性消息：已保存 / 保存失败 / 已重置… / 使用中锁定…
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: st.ok ? t.ok : t.error, whiteSpace: "nowrap" }, children: st.msg })
                    ) : null
                  ] })
                ] })
              ] }, m.model);
            }) });
          })()
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", alignItems: "center", marginTop: 12 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => setOpenStorage((o) => !o),
          style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(77,107,254,0.35)", background: "rgba(77,107,254,0.06)", color: t.brand, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 9, transform: openStorage ? "rotate(90deg)" : "none", transition: "transform .12s ease" }, children: "\u25B6" }),
            L("\u5176\u4ED6\u8BBE\u7F6E")
          ]
        }
      ) }),
      openStorage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 4, borderBottom: "1px solid rgba(77,107,254,0.2)", marginBottom: 10 }, children: [["alert", "\u4F59\u989D\u9884\u8B66"], ["theme", "\u4E3B\u9898\u8BBE\u7F6E"], ["vision", "\u6A21\u578B\u540E\u7F00\u8BC6\u522B"], ["dir", "\u5DE5\u4F5C\u76EE\u5F55\u8BBE\u7F6E"]].map(([id, label2]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            onClick: () => setStorageTab(id),
            style: { padding: "5px 12px", fontSize: 12, borderRadius: "6px 6px 0 0", border: "none", borderBottom: storageTab === id ? "2px solid #7c5cff" : "2px solid transparent", background: storageTab === id ? "rgba(124,92,255,0.10)" : "transparent", color: storageTab === id ? t.brand : t.text3, fontWeight: 600, cursor: "pointer" },
            children: L(label2)
          },
          id
        )) }),
        storageTab === "theme" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10, borderTop: "1px dashed rgba(77,107,254,0.2)", paddingTop: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: t.brand, fontWeight: 600, marginBottom: 4 }, children: L("\u5168\u5C40\u5171\u4EAB\u8272\uFF08\u72EC\u7ACB\u4E8E\u4E3B\u9898\uFF0C\u6240\u6709\u4E3B\u9898\u5171\u7528\u4E00\u5957\uFF09") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text3, marginBottom: 6, lineHeight: 1.5 }, children: L("\u9884\u8B66\u989C\u8272\u6309\u4F59\u989D\u4E09\u6863\u663E\u793A\uFF08\u8DB3/\u4E0D\u8DB3/\u900F\u652F\uFF09\uFF1B\u901F\u5EA6\u989C\u8272\u6309\u4E09\u6863\u663E\u793A\uFF080-50 / 51-100 / 101+ tokens/s\uFF09\u3002\u4F60\u9009\u7684\u662F\u300C\u57FA\u7840\u8272\u300D\uFF0C\u5B9E\u9645\u6E32\u67D3\u65F6\u4F1A\u4E0E\u5F53\u524D\u4E3B\u9898\u7684\u54C1\u724C\u8272\u6DF7\u6210\u70AB\u5F69\u6E10\u53D8\uFF0C\u5207\u6362\u4E3B\u9898\u70AB\u5F69\u968F\u4E4B\u53D8\u5316\uFF0C\u57FA\u7840\u8272\u4FDD\u6301\u4E0D\u53D8\u3002") }),
            (() => {
              const gEntries = [
                ["\u9884\u8B66\u989C\u8272\uFF08\u4F59\u989D\u8DB3\uFF09", "alertOk"],
                ["\u9884\u8B66\u989C\u8272\uFF08\u4F59\u989D\u4E0D\u8DB3\uFF09", "alertNear"],
                ["\u9884\u8B66\u989C\u8272\uFF08\u900F\u652F\uFF09", "alertOver"],
                ["\u80F6\u56CA\u4F59\u989D\u989C\u8272\uFF08\u4F59\u989D\u8DB3\uFF09", "balanceOk"],
                ["\u901F\u5EA6\u989C\u8272\uFF080-50 tokens/s\uFF09", "speedLow"],
                ["\u901F\u5EA6\u989C\u8272\uFF0851-100 tokens/s\uFF09", "speedMid"],
                ["\u901F\u5EA6\u989C\u8272\uFF08101+ tokens/s\uFF09", "speedHi"]
              ];
              return gEntries.map(([label2, key]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.text2, flex: 1 }, children: L(label2) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorInput, { value: globalColors[key], fallback: DEFAULT_GLOBAL_COLORS[key], onChange: (v) => applyGlobalColors({ ...globalColors, [key]: v }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => applyGlobalColors({ ...globalColors, [key]: DEFAULT_GLOBAL_COLORS[key] }), style: { fontSize: 11, color: t.text3, background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px" }, children: L("\u9ED8\u8BA4") })
              ] }, key));
            })(),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
                applyGlobalColors({ ...globalColors });
                setThemeMsg(L("\u5DF2\u4FDD\u5B58\u5230\u672C\u673A"));
                window.setTimeout(() => setThemeMsg(""), 1800);
              }, style: { ...btnPrimary, padding: "6px 16px" }, children: L("\u4FDD\u5B58\u914D\u8272") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
                applyGlobalColors({ ...DEFAULT_GLOBAL_COLORS });
                setThemeMsg(L("\u5DF2\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\u8272"));
                window.setTimeout(() => setThemeMsg(""), 1800);
              }, style: { ...btnGhost, padding: "6px 12px" }, children: L("\u91CD\u7F6E\u5168\u5C40\u8272") }),
              themeMsg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.ok }, children: themeMsg })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10, borderTop: "1px dashed rgba(77,107,254,0.2)", paddingTop: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: t.brand, fontWeight: 600, marginBottom: 4 }, children: L("\u5B57\u4F53") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text3, marginBottom: 6, lineHeight: 1.5 }, children: L("\u4E09\u79CD\u6A21\u5F0F\uFF1A\u63D2\u4EF6\u56FA\u5B9A\u5B57\u4F53\uFF08\u8DE8\u5E73\u53F0\u4E00\u81F4\uFF09/ \u8DDF\u968F\u5BBF\u4E3B\u4E3B\u9898\u5B57\u4F53 / \u81EA\u5B9A\u4E49\uFF08\u4ECE\u7CFB\u7EDF\u5B57\u4F53\u5E93\u70B9\u9009\u5168\u5C40\u5B57\u4F53 + \u6A21\u578B\u540D/\u6570\u503C/\u6B63\u6587/\u6B21\u8981\u8BF4\u660E\u9010\u4F4D\u7F6E\u7EC6\u5316 + \u9010\u4F4D\u7F6E\u5B57\u4F53\u7C97\u7EC6 + \u672C\u673A\u53EF\u7528\u6027\u68C0\u6D4B\uFF09\u3002\u5B57\u4F53\u7F3A\u5931\u65F6\u81EA\u52A8\u9010\u7EA7\u56DE\u9000\uFF0C\u4EFB\u4F55\u7535\u8111\u90FD\u4E0D\u4F1A\u663E\u793A\u5F02\u5E38\u3002") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => applyFontMode("plugin"), style: { ...btnSmall, borderBottom: fontMode === "plugin" ? "2px solid #7c5cff" : "2px solid transparent", fontWeight: fontMode === "plugin" ? 700 : 400, color: fontMode === "plugin" ? t.brand : t.text2 }, children: L("\u63D2\u4EF6\u56FA\u5B9A\u5B57\u4F53\uFF08\u9ED8\u8BA4\uFF09") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => applyFontMode("host"), style: { ...btnSmall, borderBottom: fontMode === "host" ? "2px solid #7c5cff" : "2px solid transparent", fontWeight: fontMode === "host" ? 700 : 400, color: fontMode === "host" ? t.brand : t.text2 }, children: L("\u8DDF\u968F\u5BBF\u4E3B\u4E3B\u9898\u5B57\u4F53") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => applyFontMode("custom"), style: { ...btnSmall, borderBottom: fontMode === "custom" ? "2px solid #7c5cff" : "2px solid transparent", fontWeight: fontMode === "custom" ? 700 : 400, color: fontMode === "custom" ? t.brand : t.text2 }, children: L("\u81EA\u5B9A\u4E49\u5B57\u4F53") })
            ] }),
            fontMode === "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 8, padding: 10, borderRadius: 8, background: t.card, border: "1px solid rgba(77,107,254,0.25)" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "3px 0", flexWrap: "wrap" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 12, color: t.text2, flex: "0 0 150px" }, children: [
                  L("\u5168\u5C40\u5B57\u4F53"),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 10, color: t.text3, marginLeft: 4 }, children: [
                    L("\u5F53\u524D"),
                    "\uFF1A",
                    (fontCustom.global || "").trim() === "" ? L("\u5185\u7F6E\u5B57\u4F53\u6808") : fontCustom.global.trim()
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FontPick, { value: fontCustom.global, emptyLabel: L("\u9ED8\u8BA4\uFF08\u5185\u7F6E\u5B57\u4F53\u6808\uFF09"), onChange: (v) => applyFontCustom({ ...fontCustom, global: v }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeightPick, { value: fontCustom.weightGlobal, onChange: (v) => applyFontCustom({ ...fontCustom, weightGlobal: v }) }),
                (fontCustom.global !== "" || fontCustom.weightGlobal !== "") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => applyFontCustom({ ...fontCustom, global: "", weightGlobal: "" }), style: { ...btnGhost, padding: "3px 8px" }, children: L("\u91CD\u7F6E\u4E3A\u9ED8\u8BA4") })
              ] }),
              FONT_CAT_ROWS.map(([label2, key, wkey]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "3px 0", flexWrap: "wrap" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 12, color: t.text2, flex: "0 0 150px" }, children: [
                  L(label2),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 10, color: t.text3, marginLeft: 4 }, children: [
                    L("\u5F53\u524D"),
                    "\uFF1A",
                    currentFontOf(fontCustom, key)
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FontPick, { value: fontCustom[key], emptyLabel: L("\u8DDF\u968F\u5168\u5C40"), onChange: (v) => applyFontCustom({ ...fontCustom, [key]: v }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeightPick, { value: fontCustom[wkey], onChange: (v) => applyFontCustom({ ...fontCustom, [wkey]: v }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => applyFontCustom({ ...fontCustom, [key]: "", [wkey]: "" }), title: L("\u6E05\u9664\u8BE5\u4F4D\u7F6E\u7684\u5B57\u4F53\u4E0E\u7C97\u7EC6\uFF0C\u56DE\u5230\u5168\u5C40\u8BBE\u7F6E"), style: { ...btnGhost, padding: "3px 8px" }, children: L("\u91CD\u7F6E\u4E3A\u5168\u5C40\u5B57\u4F53") })
              ] }, key)),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "rgba(124,92,255,0.08)", border: "1px dashed rgba(77,107,254,0.3)", fontSize: 13, color: t.text2, lineHeight: 1.7 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontFamily: fontStackForCategory("custom", fontCustom, "body"), fontWeight: Number(fontWeightForCategory("custom", fontCustom, "body")) || void 0 }, children: [
                  L("\u9884\u89C8\u6B63\u6587"),
                  "\uFF1A"
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: Number(fontWeightForCategory("custom", fontCustom, "model")) || 700, fontFamily: fontStackForCategory("custom", fontCustom, "model") }, children: L("\u6A21\u578B\u540D") }),
                " \xB7 ",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: Number(fontWeightForCategory("custom", fontCustom, "value")) || 700, fontFamily: fontStackForCategory("custom", fontCustom, "value") }, children: "$1.23" }),
                " \xB7 ",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text3, fontWeight: Number(fontWeightForCategory("custom", fontCustom, "sub")) || void 0, fontFamily: fontStackForCategory("custom", fontCustom, "sub") }, children: L("\u6B21\u8981\u8BF4\u660E \xB7 \u521A\u521A") })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10, borderTop: "1px dashed rgba(77,107,254,0.2)", paddingTop: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: t.brand, fontWeight: 600, marginBottom: 4 }, children: L("\u4E3B\u9898") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text3, marginBottom: 6, lineHeight: 1.5 }, children: L("\u9009\u62E9\u914D\u8272\u4E3B\u9898\uFF08\u5F39\u7A97\u53F3\u4E0A\u89D2\u80F6\u56CA + \u7528\u91CF\u5F39\u7A97\u914D\u8272\uFF09\uFF0C\u6D45\u8272\u7CFB\u5728\u524D\u3001\u6DF1\u8272\u7CFB\u5728\u540E\u3002\u6BCF\u4E2A\u4E3B\u9898\u4E0B\u53EF\u81EA\u5B9A\u4E49\u80F6\u56CA\u989C\u8272\u4E0E\u547C\u5438\u989C\u8272\uFF0C\u6539\u52A8\u5373\u65F6\u4FDD\u5B58\u5230\u672C\u673A\u3002") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }, children: THEMES.map((th) => {
              const sel = themeState.id === th.id;
              const pillFlat = resolveTheme(th, themeState.custom[th.id] ?? DEFAULT_CUSTOM).pill.flat;
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "button",
                {
                  type: "button",
                  onClick: () => applyTheme({ ...themeState, id: th.id }),
                  style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 8, border: sel ? `2px solid ${th.brand}` : "1px solid rgba(77,107,254,0.25)", background: th.bgSoft, color: th.text, fontSize: 12, fontWeight: sel ? 700 : 500, cursor: "pointer", textAlign: "left", boxSizing: "border-box" },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 14, height: 14, borderRadius: 999, background: pillFlat, border: "1px solid rgba(0,0,0,0.15)", flex: "none" } }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: L(th.name) })
                  ]
                },
                th.id
              );
            }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10, paddingTop: 4 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text3, marginBottom: 6 }, children: L("\u81EA\u5B9A\u4E49\u5F53\u524D\u4E3B\u9898\u7684\u989C\u8272\uFF08\u6BCF\u5957\u4E3B\u9898\u5DF2\u9884\u5236\u80F6\u56CA/\u547C\u5438/\u544A\u8B66/\u5B57\u4F53\u5206\u7C7B\u8272\uFF0C\u672A\u6539\u5219\u7528\u9884\u5236\u503C\uFF1B\u652F\u6301\u70B9\u9009\u8272\u677F\u6216\u624B\u8F93 #rrggbb\uFF09") }),
            (() => {
              const th = themeOf(themeState.id);
              const entries = [
                ["\u80F6\u56CA\u989C\u8272\uFF08\u975E\u5CF0\u8C37\uFF09", "pillFlat"],
                ["\u80F6\u56CA\u989C\u8272\uFF08\u5CF0\u8C37\uFF09", "pillPeak"],
                ["\u547C\u5438\u989C\u8272\uFF08\u975E\u5CF0\u8C37\uFF09", "ringFlat"],
                ["\u547C\u5438\u989C\u8272\uFF08\u9AD8\u5CF0\uFF09", "ringPeak"],
                ["\u547C\u5438\u989C\u8272\uFF08\u4F4E\u8C37\uFF09", "ringOff"],
                ["\u5B57\u4F53\u989C\u8272 \xB7 \u4E3B\u6587\u5B57", "textMain"],
                ["\u5B57\u4F53\u989C\u8272 \xB7 \u6A21\u578B\u540D", "textModel"],
                ["\u5B57\u4F53\u989C\u8272 \xB7 \u6570\u503C/\u91D1\u989D", "textValue"],
                ["\u5B57\u4F53\u989C\u8272 \xB7 \u6B21\u8981\u8BF4\u660E", "textSub"]
              ];
              const cd = th.customDefault;
              return entries.map(([label2, key]) => {
                const cur = themeState.custom[themeState.id];
                const userVal = cur?.[key] ?? "";
                const fallback = cd[key];
                const setCustom = (v) => {
                  const nextCustom = { ...cur ?? { ...cd }, [key]: v };
                  applyTheme({ ...themeState, custom: { ...themeState.custom, [themeState.id]: nextCustom } });
                };
                return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.text2, flex: 1 }, children: L(label2) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColorInput, { value: userVal, fallback, onChange: setCustom }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => setCustom(""), style: { fontSize: 11, color: t.text3, background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px" }, children: L("\u9ED8\u8BA4") })
                ] }, key);
              });
            })(),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
                applyTheme(themeState);
                setThemeMsg(L("\u5DF2\u4FDD\u5B58\u5230\u672C\u673A"));
                window.setTimeout(() => setThemeMsg(""), 1800);
              }, style: { ...btnPrimary, padding: "6px 16px" }, children: L("\u4FDD\u5B58\u914D\u8272") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
                const c = { ...themeState.custom };
                delete c[themeState.id];
                applyTheme({ ...themeState, custom: c });
                setThemeMsg(L("\u5DF2\u91CD\u7F6E\u4E3A\u9884\u5236\u914D\u8272"));
                window.setTimeout(() => setThemeMsg(""), 1800);
              }, style: { ...btnGhost, padding: "6px 12px" }, children: L("\u91CD\u7F6E\u8BE5\u4E3B\u9898\u4E3A\u9884\u5236\u914D\u8272") }),
              themeMsg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.ok }, children: themeMsg })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text3, marginTop: 6 }, children: L("\u63D0\u793A\uFF1A\u914D\u8272\u4FDD\u5B58\u5728\u6D4F\u89C8\u5668\u672C\u5730\uFF08localStorage\uFF09\uFF0C\u4E0D\u4F1A\u5199\u5165\u8BA1\u8D39\u6570\u636E\u6587\u4EF6\uFF0CDHS \u5347\u7EA7\u4E5F\u4E0D\u4F1A\u4E22\u5931\u3002") })
          ] })
        ] }),
        storageTab === "dir" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text3, marginBottom: 2, lineHeight: 1.5 }, children: L("\u63D2\u4EF6\u7EDF\u4E00\u6570\u636E\u76EE\u5F55\uFF1A\u4E0B\u9762\u300C\u5DE5\u4F5C\u76EE\u5F55\u300D\u5B58\u653E\u5BFC\u51FA/\u5BFC\u5165\u7684\u8BA1\u8D39\u914D\u7F6E\uFF08\u9ED8\u8BA4 $DSH_HOME/usage-meter/exports\uFF09\u3002\u4F59\u989D\u3001API \u5BC6\u94A5\u3001\u770B\u677F\u7EDF\u8BA1\u7B49\u5185\u90E8\u6570\u636E\u56FA\u5B9A\u4FDD\u5B58\u5728 $DSH_HOME/usage-meter\uFF08config.json / salt / stats.json / apikeys\uFF09\uFF0C\u4E0D\u968F\u672C\u8BBE\u7F6E\u6539\u53D8\uFF0C\u4E5F\u4E0D\u4F1A\u56E0 DSH \u5347\u7EA7\u4E22\u5931\u3002\u901A\u5E38\u65E0\u9700\u4FEE\u6539\u3002") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.brand, whiteSpace: "nowrap" }, children: L("\u5DE5\u4F5C\u76EE\u5F55\u8BBE\u7F6E") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: configDirInput, onChange: (ev) => setConfigDirInput(ev.target.value), placeholder: L("\u9ED8\u8BA4 $DSH_HOME/usage-meter/exports\uFF08\u7559\u7A7A\u7528\u9ED8\u8BA4\uFF09"), style: { flex: 1, minWidth: 180, padding: "6px 8px", border: "1px solid rgba(77,107,254,0.35)", borderRadius: 6, fontSize: 12, background: t.card, color: t.text, boxSizing: "border-box" } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => void saveBillingConfigDir(), style: { ...btnSmall }, children: L("\u4FDD\u5B58\u76EE\u5F55") }),
            dirMsg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.ok }, children: dirMsg })
          ] })
        ] }),
        storageTab === "vision" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { border: "1px solid rgba(124,92,255,0.25)", borderRadius: 8, padding: "8px 10px", background: "rgba(124,92,255,0.04)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: t.brand, fontWeight: 600, marginBottom: 4 }, children: L("\u89C6\u89C9\u5305\u88C5\u8BC6\u522B\uFF08\u63D0\u4F9B\u5546/\u6A21\u578B\u540D\u524D\u7F00\xB7\u540E\u7F00\uFF09") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 11, marginBottom: 6, lineHeight: 1.5 }, children: L("\u89C6\u89C9\u63D2\u4EF6\u4F1A\u5305\u4E00\u5C42\u300C\u5305\u88C5\u8DEF\u7531\u300D\uFF1A\u63D0\u4F9B\u5546 id \u53D8\u6210 modlens-xxx / xxx-modlens / vision-toolkit-xxx\uFF08\u6A21\u578B id \u4E0D\u53D8\uFF0C\u663E\u793A\u540D\u591A\u4E00\u4E2A (modlens vision)\uFF09\u3002\u547D\u4E2D\u7684\u8DEF\u7531\u6309\u5E95\u5C42\u63D0\u4F9B\u5546/\u6A21\u578B\u8BA1\u8D39\u3001\u67E5\u4F59\u989D\u3001\u805A\u5408\u7EDF\u8BA1\u3002\u6BCF\u884C\u4E00\u4E2A\u6807\u8BB0\uFF0C\u53F3\u4FA7\u5F00\u5173\u63A7\u5236\u8BE5\u884C\u662F\u5426\u53C2\u4E0E\u8BC6\u522B\uFF1B+ \u65B0\u589E\u3001\u2212 \u5220\u9664\u3002") }),
          wrapperMarkerRows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 11, marginBottom: 6 }, children: L("\u5F53\u524D\u6CA1\u6709\u4EFB\u4F55\u6807\u8BB0\uFF1A\u5305\u88C5\u8DEF\u7531\u4E0D\u4F1A\u88AB\u8BC6\u522B\uFF08\u8BC6\u522B\u5DF2\u5173\u95ED\uFF09\u3002\u70B9\u4E0B\u9762\u300C+ \u65B0\u589E\u6807\u8BB0\u300D\u5F00\u59CB\u6DFB\u52A0\u3002") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: wrapperMarkerRows.map((row2, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                value: row2.pattern,
                onChange: (ev) => setWrapperMarkerRows((rows) => rows.map((r, i) => i === idx ? { ...r, pattern: ev.target.value } : r)),
                placeholder: L("\u5982 modlens- \u6216 -modlens \u6216 (modlens vision)"),
                style: { flex: 1, minWidth: 140, padding: "5px 8px", border: "1px solid rgba(77,107,254,0.35)", borderRadius: 6, fontSize: 12, background: t.card, color: t.text, boxSizing: "border-box", fontFamily: "inherit" }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { title: L("\u5F00\u542F = \u8BE5\u6807\u8BB0\u53C2\u4E0E\u8BC6\u522B\uFF1B\u5173\u95ED = \u5FFD\u7565\u8BE5\u6807\u8BB0"), style: { display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flex: "none", fontSize: 11, color: row2.enabled ? t.ok : t.text3, cursor: "pointer" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: row2.enabled,
                  onChange: (ev) => setWrapperMarkerRows((rows) => rows.map((r, i) => i === idx ? { ...r, enabled: ev.target.checked } : r)),
                  style: { cursor: "pointer", margin: 0 }
                }
              ),
              row2.enabled ? L("\u8BC6\u522B") : L("\u5FFD\u7565")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                title: L("\u5220\u9664\u8FD9\u4E00\u884C"),
                onClick: () => setWrapperMarkerRows((rows) => rows.filter((_r, i) => i !== idx)),
                style: { ...btnSmall, flex: "none", minWidth: 28, padding: "4px 8px", fontWeight: 700, color: t.error, borderColor: "rgba(209,36,47,0.45)" },
                children: "\u2212"
              }
            )
          ] }, idx)) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                onClick: () => setWrapperMarkerRows((rows) => [...rows, { pattern: "", enabled: true }]),
                style: { ...btnSmall, flex: "none", fontWeight: 600 },
                children: [
                  "+ ",
                  L("\u65B0\u589E\u6807\u8BB0")
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: () => void saveWrapperMarkers(),
                style: { ...btnSmall, background: "linear-gradient(90deg, #4d6bfe, #7c5cff)", color: "#ffffff", border: "none", fontWeight: 600 },
                children: L("\u4FDD\u5B58\u8BC6\u522B\u6807\u8BB0")
              }
            ),
            wmMsg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.ok }, children: wmMsg })
          ] })
        ] }),
        storageTab === "alert" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text3, marginBottom: 6, lineHeight: 1.5 }, children: L("\u8BBE\u7F6E\u9884\u8B66\uFF1ADeepSeek \u5B98\u65B9\u7528\u300C\u5B9E\u65F6\u4F59\u989D\u91D1\u989D\u300D\u6BD4\u5BF9\uFF1B\u5176\u4ED6\u6A21\u578B\u7528\u300C\u9884\u7B97\u767E\u5206\u6BD4\u300D\u3002") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: t.text, cursor: "pointer" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "radio", checked: thrMode === "global", onChange: () => {
                setThrMode("global");
                setThrModel("");
              }, style: { accentColor: t.accent } }),
              L("\u5168\u5C40\u5171\u4EAB\u9884\u503C\uFF08\u6309\u4F9B\u5E94\u5546\uFF09")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: t.text, cursor: "pointer" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "radio", checked: thrMode === "model", onChange: () => setThrMode("model"), style: { accentColor: t.accent } }),
              L("\u6A21\u578B\u72EC\u7ACB\u9884\u503C\uFF08\u6309\u6A21\u578B\uFF09")
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.brand, whiteSpace: "nowrap" }, children: L("\u4F9B\u5E94\u5546") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: thrProvider, onChange: (ev) => {
              setThrProvider(ev.target.value);
              const p = modelDir.find((x) => x.provider === ev.target.value);
              setThrModel(p?.models[0]?.model ?? "");
            }, style: ctl({ width: "auto" }), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: L("\u9009\u62E9\u4F9B\u5E94\u5546") }),
              modelDir.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: p.provider, children: p.label }, p.provider))
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.brand, whiteSpace: "nowrap" }, children: L("\u6A21\u578B") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: thrModel, onChange: (ev) => setThrModel(ev.target.value), disabled: thrMode === "global", style: { ...ctl({ width: "auto" }), opacity: thrMode === "global" ? 0.5 : 1, cursor: thrMode === "global" ? "not-allowed" : "pointer", background: thrMode === "global" ? t.borderSoft : t.card }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: L("\u9009\u62E9\u6A21\u578B") }),
              (modelDir.find((x) => x.provider === thrProvider)?.models ?? []).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: m.model, children: m.label }, m.model))
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.brand, whiteSpace: "nowrap" }, children: L("\u9884\u503C\u7C7B\u578B") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: t.text, cursor: "pointer" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "radio", checked: thrType === "pct", onChange: () => setThrType("pct"), style: { accentColor: t.accent } }),
              L("\u6309\u767E\u5206\u6BD4 %")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: t.text, cursor: "pointer" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "radio", checked: thrType === "amt", onChange: () => setThrType("amt"), style: { accentColor: t.accent } }),
              L("\u6309\u4F59\u989D\u91D1\u989D")
            ] }),
            thrType === "pct" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: thrPctM, onChange: (ev) => setThrPctM(ev.target.value), placeholder: L("\u5982 80"), style: ctl({ width: 90 }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: thrAmt, onChange: (ev) => setThrAmt(ev.target.value), placeholder: L("\u5982 100"), style: ctl({ width: 90 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: thrCur, onChange: (ev) => setThrCur(ev.target.value), style: ctl({ width: "auto" }), children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "CNY", children: "CNY (\xA5)" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "USD", children: "USD ($)" })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                onClick: () => void saveModelThreshold(),
                style: { ...btnSmall, background: "linear-gradient(90deg, #4d6bfe, #7c5cff)", color: "#ffffff", border: "none", fontWeight: 600 },
                children: L("\u4FDD\u5B58\u9884\u503C")
              }
            ),
            thrModelMsg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.ok }, children: thrModelMsg })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { color: t.text3, fontSize: 11, marginTop: 12, marginBottom: 0 }, children: L("\u4F1A\u8BDD\u7EA7\u5355\u4EF7\u3001\u8BA1\u8D39\u65B9\u5F0F\u4E0E\u5CF0\u8C37\u4EF7\u5728\u300C\u5BF9\u8BDD \xB7 \u7528\u91CF\u5361\u7247 \u2192 \u7528\u6237\u81EA\u5B9A\u4E49\u8BBE\u7F6E\u300D\u4E2D\u7F16\u8F91\u3002") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { ref: fileInputRef, type: "file", accept: "application/json,.json", style: { display: "none" }, onChange: (ev) => void handleImportFile(ev) })
    ] })
  ] });
}
function BucketRow(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1, color: t.text2, minWidth: 0, whiteSpace: "nowrap" }, children: props.label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 104, textAlign: "right", color: t.text3, whiteSpace: "nowrap" }, children: formatTokens(props.tokens) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 104, textAlign: "right", color: props.price !== void 0 ? t.text2 : t.text3, whiteSpace: "nowrap" }, children: props.price !== void 0 ? fmtPrice(props.price, props.native, props.usage) : "\u2014" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 104, textAlign: "right", fontWeight: 600, color: props.accent ?? t.text, whiteSpace: "nowrap" }, children: props.price !== void 0 ? fmtMoney(props.cost, props.native, props.usage) : "\u2014" })
  ] });
}
return module.exports;}});
