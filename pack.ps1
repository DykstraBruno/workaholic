# Builds clean distributables for Chromium-family browsers and Firefox and
# can optionally submit the Firefox build to AMO for signing.
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\pack.ps1
#   powershell -ExecutionPolicy Bypass -File .\pack.ps1 -SignFirefox
#   powershell -ExecutionPolicy Bypass -File .\pack.ps1 -SignFirefox -Channel listed -AmoMetadataPath .\docs\amo-metadata.json

param(
    [switch]$SignFirefox,
    [ValidateSet('unlisted', 'listed')]
    [string]$Channel = 'unlisted',
    [string]$AmoMetadataPath
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$artifactsDir = Join-Path $root 'web-ext-artifacts'
$chromiumStage = Join-Path $root 'dist-chromium'
$firefoxStage = Join-Path $root 'dist-firefox'

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

function Reset-StageDirectory {
    param(
        [string]$StageDir
    )

    if (Test-Path $StageDir) { Remove-Item -Recurse -Force $StageDir }
    New-Item -ItemType Directory -Path $StageDir | Out-Null
}

function Copy-AppFilesToStage {
    param(
        [string]$StageDir
    )

    foreach ($dir in $includeDirs) {
        $src = Join-Path $root $dir
        if (Test-Path $src) {
            Copy-Item -Recurse -Path $src -Destination $StageDir
        } else {
            Write-Warning "Missing directory: $dir"
        }
    }

    foreach ($file in $includeFiles) {
        $src = Join-Path $root $file
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination $StageDir
        } else {
            Write-Warning "Missing file: $file"
        }
    }
}

function Set-ManifestVariant {
    param(
        [string]$StageDir,
        [ValidateSet('chromium', 'firefox')]
        [string]$Target
    )

    $manifestPath = Join-Path $StageDir 'manifest.json'
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

    if ($Target -eq 'chromium') {
        if ($manifest.background.PSObject.Properties.Name -contains 'scripts') {
            $manifest.background.PSObject.Properties.Remove('scripts')
        }
        if ($manifest.background.PSObject.Properties.Name -contains 'preferred_environment') {
            $manifest.background.PSObject.Properties.Remove('preferred_environment')
        }
    }

    if ($Target -eq 'firefox') {
        if ($manifest.background.PSObject.Properties.Name -contains 'service_worker') {
            $manifest.background.PSObject.Properties.Remove('service_worker')
        }
        if ($manifest.background.PSObject.Properties.Name -contains 'preferred_environment') {
            $manifest.background.PSObject.Properties.Remove('preferred_environment')
        }

        if (-not $manifest.browser_specific_settings) {
            $manifest | Add-Member -NotePropertyName 'browser_specific_settings' -NotePropertyValue ([pscustomobject]@{})
        }
        if (-not $manifest.browser_specific_settings.gecko) {
            $manifest.browser_specific_settings | Add-Member -NotePropertyName 'gecko' -NotePropertyValue ([pscustomobject]@{})
        }
        if (-not $manifest.browser_specific_settings.gecko.id) {
            $manifest.browser_specific_settings.gecko | Add-Member -NotePropertyName 'id' -NotePropertyValue 'workaholic@local'
        }
        if (-not $manifest.browser_specific_settings.gecko.data_collection_permissions) {
            $manifest.browser_specific_settings.gecko | Add-Member -NotePropertyName 'data_collection_permissions' -NotePropertyValue ([pscustomobject]@{
                required = @('none')
            })
        }
    }

    $manifest | ConvertTo-Json -Depth 100 | Set-Content $manifestPath
}

function New-ArchiveFromStage {
    param(
        [string]$StageDir,
        [string]$ArchivePath
    )

    if (Test-Path $ArchivePath) { Remove-Item -Force $ArchivePath }

    $archiveExtension = [System.IO.Path]::GetExtension($ArchivePath)
    $zipOutputPath = if ($archiveExtension -ieq '.zip') {
        $ArchivePath
    } else {
        [System.IO.Path]::ChangeExtension($ArchivePath, '.zip')
    }

    if ($zipOutputPath -ne $ArchivePath -and (Test-Path $zipOutputPath)) {
        Remove-Item -Force $zipOutputPath
    }

    Compress-Archive -Path (Join-Path $StageDir '*') -DestinationPath $zipOutputPath -Force

    if ($zipOutputPath -ne $ArchivePath) {
        Move-Item -Force $zipOutputPath $ArchivePath
    }
}

function Invoke-FirefoxSigning {
    param(
        [string]$SourceDir
    )

    if (-not $env:AMO_JWT_ISSUER) {
        throw 'AMO_JWT_ISSUER is required to sign the Firefox build.'
    }

    if (-not $env:AMO_JWT_SECRET) {
        throw 'AMO_JWT_SECRET is required to sign the Firefox build.'
    }

    $command = @(
        'npx',
        'web-ext',
        'sign',
        '--source-dir', $SourceDir,
        '--artifacts-dir', $artifactsDir,
        '--channel', $Channel,
        '--api-key', $env:AMO_JWT_ISSUER,
        '--api-secret', $env:AMO_JWT_SECRET
    )

    if ($Channel -eq 'listed') {
        if (-not $AmoMetadataPath) {
            throw 'AmoMetadataPath is required for listed AMO submissions.'
        }

        $resolvedMetadataPath = Join-Path $root $AmoMetadataPath
        if (-not (Test-Path $resolvedMetadataPath)) {
            throw "AMO metadata file not found: $resolvedMetadataPath"
        }

        $command += @('--amo-metadata', $resolvedMetadataPath)
    }

    & $command[0] $command[1..($command.Length - 1)]
    if ($LASTEXITCODE -ne 0) {
        throw "web-ext sign failed with exit code $LASTEXITCODE"
    }
}

Reset-StageDirectory -StageDir $chromiumStage
Copy-AppFilesToStage -StageDir $chromiumStage
Set-ManifestVariant -StageDir $chromiumStage -Target chromium
$chromiumZip = Join-Path $root 'workaholic-chromium.zip'
New-ArchiveFromStage -StageDir $chromiumStage -ArchivePath $chromiumZip

Reset-StageDirectory -StageDir $firefoxStage
Copy-AppFilesToStage -StageDir $firefoxStage
Set-ManifestVariant -StageDir $firefoxStage -Target firefox
$firefoxXpi = Join-Path $root 'workaholic-firefox-unsigned.xpi'
New-ArchiveFromStage -StageDir $firefoxStage -ArchivePath $firefoxXpi

Write-Host "Built: $chromiumZip"
Write-Host "Built: $firefoxXpi"

if ($SignFirefox) {
    if (-not (Test-Path $artifactsDir)) {
        New-Item -ItemType Directory -Path $artifactsDir | Out-Null
    }

    Invoke-FirefoxSigning -SourceDir $firefoxStage
    Write-Host "Signed Firefox artifacts: $artifactsDir"
}

if (Test-Path $chromiumStage) { Remove-Item -Recurse -Force $chromiumStage }
if (Test-Path $firefoxStage) { Remove-Item -Recurse -Force $firefoxStage }
