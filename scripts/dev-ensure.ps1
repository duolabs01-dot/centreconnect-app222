param(
  [int]$Port = 3010,
  [int]$WarmupSeconds = 45
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Test-DevHealth {
  param([int]$TargetPort)
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$TargetPort/" -Method Get -TimeoutSec 3 -UseBasicParsing
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Get-PortProcessId {
  param([int]$TargetPort)
  try {
    return (Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction Stop |
      Select-Object -First 1 -ExpandProperty OwningProcess)
  } catch {
    return $null
  }
}

function Test-ProductionBuildReady {
  param([string]$Root)

  $requiredPaths = @(
    ".next\\BUILD_ID",
    ".next\\routes-manifest.json",
    ".next\\server\\middleware-manifest.json"
  )

  foreach ($path in $requiredPaths) {
    if (-not (Test-Path (Join-Path $Root $path))) {
      return $false
    }
  }

  return $true
}

function Invoke-ProductionFallback {
  param(
    [string]$Root,
    [int]$TargetPort,
    [int]$WarmupSeconds,
    [string]$Reason
  )

  Write-Host "Starting production fallback ($Reason)..."

  $existingPid = Get-PortProcessId -TargetPort $TargetPort
  if ($existingPid) {
    try {
      Stop-Process -Id $existingPid -Force -ErrorAction Stop
    } catch {
      Write-Host "Warning: Could not stop process $existingPid before start fallback."
    }
  }

  $startOutLog = Join-Path $Root "tmp-start.out.log"
  $startErrLog = Join-Path $Root "tmp-start.err.log"
  $startProc = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "start") `
    -WorkingDirectory $Root `
    -RedirectStandardOutput $startOutLog `
    -RedirectStandardError $startErrLog `
    -PassThru

  Write-Host "Started production fallback (PID $($startProc.Id)). Waiting for health check..."
  $startDeadline = (Get-Date).AddSeconds($WarmupSeconds)
  while ((Get-Date) -lt $startDeadline) {
    Start-Sleep -Milliseconds 1200
    if (Test-DevHealth -TargetPort $TargetPort) {
      Write-Host "DEV_READY_FALLBACK: http://localhost:$TargetPort is healthy (next start)."
      return $true
    }
  }

  Write-Host "FALLBACK_NOT_READY: production fallback did not become healthy."
  if (Test-Path $startErrLog) {
    Write-Host "Last fallback stderr lines:"
    Get-Content $startErrLog -Tail 30
  }
  return $false
}

try {
  if (Test-DevHealth -TargetPort $Port) {
    Write-Host "DEV_READY: http://localhost:$Port is healthy."
    exit 0
  }

  $existingPid = Get-PortProcessId -TargetPort $Port
  if ($existingPid) {
    try {
      Stop-Process -Id $existingPid -Force -ErrorAction Stop
      Write-Host "Stopped unhealthy process on port $Port (PID $existingPid)."
    } catch {
      Write-Host "Warning: Could not stop process $existingPid on port $Port."
    }
  }

  $stdoutLog = Join-Path $projectRoot "tmp-dev.out.log"
  $stderrLog = Join-Path $projectRoot "tmp-dev.err.log"
  $prodBackupDir = Join-Path $projectRoot ".next-prod-backup"
  $epermMarkerPath = Join-Path $projectRoot ".next-dev-eperm.flag"
  $movedProdBuild = $false

  $preferProductionStart = (Test-Path $epermMarkerPath) -and (Test-ProductionBuildReady -Root $projectRoot)
  if ($preferProductionStart) {
    Write-Host "EPERM marker detected and production build is ready. Skipping dev startup attempt."
    if (Invoke-ProductionFallback -Root $projectRoot -TargetPort $Port -WarmupSeconds $WarmupSeconds -Reason "EPERM marker") {
      exit 0
    }
    exit 1
  }

  $hasProdBuildBeforeDev = Test-ProductionBuildReady -Root $projectRoot
  if ($hasProdBuildBeforeDev) {
    if (Test-Path $prodBackupDir) {
      Remove-Item $prodBackupDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    Move-Item (Join-Path $projectRoot ".next") $prodBackupDir -Force
    $movedProdBuild = $true
    Write-Host "Temporarily moved production .next build to backup before dev health check."
  }

  $devProc = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "dev:raw") `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

  Write-Host "Started dev server (PID $($devProc.Id)). Waiting for health check..."

  $deadline = (Get-Date).AddSeconds($WarmupSeconds)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 1200
    if (Test-DevHealth -TargetPort $Port) {
      if ($movedProdBuild -and (Test-Path $prodBackupDir)) {
        Remove-Item $prodBackupDir -Recurse -Force -ErrorAction SilentlyContinue
      }
      if (Test-Path $epermMarkerPath) {
        Remove-Item $epermMarkerPath -Force -ErrorAction SilentlyContinue
      }
      Write-Host "DEV_READY: http://localhost:$Port is healthy."
      exit 0
    }
  }

  Write-Host "DEV_NOT_READY: server did not become healthy within $WarmupSeconds seconds."
  $stderrText = ""
  if (Test-Path $stderrLog) {
    Write-Host "Last stderr lines:"
    Get-Content $stderrLog -Tail 30
    $stderrText = (Get-Content $stderrLog -Raw)
  }

  if ($stderrText -match "spawn EPERM") {
    Write-Host "Detected EPERM in dev mode. Attempting production fallback..."
    Set-Content -Path $epermMarkerPath -Value "Detected on $(Get-Date -Format s)" -NoNewline
    if ($movedProdBuild -and (Test-Path $prodBackupDir)) {
      if (Test-Path (Join-Path $projectRoot ".next")) {
        Remove-Item (Join-Path $projectRoot ".next") -Recurse -Force -ErrorAction SilentlyContinue
      }
      Move-Item $prodBackupDir (Join-Path $projectRoot ".next") -Force
      Write-Host "Restored production .next build from backup."
    }

    $isProductionBuildReady = Test-ProductionBuildReady -Root $projectRoot
    if (-not $isProductionBuildReady) {
      throw "Production fallback unavailable: missing production build artifacts. Run 'npm run build' manually, then retry."
    }
    Write-Host "Using existing production build artifacts for fallback start."
    if (Invoke-ProductionFallback -Root $projectRoot -TargetPort $Port -WarmupSeconds $WarmupSeconds -Reason "dev spawn EPERM") {
      exit 0
    }
  }

  if ($movedProdBuild -and (Test-Path $prodBackupDir)) {
    if (Test-Path (Join-Path $projectRoot ".next")) {
      Remove-Item (Join-Path $projectRoot ".next") -Recurse -Force -ErrorAction SilentlyContinue
    }
    Move-Item $prodBackupDir (Join-Path $projectRoot ".next") -Force
  }
  exit 1
} catch {
  Write-Host "dev-ensure failed: $($_.Exception.Message)"
  exit 1
}
