# sync-agents.ps1
# ONE-WAY SYNC: iris/knowledge/odoo/ → ~/.claude/skills/
# iris is the MASTER. Never pull from ~/.claude/skills/ into iris.

param([switch]$DryRun)

$irisRoot = Split-Path $PSScriptRoot -Parent
$knowledgeRoot = Join-Path $irisRoot "knowledge\odoo"
$skillsRoot = "$env:USERPROFILE\.claude\skills"

$syncPairs = @(
    @{ src = Join-Path $knowledgeRoot "ai";         dst = Join-Path $skillsRoot "odoo-ai" }
    @{ src = Join-Path $knowledgeRoot "contribute"; dst = Join-Path $skillsRoot "odoo-contribute" }
)

$robocopyFlags = @('/E', '/XO', '/NP')
if ($DryRun) { $robocopyFlags += '/L' }

$totalUpdated = 0

foreach ($pair in $syncPairs) {
    if (-not (Test-Path $pair.src)) {
        Write-Host "  ⚠️  Source not found: $($pair.src)" -ForegroundColor Yellow
        continue
    }

    $srcName = Split-Path $pair.src -Leaf
    Write-Host "  → Syncing $srcName..." -ForegroundColor Cyan

    $result = robocopy $pair.src $pair.dst @robocopyFlags
    $copied = ($result | Select-String 'Files\s*:\s*(\d+)' | ForEach-Object { $_.Matches[0].Groups[1].Value }) -as [int]
    $totalUpdated += $copied

    if ($DryRun) {
        Write-Host "    [dry-run] would copy $copied files" -ForegroundColor Gray
    } else {
        Write-Host "    ✅ $copied files updated" -ForegroundColor Green
    }
}

Write-Host "`n  Total: $totalUpdated files synced to ~/.claude/skills/" -ForegroundColor Cyan
if ($DryRun) { Write-Host "  [dry-run mode — no files written]" -ForegroundColor Gray }
