# Git Configuration Setup
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git Configuration Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find git
$gitPath = "C:\Program Files\Git\bin\git.exe"
if (-not (Test-Path $gitPath)) {
    try {
        $gitPath = (Get-Command git -ErrorAction Stop).Source
    } catch {
        Write-Host "Error: Git not found!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Configuring Git user identity..." -ForegroundColor Cyan
Write-Host ""

$name = Read-Host "Enter your name (e.g., John Doe)"
$email = Read-Host "Enter your email (e.g., john@example.com)"

Write-Host ""
Write-Host "Setting Git configuration..." -ForegroundColor Cyan

& $gitPath config --global user.name "$name"
& $gitPath config --global user.email "$email"

Write-Host ""
Write-Host "Git configured successfully!" -ForegroundColor Green
Write-Host "  Name: $name" -ForegroundColor Gray
Write-Host "  Email: $email" -ForegroundColor Gray
Write-Host ""
Write-Host "You can now run: .\upload-to-github.ps1" -ForegroundColor Cyan
