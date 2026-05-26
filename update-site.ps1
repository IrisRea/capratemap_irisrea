$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$builderPath = Join-Path $repoRoot "tools\\build_protected_page.mjs"
$csvFile = Get-ChildItem -LiteralPath $repoRoot -Filter *.csv | Select-Object -First 1

if (-not $csvFile) {
    Write-Error "Source CSV not found in $repoRoot"
}

if (-not (Test-Path -LiteralPath $builderPath)) {
    Write-Error "Build script not found: $builderPath"
}

Set-Location -LiteralPath $repoRoot

Write-Host ("Source CSV: " + $csvFile.Name)
Write-Host "Rebuilding protected site assets from source CSV..."
node $builderPath

Write-Host ""
Write-Host "Current git diff:"
git status --short
