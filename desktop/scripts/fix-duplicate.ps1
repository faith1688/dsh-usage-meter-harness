# 远程电脑修复脚本：删除 profile 根 cordis.patch.yml 里的 usage-meter 重复条目
# 用法：在远程电脑 PowerShell 里运行本脚本
$f = Join-Path $env:USERPROFILE ".dsh\profiles\web\cordis.patch.yml"
if (-not (Test-Path $f)) {
  Write-Host "未找到 $f（说明没有 profile 根 patch，duplicate 另有来源，请看下方补充）" -ForegroundColor Yellow
  exit 1
}
$lines = Get-Content $f
$out = New-Object System.Collections.Generic.List[string]
$removed = 0
$i = 0
while ($i -lt $lines.Count) {
  $l = $lines[$i]
  # 顶层条目起点：- id: 或 - insert:
  if ($l -match '^\s*-\s+(id|insert):') {
    $block = New-Object System.Collections.Generic.List[string]
    $block.Add($l)
    $j = $i + 1
    while ($j -lt $lines.Count -and $lines[$j] -notmatch '^\s*-\s+(id|insert):') {
      $block.Add($lines[$j]); $j++
    }
    $blockText = ($block -join "`n")
    if ($blockText -match 'usage-meter') {
      Write-Host "删除重复条目: $($block[0].Trim())" -ForegroundColor Green
      $removed++
      $i = $j
      continue
    } else {
      foreach ($b in $block) { $out.Add($b) }
      $i = $j
      continue
    }
  }
  $out.Add($l)
  $i++
}
# 写回（保留原换行风格：CRLF）
$outText = ($out -join "`r`n")
Set-Content -Path $f -Value $outText -NoNewline -Encoding UTF8
Write-Host "完成：删除 $removed 条 usage-meter 条目"
Write-Host "剩余 usage-meter 出现次数：$((Select-String -Path $f -Pattern 'usage-meter' -SimpleMatch).Count)"
