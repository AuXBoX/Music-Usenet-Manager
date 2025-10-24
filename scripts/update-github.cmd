@echo off
echo ========================================
echo Git Update Script
echo ========================================
echo.

:menu
echo What would you like to do?
echo.
echo 1. Check status (see what changed)
echo 2. Add all changes and commit
echo 3. Push to GitHub
echo 4. Full update (add, commit, and push)
echo 5. View recent commits
echo 6. Exit
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto status
if "%choice%"=="2" goto commit
if "%choice%"=="3" goto push
if "%choice%"=="4" goto full
if "%choice%"=="5" goto log
if "%choice%"=="6" goto end
goto menu

:status
echo.
echo Checking git status...
echo.
git status
echo.
pause
goto menu

:commit
echo.
set /p message="Enter commit message: "
if "%message%"=="" (
    echo Error: Commit message cannot be empty
    pause
    goto menu
)
echo.
echo Adding all changes...
git add .
echo.
echo Committing with message: %message%
git commit -m "%message%"
echo.
echo Done!
pause
goto menu

:push
echo.
echo Pushing to GitHub...
echo.
git push
echo.
if %errorlevel% equ 0 (
    echo Successfully pushed to GitHub!
) else (
    echo Failed to push. Check your connection and credentials.
)
pause
goto menu

:full
echo.
set /p message="Enter commit message: "
if "%message%"=="" (
    echo Error: Commit message cannot be empty
    pause
    goto menu
)
echo.
echo Step 1: Adding all changes...
git add .
echo.
echo Step 2: Committing with message: %message%
git commit -m "%message%"
echo.
echo Step 3: Pushing to GitHub...
git push
echo.
if %errorlevel% equ 0 (
    echo Successfully updated GitHub!
) else (
    echo Failed to push. Check your connection and credentials.
)
pause
goto menu

:log
echo.
echo Recent commits:
echo.
git log --oneline -10
echo.
pause
goto menu

:end
echo.
echo Goodbye!
