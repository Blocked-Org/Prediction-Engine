# =============================================================================
# install.ps1  —  Project Setup & Dependency Installation
# 
# Installs backend Python dependencies and frontend Node.js dependencies.
# Also ensures environment variables are synced.
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Brand Simulation Engine Setup..." -ForegroundColor Cyan

# 1. Backend Setup
Write-Host "`n[1/3] Setting up Python Virtual Environment..." -ForegroundColor Yellow
if (-not (Test-Path ".\.venv")) {
    python -m venv .venv
    Write-Host "  ✅ Created .venv directory." -ForegroundColor Green
} else {
    Write-Host "  ✅ .venv already exists." -ForegroundColor Green
}

Write-Host "  -> Installing Python requirements..." -ForegroundColor Yellow
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\pip.exe install -r requirements.txt

# 2. Environment Variables Sync
Write-Host "`n[2/3] Syncing Environment Variables..." -ForegroundColor Yellow
if (-not (Test-Path ".\.env")) {
    Write-Host "  ⚠️ Warning: .env file not found in root. Please create one based on the docs." -ForegroundColor Red
} else {
    Write-Host "  ✅ Root .env found. Copying NEO4J variables to frontend/.env.local..." -ForegroundColor Green
    
    $neo4jVars = Get-Content ".\.env" | Where-Object { $_ -match "^NEO4J_" }
    $frontendEnvPath = ".\frontend\.env.local"
    
    if (-not (Test-Path $frontendEnvPath)) {
        New-Item -Path $frontendEnvPath -ItemType File -Force | Out-Null
    }
    
    # Remove old NEO4J entries from frontend env if they exist to prevent duplicates
    $existingEnv = Get-Content $frontendEnvPath -ErrorAction SilentlyContinue | Where-Object { $_ -notmatch "^NEO4J_" }
    $existingEnv | Set-Content $frontendEnvPath
    
    # Append the new ones
    $neo4jVars | Add-Content $frontendEnvPath
    Write-Host "  ✅ Successfully synced frontend/.env.local" -ForegroundColor Green
}

# 3. Frontend Setup
Write-Host "`n[3/3] Installing Frontend Dependencies..." -ForegroundColor Yellow
cd frontend
cmd.exe /c "npm install"
cd ..

Write-Host "`n🎉 Setup Complete! You can now run 'docker compose up -d' followed by '.\start_backend.ps1'." -ForegroundColor Cyan
