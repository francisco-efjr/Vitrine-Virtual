# push-try-on-openai.ps1
# Empurra feature/try-on-openai para o GitHub e abre URL da branch
# Rodar do PowerShell dentro da pasta vitrine-virtual (onde fica o .git)

Set-Location -Path $PSScriptRoot

Write-Host "=== Vitrine Virtual — push feature/try-on-openai (2 commits) ===" -ForegroundColor Cyan

# 1. Remover lock files residuais
$locks = @(
    ".git\refs\heads\main.lock",
    ".git\refs\heads\feature\try-on-openai.lock",
    ".git\index.lock",
    ".git\HEAD.lock",
    ".git\config.lock"
)
foreach ($lock in $locks) {
    if (Test-Path $lock) {
        Remove-Item $lock -Force
        Write-Host "Removido: $lock" -ForegroundColor Yellow
    }
}

# 2. Confirmar que estamos na branch certa
$currentBranch = git rev-parse --abbrev-ref HEAD 2>&1
Write-Host ""
Write-Host "Branch: $currentBranch" -ForegroundColor Green
git log --oneline -3

# 3. Push da branch feature
Write-Host ""
Write-Host "Fazendo push..." -ForegroundColor Green
git push origin feature/try-on-openai

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Push concluido!" -ForegroundColor Green

    # Abre direto na URL de criar PR no GitHub
    $prUrl = "https://github.com/francisco-efjr/Vitrine-Virtual/compare/main...feature/try-on-openai?expand=1&title=feat%3A+provider+OpenAI+gpt-image-1+para+try-on&body=Adiciona+provider+OpenAI+como+opcao+secundaria+para+o+provador+virtual"
    Write-Host "Abrindo PR no GitHub..." -ForegroundColor Cyan
    Start-Process $prUrl
} else {
    Write-Host ""
    Write-Host "Erro no push. Verifique acima." -ForegroundColor Red
}
