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

// src/projection.ts
function costBreakdown(usage, pricing) {
  if (pricing === null) {
    return { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0 };
  }
  const perM = (v) => v / 1e6;
  const discount = pricing.discount ?? 1;
  if (pricing.combinedPerM !== void 0) {
    const all = usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens + usage.outputTokens;
    const total = all * perM(pricing.combinedPerM) * discount;
    return { input: total, cacheRead: 0, cacheWrite: 0, output: 0, total };
  }
  const input = usage.inputTokens * perM(pricing.inputPerM) * discount;
  const cacheRead = usage.cacheReadTokens * perM(pricing.cacheReadPerM ?? pricing.inputPerM) * discount;
  const cacheWrite = usage.cacheWriteTokens * perM(pricing.cacheWritePerM ?? pricing.inputPerM) * discount;
  const output = usage.outputTokens * perM(pricing.outputPerM) * discount;
  return { input, cacheRead, cacheWrite, output, total: input + cacheRead + cacheWrite + output };
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

// src/client.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var inject = ["slots"];
function apply(ctx) {
  ctx.slots.inject(
    "conversation.composer.dock",
    () => ctx.slots.register(
      { name: "conversation.composer.dock", id: "usage-meter.readout", order: 20 },
      UsageReadout
    )
  );
}
var t = {
  text: "var(--dsw-alias-label-primary, #1f2328)",
  text2: "var(--dsw-alias-label-secondary, #59636e)",
  text3: "var(--dsw-alias-label-tertiary, #8b949e)",
  brand: "var(--dsw-alias-brand-primary, #4d6bfe)",
  error: "var(--dsw-alias-label-error, #d1242f)",
  ok: "var(--dsw-alias-label-success, #16a34a)",
  border: "var(--dsw-alias-border-l2, rgba(31, 35, 40, 0.12))",
  borderSoft: "var(--dsw-alias-border-l1, rgba(31, 35, 40, 0.06))",
  card: "var(--dsw-alias-bg-layer-3, #ffffff)",
  accent: "var(--dsw-alias-brand-subtle, rgba(77, 107, 254, 0.1))"
};
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
function completedTurnRate(turns) {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    const durationMs = turn.endedAt - turn.startedAt;
    if (turn.endedAt > 0 && turn.outputTokens > 0 && durationMs >= 300) return turn.outputTokens / (durationMs / 1e3);
  }
  return null;
}
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
  return `${symbol} ${v.toFixed(decimals)}`;
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
  const d = new Date(ms);
  return `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708${d.getDate()}\u65E5`;
}
function sameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
async function fetchFreshRate() {
  try {
    const res = await fetch("/api/usage-meter/refresh-rate", { method: "POST" });
    if (!res.ok) return null;
    const doc = await res.json();
    if (typeof doc?.usdToCny !== "number") return null;
    return { usdToCny: doc.usdToCny, rateUpdatedAt: doc.rateUpdatedAt ?? Date.now() };
  } catch {
    return null;
  }
}
function turnTokensText(turn) {
  const total = turn.inputTokens + turn.cacheReadTokens + turn.cacheWriteTokens + turn.outputTokens;
  const stopped = total === 0 && turn.endedAt > 0 && (turn.endReason === "aborted" || turn.endReason === "interrupted");
  return stopped ? "\u5BF9\u8BDD\u88AB\u505C\u6B62" : `${formatTokens(total - turn.outputTokens)} \u5165 / ${formatTokens(turn.outputTokens)} \u51FA`;
}
function bucketTokens(usage, b) {
  switch (b) {
    case "input":
      return usage.inputTokens;
    case "cacheRead":
      return usage.cacheReadTokens;
    case "cacheWrite":
      return usage.cacheWriteTokens;
    case "output":
      return usage.outputTokens;
  }
}
function bucketCost(bd, b) {
  switch (b) {
    case "input":
      return bd.input;
    case "cacheRead":
      return bd.cacheRead;
    case "cacheWrite":
      return bd.cacheWrite;
    case "output":
      return bd.output;
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
function bucketPriceKey(b) {
  switch (b) {
    case "input":
      return "inputPerM";
    case "cacheRead":
      return "cacheReadPerM";
    case "cacheWrite":
      return "cacheWritePerM";
    case "output":
      return "outputPerM";
  }
}
function peakPricePerM(peak, b) {
  if (peak === void 0) return void 0;
  switch (b) {
    case "input":
      return peak.inputPerM;
    case "cacheRead":
      return peak.cacheReadPerM ?? peak.inputPerM;
    case "cacheWrite":
      return peak.inputPerM;
    case "output":
      return peak.outputPerM;
  }
}
function peakLabel(p) {
  if (p === null || p.peak === void 0 || p.offPeak === void 0) return null;
  if (p.peakOffPeakFrom !== void 0 && Date.now() < p.peakOffPeakFrom) return "\u5CF0\u8C37\u4EF7\u672A\u751F\u6548";
  const h = (/* @__PURE__ */ new Date()).getUTCHours();
  return h >= 1 && h < 4 || h >= 6 && h < 10 ? "\u9AD8\u5CF0" : "\u4F4E\u8C37";
}
function UsageReadout({ useProjection }) {
  const usage = useProjection("usageCost");
  const [open, setOpen] = (0, import_react.useState)(false);
  const rootRef = (0, import_react.useRef)(null);
  const [rate, setRate] = (0, import_react.useState)(null);
  const rateSamplesRef = (0, import_react.useRef)([]);
  const usageRef = (0, import_react.useRef)(void 0);
  (0, import_react.useEffect)(() => {
    usageRef.current = usage;
    if (usage === void 0) {
      rateSamplesRef.current = [];
      return;
    }
    const samples = rateSamplesRef.current;
    const last = samples[samples.length - 1];
    if (last !== void 0 && usage.realtimeOutputTokens < last.total) samples.length = 0;
    if (usage.realtimeUpdatedAt > 0) {
      const current = samples[samples.length - 1];
      if (current?.at !== usage.realtimeUpdatedAt || current.total !== usage.realtimeOutputTokens) {
        samples.push({ at: usage.realtimeUpdatedAt, total: usage.realtimeOutputTokens });
      }
    }
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
      const live = tokenRateOf(rateSamplesRef.current, Date.now());
      setRate((previous) => live ?? previous ?? completedTurnRate(u.turns));
    }, RATE_TICK_MS);
    return () => clearInterval(id);
  }, []);
  if (usage === void 0) return null;
  const p = usage.pricing;
  const native = p?.currency ?? "CNY";
  const breakdown = costBreakdown(usage, p);
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { ref: rootRef, style: { position: "relative", display: "inline-flex" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => setOpen((o) => !o),
        "aria-expanded": open,
        title: "\u7528\u91CF / \u8D39\u7528\u8BE6\u60C5",
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          maxWidth: "100%",
          padding: "2px 8px",
          border: `1px solid ${open ? t.border : "transparent"}`,
          borderRadius: 999,
          background: open ? t.accent : "transparent",
          color: t.text2,
          fontSize: 11,
          lineHeight: "16px",
          fontVariantNumeric: "tabular-nums",
          cursor: "pointer",
          transition: "background .12s ease, border-color .12s ease"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 600, color: t.text, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: usage.model ?? "\u672A\u9009\u62E9\u6A21\u578B" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3, whiteSpace: "nowrap" }, children: "\xB7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 700, color: p ? t.brand : t.text3, whiteSpace: "nowrap" }, children: p ? fmtMoney(usage.estimatedCost, usage.currency, usage) : "\u65E0\u4EF7\u683C" }),
          (balanceKind !== "none" || isDeepSeek && accountBalance === null) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "span",
            {
              title: accountBalance !== null ? `${accountBalance.source === "computed" ? "\u8BA1\u7B97" : "\u66F4\u65B0"}\u4E8E ${fmtTime(accountBalance.updatedAt)}${isDeepSeek ? "\uFF08\u5B98\u7F51\u4F59\u989D\u5237\u65B0\u6709\u5EF6\u8FDF\uFF09" : ""}${pricesConverted ? ` \xB7 \u6C47\u7387 1USD\u2248${usage.usdToCny.toFixed(4)}CNY${usage.rateUpdatedAt > 0 ? ` \xB7 \u66F4\u65B0\u4E8E ${fmtTime(usage.rateUpdatedAt)}` : ""}` : ""}` : "\u7B49\u5F85\u4F59\u989D\u914D\u7F6E\u2026",
              style: {
                fontWeight: 600,
                color: accountBalance === null ? t.text3 : balanceNegative ? t.error : t.ok,
                background: accountBalance === null ? "rgba(139, 148, 158, 0.10)" : balanceNegative ? "rgba(209, 36, 47, 0.10)" : "rgba(22, 163, 74, 0.10)",
                borderRadius: 999,
                padding: "0 6px",
                whiteSpace: "nowrap"
              },
              children: accountBalance === null ? "\u4F59\u989D \u83B7\u53D6\u4E2D\u2026" : `${balanceNegative ? "\u900F\u652F " : "\u4F59\u989D "}${fmtBalance(accountBalance, usage)}`
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text3, whiteSpace: "nowrap" }, children: [
            usage.requestCount,
            " \u6B21"
          ] }),
          rate !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text3, whiteSpace: "nowrap" }, children: [
            "\xB7 \u901F\u5EA6 ",
            rate.toFixed(1),
            " tokens/s"
          ] }),
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
          left: 0,
          zIndex: 40,
          width: 480,
          maxWidth: "calc(100vw - 32px)",
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          boxShadow: "0 12px 32px rgba(31, 35, 40, 0.18)",
          padding: "12px 14px",
          fontSize: 12,
          color: t.text,
          fontVariantNumeric: "tabular-nums"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 700, fontSize: 13 }, children: usage.model ?? "\u672A\u9009\u62E9\u6A21\u578B" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3, fontSize: 11 }, children: usage.provider ?? "" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: t.text3, fontSize: 11, marginTop: 2 }, children: [
            "\u4EF7\u683C\u6765\u6E90 ",
            p?.source === "remote" ? "\u8FDC\u7AEF" : "\u5185\u7F6E",
            " \xB7 \u66F4\u65B0\u4E8E",
            " ",
            p?.updatedAt ? new Date(p.updatedAt).toLocaleString() : "\u2014",
            peak !== null ? ` \xB7 ${peak}` : "",
            pricesConverted ? ` \xB7 \u6C47\u7387 1USD=${usage.usdToCny.toFixed(4)}CNY` : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, borderBottom: `1px solid ${t.borderSoft}`, paddingTop: 8, paddingBottom: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text2 }, children: balanceKind === "account" ? "\u8D26\u6237\u4F59\u989D" : "\u4F59\u989D" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 800, fontSize: 16, color: balanceKind === "none" ? t.text3 : balanceNegative ? t.error : t.ok }, children: balanceKind === "none" ? isDeepSeek ? "\u83B7\u53D6\u4E2D\u2026" : "\u672A\u914D\u7F6E" : accountBalance !== null ? fmtBalance(accountBalance, usage) : "\u2014" }),
              accountBalance !== null && accountBalance.updatedAt > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { title: isDeepSeek ? "\u5B98\u7F51\u4F59\u989D\u5237\u65B0\u53EF\u80FD\u6709\u5EF6\u8FDF\uFF0C\u4F59\u989D\u6309\u300C\u951A\u70B9 \u2212 \u672C\u5730\u6D88\u8D39\u300D\u5B9E\u65F6\u8BA1\u7B97" : "\u4F59\u989D = \u8D26\u6237\u4F59\u989D \u2212 \u7D2F\u8BA1\u6D88\u8D39\uFF08\u5168\u5C40\u8D26\u672C\uFF09", style: { color: t.text3, fontSize: 10, whiteSpace: "nowrap" }, children: [
                accountBalance.source === "computed" ? "\u8BA1\u7B97" : "\u66F4\u65B0",
                "\u4E8E ",
                fmtTime(accountBalance.updatedAt),
                isDeepSeek ? " \xB7 \u5B98\u7F51\u5237\u65B0\u6709\u5EF6\u8FDF" : ""
              ] }),
              pricesConverted && balanceKind !== "none" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text3, fontSize: 10, whiteSpace: "nowrap" }, children: [
                "\u6C47\u7387 1USD\u2248",
                usage.usdToCny.toFixed(4),
                "CNY",
                usage.rateUpdatedAt > 0 ? ` \xB7 \u66F4\u65B0\u4E8E ${fmtTime(usage.rateUpdatedAt)}` : ""
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, paddingTop: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text2 }, children: "\u672C\u6B21\u5BF9\u8BDD\u8D39\u7528" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 700, color: p ? t.brand : t.text3 }, children: p ? fmtMoney(usage.estimatedCost, usage.currency, usage) : "\u65E0\u4EF7\u683C\u6570\u636E" })
          ] }),
          usage.budget !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { borderTop: `1px solid ${t.borderSoft}`, marginTop: 4, paddingTop: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, paddingTop: 0 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text2 }, children: [
                "\u9884\u7B97 ",
                fmtMoney(usage.budget, usage.currency, usage)
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text3 }, children: [
                "\u5DF2\u7528 ",
                fmtMoney(usage.estimatedCost, usage.currency, usage)
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1, height: 6, borderRadius: 999, background: t.borderSoft, overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: `${Math.round((budgetRatio ?? 0) * 100)}%`, height: "100%", borderRadius: 999, background: overBudget ? t.error : t.brand, transition: "width .2s ease" } }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 700, color: overBudget ? t.error : t.text, whiteSpace: "nowrap" }, children: [
                overBudget ? "\u8D85\u652F " : "\u5269\u4F59 ",
                fmtMoney(Math.abs(remaining ?? 0), usage.currency, usage)
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, paddingBottom: 2, color: t.text3, fontSize: 11 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1 }, children: "\u7528\u91CF" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 92, textAlign: "right" }, children: "\u5355\u4EF7" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 92, textAlign: "right" }, children: "\u5C0F\u8BA1" })
            ] }),
            usage.priceRows.map((r) => {
              const primary = r.buckets[0] ?? "input";
              const tokens = r.buckets.reduce((s, b) => s + bucketTokens(usage, b), 0);
              const cost = r.buckets.reduce((s, b) => s + bucketCost(breakdown, b), 0);
              const price = bucketPricePerM(p, primary);
              return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BucketRow, { label: r.label, tokens, price, cost, native, usage, accent: primary === "cacheRead" ? t.ok : void 0 }, r.label + r.buckets.join(","));
            }),
            usage.reasoningTokens > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...row, color: t.text3, fontSize: 11, paddingTop: 1 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              "\u63A8\u7406 ",
              formatTokens(usage.reasoningTokens),
              "\uFF08\u5DF2\u542B\u5728\u8F93\u51FA\u5185\uFF09"
            ] }) }),
            p !== null && p.discount !== void 0 && p.discount < 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: t.brand, fontSize: 10, paddingTop: 2 }, children: [
              "Batch \u534A\u4EF7\uFF1A\u5C0F\u8BA1\u5DF2\u6309 \xD7",
              p.discount,
              " \u8BA1\u7B97\uFF08\u5355\u4EF7\u5217\u4ECD\u4E3A\u6807\u51C6\u4EF7\uFF09"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, color: t.text2, fontSize: 11, borderTop: `1px solid ${t.borderSoft}`, marginTop: 4, paddingTop: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              "\u8BF7\u6C42 ",
              usage.requestCount,
              " \u6B21\u6210\u529F \xB7 ",
              usage.stepCount,
              " \u6B21\u5C1D\u8BD5"
            ] }),
            hitRate !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text3 }, children: [
              "\u7F13\u5B58\u547D\u4E2D ",
              hitRate,
              "%"
            ] })
          ] }),
          turns.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { borderTop: `1px solid ${t.borderSoft}`, marginTop: 6, paddingTop: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: t.text3, fontSize: 11, marginBottom: 2 }, children: [
              "\u6BCF\u8F6E\u8D39\u7528\uFF08\u5171 ",
              turns.length,
              " \u8F6E\uFF09"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { maxHeight: 200, overflowY: "auto" }, children: turns.map((turn, i) => {
              const prev = i > 0 ? turns[i - 1] : void 0;
              const newDay = prev === void 0 || !sameDay(prev.startedAt, turn.startedAt);
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [
                newDay && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: dateSep, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1, height: 1, background: t.borderSoft } }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmtDate(turn.startedAt) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1, height: 1, background: t.borderSoft } })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, padding: "2px 0" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.text2, whiteSpace: "nowrap" }, children: [
                    "\u7B2C ",
                    turn.turn,
                    " \u8F6E \xB7 ",
                    fmtTime(turn.startedAt),
                    turn.endedAt > 0 ? `\u2013${fmtTime(turn.endedAt)}` : "",
                    turn.model ? ` \xB7 ${turn.model}` : ""
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3 }, children: turnTokensText(turn) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 600, color: t.error }, children: [
                    "-",
                    fmtMoney(turn.cost, turn.currency, usage)
                  ] })
                ] })
              ] }, turn.turn);
            }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsSection, { usage })
        ]
      }
    )
  ] });
}
function SettingsSection({ usage }) {
  const isDeepSeek = usage.provider === "deepseek-official" || usage.provider === "deepseek";
  const [openSettings, setOpenSettings] = (0, import_react.useState)(false);
  const [cfgCurrency, setCfgCurrency] = (0, import_react.useState)(usage.currency);
  const [currencyDirty, setCurrencyDirty] = (0, import_react.useState)(false);
  const [modelCurrency, setModelCurrency] = (0, import_react.useState)(usage.basePricing?.currency ?? "CNY");
  const [modelCurrencyDirty, setModelCurrencyDirty] = (0, import_react.useState)(false);
  const [rateInfo, setRateInfo] = (0, import_react.useState)({ usdToCny: usage.usdToCny, rateUpdatedAt: usage.rateUpdatedAt });
  const conversionActive = cfgCurrency !== modelCurrency;
  const [cfgBalance, setCfgBalance] = (0, import_react.useState)("");
  const [balanceDirty, setBalanceDirty] = (0, import_react.useState)(false);
  const [cfgRecharge, setCfgRecharge] = (0, import_react.useState)("");
  const [saved, setSaved] = (0, import_react.useState)(false);
  const [saveMsg, setSaveMsg] = (0, import_react.useState)("");
  const unitSym = cfgCurrency === "USD" ? "$" : "\xA5";
  (0, import_react.useEffect)(() => {
    if (currencyDirty) return;
    setCfgCurrency(usage.currency);
  }, [usage.model, usage.currency]);
  (0, import_react.useEffect)(() => {
    if (modelCurrencyDirty) return;
    setModelCurrency(usage.basePricing?.currency ?? "CNY");
  }, [usage.model, usage.basePricing?.currency]);
  (0, import_react.useEffect)(() => {
    if (balanceDirty) return;
    if (usage.accountBalance !== null) {
      const live = toDisplay(usage.accountBalance.totalBalance, usage.accountBalance.currency, cfgCurrency, usage.usdToCny);
      setCfgBalance(String(Number(live.toFixed(2))));
    }
  }, [usage.accountBalance?.totalBalance, usage.accountBalance?.currency, cfgCurrency, balanceDirty]);
  const onCurrencyChange = (next) => {
    if (next === cfgCurrency) return;
    const cur = Number(cfgBalance);
    if (!Number.isNaN(cur) && cfgBalance.trim() !== "") {
      setCfgBalance(String(Number(toDisplay(cur, cfgCurrency, next, usage.usdToCny).toFixed(2))));
    }
    setBalanceDirty(false);
    setCurrencyDirty(true);
    setCfgCurrency(next);
    if (next !== modelCurrency) {
      void fetchFreshRate().then((fresh) => {
        if (fresh !== null) setRateInfo(fresh);
      });
    }
  };
  const onPricingCurrencyChange = (next) => {
    setModelCurrencyDirty(true);
    setModelCurrency(next);
    if (next !== cfgCurrency) {
      void fetchFreshRate().then((fresh) => {
        if (fresh !== null) setRateInfo(fresh);
      });
    }
  };
  const save = async () => {
    const patch = { provider: usage.provider, model: usage.model, currency: cfgCurrency };
    if (!isDeepSeek) {
      const bal = Number(cfgBalance);
      if (cfgBalance.trim() !== "" && !Number.isNaN(bal)) patch.balance = bal;
      const rechargeNum = Number(cfgRecharge);
      if (cfgRecharge.trim() !== "" && !Number.isNaN(rechargeNum) && rechargeNum !== 0) patch.recharge = rechargeNum;
      setCfgRecharge("");
    }
    try {
      const res = await fetch("/api/usage-meter/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch)
      });
      setSaved(res.ok);
      if (res.ok) setBalanceDirty(false);
      setSaveMsg(res.ok ? "\u5DF2\u4FDD\u5B58\uFF0C\u4F59\u989D\u5DF2\u66F4\u65B0" : "\u4FDD\u5B58\u5931\u8D25");
      window.setTimeout(() => {
        setSaved(false);
        setSaveMsg("");
      }, 2500);
    } catch (err) {
      console.warn("[usage-meter] save failed", err);
      setSaveMsg("\u4FDD\u5B58\u5931\u8D25");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { borderTop: `1px solid ${t.borderSoft}`, marginTop: 6, paddingTop: 6 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        onClick: () => setOpenSettings((o) => !o),
        "aria-expanded": openSettings,
        style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.text2, background: "transparent", border: "none", padding: "2px 0", cursor: "pointer" },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u7528\u6237\u81EA\u5B9A\u4E49\u8BBE\u7F6E" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 9, transform: openSettings ? "rotate(180deg)" : "none", transition: "transform .12s ease" }, children: "\u25BC" })
        ]
      }
    ),
    openSettings && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 10, marginBottom: 4 }, children: "\u4FDD\u5B58\u540E\u4F59\u989D\u7ACB\u5373\u751F\u6548\uFF1B\u6A21\u677F\u4FEE\u6539\u9700\u5237\u65B0\u6D4F\u89C8\u5668\u751F\u6548" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { fontSize: 11, color: t.text2 }, children: "\u5E01\u79CD" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: cfgCurrency, onChange: (e) => onCurrencyChange(e.target.value), style: { fontSize: 12, padding: "2px 4px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "CNY", children: "CNY\uFF08\u4EBA\u6C11\u5E01\uFF09" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "USD", children: "USD\uFF08\u7F8E\u5143\uFF09" })
        ] }),
        isDeepSeek && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: save, style: { fontSize: 12, padding: "3px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: "pointer" }, children: saved ? "\u5DF2\u4FDD\u5B58" : "\u4FDD\u5B58" }),
        isDeepSeek && saveMsg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.ok, fontSize: 10 }, children: saveMsg })
      ] }),
      !isDeepSeek && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { fontSize: 11, color: t.text2 }, children: [
          "\u8D26\u6237\u4F59\u989D\uFF08",
          unitSym,
          "\uFF09"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: cfgBalance, onChange: (e) => {
          setCfgBalance(e.target.value);
          setBalanceDirty(true);
        }, placeholder: `\u5982 100${unitSym}`, style: { width: 84, fontSize: 12, padding: "2px 4px" } }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { fontSize: 11, color: t.text2 }, children: [
          "\u5145\u503C\uFF08",
          unitSym,
          "\uFF0C\u53EF\u8D1F\uFF09"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: cfgRecharge, onChange: (e) => setCfgRecharge(e.target.value), placeholder: `\u5982 20${unitSym}`, style: { width: 84, fontSize: 12, padding: "2px 4px" } }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: save, style: { fontSize: 12, padding: "3px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: "pointer" }, children: saved ? "\u5DF2\u4FDD\u5B58" : "\u4FDD\u5B58" }),
        saveMsg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.ok, fontSize: 10 }, children: saveMsg })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        PriceEditor,
        {
          usage,
          onPricingCurrencyChange,
          onResetCurrency: (c) => {
            setCfgCurrency(c);
            setCurrencyDirty(false);
            setModelCurrency(c);
            setModelCurrencyDirty(false);
          }
        }
      ),
      conversionActive && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: t.text3, fontSize: 10, marginTop: 2 }, children: [
        "\u6C47\u7387\uFF1A1 USD \u2248 ",
        rateInfo.usdToCny.toFixed(4),
        " CNY \xB7 \u66F4\u65B0\u4E8E ",
        fmtTime(rateInfo.rateUpdatedAt),
        "\uFF08",
        modelCurrency,
        " \u2192 ",
        cfgCurrency,
        " \u9700\u6362\u7B97\uFF09"
      ] })
    ] })
  ] });
}
function PriceEditor({
  usage,
  onPricingCurrencyChange,
  onResetCurrency
}) {
  const model = usage.model;
  const rows = usage.priceRows;
  const base = usage.basePricing;
  const isDeepSeek = usage.provider === "deepseek-official" || usage.provider === "deepseek";
  const peakMode = base?.peak !== void 0 && base?.offPeak !== void 0;
  const [labels, setLabels] = (0, import_react.useState)(() => rows.map((r) => r.label));
  const [prices, setPrices] = (0, import_react.useState)(
    () => rows.map((r) => {
      const b = r.buckets[0] ?? "input";
      const v = peakMode ? peakPricePerM(base.peak, b) ?? bucketPricePerM(base, b) : bucketPricePerM(base, b);
      return v === void 0 ? "" : String(v);
    })
  );
  const [currency, setCurrency] = (0, import_react.useState)(base?.currency ?? "CNY");
  const [rowsState, setRowsState] = (0, import_react.useState)(() => rows);
  const [billing, setBilling] = (0, import_react.useState)({
    combined: base?.combinedPerM !== void 0,
    discount: base?.discount,
    peak: peakMode
  });
  const [types, setTypes] = (0, import_react.useState)([]);
  const [typeKey, setTypeKey] = (0, import_react.useState)("");
  const [typeNote, setTypeNote] = (0, import_react.useState)("");
  const [msg, setMsg] = (0, import_react.useState)("");
  const [justReset, setJustReset] = (0, import_react.useState)(false);
  const sym = currency === "USD" ? "$" : "\xA5";
  (0, import_react.useEffect)(() => {
    if (isDeepSeek || types.length > 0) return;
    fetch("/api/usage-meter/templates").then((r) => r.ok ? r.json() : null).then((doc) => {
      if (doc?.types) setTypes(doc.types);
    }).catch(() => {
    });
  }, [isDeepSeek, types.length]);
  (0, import_react.useEffect)(() => {
    if (types.length === 0 || isDeepSeek) return;
    const idx = types.findIndex((tp) => tp.id === matchTypeId(base));
    if (idx >= 0 && typeKey === "") {
      setTypeKey(String(idx));
      setTypeNote(types[idx]?.note ?? "");
    }
  }, [types, base, isDeepSeek, typeKey]);
  if (!model || rowsState.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, {});
  const applyTemplate = (key) => {
    setTypeKey(key);
    if (key === "") {
      setTypeNote("");
      return;
    }
    const tpl = types[Number(key)];
    if (tpl === void 0) return;
    setTypeNote(tpl.note ?? "");
    if (tpl.mode === "keep") {
      setBilling((b) => ({ combined: b.combined, discount: 0.5, peak: b.peak }));
      setMsg("\u5DF2\u542F\u7528 Batch \u534A\u4EF7\uFF08\xD70.5\uFF09\uFF0C\u53EF\u4FEE\u6539\u540E\u4FDD\u5B58");
      window.setTimeout(() => setMsg(""), 3e3);
      return;
    }
    const prefill = (b) => {
      const v = tpl.peak === true ? peakPricePerM(base?.peak, b) ?? bucketPricePerM(base, b) : bucketPricePerM(base, b);
      return v === void 0 ? "" : String(v);
    };
    setRowsState(tpl.rows);
    setLabels(tpl.rows.map((r) => r.label));
    setPrices(tpl.rows.map((r) => prefill(r.buckets[0] ?? "input")));
    setBilling({ combined: tpl.mode === "combined", discount: void 0, peak: tpl.peak === true });
    setMsg(`\u5DF2\u8F7D\u5165\u300C${tpl.label}\u300D\u8BA1\u8D39\u65B9\u5F0F\uFF0C\u53EF\u4FEE\u6539\u540E\u4FDD\u5B58`);
    window.setTimeout(() => setMsg(""), 3e3);
  };
  const onCurrencySelect = async (next) => {
    if (next === currency) return;
    let rate = usage.usdToCny;
    if (next !== (base?.currency ?? "CNY")) {
      const fresh = await fetchFreshRate();
      if (fresh !== null) rate = fresh.usdToCny;
    }
    setPrices((ps) => ps.map((p) => {
      const n = Number(p);
      return p.trim() === "" || Number.isNaN(n) ? p : String(Number(toDisplay(n, currency, next, rate).toFixed(4)));
    }));
    setCurrency(next);
    onPricingCurrencyChange?.(next);
  };
  const post = async (body) => {
    try {
      const res = await fetch("/api/usage-meter/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      return res.ok;
    } catch {
      return false;
    }
  };
  const flash = (text) => {
    setMsg(text);
    window.setTimeout(() => setMsg(""), 3500);
  };
  const save = async () => {
    const pricePatch = {};
    rowsState.forEach((r, i) => {
      const raw = (prices[i] ?? "").trim();
      if (raw === "") return;
      const v = Number(raw);
      if (!Number.isNaN(v) && v >= 0) pricePatch[bucketPriceKey(r.buckets[0] ?? "input")] = v;
    });
    if (billing.combined) {
      const combined = pricePatch.inputPerM;
      if (typeof combined === "number" && combined >= 0) {
        pricePatch.combinedPerM = combined;
        pricePatch.inputPerM = combined;
        pricePatch.outputPerM = combined;
      }
    }
    if (billing.discount !== void 0) pricePatch.discount = billing.discount;
    if (billing.peak) {
      const peak = {};
      const offPeak = {};
      rowsState.forEach((r, i) => {
        const raw = (prices[i] ?? "").trim();
        const v = Number(raw);
        if (raw === "" || Number.isNaN(v) || v < 0) return;
        const key = bucketPriceKey(r.buckets[0] ?? "input");
        peak[key] = v;
        offPeak[key] = v * 0.5;
      });
      if (Object.keys(peak).length > 0) {
        pricePatch.peak = peak;
        pricePatch.offPeak = offPeak;
      }
    }
    pricePatch.currency = currency;
    const ok = await post({
      provider: usage.provider,
      model,
      prices: pricePatch,
      rows: rowsState.map((r, i) => ({ label: (labels[i] ?? "").trim() || r.label, buckets: r.buckets }))
    });
    flash(ok ? "\u5DF2\u4FDD\u5B58\uFF0C\u8BF7\u5237\u65B0\u6D4F\u89C8\u5668\u540E\u751F\u6548" : "\u4FDD\u5B58\u5931\u8D25");
  };
  const reset = async () => {
    if (usage.officialPrice !== null) {
      const op = usage.officialPrice;
      const ok = await post({ provider: usage.provider, model, reset: true });
      if (ok) {
        const opPeak = op.pricing.peak !== void 0 && op.pricing.offPeak !== void 0;
        setRowsState(op.rows);
        setLabels(op.rows.map((r) => r.label));
        setPrices(op.rows.map((r) => {
          const b = r.buckets[0] ?? "input";
          const v = opPeak ? peakPricePerM(op.pricing.peak, b) ?? bucketPricePerM(op.pricing, b) : bucketPricePerM(op.pricing, b);
          return v === void 0 ? "" : String(v);
        }));
        setBilling({ combined: op.pricing.combinedPerM !== void 0, discount: op.pricing.discount, peak: opPeak });
        setCurrency(op.pricing.currency ?? usage.currency);
        const tIdx2 = types.findIndex((tp) => tp.id === matchTypeId(op.pricing));
        if (tIdx2 >= 0) {
          setTypeKey(String(tIdx2));
          setTypeNote(types[tIdx2]?.note ?? "");
        }
        onResetCurrency?.(op.pricing.currency ?? usage.currency);
        setJustReset(true);
        window.setTimeout(() => setJustReset(false), 1600);
        flash(ok ? "\u5DF2\u91CD\u7F6E\u4E3A\u8BE5\u6A21\u578B\u5B98\u65B9\u4EF7\u683C\uFF0C\u8BF7\u5237\u65B0\u6D4F\u89C8\u5668\u540E\u751F\u6548" : "\u91CD\u7F6E\u5931\u8D25");
      }
      return;
    }
    const tIdx = types.findIndex((tp) => tp.id === matchTypeId(base));
    if (tIdx >= 0) applyTemplate(String(tIdx));
    setCurrency(base?.currency ?? usage.currency);
    onResetCurrency?.(base?.currency ?? usage.currency);
    setJustReset(true);
    window.setTimeout(() => setJustReset(false), 1600);
    flash("\u5DF2\u91CD\u7F6E\u4E3A\u8BE5\u8BA1\u8D39\u65B9\u5F0F\u7ED3\u6784\uFF0C\u8BF7\u6838\u5BF9\u5355\u4EF7\u540E\u70B9\u4FDD\u5B58\u5355\u4EF7\u751F\u6548");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 6, paddingTop: 6, borderTop: `1px solid ${t.borderSoft}` }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: t.text2, fontSize: 11, marginBottom: 2 }, children: [
      "\u6A21\u578B\u5355\u4EF7\u7F16\u8F91\uFF08",
      model,
      " \xB7 \u5355\u4F4D\uFF1A\u6BCF\u767E\u4E07tokens ",
      sym,
      "\uFF09"
    ] }),
    !isDeepSeek && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 4 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { fontSize: 11, color: t.text2 }, children: "\u8BA1\u8D39\u65B9\u5F0F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: typeKey, onChange: (e) => applyTemplate(e.target.value), style: { fontSize: 12, padding: "2px 4px", maxWidth: 320 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\uFF08\u9009\u62E9\u8BA1\u8D39\u65B9\u5F0F\u9884\u586B\uFF09" }),
          types.map((tpl, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: String(i), children: tpl.label }, tpl.id))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { fontSize: 11, color: t.text2 }, children: "\u5E01\u79CD" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: currency, onChange: (e) => void onCurrencySelect(e.target.value), style: { fontSize: 12, padding: "2px 4px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "CNY", children: "CNY\uFF08\u4EBA\u6C11\u5E01\uFF09" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "USD", children: "USD\uFF08\u7F8E\u5143\uFF09" })
        ] })
      ] }),
      typeNote !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 10, marginTop: 2 }, children: typeNote })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...row, paddingBottom: 2, color: t.text3, fontSize: 10 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1 }, children: "\u7528\u91CF\u540D\u79F0\uFF08\u53EF\u6539\uFF09" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 86, textAlign: "right" }, children: billing.peak ? "\u9AD8\u5CF0\u4EF7\uFF08\u53EF\u6539\uFF09" : "\u5355\u4EF7\uFF08\u53EF\u6539\uFF09" })
    ] }),
    billing.peak && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 10, marginBottom: 2 }, children: "\u95F2\u65F6\u5355\u4EF7\u81EA\u52A8 = \u9AD8\u5CF0 \xD70.5\uFF08\u9AD8\u5CF0\u65F6\u6BB5 9-12 / 14-18 \u5317\u4EAC\u65F6\u95F4\uFF09" }),
    rowsState.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          value: labels[i] ?? "",
          onChange: (e) => setLabels((ls) => {
            const n = [...ls];
            n[i] = e.target.value;
            return n;
          }),
          style: { flex: 1, minWidth: 0, fontSize: 12, padding: "1px 4px", background: justReset ? "rgba(22, 163, 74, 0.10)" : void 0, transition: "background .2s ease" }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          value: prices[i] ?? "",
          onChange: (e) => setPrices((ps) => {
            const n = [...ps];
            n[i] = e.target.value;
            return n;
          }),
          placeholder: `\u5982 ${bucketPricePerM(base, r.buckets[0] ?? "input") ?? ""}`,
          style: { width: 86, fontSize: 12, padding: "1px 4px", textAlign: "right", background: justReset ? "rgba(22, 163, 74, 0.10)" : void 0, transition: "background .2s ease" }
        }
      )
    ] }, r.buckets.join(","))),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 4 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: save, style: { fontSize: 12, padding: "3px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: "pointer" }, children: "\u4FDD\u5B58\u5355\u4EF7" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: reset, style: { fontSize: 12, padding: "3px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.card, color: t.text, cursor: "pointer", boxShadow: "none" }, children: "\u91CD\u7F6E\u4EF7\u683C" }),
      billing.combined && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3, fontSize: 10 }, children: "\u5408\u5E76\u8BA1\u4EF7" }),
      billing.discount !== void 0 && billing.discount < 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: t.brand, fontSize: 10 }, children: [
        "Batch \u534A\u4EF7 \xD7",
        billing.discount
      ] }),
      msg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.ok, fontSize: 10 }, children: msg })
    ] })
  ] });
}
function BucketRow(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: row, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1, color: t.text2, minWidth: 0, whiteSpace: "nowrap" }, children: props.label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 92, textAlign: "right", color: t.text3, whiteSpace: "nowrap" }, children: formatTokens(props.tokens) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 92, textAlign: "right", color: props.price !== void 0 ? t.text2 : t.text3, whiteSpace: "nowrap" }, children: props.price !== void 0 ? fmtPrice(props.price, props.native, props.usage) : "\u2014" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 92, textAlign: "right", fontWeight: 600, color: props.accent ?? t.text, whiteSpace: "nowrap" }, children: props.price !== void 0 ? fmtMoney(props.cost, props.native, props.usage) : "\u2014" })
  ] });
}
return module.exports;}});
