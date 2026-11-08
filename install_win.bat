@echo off
setlocal
set "DEST=%APPDATA%\Adobe\CEP\extensions\com.arcmedits.panel"
set "FDEST=%LOCALAPPDATA%\Microsoft\Windows\Fonts"

echo Enabling CEP debug mode...
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.9"  /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

echo Installing ARCM Edits panel...
if not exist "%DEST%" mkdir "%DEST%"
xcopy "%~dp0extension\*" "%DEST%\" /E /I /Y >nul

echo Installing Montserrat font...
if not exist "%FDEST%" mkdir "%FDEST%"
copy /Y "%~dp0extension\fonts\Montserrat-ExtraBold.ttf" "%FDEST%\" >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts" /v "Montserrat ExtraBold (TrueType)" /t REG_SZ /d "%FDEST%\Montserrat-ExtraBold.ttf" /f >nul 2>&1

echo.
echo Done. Quit After Effects completely, reopen it, then open
echo Window ^> Extensions ^> ARCM Edits
echo.
pause
