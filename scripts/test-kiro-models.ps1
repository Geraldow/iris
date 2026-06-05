# test-kiro-models.ps1
# Tests all kiro-cli models headless and strips ANSI codes from output

$models = @(
    @{ id = "auto";              credits = "1.00x" },
    @{ id = "claude-sonnet-4.5"; credits = "1.30x" },
    @{ id = "claude-sonnet-4";   credits = "1.30x" },
    @{ id = "claude-haiku-4.5";  credits = "0.40x" },
    @{ id = "deepseek-3.2";      credits = "0.25x" },
    @{ id = "minimax-m2.5";      credits = "0.25x" },
    @{ id = "minimax-m2.1";      credits = "0.15x" },
    @{ id = "glm-5";             credits = "0.50x" },
    @{ id = "qwen3-coder-next";  credits = "0.05x" }
)

$prompt  = "reply only the word: OK"
$results = @()

# Strip ANSI escape codes
function Strip-Ansi($text) {
    return [regex]::Replace($text, '\x1B\[[0-9;]*[mGKHFABCDJST]', '')
}

Write-Host "Testing kiro-cli models...`n"

foreach ($m in $models) {
    Write-Host "  [$($m.credits)] $($m.id) ..." -NoNewline

    try {
        $raw    = & kiro-cli chat --no-interactive --model $m.id --trust-all-tools $prompt 2>&1
        $clean  = ($raw | ForEach-Object { Strip-Ansi $_ }) -join "`n"

        # Extract meaningful response lines (skip empty, skip ">" prompt lines)
        $lines  = $clean -split "`n" | Where-Object {
            $_.Trim() -ne "" -and
            $_ -notmatch "^\s*>?\s*$" -and
            $_ -notmatch "^kiro-cli" -and
            $_ -notmatch "^\["
        }
        $answer = ($lines | Select-Object -Last 3) -join " " | ForEach-Object { $_.Trim() }

        $status = if ($clean -match "OK") { "✅" } else { "⚠️" }
        Write-Host " $status  → $answer"
    } catch {
        $status = "❌"
        $answer = "$_"
        Write-Host " $status  → $answer"
    }

    $results += [PSCustomObject]@{
        Model   = $m.id
        Credits = $m.credits
        Status  = $status
        Answer  = $answer
    }
}

# Print markdown table
$md = @(
    "# Kiro-CLI Models — Test Results",
    "",
    "| Model | Credits | Status | Response |",
    "|---|---|---|---|"
)
foreach ($r in $results) {
    $md += "| ``$($r.Model)`` | $($r.Credits) | $($r.Status) | $($r.Answer) |"
}

$outPath = "$PSScriptRoot\kiro-test-results.md"
$md | Set-Content $outPath -Encoding UTF8

Write-Host "`n## Results`n"
$md | Write-Host
Write-Host "`nSaved to: $outPath"
