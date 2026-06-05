# install-tools.ps1
# Checks required tools and outputs JSON with installation status.
# Used by iris-setup.exe to detect what needs to be installed.

param([switch]$Json)

$tools = @(
    @{ name = 'node';       cmd = 'node --version';           winget = 'OpenJS.NodeJS.LTS';          npm = $null }
    @{ name = 'bun';        cmd = 'bun --version';            winget = $null;                        npm = 'bun' }
    @{ name = 'gh';         cmd = 'gh --version';             winget = 'GitHub.cli';                 npm = $null }
    @{ name = 'engram';     cmd = 'engram --version';         winget = $null;                        npm = $null; note = 'Download from GitHub releases' }
    @{ name = 'codegraph';  cmd = 'codegraph --version';      winget = $null;                        npm = '@codegraph/cli' }
    @{ name = 'agy';        cmd = 'agy --version';            winget = $null;                        npm = $null; note = 'Download from Antigravity releases' }
    @{ name = 'kilo';       cmd = 'kilocode --version';       winget = $null;                        npm = $null; note = 'Download from Kilo releases' }
    @{ name = 'opencode';   cmd = 'opencode --version';       winget = $null;                        npm = 'opencode' }
    @{ name = 'claude';     cmd = 'claude --version';         winget = $null;                        npm = '@anthropic-ai/claude-code' }
)

$results = @()

foreach ($tool in $tools) {
    $installed = $false
    $version = $null

    try {
        $output = Invoke-Expression $tool.cmd 2>&1
        if ($LASTEXITCODE -eq 0 -or $output) {
            $installed = $true
            $version = ($output | Select-Object -First 1).ToString().Trim()
        }
    } catch { }

    $installCmd = $null
    if (-not $installed) {
        if ($tool.winget) { $installCmd = "winget install $($tool.winget)" }
        elseif ($tool.npm) { $installCmd = "npm install -g $($tool.npm)" }
        elseif ($tool.note) { $installCmd = $tool.note }
    }

    $results += @{
        tool       = $tool.name
        installed  = $installed
        version    = $version
        installCmd = $installCmd
    }
}

if ($Json) {
    $results | ConvertTo-Json -Depth 3
} else {
    foreach ($r in $results) {
        $status = if ($r.installed) { "✅ $($r.version)" } else { "❌ not found" }
        Write-Host "  $($r.tool): $status"
        if (-not $r.installed -and $r.installCmd) {
            Write-Host "     → $($r.installCmd)" -ForegroundColor Yellow
        }
    }
}
