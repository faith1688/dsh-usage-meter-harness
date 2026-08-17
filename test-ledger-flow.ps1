# ledger-flow integration tests against the 3081 test server.
# Run: powershell -ExecutionPolicy Bypass -File test-ledger-flow.ps1
$script:fails = 0
$base = 'http://127.0.0.1:3081/api/usage-meter/config'
function Post($body) { Invoke-RestMethod -Uri $base -Method Post -ContentType 'application/json; charset=utf-8' -Body $body -TimeoutSec 15 | Out-Null }
function LedgerVal($key) { $b = (Invoke-RestMethod -Uri $base -Method Get -TimeoutSec 10).balances; if ($null -ne $b.$key) { $b.$key } else { $null } }
function Check($name, $cond) { if ($cond) { "PASS $name" } else { "FAIL $name"; $script:fails++ } }

# 1. balance overwrite (the reported bug scenario)
Post '{"provider":"openai","model":"gpt-4o","currency":"USD","balance":123.45}'
$v = LedgerVal 'p:openai'
Check 'balance overwrite 123.45' ($null -ne $v -and [math]::Abs($v.balance - 123.45) -lt 0.001)
Post '{"provider":"openai","model":"gpt-4o","currency":"USD","balance":500}'
$v = LedgerVal 'p:openai'
Check 'balance overwrite 500 (no revert)' ([math]::Abs($v.balance - 500) -lt 0.001)

# 2. recharge positive adds
Post '{"provider":"openai","model":"gpt-4o","recharge":100}'
Check 'recharge +100 -> 600' ([math]::Abs((LedgerVal 'p:openai').balance - 600) -lt 0.001)

# 3. recharge negative subtracts
Post '{"provider":"openai","model":"gpt-4o","recharge":-10}'
Check 'recharge -10 -> 590' ([math]::Abs((LedgerVal 'p:openai').balance - 590) -lt 0.001)

# 4. recharge 0 -> no-op
Post '{"provider":"openai","model":"gpt-4o","recharge":0}'
Check 'recharge 0 -> still 590' ([math]::Abs((LedgerVal 'p:openai').balance - 590) -lt 0.001)

# 5. no balance/recharge fields -> unchanged
Post '{"provider":"openai","model":"gpt-4o","currency":"USD"}'
Check 'no-op POST unchanged' ([math]::Abs((LedgerVal 'p:openai').balance - 590) -lt 0.001)

# 6. currency switch WITH client-converted balance
Post '{"provider":"openai","model":"gpt-4o","currency":"CNY","balance":4000}'
$v = LedgerVal 'p:openai'
Check 'switch CNY with balance -> 4000 CNY' ($v.currency -eq 'CNY' -and [math]::Abs($v.balance - 4000) -lt 0.001)

# 7. currency switch WITHOUT balance -> backend converts (fresh rate)
Post '{"provider":"openai","model":"gpt-4o","currency":"USD"}'
$v = LedgerVal 'p:openai'
Check 'switch back USD converts' ($v.currency -eq 'USD' -and [math]::Abs($v.balance * 6.7 - 4000) -lt 300)

# 8. round-trip approx (CNY->USD->CNY keeps value)
Post '{"provider":"openai","model":"gpt-4o","currency":"CNY","balance":4000}'
Post '{"provider":"openai","model":"gpt-4o","currency":"USD"}'
Post '{"provider":"openai","model":"gpt-4o","currency":"CNY"}'
Check 'CNY round-trip ~4000 (+-10)' ([math]::Abs((LedgerVal 'p:openai').balance - 4000) -lt 10)

# 9. custom model -> m: key
Post '{"provider":"my-gateway","model":"my-model","currency":"CNY","balance":88}'
$v = LedgerVal 'm:my-gateway/my-model'
Check 'custom model m:my-gateway/my-model' ($null -ne $v -and [math]::Abs($v.balance - 88) -lt 0.001)

# 10. official vendor shared key (gpt-4.1 same p:openai)
Post '{"provider":"openai","model":"gpt-4.1","recharge":5}'
Check 'gpt-4.1 shares p:openai (+5)' ([math]::Abs((LedgerVal 'p:openai').balance - 4005) -lt 1)

# 11. different vendors -> different keys
Post '{"provider":"qwen","model":"qwen-max","currency":"CNY","balance":300}'
Check 'qwen separate key' ([math]::Abs((LedgerVal 'p:qwen').balance - 300) -lt 0.001)

# 12. DeepSeek ignores ledger ops
Post '{"provider":"deepseek-official","model":"deepseek-v4-flash","currency":"CNY","balance":999}'
Check 'deepseek no ledger key' ($null -eq (LedgerVal 'p:deepseek-official'))

# 13. negative balance stored
Post '{"provider":"qwen","model":"qwen-max","currency":"CNY","balance":-25}'
Check 'negative balance -25' ([math]::Abs((LedgerVal 'p:qwen').balance + 25) -lt 0.001)

# 14. template save + reset
Post '{"provider":"openai","model":"gpt-4o","prices":{"inputPerM":9.9},"rows":[{"label":"自定义输入","buckets":["input"]},{"label":"自定义输出","buckets":["output"]}]}'
$g = Invoke-RestMethod -Uri $base -Method Get -TimeoutSec 10
Check 'template saved' ($null -ne $g.priceOverrides.'openai/gpt-4o' -and $g.priceOverrides.'openai/gpt-4o'.prices.inputPerM -eq 9.9)
Post '{"provider":"openai","model":"gpt-4o","reset":true}'
$g = Invoke-RestMethod -Uri $base -Method Get -TimeoutSec 10
Check 'template reset' ($null -eq $g.priceOverrides.'openai/gpt-4o')

# 15. provider null -> no crash
Post '{"provider":null,"currency":"CNY"}'
Check 'provider null no crash' ($true)

# 16. templates endpoint
$t = Invoke-RestMethod -Uri 'http://127.0.0.1:3081/api/usage-meter/templates' -TimeoutSec 10
Check 'templates endpoint 15 vendors' ($t.templates.Count -eq 15)

""
if ($script:fails -eq 0) { "ALL LEDGER TESTS PASSED" } else { "$($script:fails) LEDGER TEST(S) FAILED" }
exit $script:fails
