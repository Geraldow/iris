# init-codegraph.ps1
# Detects Odoo projects and initializes CodeGraph index for each.

param(
    [string]$SearchRoot = "C:\Development\Odoo\18",
    [switch]$Auto  # skip prompts, index all unindexed projects
)

if (-not (Test-Path $SearchRoot)) {
    Write-Host "  ⚠️  Search root not found: $SearchRoot" -ForegroundColor Yellow
    Write-Host "  → Skipping CodeGraph initialization" -ForegroundColor Gray
    exit 0
}

# Find Odoo project directories (those with __manifest__.py at root or depth 1)
$projects = @()
Get-ChildItem -Path $SearchRoot -Directory | ForEach-Object {
    $manifestAtRoot = Join-Path $_.FullName "__manifest__.py"
    $manifestAtDepth1 = Get-ChildItem -Path $_.FullName -Filter "__manifest__.py" -Depth 1 -ErrorAction SilentlyContinue | Select-Object -First 1

    if (Test-Path $manifestAtRoot) {
        $projects += $_.FullName
    } elseif ($manifestAtDepth1) {
        $projects += $manifestAtDepth1.Directory.FullName
    }
}

if ($projects.Count -eq 0) {
    Write-Host "  ℹ️  No Odoo projects found in $SearchRoot" -ForegroundColor Gray
    exit 0
}

Write-Host "`n  Proyectos Odoo detectados en $SearchRoot`:" -ForegroundColor Cyan

foreach ($project in $projects) {
    $name = Split-Path $project -Leaf
    $codegraphDir = Join-Path $project ".codegraph"

    if (Test-Path $codegraphDir) {
        Write-Host "  ✅ $name (.codegraph/ existe)" -ForegroundColor Green
        continue
    }

    Write-Host "  ❌ $name (sin índice)" -ForegroundColor Yellow

    $shouldIndex = $Auto
    if (-not $Auto) {
        $response = Read-Host "     → ¿Indexar ahora? [Y/n]"
        $shouldIndex = $response -eq '' -or $response -match '^[Yy]'
    }

    if ($shouldIndex) {
        Write-Host "     → Indexando $name..." -ForegroundColor Cyan
        try {
            Push-Location $project
            & codegraph init -i 2>&1 | Out-Null
            Pop-Location
            Write-Host "     ✅ Indexado" -ForegroundColor Green
        } catch {
            Pop-Location
            Write-Host "     ❌ Error: $_" -ForegroundColor Red
        }
    }
}
