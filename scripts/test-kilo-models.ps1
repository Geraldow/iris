# test-kilo-models.ps1
# Tests all kilo free models with each variant level
# Output: markdown table with results

$models = @(
    "kilo/kilo-auto/free",
    "kilo/nvidia/nemotron-3-super-120b-a12b:free",
    "kilo/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "kilo/poolside/laguna-m.1:free",
    "kilo/poolside/laguna-xs.2:free",
    "kilo/qwen/qwen3.7-plus:free",
    "kilo/stepfun/step-3.7-flash:free"
)

$variants = @($null, "minimal", "low", "medium", "high", "max")
$prompt   = "reply only the word: OK"
$results  = @()

foreach ($model in $models) {
    foreach ($variant in $variants) {
        $label = if ($variant) { $variant } else { "(none)" }
        Write-Host "Testing $model  variant=$label ..." -NoNewline

        $args = @("run", "--format", "json", "-m", $model, $prompt)
        if ($variant) { $args += @("--variant", $variant) }

        try {
            $raw    = & kilo @args 2>&1
            $lines  = $raw -split "`n" | Where-Object { $_ -match '"type":"text"' }
            $text   = ($lines | ForEach-Object {
                ($_ | ConvertFrom-Json -ErrorAction SilentlyContinue).part.text
            }) -join ""

            $costLine = $raw -split "`n" | Where-Object { $_ -match '"cost"' } | Select-Object -Last 1
            $cost = if ($costLine) {
                ($costLine | ConvertFrom-Json -ErrorAction SilentlyContinue).part.cost
            } else { "?" }

            $status = if ($text -match "OK") { "✅" } else { "⚠️ $text" }
            Write-Host " $status  cost=$cost"
        } catch {
            $status = "❌ $_"
            $cost   = "?"
            Write-Host " $status"
        }

        $results += [PSCustomObject]@{
            Model   = $model
            Variant = $label
            Status  = $status
            Cost    = $cost
        }
    }
}

# Print markdown table
Write-Host "`n## Kilo Free Models — Test Results`n"
Write-Host "| Model | Variant | Status | Cost |"
Write-Host "|---|---|---|---|"
foreach ($r in $results) {
    Write-Host "| ``$($r.Model)`` | $($r.Variant) | $($r.Status) | $($r.Cost) |"
}

# Save results to file
$outPath = "$PSScriptRoot\kilo-test-results.md"
$md = @("# Kilo Free Models — Test Results", "", "| Model | Variant | Status | Cost |", "|---|---|---|---|")
foreach ($r in $results) {
    $md += "| ``$($r.Model)`` | $($r.Variant) | $($r.Status) | $($r.Cost) |"
}
$md | Set-Content $outPath -Encoding UTF8
Write-Host "`nResults saved to: $outPath"
