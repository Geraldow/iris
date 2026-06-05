# detect-alesco-path.ps1
# Auto-detects the Alesco Google Drive folder path on Windows.
# Outputs the absolute path to stdout on success; exits 1 if not found.
#
# Priority:
# 1. Google Drive registry key (DriveFS mount point)
# 2. Legacy Google Drive registry key
# 3. Full drive scan (depth 4)

param()

function Find-AlescoInDrive {
    param([string]$RootPath, [int]$Depth = 5)
    try {
        $found = Get-ChildItem -Path $RootPath -Directory -Recurse -Depth $Depth -Filter "Alesco" -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName
        return $found
    } catch {
        return $null
    }
}

# 1. Try Google DriveFS registry (Google Drive for Desktop)
$registryPaths = @(
    'HKCU:\Software\Google\DriveFS\Share',
    'HKCU:\Software\Google\Drive',
    'HKLM:\Software\Google\DriveFS'
)

foreach ($regPath in $registryPaths) {
    if (Test-Path $regPath) {
        $props = Get-ItemProperty $regPath -ErrorAction SilentlyContinue
        $mountPoint = $props.MountPoint ?? $props.FSMountPoint ?? $props.InstallLocation
        if ($mountPoint -and (Test-Path $mountPoint)) {
            $result = Find-AlescoInDrive -RootPath $mountPoint -Depth 5
            if ($result) {
                Write-Output $result
                exit 0
            }
        }
    }
}

# 2. Scan all available drives
foreach ($drive in (Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
    $root = "$($drive.Root)"
    if (-not (Test-Path $root)) { continue }
    $result = Find-AlescoInDrive -RootPath $root -Depth 4
    if ($result) {
        Write-Output $result
        exit 0
    }
}

exit 1
