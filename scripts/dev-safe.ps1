param(
  [int]$Port = 3010,
  [switch]$Clean
)

$ErrorActionPreference = "Stop"

function Get-PortProcessIds {
  param([int]$TargetPort)
  try {
    return @(Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess -Unique)
  } catch {
    return @()
  }
}

try {
  $projectRoot = Split-Path -Parent $PSScriptRoot
  Set-Location $projectRoot

  Write-Host "Preparing dev server on port $Port..."

  $portProcessIds = Get-PortProcessIds -TargetPort $Port
  foreach ($portProcessId in $portProcessIds) {
    try {
      Stop-Process -Id $portProcessId -Force -ErrorAction Stop
      Write-Host "Stopped existing process on port $Port (PID $portProcessId)."
    } catch {
      Write-Host "Warning: Could not stop PID $portProcessId on port $Port."
    }
  }

  if ($Clean -and (Test-Path ".next")) {
    try {
      Remove-Item ".next" -Recurse -Force
      Write-Host "Cleared .next cache."
    } catch {
      Write-Host "Warning: Could not clear .next cache. Continuing..."
    }
  }

  $nextCmd = Join-Path $projectRoot "node_modules\.bin\next.cmd"
  if (-not (Test-Path $nextCmd)) {
    throw "Missing Next.js binary. Run 'npm install' first."
  }

  Write-Host "Starting Next.js dev server on port $Port..."
  & $nextCmd dev -H 0.0.0.0 -p $Port
  if ($LASTEXITCODE -ne 0) {
    throw "Next dev exited with code $LASTEXITCODE."
  }
} catch {
  $message = $_.Exception.Message
  Write-Host "dev-safe failed: $message"
  if ($message -match "EPERM" -or $message -match "spawn") {
    Write-Host "Detected spawn/EPERM issue. Falling back to dev-ensure startup flow..."
    $ensureScript = Join-Path $PSScriptRoot "dev-ensure.ps1"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $ensureScript -Port $Port
    exit $LASTEXITCODE
  }
  exit 1
}
