#Requires -Version 7.0
<#
.SYNOPSIS
    Verifies that mirrored odoo-contribute skill trees match the source tree.
.DESCRIPTION
    Read-only drift detector. Compares relative file paths and SHA256 hashes
    from the source skill tree against one or more destination skill trees.
.PARAMETER SourcePath
    Canonical odoo-contribute source path.
.PARAMETER DestinationPaths
    One or more mirrored odoo-contribute destination paths.
.PARAMETER Exclude
    File or directory name patterns to exclude from comparison.
.OUTPUTS
    Exit 0 - all destinations match
    Exit 1 - one or more destinations drifted or are missing
#>
param(
    [string]$SourcePath = "$env:USERPROFILE\.claude\skills\odoo-contribute",
    [string[]]$DestinationPaths = @(
        "$env:USERPROFILE\.codex\skills\odoo-contribute"
    ),
    [string[]]$Exclude = @("*.tmp", "*.log", ".cache", "__pycache__")
)

Set-StrictMode -Version Latest

function Test-Excluded {
    param(
        [System.IO.FileInfo]$File,
        [string]$RootPath,
        [string[]]$Patterns
    )

    $relative = [System.IO.Path]::GetRelativePath($RootPath, $File.FullName)
    foreach ($pattern in $Patterns) {
        if ($File.Name -like $pattern -or $relative -like $pattern -or $relative -like "*\$pattern\*") {
            return $true
        }
    }
    return $false
}

function Get-TreeManifest {
    param(
        [string]$RootPath,
        [string[]]$ExcludePatterns
    )

    $resolvedRoot = (Resolve-Path $RootPath -ErrorAction Stop).Path
    $manifest = @{}

    Get-ChildItem -Path $resolvedRoot -Recurse -File -Force |
        Where-Object { -not (Test-Excluded -File $_ -RootPath $resolvedRoot -Patterns $ExcludePatterns) } |
        ForEach-Object {
            $relative = [System.IO.Path]::GetRelativePath($resolvedRoot, $_.FullName)
            $manifest[$relative] = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
        }

    return $manifest
}

Write-Host ""
Write-Host "odoo-contribute Consolidation Verify"
Write-Host "===================================="
Write-Host "Source: $SourcePath"
Write-Host ""

if (-not (Test-Path $SourcePath)) {
    Write-Host "FAIL source missing: $SourcePath" -ForegroundColor Red
    exit 1
}

$sourceManifest = Get-TreeManifest -RootPath $SourcePath -ExcludePatterns $Exclude
$hasDrift = $false

foreach ($destination in $DestinationPaths) {
    Write-Host "Destination: $destination"

    if (-not (Test-Path $destination)) {
        Write-Host "  FAIL destination missing. Run sync-agents.ps1." -ForegroundColor Red
        $hasDrift = $true
        continue
    }

    $destinationManifest = Get-TreeManifest -RootPath $destination -ExcludePatterns $Exclude
    $sourceKeys = @($sourceManifest.Keys | Sort-Object)
    $destinationKeys = @($destinationManifest.Keys | Sort-Object)

    $missing = @($sourceKeys | Where-Object { -not $destinationManifest.ContainsKey($_) })
    $extra = @($destinationKeys | Where-Object { -not $sourceManifest.ContainsKey($_) })
    $changed = @(
        $sourceKeys |
            Where-Object { $destinationManifest.ContainsKey($_) -and $sourceManifest[$_] -ne $destinationManifest[$_] }
    )

    $status = if ($missing.Count -eq 0 -and $extra.Count -eq 0 -and $changed.Count -eq 0) { "PASS" } else { "FAIL" }
    $color = if ($status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "  $status missing=$($missing.Count) extra=$($extra.Count) changed=$($changed.Count)" -ForegroundColor $color

    foreach ($path in $missing) { Write-Host "    missing: $path" -ForegroundColor Yellow }
    foreach ($path in $extra) { Write-Host "    extra:   $path" -ForegroundColor Yellow }
    foreach ($path in $changed) { Write-Host "    changed: $path" -ForegroundColor Yellow }

    if ($status -eq "FAIL") { $hasDrift = $true }
    Write-Host ""
}

if ($hasDrift) { exit 1 }
exit 0
