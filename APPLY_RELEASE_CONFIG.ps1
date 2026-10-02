Set-Location "D:\GymManagementApp\GymManagementApp"

$projectRoot = (Get-Location).Path
$packRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "D:\GymManagementApp\_GymManagementAppBackups\release-bulk-v2-$stamp"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$filesToBackup = @(
    "app.json",
    "app.config.js",
    "eas.json"
)

foreach ($relative in $filesToBackup) {
    $source = Join-Path $projectRoot $relative
    if (Test-Path $source) {
        Copy-Item $source (Join-Path $backupDir $relative)
    }
}

$assetBackup = Join-Path $backupDir "assets"
New-Item -ItemType Directory -Force -Path $assetBackup | Out-Null

$assetNames = @(
    "icon.png",
    "icon-foreground.png",
    "icon-monochrome.png",
    "notification-icon.png",
    "splash-icon.png",
    "favicon.png"
)

foreach ($name in $assetNames) {
    $existing = Join-Path $projectRoot ("assets\" + $name)
    if (Test-Path $existing) {
        Copy-Item $existing (Join-Path $assetBackup $name)
    }
}

Copy-Item (Join-Path $packRoot "config\app.json") (Join-Path $projectRoot "app.json") -Force
Copy-Item (Join-Path $packRoot "config\app.config.js") (Join-Path $projectRoot "app.config.js") -Force
Copy-Item (Join-Path $packRoot "config\eas.json") (Join-Path $projectRoot "eas.json") -Force

foreach ($name in $assetNames) {
    Copy-Item `
        (Join-Path $packRoot ("assets\" + $name)) `
        (Join-Path $projectRoot ("assets\" + $name)) `
        -Force
}

Write-Host "Release config/assets applied." -ForegroundColor Green
Write-Host "Backup: $backupDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Native Android was NOT regenerated automatically." -ForegroundColor Yellow
Write-Host "Run VERIFY_RELEASE.ps1 next." -ForegroundColor Yellow
