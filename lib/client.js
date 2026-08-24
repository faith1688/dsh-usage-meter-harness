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
  if (pricing.customRows !== void 0 && pricing.customRows.length > 0) {
    const byBucket = {
      input: usage.inputTokens,
      cacheRead: usage.cacheReadTokens,
      cacheWrite: usage.cacheWriteTokens,
      output: usage.outputTokens
    };
    let total = 0;
    for (const r of pricing.customRows) {
      const tokens = r.buckets.reduce((s, b) => s + (byBucket[b] ?? 0), 0);
      total += tokens * perM(r.perM) * discount;
    }
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
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      { name: "settings.section", id: "usage-meter", order: 20, label: () => "\u7528\u91CF\u8BA1\u91CF" },
      UsageMeterSettingsSection
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
              children: accountBalance === null ? usage.balanceNeedsKey ? "\u4F59\u989D \u672A\u914D\u7F6EKey" : "\u4F59\u989D \u83B7\u53D6\u4E2D\u2026" : `${balanceNegative ? "\u900F\u652F " : "\u4F59\u989D "}${fmtBalance(accountBalance, usage)}`
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
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 800, fontSize: 16, color: balanceKind === "none" ? t.text3 : balanceNegative ? t.error : t.ok }, children: balanceKind === "none" ? isDeepSeek ? usage.balanceNeedsKey ? "\u672A\u914D\u7F6EKey" : "\u83B7\u53D6\u4E2D\u2026" : "\u672A\u914D\u7F6E" : accountBalance !== null ? fmtBalance(accountBalance, usage) : "\u2014" }),
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
              const price = r.perM ?? bucketPricePerM(p, primary);
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
          ] })
        ]
      }
    )
  ] });
}
function draftKeyOf(provider, model) {
  return `${provider}/${model}`;
}
function isDeepseekRoute(provider) {
  return provider === "deepseek" || provider === "deepseek-official";
}
var DAY_LABELS = [[0, "\u65E5"], [1, "\u4E00"], [2, "\u4E8C"], [3, "\u4E09"], [4, "\u56DB"], [5, "\u4E94"], [6, "\u516D"]];
var NUM_PRICE_FIELDS = ["input", "cache", "cacheWrite", "output", "inputPeak", "inputOff", "cachePeak", "cacheOff", "outPeak", "outOff", "balance"];
var FIELD_LABEL = {
  input: "\u8F93\u5165(\u672A\u547D\u4E2D)",
  cache: "\u7F13\u5B58\u547D\u4E2D",
  cacheWrite: "\u7F13\u5B58\u5199\u5165",
  output: "\u8F93\u51FA"
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
    peakOn: pe !== void 0 && (pe.peak !== void 0 || pe.offPeak !== void 0),
    days: Array.isArray(pe?.peakDays) ? pe.peakDays : OFFICIAL_DAYS,
    windows: windowsToPeriods(Array.isArray(pe?.peakWindows) ? pe.peakWindows : OFFICIAL_WINDOWS),
    templateId: isCustom ? "" : pe !== void 0 ? matchTypeId(pe) : "",
    customRows,
    baseCustomRows: customRows,
    combined: pe?.combinedPerM !== void 0,
    discount: typeof pe?.discount === "number" && pe.discount < 1 ? String(pe.discount) : "",
    // whether this is a fresh official model shown with known defaults (→ show
    // a friendly "已按官方价预填，可修改后保存" hint) vs a non-official model
    // with no saved price (→ prompt the user to fill it in).
    prefillOfficial: official !== void 0 && !savedOverride,
    noSavedPrice: !savedOverride && official === void 0
  };
}
function UsageMeterSettingsSection(_props) {
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [loadError, setLoadError] = (0, import_react.useState)("");
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [saveMsg, setSaveMsg] = (0, import_react.useState)("");
  const [saveOk, setSaveOk] = (0, import_react.useState)(false);
  const rateRef = (0, import_react.useRef)(7.2);
  const [initialBalance, setInitialBalance] = (0, import_react.useState)("");
  const [apiKey, setApiKey] = (0, import_react.useState)("");
  const [keySaved, setKeySaved] = (0, import_react.useState)(false);
  const [modelDir, setModelDir] = (0, import_react.useState)([]);
  const [modelsLoading, setModelsLoading] = (0, import_react.useState)(true);
  const [selProvider, setSelProvider] = (0, import_react.useState)("");
  const [overrides, setOverrides] = (0, import_react.useState)({});
  const [balances, setBalances] = (0, import_react.useState)({});
  const [edits, setEdits] = (0, import_react.useState)({});
  const [expanded, setExpanded] = (0, import_react.useState)({});
  const [saveStates, setSaveStates] = (0, import_react.useState)({});
  const [savingAll, setSavingAll] = (0, import_react.useState)(false);
  const [sharedBalances, setSharedBalances] = (0, import_react.useState)({});
  const [templates, setTemplates] = (0, import_react.useState)([]);
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
          setLoadError(`\u52A0\u8F7D\u5931\u8D25 (${res.status})`);
          return;
        }
        const doc = await res.json();
        if (cancelled) return;
        const c = doc.config ?? {};
        const get = (v) => v === null || v === void 0 ? "" : String(v);
        setInitialBalance(get(c.initialBalance));
        setKeySaved(c.deepseekApiKey === "***");
        setOverrides(doc.priceOverrides ?? {});
        setBalances(doc.balances ?? {});
        const sb = {};
        for (const [pv, pc] of Object.entries(doc.providers ?? {})) if (pc.sharedBalance === true) sb[pv] = true;
        setSharedBalances(sb);
      } catch (err) {
        if (!cancelled) {
          console.warn("[usage-meter] load config failed", err);
          setLoadError("\u52A0\u8F7D\u5931\u8D25");
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
              const converted = cur !== void 0 && typeof b.currency === "string" && cur.currency !== b.currency ? convertAmount(b.balance, b.currency, cur.currency, rateRef.current) : b.balance;
              next[k] = { ...cur, balance: String(Math.round(converted * 1e6) / 1e6) };
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
  (0, import_react.useEffect)(() => {
    const d = {};
    for (const p of modelDir) {
      for (const m of p.models) {
        d[draftKeyOf(p.provider, m.model)] = seedEntry(draftKeyOf(p.provider, m.model), overrides, balances);
      }
    }
    setEdits(d);
  }, [modelDir, overrides, balances]);
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
      const tplDef = templates.find((tp) => tp.id === e.templateId);
      const cols = tplDef?.mode === "keep" ? [] : columnsForTemplate(e.templateId, templates);
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
      const rows = e.customRows.filter((r) => num(r.perM) !== void 0).map((r) => ({
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
    const body = { provider, model, prices, displayCurrency: e.currency };
    const bal = num(e.balance);
    if (!isDeepseekRoute(provider) && bal !== void 0) body.balance = bal;
    return body;
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
      return { ...s, [key]: next };
    });
  };
  const editNum = (key, fld, val) => {
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
  const persistModel = async (provider, model, body) => {
    const k = draftKeyOf(provider, model);
    const res = await fetch("/api/usage-meter/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      if (body.balance !== void 0) {
        setBalances((b) => ({ ...b, [`m:${provider}/${model}`]: { balance: Number(body.balance) } }));
      }
      setOverrides((o) => ({ ...o, [k]: { prices: body.prices } }));
    }
    return res.ok;
  };
  const saveModelPrice = async (provider, model) => {
    const k = draftKeyOf(provider, model);
    const body = buildModelBody(provider, model);
    if (body === null) return;
    setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: "\u4FDD\u5B58\u4E2D\u2026" } }));
    let ok = false;
    try {
      ok = await persistModel(provider, model, body);
    } catch (err) {
      console.warn("[usage-meter] save model price failed", err);
    }
    setSaveStates((s) => ({ ...s, [k]: { ok, msg: ok ? "\u5DF2\u4FDD\u5B58" : "\u4FDD\u5B58\u5931\u8D25" } }));
    window.setTimeout(() => setSaveStates((s) => {
      const n = { ...s };
      delete n[k];
      return n;
    }), 2500);
  };
  const resetModelPrice = (provider, model) => {
    const k = draftKeyOf(provider, model);
    setEdits((s) => ({ ...s, [k]: seedEntry(k, overrides, balances) }));
    const official = isDeepseekRoute(provider);
    setSaveStates((s) => ({ ...s, [k]: { ok: true, msg: official ? "\u5DF2\u91CD\u7F6E\u4E3A\u5B98\u65B9\u4EF7" : "\u5DF2\u91CD\u7F6E\u4E3A\u8BE5\u6A21\u578B\u5DF2\u4FDD\u5B58\u7684\u4EF7\u683C" } }));
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
      setSaveStates((s) => ({ ...s, [k]: { ok, msg: ok ? "\u5DF2\u4FDD\u5B58" : "\u4FDD\u5B58\u5931\u8D25" } }));
    }));
    setSavingAll(false);
  };
  const field = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "6px 0" };
  const label = { fontSize: 13, color: t.text2, minWidth: 120 };
  const input = { flex: 1, maxWidth: 320, padding: "4px 8px", border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 13, background: t.card, color: t.text };
  const select = { padding: "4px 8px", border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 13, background: t.card, color: t.text };
  const msToReadable = (ms) => {
    const n = Number(ms);
    if (Number.isNaN(n) || n <= 0) return ms;
    return n >= 864e5 ? `${Math.round(n / 864e5)} \u5929` : n >= 36e5 ? `${Math.round(n / 36e5)} \u5C0F\u65F6` : n >= 6e4 ? `${Math.round(n / 6e4)} \u5206\u949F` : `${Math.round(n / 1e3)} \u79D2`;
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
      if (initialBalance.trim() !== "") {
        const n = Number(initialBalance);
        if (!Number.isNaN(n) && n >= 0) patch.initialBalance = n;
      }
      if (apiKey.trim() !== "" && apiKey !== "***") patch.deepseekApiKey = apiKey.trim();
      patch.provider = "*";
      const res = await fetch("/api/usage-meter/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      if (res.ok) {
        setSaveOk(true);
        setSaveMsg("\u5DF2\u4FDD\u5B58");
        if (apiKey.trim() !== "" && apiKey !== "***") {
          setKeySaved(true);
          setApiKey("");
        }
      } else {
        setSaveOk(false);
        setSaveMsg(`\u4FDD\u5B58\u5931\u8D25 (${res.status})`);
      }
    } catch (err) {
      console.warn("[usage-meter] save config failed", err);
      setSaveOk(false);
      setSaveMsg("\u4FDD\u5B58\u5931\u8D25");
    }
    setSaving(false);
    window.setTimeout(() => {
      setSaveMsg("");
      setSaveOk(false);
    }, 2500);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "16px 24px 24px", fontSize: 13, color: t.text }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { fontSize: 18, fontWeight: 700, margin: "0 0 4px" }, children: "dsh-usage-meter" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { color: t.text3, fontSize: 12, margin: "0 0 12px" }, children: "DeepSeek \u7528\u91CF\u8BA1\u91CF \xB7 \u5168\u5C40\u8BBE\u7F6E\u3002\u5355\u4EF7\u4E0E\u5CF0\u8C37\u8BA1\u8D39\u8BF7\u5728\u300C\u4F1A\u8BDD \xB7 \u7528\u91CF\u5361\u7247 \u2192 \u7528\u6237\u81EA\u5B9A\u4E49\u8BBE\u7F6E\u300D\u4E2D\u7F16\u8F91\u3002" }),
    loadError !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginBottom: 12, padding: "8px 10px", border: `1px solid ${t.error}`, borderRadius: 6, color: t.error, fontSize: 12 }, children: loadError }),
    loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 13 }, children: "\u52A0\u8F7D\u5168\u5C40\u914D\u7F6E\u2026" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: field, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: label, htmlFor: "um-init", children: "\u975E DeepSeek \u521D\u59CB\u4F59\u989D" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "um-init", value: initialBalance, onChange: (e) => setInitialBalance(e.target.value), placeholder: "\u5982 100\uFF08CNY\uFF09", style: input })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: field, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: label, htmlFor: "um-key", children: "DeepSeek API Key" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1, display: "flex", gap: 8, maxWidth: 320, alignItems: "center" }, children: [
          keySaved ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { padding: "4px 8px", borderRadius: 6, background: "rgba(22, 163, 74, 0.10)", color: t.ok, fontSize: 12, whiteSpace: "nowrap" }, children: "\u5DF2\u4FDD\u5B58" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: t.text3, fontSize: 12, whiteSpace: "nowrap" }, children: "\u672A\u914D\u7F6E" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: "um-key",
              value: apiKey,
              onChange: (e) => {
                setApiKey(e.target.value);
              },
              placeholder: keySaved ? "\u7559\u7A7A\u4FDD\u7559\u5F53\u524D Key\uFF1B\u586B\u5199\u4EE5\u8986\u76D6" : "\u5982 sk-\u2026",
              autoComplete: "off",
              style: { ...input, maxWidth: 200 }
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 16, display: "flex", alignItems: "center", gap: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: save, disabled: saving, style: { fontSize: 13, padding: "6px 18px", borderRadius: 6, border: `1px solid ${t.border}`, background: saving ? "rgba(139, 148, 158, 0.10)" : t.accent, color: saving ? t.text3 : t.text, cursor: saving ? "default" : "pointer" }, children: saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58" }),
        saveMsg !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 12, color: saveOk ? t.ok : t.error }, children: [
          saveMsg,
          saveOk && apiKey.trim() !== "" ? " \xB7 \u5DF2\u66F4\u65B0 API Key" : ""
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 16, paddingTop: 12, borderTop: `1px solid ${t.borderSoft}` }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 700, fontSize: 13, marginBottom: 2 }, children: "\u7528\u91CF\u8BA1\u91CF \xB7 \u6A21\u578B\u914D\u7F6E" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 11, marginBottom: 0 }, children: "\u6309\u4F9B\u5E94\u5546 \u2192 \u6A21\u578B\u4E3A\u6BCF\u4E2A\u6A21\u578B\u5355\u72EC\u8BBE\u7F6E\u5E01\u79CD\u3001\u7528\u6237\u4F59\u989D\u3001\u5355\u4EF7\uFF08\u542B\u5CF0\u8C37\u4EF7\u5BF9\uFF09\u3001\u751F\u6548\u661F\u671F\u4E0E\u9AD8\u5CF0\u65F6\u6BB5\u3002" })
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
                style: { fontSize: 12, padding: "5px 14px", borderRadius: 6, border: `1px solid ${t.border}`, background: savingAll ? "rgba(139,148,158,0.10)" : t.accent, color: savingAll ? t.text3 : t.text, cursor: savingAll ? "default" : "pointer", whiteSpace: "nowrap" },
                children: savingAll ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4E00\u952E\u4FDD\u5B58\u5168\u90E8"
              }
            );
          })()
        ] }),
        modelsLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 12, marginTop: 8 }, children: "\u52A0\u8F7D\u6A21\u578B\u76EE\u5F55\u2026" }) : modelDir.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 12, marginTop: 8 }, children: "\u672A\u4ECE\u6A21\u578B\u76EE\u5F55\u83B7\u53D6\u5230\u6A21\u578B\u3002\u8BF7\u786E\u8BA4\u5F53\u524D\u7EC4\u5408\u5DF2\u6CE8\u518C LLM \u9002\u914D\uFF08`ctx.llm`\uFF09\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 10 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { fontSize: 12, color: t.text2 }, htmlFor: "um-provider", children: "\u4F9B\u5E94\u5546" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "select",
              {
                id: "um-provider",
                value: selProvider,
                onChange: (e) => setSelProvider(e.target.value),
                style: select,
                children: modelDir.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: p.provider, children: p.label }, p.provider))
              }
            ),
            !isDeepseekRoute(selProvider) && selProvider !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", marginLeft: 8 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: sharedBalances[selProvider] === true,
                  onChange: (ev) => void toggleSharedBalance(selProvider, ev.target.checked),
                  style: { accentColor: t.accent }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text2 }, children: "\u5171\u4EAB\u4F59\u989D\uFF08\u8BE5\u4F9B\u5E94\u5546\u6240\u6709\u6A21\u578B\u5171\u7528\u4E00\u4E2A\u4F59\u989D\uFF09" })
            ] })
          ] }),
          (() => {
            const active = modelDir.find((p) => p.provider === selProvider);
            if (active === void 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 12 }, children: "\u8BF7\u9009\u62E9\u4F9B\u5E94\u5546" });
            if (active.models.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.text3, fontSize: 12 }, children: "\u8BE5\u4F9B\u5E94\u5546\u4E0B\u6682\u65E0\u6A21\u578B" });
            const deep = isDeepseekRoute(active.provider);
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: active.models.map((m) => {
              const k = draftKeyOf(active.provider, m.model);
              const e = edits[k];
              if (e === void 0) return null;
              const isOpen = expanded[k] === true;
              const st = saveStates[k];
              const cell = { width: "100%", minWidth: 80, maxWidth: 150, boxSizing: "border-box", textAlign: "right", fontSize: 12, padding: "5px 8px", border: `1px solid ${t.border}`, borderRadius: 5, background: t.card, color: t.text };
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { border: `1px solid ${t.border}`, borderRadius: 6, overflow: "hidden" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "button",
                  {
                    type: "button",
                    onClick: () => setExpanded((s) => ({ ...s, [k]: !isOpen })),
                    style: { display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, fontWeight: 600, border: "none", background: isOpen ? t.card : "transparent", color: t.text, cursor: "pointer" },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 }, children: isOpen ? "\u25BC" : "\u25B6" }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: m.label }),
                      e.peakOn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "rgba(139,148,158,0.12)", color: t.text2, whiteSpace: "nowrap" }, children: "\u5CF0\u8C37" }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 }, children: e.currency })
                    ]
                  }
                ),
                isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 10 }, children: [
                  e.prefillOfficial && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.ok, fontSize: 11, lineHeight: 1.4 }, children: "\u5DF2\u6309 DeepSeek \u5B98\u65B9\u4EF7\u9884\u586B\uFF1A\u5468\u4E00\u81F3\u4E94 9:00\u201312:00\u300114:00\u201318:00 \u4E3A\u5CF0\u4EF7\uFF0C\u5468\u516D/\u5468\u65E5\u6309\u8C37\u4EF7\uFF1B\u53EF\u4FEE\u6539\u540E\u4FDD\u5B58\u3002" }),
                  e.noSavedPrice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: t.error, fontSize: 11, lineHeight: 1.4 }, children: "\u8BE5\u6A21\u578B\u5C1A\u672A\u914D\u7F6E\u4EF7\u683C\u4E0E\u4F59\u989D\uFF1A\u8BF7\u5728\u4E0B\u65B9\u586B\u5199\u5355\u4EF7/\u4F59\u989D\u540E\u70B9\u300C\u4FDD\u5B58\u5355\u4EF7\u300D\uFF0C\u5426\u5219\u8BE5\u6A21\u578B\u7528\u91CF\u91D1\u989D\u53EF\u80FD\u6309 0 \u8BA1\u3002" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 16, flexWrap: "wrap" }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: field, htmlFor: `um-cur-${k}`, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.text2 }, children: "\u5E01\u79CD" }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                        "select",
                        {
                          id: `um-cur-${k}`,
                          value: e.currency,
                          onChange: (ev) => void switchCurrency(k, ev.target.value),
                          style: { ...select, maxWidth: 100, fontSize: 12, padding: "3px 6px" },
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "CNY", children: "CNY (\xA5)" }),
                            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "USD", children: "USD ($)" })
                          ]
                        }
                      )
                    ] }),
                    !deep && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: field, htmlFor: `um-bal-${k}`, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.text2 }, children: "\u7528\u6237\u4F59\u989D" }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "input",
                        {
                          id: `um-bal-${k}`,
                          value: e.balance,
                          onChange: (ev) => editNum(k, "balance", ev.target.value),
                          placeholder: "\u5982 100",
                          style: { ...input, maxWidth: 140, fontSize: 12, padding: "3px 6px" }
                        }
                      )
                    ] })
                  ] }),
                  templates.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: field, htmlFor: `um-tpl-${k}`, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.text2 }, children: "\u8BA1\u8D39\u6A21\u677F" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
                        style: { ...select, maxWidth: 240, fontSize: 12, padding: "3px 6px" },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\uFF08\u81EA\u5B9A\u4E49\uFF09" }),
                          templates.map((tp) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: tp.id, children: tp.label }, tp.id))
                        ]
                      }
                    )
                  ] }),
                  e.combined && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text2 }, children: "\u5408\u5E76\u8BA1\u4EF7\uFF1A\u8F93\u5165\u5355\u4EF7\u5373\u5BF9\u5168\u90E8 token \u7EDF\u4E00\u8BA1\u8D39\uFF08\u7F13\u5B58/\u8F93\u51FA\u5408\u5E76\uFF09\u3002" }),
                  e.discount !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: field, htmlFor: `um-disc-${k}`, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.text2 }, children: "Batch \u6298\u6263" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "input",
                      {
                        id: `um-disc-${k}`,
                        value: e.discount,
                        onChange: (ev) => setEdits((s) => ({ ...s, [k]: { ...e, discount: ev.target.value } })),
                        placeholder: "\u5982 0.5",
                        style: { ...input, maxWidth: 90, fontSize: 12, padding: "3px 6px" }
                      }
                    )
                  ] }),
                  e.templateId === "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, fontWeight: 700, color: t.text2, marginBottom: 4 }, children: "\u81EA\u5B9A\u4E49\u5355\u4EF7\u9879\uFF08\u6BCF\u884C = \u5355\u4EF7 \xD7 \u8BE5\u884C token \u6570\uFF1B\u5CF0/\u8C37\u4EF7\u5728\u4E0B\u65B9\u300C\u542F\u7528\u5CF0\u8C37\u8BA1\u8D39\u300D\u91CC\u7EDF\u4E00\u586B\uFF09" }),
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
                            CUSTOM_BUCKET_LABEL[b]
                          ] }, b);
                        }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, color: t.text2, minWidth: 56 }, children: [
                          "\uFF1D ",
                          CUSTOM_BUCKET_LABEL[r.bucket]
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "input",
                          {
                            value: r.perM,
                            placeholder: "\u5143/M",
                            onChange: (ev) => editCustomRow(k, ri, (x) => ({ ...x, perM: ev.target.value })),
                            style: { ...input, maxWidth: 80, fontSize: 12, padding: "3px 6px" }
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "button",
                          {
                            type: "button",
                            onClick: () => delCustomRow(k, ri),
                            style: { fontSize: 11, padding: "2px 8px", borderRadius: 6, border: `1px solid ${t.borderSoft}`, background: "transparent", color: t.text2, cursor: "pointer" },
                            children: "\u5220"
                          }
                        )
                      ] }, ri);
                    }),
                    e.customRows.length < CUSTOM_BUCKETS.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        type: "button",
                        onClick: () => addCustomRow(k),
                        style: { fontSize: 11, padding: "2px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: "pointer" },
                        children: "+ \u6DFB\u52A0\u5355\u4EF7\u9879\uFF08\u6700\u591A 4 \u9879\uFF09"
                      }
                    )
                  ] }),
                  e.templateId !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 12, fontWeight: 700, color: t.text2, marginBottom: 4 }, children: "\u57FA\u7840\u5355\u4EF7\uFF08\u5143/M \u6216 $/M\uFF09" }),
                    (() => {
                      const gridFields = columnsForTemplate(e.templateId, templates);
                      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: `auto ${gridFields.map(() => "1fr").join(" ")}`, gap: "2px 8px", alignItems: "center" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 } }),
                        gridFields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3, textAlign: "right" }, children: FIELD_LABEL[f] }, f)),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text2 }, children: "\u5355\u4EF7" }),
                        gridFields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "input",
                          {
                            id: `um-${f}-${k}`,
                            value: e[f],
                            onChange: (ev) => editNum(k, f, ev.target.value),
                            placeholder: "\u5143/M",
                            style: cell
                          },
                          f
                        ))
                      ] });
                    })()
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }, children: (deep || e.templateId === "peak-off-peak" || e.templateId === "" || e.peakOn) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "input",
                          {
                            type: "checkbox",
                            checked: e.peakOn,
                            onChange: (ev) => setEdits((s) => ({ ...s, [k]: { ...e, peakOn: ev.target.checked } })),
                            style: { accentColor: t.accent }
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: t.text2 }, children: "\u542F\u7528\u5CF0\u8C37\u8BA1\u8D39" })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 }, children: "\u5CF0: \u9AD8; \u8C37: \u4F4E; \u672A\u52FE\u9009\u661F\u671F = \u8C37\u4EF7" })
                    ] }) }),
                    e.peakOn && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 6, padding: "6px 8px", background: "rgba(139,148,158,0.06)", borderRadius: 4 }, children: [
                      e.templateId === "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: e.customRows.map((r, ri) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text2, width: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: CUSTOM_BUCKET_LABEL[r.bucket] }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 }, children: "\u5CF0\u4EF7" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "input",
                          {
                            value: r.peakPerM,
                            placeholder: "\u5143/M",
                            onChange: (ev) => editCustomRow(k, ri, (x) => ({ ...x, peakPerM: ev.target.value })),
                            style: { ...input, maxWidth: 90, fontSize: 12, padding: "3px 6px" }
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 }, children: "\u8C37\u4EF7" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "input",
                          {
                            value: r.offPerM,
                            placeholder: "\u5143/M",
                            onChange: (ev) => editCustomRow(k, ri, (x) => ({ ...x, offPerM: ev.target.value })),
                            style: { ...input, maxWidth: 90, fontSize: 12, padding: "3px 6px" }
                          }
                        )
                      ] }, ri)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: "2px 8px", alignItems: "center" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 } }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3, textAlign: "right" }, children: "\u8F93\u5165(\u672A\u547D\u4E2D)" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3, textAlign: "right" }, children: "\u7F13\u5B58\u547D\u4E2D" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3, textAlign: "right" }, children: "\u8F93\u51FA" }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text2 }, children: "\u5CF0\u4EF7" }),
                        ["inputPeak", "cachePeak", "outPeak"].map((fld) => {
                          const key = `um-${fld}-${k}`;
                          return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "input",
                            {
                              id: key,
                              value: e[fld],
                              onChange: (ev) => editNum(k, fld, ev.target.value),
                              placeholder: "\u5143/M",
                              style: cell
                            },
                            key
                          );
                        }),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text2 }, children: "\u8C37\u4EF7" }),
                        ["inputOff", "cacheOff", "outOff"].map((fld) => {
                          const key = `um-${fld}-${k}`;
                          return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "input",
                            {
                              id: key,
                              value: e[fld],
                              onChange: (ev) => editNum(k, fld, ev.target.value),
                              placeholder: "\u5143/M",
                              style: cell
                            },
                            key
                          );
                        })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text2, whiteSpace: "nowrap" }, children: "\u5CF0\u8C37\u661F\u671F:" }),
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
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: t.text }, children: lbl })
                        ] }, d))
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 11, color: t.text2, marginBottom: 3 }, children: "\u9AD8\u5CF0\u65F6\u6BB5\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09:" }),
                        e.windows.map((p, pi) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 4, marginBottom: 4, flexWrap: "wrap" }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, color: t.text3 }, children: [
                            pi + 1,
                            "."
                          ] }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 }, children: "\u8D77" }),
                          [["sh", 23], ["sm", 59]].map(([f, max]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "select",
                            {
                              value: p[f],
                              "aria-label": `${f}-${pi}`,
                              onChange: (ev) => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.map((x, xi) => xi === pi ? { ...x, [f]: ev.target.value } : x) } })),
                              style: { padding: "2px 4px", border: `1px solid ${t.border}`, borderRadius: 5, background: t.card, color: t.text, fontSize: 12 },
                              children: Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: v, children: v }, v))
                            },
                            f
                          )),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 }, children: "\u65F6" }),
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 10, color: t.text3 }, children: "\u6B62" }),
                          [["eh", 23], ["em", 59]].map(([f, max]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "select",
                            {
                              value: p[f],
                              "aria-label": `${f}-${pi}`,
                              onChange: (ev) => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.map((x, xi) => xi === pi ? { ...x, [f]: ev.target.value } : x) } })),
                              style: { padding: "2px 4px", border: `1px solid ${t.border}`, borderRadius: 5, background: t.card, color: t.text, fontSize: 12 },
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
                              children: "\u5220"
                            }
                          )
                        ] }, pi)),
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          "button",
                          {
                            type: "button",
                            onClick: () => setEdits((s) => ({ ...s, [k]: { ...e, windows: [...e.windows, { sh: "9", sm: "00", eh: "12", em: "00" }] } })),
                            style: { fontSize: 11, padding: "2px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: "pointer" },
                            children: "+ \u6DFB\u52A0\u65F6\u6BB5"
                          }
                        )
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        type: "button",
                        onClick: () => void saveModelPrice(active.provider, m.model),
                        style: { fontSize: 12, padding: "4px 12px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: "pointer" },
                        children: "\u4FDD\u5B58\u5355\u4EF7"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "button",
                      {
                        type: "button",
                        onClick: () => void resetModelPrice(active.provider, m.model),
                        style: { fontSize: 12, padding: "4px 12px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, cursor: "pointer" },
                        children: "\u91CD\u7F6E\u4EF7\u683C"
                      }
                    ),
                    st !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11, color: st.ok ? t.ok : t.error, whiteSpace: "nowrap" }, children: st.msg })
                  ] })
                ] })
              ] }, m.model);
            }) });
          })()
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { color: t.text3, fontSize: 11, marginTop: 12, marginBottom: 0 }, children: "\u4F1A\u8BDD\u7EA7\u5355\u4EF7\u3001\u8BA1\u8D39\u65B9\u5F0F\u4E0E\u5CF0\u8C37\u4EF7\u5728\u300C\u5BF9\u8BDD \xB7 \u7528\u91CF\u5361\u7247 \u2192 \u7528\u6237\u81EA\u5B9A\u4E49\u8BBE\u7F6E\u300D\u4E2D\u7F16\u8F91\u3002" })
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
