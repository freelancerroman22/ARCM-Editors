@echo off
setlocal
set "DEST=%APPDATA%\Adobe\CEP\extensions\com.arcmedits.panel"

echo Enabling CEP debug mode...
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.9"  /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

echo Installing ARCM Edits panel to:
echo   %DEST%
if not exist "%DEST%" mkdir "%DEST%"
xcopy "%~dp0extension\*" "%DEST%\" /E /I /Y >nul

echo.
echo Done. Quit After Effects completely, reopen it, then open
echo Window ^> Extensions ^> ARCM Edits
echo (The panel updates itself from GitHub after this.)
echo.
pause
