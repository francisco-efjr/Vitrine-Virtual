# push-main.ps1 — empurra main local para origin
# Rodar do PowerShell dentro da pasta vitrine-virtual (onde fica o .git)

Set-Location -Path $PSScriptRoot

Write-Host "=== Vitrine Virtual — push para main ===" -ForegroundColor Cyan

# 1. Remover lock files que o Linux deixou
$locks = @(".git\refs\heads\main.lock", ".git\index.lock", ".git\HEAD.lock", ".git\config.lock")
foreach ($lock in $locks) {
    if (Test-Path $lock) {
        Remove-Item $lock -Force
        Write-Host "Removido: $lock" -ForegroundColor Yellow
    }
}

# 2. Confirmar HEAD e commit atual
Write-Host ""
Write-Host "Branch atual e commit:" -ForegroundColor Green
git log --oneline -3

# 3. Push para origin/main
Write-Host ""
Write-Host "Fazendo push..." -ForegroundColor Green
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Push concluido com sucesso!" -ForegroundColor Green
    Write-Host "https://github.com/francisco-efjr/Vitrine-Virtual/commits/main" -ForegroundColor Cyan
    Start-Process "https://github.com/francisco-efjr/Vitrine-Virtual/commits/main"
} else {
    Write-Host ""
    Write-Host "Erro no push. Verifique acima." -ForegroundColor Red
}
