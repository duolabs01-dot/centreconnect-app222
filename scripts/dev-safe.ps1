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

# Start Next.js directly (bypasses PowerShell spawn issues)
Write-Host "Starting Next.js on http://localhost:$Port" -ForegroundColor Green
node_modules/.bin/next dev -H 0.0.0.0 -p $Port
