param([int]$Port = 3010, [switch]$Clean)

Write-Host "CentreConnect Dev Server Starter (Windows-safe)" -ForegroundColor Cyan

# Kill any process on port 3010
$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $process.OwningProcess -Force
    Write-Host "Killed stale process on port $Port" -ForegroundColor Yellow
}

# Clean if requested
if ($Clean) {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "Cleaned .next cache" -ForegroundColor Green
}

# Hand off to the proven health-checked starter so restart works on Windows too
$projectRoot = Split-Path -Parent $PSScriptRoot
$ensureScript = Join-Path $PSScriptRoot 'dev-ensure.ps1'
Write-Host "Starting Next.js on http://localhost:$Port" -ForegroundColor Green
Set-Location $projectRoot
powershell -NoProfile -ExecutionPolicy Bypass -File $ensureScript -Port $Port

