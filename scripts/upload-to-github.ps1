# Upload to GitHub Script
# This script commits and pushes all changes to GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Upload to GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Try to find git
$gitPath = $null
$possiblePaths = @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $gitPath = $path
        break
    }
}

if (-not $gitPath) {
    # Try to find git in PATH
    try {
        $gitPath = (Get-Command git -ErrorAction Stop).Source
    } catch {
        Write-Host "Error: Git not found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
        Write-Host "After installation, restart PowerShell and run this script again." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Or add Git to your PATH manually:" -ForegroundColor Yellow
        Write-Host "1. Find where Git is installed (usually C:\Program Files\Git)" -ForegroundColor Gray
        Write-Host "2. Add C:\Program Files\Git\bin to your PATH environment variable" -ForegroundColor Gray
        Write-Host "3. Restart PowerShell" -ForegroundColor Gray
        exit 1
    }
}

Write-Host "Found Git at: $gitPath" -ForegroundColor Green
Write-Host ""

# Check git status
Write-Host "Checking repository status..." -ForegroundColor Cyan
& $gitPath status --short

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ready to Upload" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$continue = Read-Host "Do you want to commit and push these changes? (y/N)"

if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Staging all changes..." -ForegroundColor Cyan
& $gitPath add .

Write-Host "Creating commit..." -ForegroundColor Cyan
$commitMessage = @"
feat: Implement auto-update mechanism with electron-updater

- Add AutoUpdateService for managing updates
- Add UpdateNotification component for user notifications
- Add AppSettings component with manual update check
- Configure GitHub Releases as update server (AuXBoX/Music-Usenet-Manager)
- Add comprehensive documentation and setup scripts
- Add GitHub Actions workflow for automated releases
- Implement periodic update checks (every 4 hours)
- Add download progress tracking
- Add error handling and retry logic
- Install electron-updater and electron-log dependencies
"@

& $gitPath commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Commit failed. This might be because:" -ForegroundColor Red
    Write-Host "- No changes to commit" -ForegroundColor Yellow
    Write-Host "- Git user not configured" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To configure Git user, run:" -ForegroundColor Yellow
    Write-Host "git config --global user.name `"Your Name`"" -ForegroundColor Gray
    Write-Host "git config --global user.email `"your.email@example.com`"" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
& $gitPath push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Successfully uploaded to GitHub!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "View your repository at:" -ForegroundColor Cyan
    Write-Host "https://github.com/AuXBoX/Music-Usenet-Manager" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Push failed. This might be because:" -ForegroundColor Red
    Write-Host "- Authentication failed (need to set up credentials)" -ForegroundColor Yellow
    Write-Host "- Remote branch doesn't exist" -ForegroundColor Yellow
    Write-Host "- Network issues" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Try running manually:" -ForegroundColor Yellow
    Write-Host "git push origin main" -ForegroundColor Gray
    exit 1
}
