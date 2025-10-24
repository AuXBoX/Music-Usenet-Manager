# GitHub Release Setup Script for Music Usenet Manager
# This script helps you set up GitHub releases for auto-updates

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Music Usenet Manager - GitHub Release Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if GH_TOKEN is already set
if ($env:GH_TOKEN) {
    Write-Host "GitHub token is already set" -ForegroundColor Green
    $tokenPreview = $env:GH_TOKEN.Substring(0, [Math]::Min(10, $env:GH_TOKEN.Length))
    Write-Host "  Token: $tokenPreview..." -ForegroundColor Gray
    Write-Host ""
    
    $response = Read-Host "Do you want to update the token? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "Using existing token." -ForegroundColor Green
        $tokenSet = $true
    } else {
        $tokenSet = $false
    }
} else {
    Write-Host "GitHub token is not set" -ForegroundColor Yellow
    $tokenSet = $false
}

# Prompt for GitHub token if not set
if (-not $tokenSet) {
    Write-Host ""
    Write-Host "To publish releases, you need a GitHub Personal Access Token." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Steps to create a token:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://github.com/settings/tokens" -ForegroundColor Gray
    Write-Host "2. Click 'Generate new token (classic)'" -ForegroundColor Gray
    Write-Host "3. Give it a name: 'Music Usenet Manager Releases'" -ForegroundColor Gray
    Write-Host "4. Select scope: 'repo' (Full control of private repositories)" -ForegroundColor Gray
    Write-Host "5. Click 'Generate token' and copy it" -ForegroundColor Gray
    Write-Host ""
    
    $token = Read-Host "Enter your GitHub Personal Access Token (or press Enter to skip)"
    
    if ($token) {
        # Set for current session
        $env:GH_TOKEN = $token
        Write-Host "Token set for current session" -ForegroundColor Green
        
        # Ask if user wants to save permanently
        Write-Host ""
        $savePermanent = Read-Host "Save token permanently for your user account? (y/N)"
        
        if ($savePermanent -eq "y" -or $savePermanent -eq "Y") {
            [System.Environment]::SetEnvironmentVariable('GH_TOKEN', $token, 'User')
            Write-Host "Token saved permanently" -ForegroundColor Green
            Write-Host "  Note: You may need to restart your terminal for it to take effect" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Skipping token setup. You'll need to set GH_TOKEN manually to publish." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Repository Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Read electron-builder.json to show current config
$builderConfig = Get-Content "electron-builder.json" | ConvertFrom-Json
$repoUrl = "https://github.com/$($builderConfig.publish.owner)/$($builderConfig.publish.repo)"
Write-Host "Repository: $repoUrl" -ForegroundColor Green
Write-Host "Owner: $($builderConfig.publish.owner)" -ForegroundColor Gray
Write-Host "Repo: $($builderConfig.publish.repo)" -ForegroundColor Gray
Write-Host ""

# Check current version
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Current Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$packageJson = Get-Content "package.json" | ConvertFrom-Json
Write-Host "Current version: $($packageJson.version)" -ForegroundColor Green
Write-Host ""

# Ask what to do next
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "What would you like to do?" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Build and publish current version ($($packageJson.version))" -ForegroundColor White
Write-Host "2. Update version and publish" -ForegroundColor White
Write-Host "3. Just build (no publish)" -ForegroundColor White
Write-Host "4. Test build (directory only, no installer)" -ForegroundColor White
Write-Host "5. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Building and publishing version $($packageJson.version)..." -ForegroundColor Cyan
        Write-Host ""
        
        if (-not $env:GH_TOKEN) {
            Write-Host "Error: GH_TOKEN is not set. Cannot publish." -ForegroundColor Red
            Write-Host "  Please run this script again and provide a GitHub token." -ForegroundColor Yellow
            exit 1
        }
        
        npm run publish
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Successfully published!" -ForegroundColor Green
            Write-Host "  Check your release at: $repoUrl/releases" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "Build/publish failed. Check the error messages above." -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "Current version: $($packageJson.version)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Version update options:" -ForegroundColor Cyan
        Write-Host "1. Patch (bug fixes)" -ForegroundColor White
        Write-Host "2. Minor (new features)" -ForegroundColor White
        Write-Host "3. Major (breaking changes)" -ForegroundColor White
        Write-Host "4. Custom version" -ForegroundColor White
        Write-Host ""
        
        $versionChoice = Read-Host "Enter your choice (1-4)"
        
        switch ($versionChoice) {
            "1" { npm version patch --no-git-tag-version }
            "2" { npm version minor --no-git-tag-version }
            "3" { npm version major --no-git-tag-version }
            "4" {
                $customVersion = Read-Host "Enter version (e.g. 1.2.3)"
                npm version $customVersion --no-git-tag-version
            }
            default {
                Write-Host "Invalid choice. Exiting." -ForegroundColor Red
                exit 1
            }
        }
        
        # Reload package.json to get new version
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        Write-Host ""
        Write-Host "Version updated to: $($packageJson.version)" -ForegroundColor Green
        Write-Host ""
        
        $publish = Read-Host "Publish this version now? (y/N)"
        
        if ($publish -eq "y" -or $publish -eq "Y") {
            if (-not $env:GH_TOKEN) {
                Write-Host "Error: GH_TOKEN is not set. Cannot publish." -ForegroundColor Red
                exit 1
            }
            
            Write-Host ""
            Write-Host "Building and publishing version $($packageJson.version)..." -ForegroundColor Cyan
            npm run publish
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "Successfully published!" -ForegroundColor Green
                Write-Host "  Check your release at: $repoUrl/releases" -ForegroundColor Cyan
            } else {
                Write-Host ""
                Write-Host "Build/publish failed. Check the error messages above." -ForegroundColor Red
            }
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "Building version $($packageJson.version)..." -ForegroundColor Cyan
        npm run package:win
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Build successful!" -ForegroundColor Green
            Write-Host "  Installer location: release\Music Usenet Manager-Setup-$($packageJson.version).exe" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "Build failed. Check the error messages above." -ForegroundColor Red
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "Building test version (directory only)..." -ForegroundColor Cyan
        npm run package:win:dir
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Build successful!" -ForegroundColor Green
            Write-Host "  Build location: release\win-unpacked\" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "Build failed. Check the error messages above." -ForegroundColor Red
        }
    }
    
    "5" {
        Write-Host ""
        Write-Host "Exiting..." -ForegroundColor Gray
        exit 0
    }
    
    default {
        Write-Host ""
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install the application from the release folder" -ForegroundColor Gray
Write-Host "2. Test the auto-update by publishing a new version" -ForegroundColor Gray
Write-Host "3. Check Settings > Application to see current version" -ForegroundColor Gray
Write-Host ""
Write-Host "For more information, see:" -ForegroundColor Yellow
Write-Host "- docs/GITHUB_RELEASE_SETUP.md" -ForegroundColor Gray
Write-Host "- docs/AUTO_UPDATE.md" -ForegroundColor Gray
Write-Host "- docs/AUTO_UPDATE_TESTING.md" -ForegroundColor Gray
Write-Host ""
