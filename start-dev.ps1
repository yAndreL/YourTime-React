# Script para iniciar React + Python juntos
# Execute: .\start-dev.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   YourTime - Iniciando Ambiente Dev   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Python está instalado
Write-Host "[1/3] Verificando Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ $pythonVersion encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Python não encontrado!" -ForegroundColor Red
    Write-Host "   Instale Python 3.8+ de: https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}

# Verificar dependências Python
Write-Host ""
Write-Host "[2/3] Verificando dependências Python..." -ForegroundColor Yellow
$packages = @("xlsxwriter", "flask", "flask-cors")
$missing = @()

foreach ($pkg in $packages) {
    $check = pip show $pkg 2>&1
    if ($LASTEXITCODE -ne 0) {
        $missing += $pkg
    }
}

if ($missing.Count -gt 0) {
    Write-Host "⚠️  Instalando dependências faltando: $($missing -join ', ')" -ForegroundColor Yellow
    pip install xlsxwriter flask flask-cors requests --quiet
    Write-Host "✅ Dependências instaladas" -ForegroundColor Green
} else {
    Write-Host "✅ Todas dependências OK" -ForegroundColor Green
}

# Iniciar serviços
Write-Host ""
Write-Host "[3/3] Iniciando serviços..." -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 React rodando em:  http://localhost:5173" -ForegroundColor Green
Write-Host "🐍 Python rodando em: http://localhost:5001" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para parar ambos serviços" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar Python em background
$pythonJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $pythonExe = ".\.venv\Scripts\python.exe"
    if (Test-Path $pythonExe) {
        cd python
        & "..\$pythonExe" export_xlsx.py
    } else {
        cd python
        python export_xlsx.py
    }
}

# Aguardar Python iniciar
Start-Sleep -Seconds 3

# Iniciar React (blocking)
try {
    npm run dev
} finally {
    # Parar Python ao fechar
    Write-Host ""
    Write-Host "🛑 Parando serviços..." -ForegroundColor Yellow
    Stop-Job -Job $pythonJob
    Remove-Job -Job $pythonJob
    Write-Host "✅ Serviços parados" -ForegroundColor Green
}
