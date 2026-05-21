# =============================================================================
# start_backend.ps1  —  Developer A Handoff Script
# Starts FastAPI + Celery worker together for Day 6 integration testing.
#
# Usage (from the project root):
#   .\start_backend.ps1
#
# Requirements:
#   - .venv is set up and all requirements installed
#   - Docker Compose is running  (docker compose up -d)
#   - .env has valid NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, REDIS_URL
# =============================================================================

$ErrorActionPreference = "Stop"

$VenvPython  = ".\.venv\Scripts\python.exe"
$VenvActivate = ".\.venv\Scripts\Activate.ps1"
$UvicornPath = ".\.venv\Scripts\uvicorn.exe"
$CeleryPath  = ".\.venv\Scripts\celery.exe"

# Activate virtual environment
Write-Host "✅ Activating virtual environment..." -ForegroundColor Cyan
& $VenvActivate

# Verify critical executables exist
if (-not (Test-Path $UvicornPath) -or -not (Test-Path $CeleryPath)) {
    Write-Host "❌ Backend tools missing from .venv! Your 'pip install' likely failed midway." -ForegroundColor Red
    Write-Host "   -> This is typically caused by missing Microsoft C++ Build Tools on Windows (failing to build lxml)." -ForegroundColor Yellow
    Write-Host "   -> Please review the README.md Troubleshooting section to resolve this." -ForegroundColor Yellow
    exit 1
}

# Removed .env check to support Doppler

Write-Host ""
Write-Host "🚀 Starting FastAPI server on http://localhost:8000 ..." -ForegroundColor Green
Write-Host "🔧 Starting Celery worker ..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop both processes." -ForegroundColor Gray
Write-Host ""

# Start FastAPI in a new PowerShell window
$fastapiJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    & doppler run -- ".\.venv\Scripts\uvicorn.exe" src.api.main:app --reload --port 8000 --host 0.0.0.0
} -ArgumentList $PWD

# Start Celery worker in a new PowerShell window
$celeryJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    & doppler run -- ".\.venv\Scripts\celery.exe" -A src.api.worker.celery_app worker --loglevel=info --pool=solo
} -ArgumentList $PWD

Write-Host "FastAPI Job ID  : $($fastapiJob.Id)" -ForegroundColor Green
Write-Host "Celery  Job ID  : $($celeryJob.Id)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tailing logs (Ctrl+C to exit):" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────"

# Tail both jobs until the user presses Ctrl+C
try {
    $ErrorActionPreference = "Continue"
    while ($true) {
        Receive-Job -Job $fastapiJob 2>&1 | ForEach-Object { Write-Host "[FastAPI] $_" -ForegroundColor Green }
        Receive-Job -Job $celeryJob  2>&1 | ForEach-Object { Write-Host "[Celery]  $_" -ForegroundColor Yellow }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host ""
    Write-Host "Stopping background jobs..." -ForegroundColor Red
    Stop-Job  -Job $fastapiJob, $celeryJob
    Remove-Job -Job $fastapiJob, $celeryJob -Force
    Write-Host "Done." -ForegroundColor Gray
}
