# Builds a clean ZIP of the extension for Chrome Web Store submission.
# Excludes node_modules, tests, dev files, and any non-runtime artifacts.
# Usage:  powershell -ExecutionPolicy Bypass -File .\pack.ps1

$ErrorActionPreference = 'Stop'

$root    = $PSScriptRoot
$staging = Join-Path $root 'dist-cws'
$zipPath = Join-Path $root 'workaholic-cws.zip'

$includeDirs = @(
    'background',
    'content',
    'icons',
    'libs',
    'parsers',
    'popup',
    'shared'
)

$includeFiles = @(
    'manifest.json',
    'PRIVACY.md'
)

if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
New-Item -ItemType Directory -Path $staging | Out-Null

foreach ($dir in $includeDirs) {
    $src = Join-Path $root $dir
    if (Test-Path $src) {
        Copy-Item -Recurse -Path $src -Destination $staging
    } else {
        Write-Warning "Missing directory: $dir"
    }
}

foreach ($file in $includeFiles) {
    $src = Join-Path $root $file
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $staging
    } else {
        Write-Warning "Missing file: $file"
    }
}

Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -Force
Remove-Item -Recurse -Force $staging

Write-Host "Built: $zipPath"
