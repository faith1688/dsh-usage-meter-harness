window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-usage-meter",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/projection.ts
		/** Bucket-by-bucket cost (each bucket × its own price); 0 while pricing is unknown. */
		function costBreakdown(usage, pricing) {
			if (pricing === null) return {
				input: 0,
				cacheRead: 0,
				cacheWrite: 0,
				output: 0,
				total: 0
			};
			const perM = (v) => v / 1e6;
			const discount = pricing.discount ?? 1;
			if (pricing.combinedPerM !== void 0) {
				const total = (usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens + usage.outputTokens) * perM(pricing.combinedPerM) * discount;
				return {
					input: total,
					cacheRead: 0,
					cacheWrite: 0,
					output: 0,
					total
				};
			}
			const input = usage.inputTokens * perM(pricing.inputPerM) * discount;
			const cacheRead = usage.cacheReadTokens * perM(pricing.cacheReadPerM ?? pricing.inputPerM) * discount;
			const cacheWrite = usage.cacheWriteTokens * perM(pricing.cacheWritePerM ?? pricing.inputPerM) * discount;
			const output = usage.outputTokens * perM(pricing.outputPerM) * discount;
			return {
				input,
				cacheRead,
				cacheWrite,
				output,
				total: input + cacheRead + cacheWrite + output
			};
		}
		//#endregion
		//#region src/client/UsageReadout.tsx
		/**
		* The session-scoped usage/cost readout rendered into
		* `conversation.composer.dock`. One-line summary + click-to-expand detail card.
		*
		* Pure reader: the host computed every number in each pricing row's native
		* currency (CNY for domestic models, USD for foreign ones). Display currency
		* conversion (CNY↔USD, live rate) happens here only.
		*/
		const t = {
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
		function formatTokens(n) {
			if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
			if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
			if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
			return String(n);
		}
		/** Convert an amount from its native currency into the display currency. */
		function toDisplay(amount, native, display, usdToCny) {
			if (native === display) return amount;
			if (native === "USD" && display === "CNY") return amount * usdToCny;
			if (native === "CNY" && display === "USD") return amount / usdToCny;
			return amount;
		}
		function fmtMoney(amount, native, usage) {
			const v = toDisplay(amount, native, usage.currency, usage.usdToCny);
			const symbol = usage.currency === "USD" ? "$" : "¥";
			const decimals = Math.abs(v) > 0 && Math.abs(v) < .01 ? 4 : 2;
			return `${symbol} ${v.toFixed(decimals)}`;
		}
		function fmtPrice(amountPerM, native, usage) {
			const v = toDisplay(amountPerM, native, usage.currency, usage.usdToCny);
			return `${usage.currency === "USD" ? "$" : "¥"} ${v.toFixed(v < 1 ? 3 : 2)}/M`;
		}
		/**
		* Format an account balance in the DISPLAY currency: the internal value is
		* always kept in its official currency (CNY for DeepSeek); only the shown
		* number is converted through the rate — conversions never feed back into
		* any computation.
		*/
		function fmtBalance(balance, usage) {
			const v = toDisplay(balance.totalBalance, balance.currency, usage.currency, usage.usdToCny);
			return `${usage.currency === "USD" ? "$" : "¥"} ${v.toFixed(2)}`;
		}
		function fmtTime(ms) {
			if (!ms) return "--:--:--";
			return new Date(ms).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit"
			});
		}
		/** Force a fresh USD→CNY rate from the server; null on failure (keep last). */
		async function fetchFreshRate() {
			try {
				const res = await fetch("/api/usage-meter/refresh-rate", { method: "POST" });
				if (!res.ok) return null;
				const doc = await res.json();
				if (typeof doc?.usdToCny !== "number") return null;
				return {
					usdToCny: doc.usdToCny,
					rateUpdatedAt: doc.rateUpdatedAt ?? Date.now()
				};
			} catch {
				return null;
			}
		}
		function fmtDate(ms) {
			const d = new Date(ms);
			return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
		}
		function sameDay(a, b) {
			const da = new Date(a);
			const db = new Date(b);
			return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
		}
		/**
		* Tokens summary for one turn row. A turn that just started (0 tokens, still
		* in progress) shows 「0 入 / 0 出」; only a zero-token turn that actually
		* ENDED aborted/interrupted shows 「对话被停止」.
		*/
		function turnTokensText(turn) {
			const total = turn.inputTokens + turn.cacheReadTokens + turn.cacheWriteTokens + turn.outputTokens;
			return total === 0 && turn.endedAt > 0 && (turn.endReason === "aborted" || turn.endReason === "interrupted") ? "对话被停止" : `${formatTokens(total - turn.outputTokens)} 入 / ${formatTokens(turn.outputTokens)} 出`;
		}
		function bucketTokens(usage, b) {
			switch (b) {
				case "input": return usage.inputTokens;
				case "cacheRead": return usage.cacheReadTokens;
				case "cacheWrite": return usage.cacheWriteTokens;
				case "output": return usage.outputTokens;
			}
		}
		function bucketCost(bd, b) {
			switch (b) {
				case "input": return bd.input;
				case "cacheRead": return bd.cacheRead;
				case "cacheWrite": return bd.cacheWrite;
				case "output": return bd.output;
			}
		}
		function bucketPricePerM(p, b) {
			if (p === null) return void 0;
			if (p.combinedPerM !== void 0) return p.combinedPerM;
			switch (b) {
				case "input": return p.inputPerM;
				case "cacheRead": return p.cacheReadPerM ?? p.inputPerM;
				case "cacheWrite": return p.cacheWritePerM ?? p.inputPerM;
				case "output": return p.outputPerM;
			}
		}
		/** The ModelPricing field a bucket's per-M price maps to (for the editor). */
		function bucketPriceKey(b) {
			switch (b) {
				case "input": return "inputPerM";
				case "cacheRead": return "cacheReadPerM";
				case "cacheWrite": return "cacheWritePerM";
				case "output": return "outputPerM";
			}
		}
		/** Which of the 7 billing types a pricing row structurally matches (for the dropdown auto-select). */
		function matchTypeId(p) {
			if (p === null) return "basic";
			if (p.discount !== void 0 && p.discount < 1) return "batch";
			if (p.combinedPerM !== void 0) return "combined";
			if (p.peak !== void 0 && p.offPeak !== void 0) return "peak-off-peak";
			if (p.cacheWritePerM !== void 0 && p.cacheReadPerM !== void 0) return "cache-write";
			if (p.cacheReadPerM !== void 0) return "cache-split";
			return "basic";
		}
		/** The per-bucket peak/off-peak rate (fallback to input when cache-read rate absent). */
		function peakPricePerM(p, b) {
			if (p === void 0) return void 0;
			switch (b) {
				case "input": return p.inputPerM;
				case "cacheRead": return p.cacheReadPerM ?? p.inputPerM;
				case "cacheWrite": return p.inputPerM;
				case "output": return p.outputPerM;
			}
		}
		/** Peak/off-peak label for providers with time-of-day billing, or null. */
		function peakLabel(p) {
			if (p === null || p.peak === void 0 || p.offPeak === void 0) return null;
			if (p.peakOffPeakFrom !== void 0 && Date.now() < p.peakOffPeakFrom) return "峰谷价未生效";
			const h = (/* @__PURE__ */ new Date()).getUTCHours();
			return h >= 1 && h < 4 || h >= 6 && h < 10 ? "高峰" : "低谷";
		}
		const row = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 8,
			padding: "4px 0",
			lineHeight: "18px"
		};
		const dateSep = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			color: "var(--dsw-alias-label-tertiary, #8b949e)",
			fontSize: 11,
			margin: "4px 0"
		};
		function UsageReadout({ useProjection }) {
			const usage = useProjection("usageCost");
			const [open, setOpen] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onDoc = (e) => {
					if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
				};
				document.addEventListener("mousedown", onDoc);
				return () => document.removeEventListener("mousedown", onDoc);
			}, [open]);
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				style: {
					position: "relative",
					display: "inline-flex"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setOpen((o) => !o),
					"aria-expanded": open,
					title: "用量 / 费用详情",
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
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontWeight: 600,
								color: t.text,
								maxWidth: 140,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							children: usage.model ?? "未选择模型"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: t.text3,
								whiteSpace: "nowrap"
							},
							children: "·"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								fontWeight: 700,
								color: p ? t.brand : t.text3,
								whiteSpace: "nowrap"
							},
							children: ["本次 ", p ? fmtMoney(usage.estimatedCost, native, usage) : "无价格"]
						}),
						(balanceKind !== "none" || isDeepSeek && accountBalance === null) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							title: accountBalance !== null ? `${accountBalance.source === "computed" ? "计算" : "更新"}于 ${fmtTime(accountBalance.updatedAt)}${isDeepSeek ? "（官网余额刷新有延迟）" : ""}${pricesConverted ? ` · 汇率 1USD≈${usage.usdToCny.toFixed(4)}CNY${usage.rateUpdatedAt > 0 ? ` · 更新于 ${fmtTime(usage.rateUpdatedAt)}` : ""}` : ""}` : "等待余额配置…",
							style: {
								fontWeight: 600,
								color: accountBalance === null ? t.text3 : balanceNegative ? t.error : t.ok,
								background: accountBalance === null ? "rgba(139, 148, 158, 0.10)" : balanceNegative ? "rgba(209, 36, 47, 0.10)" : "rgba(22, 163, 74, 0.10)",
								borderRadius: 999,
								padding: "0 6px",
								whiteSpace: "nowrap"
							},
							children: accountBalance === null ? "余额 获取中…" : `${balanceNegative ? "透支 " : "余额 "}${fmtBalance(accountBalance, usage)}`
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								color: t.text3,
								whiteSpace: "nowrap"
							},
							children: [usage.requestCount, " 次"]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: t.text3,
								transform: open ? "rotate(180deg)" : "none",
								transition: "transform .12s ease",
								fontSize: 9
							},
							children: "▼"
						})
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "baseline",
								justifyContent: "space-between",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontWeight: 700,
									fontSize: 13
								},
								children: usage.model ?? "未选择模型"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: t.text3,
									fontSize: 11
								},
								children: usage.provider ?? ""
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								color: t.text3,
								fontSize: 11,
								marginTop: 2
							},
							children: [
								"价格来源 ",
								p?.source === "remote" ? "远端" : "内置",
								" · 更新于",
								" ",
								p?.updatedAt ? new Date(p.updatedAt).toLocaleString() : "—",
								peak !== null ? ` · ${peak}` : "",
								pricesConverted ? ` · 汇率 1USD=${usage.usdToCny.toFixed(4)}CNY` : ""
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...row,
								borderBottom: `1px solid ${t.borderSoft}`,
								paddingTop: 8,
								paddingBottom: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { color: t.text2 },
								children: balanceKind === "account" ? "账户余额" : "余额"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-end",
									gap: 1
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontWeight: 800,
											fontSize: 16,
											color: balanceKind === "none" ? t.text3 : balanceNegative ? t.error : t.ok
										},
										children: balanceKind === "none" ? isDeepSeek ? "获取中…" : "未配置" : accountBalance !== null ? fmtBalance(accountBalance, usage) : "—"
									}),
									accountBalance !== null && accountBalance.updatedAt > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										title: isDeepSeek ? "官网余额刷新可能有延迟，余额按「锚点 − 本地消费」实时计算" : "余额 = 账户余额 − 累计消费（全局账本）",
										style: {
											color: t.text3,
											fontSize: 10,
											whiteSpace: "nowrap"
										},
										children: [
											accountBalance.source === "computed" ? "计算" : "更新",
											"于 ",
											fmtTime(accountBalance.updatedAt),
											isDeepSeek ? " · 官网刷新有延迟" : ""
										]
									}),
									pricesConverted && balanceKind !== "none" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											color: t.text3,
											fontSize: 10,
											whiteSpace: "nowrap"
										},
										children: [
											"汇率 1USD≈",
											usage.usdToCny.toFixed(4),
											"CNY",
											usage.rateUpdatedAt > 0 ? ` · 更新于 ${fmtTime(usage.rateUpdatedAt)}` : ""
										]
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...row,
								paddingTop: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { color: t.text2 },
								children: "本次对话费用"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontWeight: 700,
									color: p ? t.brand : t.text3
								},
								children: p ? fmtMoney(usage.estimatedCost, native, usage) : "无价格数据"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { marginTop: 8 },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										...row,
										paddingBottom: 2,
										color: t.text3,
										fontSize: 11
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: { flex: 1 },
											children: "用量"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												width: 92,
												textAlign: "right"
											},
											children: "单价"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												width: 92,
												textAlign: "right"
											},
											children: "小计"
										})
									]
								}),
								usage.priceRows.map((r) => {
									const primary = r.buckets[0] ?? "input";
									const tokens = r.buckets.reduce((s, b) => s + bucketTokens(usage, b), 0);
									const cost = r.buckets.reduce((s, b) => s + bucketCost(breakdown, b), 0);
									const price = bucketPricePerM(p, primary);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BucketRow, {
										label: r.label,
										tokens,
										price,
										cost,
										native,
										usage,
										accent: primary === "cacheRead" ? t.ok : void 0
									}, r.label + r.buckets.join(","));
								}),
								usage.reasoningTokens > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										...row,
										color: t.text3,
										fontSize: 11,
										paddingTop: 1
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										"推理 ",
										formatTokens(usage.reasoningTokens),
										"（已含在输出内）"
									] })
								}),
								p !== null && p.discount !== void 0 && p.discount < 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										color: t.brand,
										fontSize: 10,
										paddingTop: 2
									},
									children: [
										"Batch 半价：小计已按 ×",
										p.discount,
										" 计算（单价列仍为标准价）"
									]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...row,
								color: t.text2,
								fontSize: 11,
								borderTop: `1px solid ${t.borderSoft}`,
								marginTop: 4,
								paddingTop: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								"请求 ",
								usage.requestCount,
								" 次成功 · ",
								usage.stepCount,
								" 次尝试"
							] }), hitRate !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: { color: t.text3 },
								children: [
									"缓存命中 ",
									hitRate,
									"%"
								]
							})]
						}),
						turns.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								borderTop: `1px solid ${t.borderSoft}`,
								marginTop: 6,
								paddingTop: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									color: t.text3,
									fontSize: 11,
									marginBottom: 2
								},
								children: [
									"每轮费用（共 ",
									turns.length,
									" 轮）"
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									maxHeight: 200,
									overflowY: "auto"
								},
								children: turns.map((turn, i) => {
									const prev = i > 0 ? turns[i - 1] : void 0;
									const newDay = prev === void 0 || !sameDay(prev.startedAt, turn.startedAt);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [newDay && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: dateSep,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
												flex: 1,
												height: 1,
												background: t.borderSoft
											} }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fmtDate(turn.startedAt) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
												flex: 1,
												height: 1,
												background: t.borderSoft
											} })
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											...row,
											padding: "2px 0"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													color: t.text2,
													whiteSpace: "nowrap"
												},
												children: [
													"第 ",
													turn.turn,
													" 轮 · ",
													fmtTime(turn.startedAt),
													turn.endedAt > 0 ? `–${fmtTime(turn.endedAt)}` : "",
													turn.model ? ` · ${turn.model}` : ""
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: { color: t.text3 },
												children: turnTokensText(turn)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													fontWeight: 600,
													color: t.error
												},
												children: ["-", fmtMoney(turn.cost, turn.currency, usage)]
											})
										]
									})] }, turn.turn);
								})
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsSection, { usage }, usage.provider ?? "none")
					]
				})]
			});
		}
		/**
		* Per-provider settings (collapsible):
		*  行1 币种 (all providers)
		*  行2 账户余额 + 充值 + 保存 (non-DeepSeek; 余额与顶部同一值，编辑=覆盖，充值正加负减)
		*  行3-5 模型单价编辑（标题 / 计费方式下拉 / 用量名称+单价 / 保存单价+重置）
		*/
		function SettingsSection({ usage }) {
			const isDeepSeek = usage.provider === "deepseek-official" || usage.provider === "deepseek";
			const [openSettings, setOpenSettings] = (0, react.useState)(false);
			const [cfgCurrency, setCfgCurrency] = (0, react.useState)(usage.currency);
			const [currencyDirty, setCurrencyDirty] = (0, react.useState)(false);
			const [modelCurrency, setModelCurrency] = (0, react.useState)(usage.basePricing?.currency ?? "CNY");
			const [modelCurrencyDirty, setModelCurrencyDirty] = (0, react.useState)(false);
			const [rateInfo, setRateInfo] = (0, react.useState)({
				usdToCny: usage.usdToCny,
				rateUpdatedAt: usage.rateUpdatedAt
			});
			const conversionActive = cfgCurrency !== modelCurrency;
			const [cfgBalance, setCfgBalance] = (0, react.useState)("");
			const [balanceDirty, setBalanceDirty] = (0, react.useState)(false);
			const [cfgRecharge, setCfgRecharge] = (0, react.useState)("");
			const [saved, setSaved] = (0, react.useState)(false);
			const [saveMsg, setSaveMsg] = (0, react.useState)("");
			const unitSym = cfgCurrency === "USD" ? "$" : "¥";
			(0, react.useEffect)(() => {
				if (currencyDirty) return;
				setCfgCurrency(usage.currency);
			}, [usage.model, usage.currency]);
			(0, react.useEffect)(() => {
				if (modelCurrencyDirty) return;
				setModelCurrency(usage.basePricing?.currency ?? "CNY");
			}, [usage.model, usage.basePricing?.currency]);
			(0, react.useEffect)(() => {
				if (balanceDirty) return;
				if (usage.accountBalance !== null) {
					const live = toDisplay(usage.accountBalance.totalBalance, usage.accountBalance.currency, cfgCurrency, usage.usdToCny);
					setCfgBalance(String(Number(live.toFixed(2))));
				}
			}, [
				usage.accountBalance?.totalBalance,
				usage.accountBalance?.currency,
				cfgCurrency,
				balanceDirty
			]);
			const onCurrencyChange = (next) => {
				if (next === cfgCurrency) return;
				const cur = Number(cfgBalance);
				if (!Number.isNaN(cur) && cfgBalance.trim() !== "") setCfgBalance(String(Number(toDisplay(cur, cfgCurrency, next, usage.usdToCny).toFixed(2))));
				setBalanceDirty(false);
				setCurrencyDirty(true);
				setCfgCurrency(next);
				if (next !== modelCurrency) fetchFreshRate().then((fresh) => {
					if (fresh !== null) setRateInfo(fresh);
				});
			};
			const onPricingCurrencyChange = (next) => {
				setModelCurrencyDirty(true);
				setModelCurrency(next);
				if (next !== cfgCurrency) fetchFreshRate().then((fresh) => {
					if (fresh !== null) setRateInfo(fresh);
				});
			};
			const save = async () => {
				const patch = {
					provider: usage.provider,
					model: usage.model,
					currency: cfgCurrency
				};
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
					setSaveMsg(res.ok ? "已保存，余额已更新" : "保存失败");
					window.setTimeout(() => {
						setSaved(false);
						setSaveMsg("");
					}, 2500);
				} catch (err) {
					console.warn("[usage-meter] save failed", err);
					setSaveMsg("保存失败");
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					borderTop: `1px solid ${t.borderSoft}`,
					marginTop: 6,
					paddingTop: 6
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setOpenSettings((o) => !o),
					"aria-expanded": openSettings,
					style: {
						display: "flex",
						alignItems: "center",
						gap: 6,
						fontSize: 11,
						color: t.text2,
						background: "transparent",
						border: "none",
						padding: "2px 0",
						cursor: "pointer"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "用户自定义设置" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 9,
							transform: openSettings ? "rotate(180deg)" : "none",
							transition: "transform .12s ease"
						},
						children: "▼"
					})]
				}), openSettings && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: t.text3,
							fontSize: 10,
							marginBottom: 4
						},
						children: "保存后余额立即生效；模板修改需刷新浏览器生效"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							marginBottom: 4
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: {
									fontSize: 11,
									color: t.text2
								},
								children: "币种"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								value: cfgCurrency,
								onChange: (e) => onCurrencyChange(e.target.value),
								style: {
									fontSize: 12,
									padding: "2px 4px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "CNY",
									children: "CNY（人民币）"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "USD",
									children: "USD（美元）"
								})]
							}),
							isDeepSeek && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: save,
								style: {
									fontSize: 12,
									padding: "3px 10px",
									borderRadius: 6,
									border: `1px solid ${t.border}`,
									background: t.accent,
									color: t.text,
									cursor: "pointer"
								},
								children: saved ? "已保存" : "保存"
							}),
							isDeepSeek && saveMsg !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: t.ok,
									fontSize: 10
								},
								children: saveMsg
							})
						]
					}),
					!isDeepSeek && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							flexWrap: "wrap",
							marginBottom: 4
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									fontSize: 11,
									color: t.text2
								},
								children: [
									"账户余额（",
									unitSym,
									"）"
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: cfgBalance,
								onChange: (e) => {
									setCfgBalance(e.target.value);
									setBalanceDirty(true);
								},
								placeholder: `如 100${unitSym}`,
								style: {
									width: 84,
									fontSize: 12,
									padding: "2px 4px"
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									fontSize: 11,
									color: t.text2
								},
								children: [
									"充值（",
									unitSym,
									"，可负）"
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: cfgRecharge,
								onChange: (e) => setCfgRecharge(e.target.value),
								placeholder: `如 100${unitSym}`,
								style: {
									width: 70,
									fontSize: 12,
									padding: "2px 4px"
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: save,
								style: {
									fontSize: 12,
									padding: "3px 10px",
									borderRadius: 6,
									border: `1px solid ${t.border}`,
									background: t.accent,
									color: t.text,
									cursor: "pointer"
								},
								children: saved ? "已保存" : "保存"
							}),
							saveMsg !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: t.ok,
									fontSize: 10
								},
								children: saveMsg
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PriceEditor, {
						usage,
						onPricingCurrencyChange,
						onResetCurrency: (c) => {
							setCfgCurrency(c);
							setCurrencyDirty(false);
							setModelCurrency(c);
							setModelCurrencyDirty(false);
						}
					}, `${usage.provider ?? ""}/${usage.model ?? ""}`),
					conversionActive && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							color: t.text3,
							fontSize: 10,
							marginTop: 2
						},
						children: [
							"汇率：1 USD ≈ ",
							rateInfo.usdToCny.toFixed(4),
							" CNY · 更新于 ",
							fmtTime(rateInfo.rateUpdatedAt),
							"（",
							modelCurrency,
							" → ",
							cfgCurrency,
							" 需换算）"
						]
					})
				] })]
			});
		}
		/**
		* Editable per-model 用量 template + unit prices. Defaults come from the
		* official bundled values (usage.basePricing / usage.priceRows). 保存 writes
		* the user's edits (persisted, used by the computation after a page
		* refresh). 重置价格：官方模型 → 恢复内置行结构+单价+计算方式+币种；
		* 自定义模型 → 恢复为该计费方式的默认结构+币种。Prices are per 1M tokens in
		* the model's native currency.
		*/
		function PriceEditor({ usage, onPricingCurrencyChange, onResetCurrency }) {
			const model = usage.model;
			const rows = usage.priceRows;
			const base = usage.basePricing;
			const isDeepSeek = usage.provider === "deepseek-official" || usage.provider === "deepseek";
			const peakMode = base?.peak !== void 0 && base?.offPeak !== void 0;
			const [labels, setLabels] = (0, react.useState)(() => rows.map((r) => r.label));
			const [prices, setPrices] = (0, react.useState)(() => rows.map((r) => {
				const b = r.buckets[0] ?? "input";
				const v = peakMode ? peakPricePerM(base.peak, b) ?? bucketPricePerM(base, b) : bucketPricePerM(base, b);
				return v === void 0 ? "" : String(v);
			}));
			const [currency, setCurrency] = (0, react.useState)(base?.currency ?? "CNY");
			const [rowsState, setRowsState] = (0, react.useState)(() => rows);
			const [billing, setBilling] = (0, react.useState)({
				combined: base?.combinedPerM !== void 0,
				discount: base?.discount,
				peak: peakMode
			});
			const [types, setTypes] = (0, react.useState)([]);
			const [typeKey, setTypeKey] = (0, react.useState)("");
			const [typeNote, setTypeNote] = (0, react.useState)("");
			const [msg, setMsg] = (0, react.useState)("");
			const [justReset, setJustReset] = (0, react.useState)(false);
			const sym = currency === "USD" ? "$" : "¥";
			(0, react.useEffect)(() => {
				if (isDeepSeek || types.length > 0) return;
				fetch("/api/usage-meter/templates").then((r) => r.ok ? r.json() : null).then((doc) => {
					if (doc?.types) setTypes(doc.types);
				}).catch(() => {});
			}, [isDeepSeek, types.length]);
			(0, react.useEffect)(() => {
				if (types.length === 0 || isDeepSeek) return;
				const idx = types.findIndex((t) => t.id === matchTypeId(base));
				if (idx >= 0 && typeKey === "") {
					setTypeKey(String(idx));
					setTypeNote(types[idx]?.note ?? "");
				}
			}, [
				types,
				base,
				isDeepSeek,
				typeKey
			]);
			if (!model || rowsState.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, {});
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
					setBilling((b) => ({
						combined: b.combined,
						discount: .5,
						peak: b.peak
					}));
					setMsg("已启用 Batch 半价（×0.5），可修改后保存");
					window.setTimeout(() => setMsg(""), 3e3);
					return;
				}
				const prefill = (b) => {
					const bkey = b;
					const v = tpl.peak === true ? peakPricePerM(base?.peak, bkey) ?? bucketPricePerM(base, bkey) : bucketPricePerM(base, bkey);
					return v === void 0 ? "" : String(v);
				};
				setRowsState(tpl.rows);
				setLabels(tpl.rows.map((r) => r.label));
				setPrices(tpl.rows.map((r) => prefill(r.buckets[0] ?? "input")));
				setBilling({
					combined: tpl.mode === "combined",
					discount: void 0,
					peak: tpl.peak === true
				});
				setMsg(`已载入「${tpl.label}」计费方式，可修改后保存`);
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
					return (await fetch("/api/usage-meter/config", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(body)
					})).ok;
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
						offPeak[key] = v * .5;
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
					rows: rowsState.map((r, i) => ({
						label: (labels[i] ?? "").trim() || r.label,
						buckets: r.buckets
					}))
				});
				flash(ok ? "已保存，请刷新浏览器后生效" : "保存失败");
			};
			const reset = async () => {
				if (usage.officialPrice !== null) {
					const op = usage.officialPrice;
					const ok = await post({
						provider: usage.provider,
						model,
						reset: true
					});
					if (ok) {
						const opPeak = op.pricing.peak !== void 0 && op.pricing.offPeak !== void 0;
						setRowsState(op.rows);
						setLabels(op.rows.map((r) => r.label));
						setPrices(op.rows.map((r) => {
							const b = r.buckets[0] ?? "input";
							const v = opPeak ? peakPricePerM(op.pricing.peak, b) ?? bucketPricePerM(op.pricing, b) : bucketPricePerM(op.pricing, b);
							return v === void 0 ? "" : String(v);
						}));
						setBilling({
							combined: op.pricing.combinedPerM !== void 0,
							discount: op.pricing.discount,
							peak: opPeak
						});
						setCurrency(op.pricing.currency ?? usage.currency);
						const tIdx = types.findIndex((t) => t.id === matchTypeId(op.pricing));
						if (tIdx >= 0) {
							setTypeKey(String(tIdx));
							setTypeNote(types[tIdx]?.note ?? "");
						}
						onResetCurrency?.(op.pricing.currency ?? usage.currency);
						setJustReset(true);
						window.setTimeout(() => setJustReset(false), 1600);
						flash(ok ? "已重置为该模型官方价格，请刷新浏览器后生效" : "重置失败");
					}
					return;
				}
				const tIdx = types.findIndex((t) => t.id === matchTypeId(base));
				if (tIdx >= 0) applyTemplate(String(tIdx));
				setCurrency(base?.currency ?? usage.currency);
				onResetCurrency?.(base?.currency ?? usage.currency);
				setJustReset(true);
				window.setTimeout(() => setJustReset(false), 1600);
				flash("已重置为该计费方式结构，请核对单价后点保存单价生效");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					marginTop: 6,
					paddingTop: 6,
					borderTop: `1px solid ${t.borderSoft}`
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							color: t.text2,
							fontSize: 11,
							marginBottom: 2
						},
						children: [
							"模型单价编辑（",
							model,
							" · 单位：每百万tokens ",
							sym,
							"）"
						]
					}),
					!isDeepSeek && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { marginBottom: 4 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8,
								flexWrap: "wrap"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: {
										fontSize: 11,
										color: t.text2
									},
									children: "计费方式"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: typeKey,
									onChange: (e) => applyTemplate(e.target.value),
									style: {
										fontSize: 12,
										padding: "2px 4px",
										maxWidth: 320
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "（选择计费方式预填）"
									}), types.map((tpl, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: String(i),
										children: tpl.label
									}, tpl.id))]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: {
										fontSize: 11,
										color: t.text2
									},
									children: "币种"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: currency,
									onChange: (e) => void onCurrencySelect(e.target.value),
									style: {
										fontSize: 12,
										padding: "2px 4px"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "CNY",
										children: "CNY（人民币）"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "USD",
										children: "USD（美元）"
									})]
								})
							]
						}), typeNote !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								color: t.text3,
								fontSize: 10,
								marginTop: 2
							},
							children: typeNote
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...row,
							paddingBottom: 2,
							color: t.text3,
							fontSize: 10
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { flex: 1 },
							children: "用量名称（可改）"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								width: 86,
								textAlign: "right"
							},
							children: billing.peak ? "高峰价（可改）" : "单价（可改）"
						})]
					}),
					billing.peak && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: t.text3,
							fontSize: 10,
							marginBottom: 2
						},
						children: "闲时单价自动 = 高峰 ×0.5（高峰时段 9-12 / 14-18 北京时间）"
					}),
					rowsState.map((r, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...row,
							padding: "1px 0"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							value: labels[i] ?? "",
							onChange: (e) => setLabels((ls) => {
								const n = [...ls];
								n[i] = e.target.value;
								return n;
							}),
							style: {
								flex: 1,
								minWidth: 0,
								fontSize: 12,
								padding: "1px 4px",
								background: justReset ? "rgba(22, 163, 74, 0.10)" : void 0,
								transition: "background .2s ease"
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							value: prices[i] ?? "",
							onChange: (e) => setPrices((ps) => {
								const n = [...ps];
								n[i] = e.target.value;
								return n;
							}),
							placeholder: `如 ${bucketPricePerM(base, r.buckets[0] ?? "input") ?? ""}`,
							style: {
								width: 86,
								fontSize: 12,
								padding: "1px 4px",
								textAlign: "right",
								background: justReset ? "rgba(22, 163, 74, 0.10)" : void 0,
								transition: "background .2s ease"
							}
						})]
					}, r.buckets.join(","))),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							marginTop: 4
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: save,
								style: {
									fontSize: 12,
									padding: "3px 10px",
									borderRadius: 6,
									border: `1px solid ${t.border}`,
									background: t.accent,
									color: t.text,
									cursor: "pointer"
								},
								children: "保存单价"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: reset,
								style: {
									fontSize: 12,
									padding: "3px 10px",
									borderRadius: 6,
									border: `1px solid ${t.border}`,
									background: t.card,
									color: t.text,
									cursor: "pointer",
									boxShadow: "none"
								},
								children: "重置价格"
							}),
							billing.combined && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: t.text3,
									fontSize: 10
								},
								children: "合并计价"
							}),
							billing.discount !== void 0 && billing.discount < 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									color: t.brand,
									fontSize: 10
								},
								children: ["Batch 半价 ×", billing.discount]
							}),
							msg !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: t.ok,
									fontSize: 10
								},
								children: msg
							})
						]
					})
				]
			});
		}
		function BucketRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: row,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							flex: 1,
							color: t.text2,
							minWidth: 0,
							whiteSpace: "nowrap"
						},
						children: props.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							width: 92,
							textAlign: "right",
							color: t.text3,
							whiteSpace: "nowrap"
						},
						children: formatTokens(props.tokens)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							width: 92,
							textAlign: "right",
							color: props.price !== void 0 ? t.text2 : t.text3,
							whiteSpace: "nowrap"
						},
						children: props.price !== void 0 ? fmtPrice(props.price, props.native, props.usage) : "—"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							width: 92,
							textAlign: "right",
							fontWeight: 600,
							color: props.accent ?? t.text,
							whiteSpace: "nowrap"
						},
						children: props.price !== void 0 ? fmtMoney(props.cost, props.native, props.usage) : "—"
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Services this client plugin requires on `ctx`. */
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "usage-meter.readout",
				order: 20
			}, UsageReadout));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map