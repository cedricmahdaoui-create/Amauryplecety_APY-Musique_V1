@echo off
title La Cave aux Instrum - serveur local
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js n'est pas installe ou pas dans le PATH.
  echo   Telechargez-le sur https://nodejs.org  puis relancez ce fichier.
  echo.
  pause
  exit /b 1
)

REM Arrete un eventuel serveur d'apercu deja lance (evite les conflits de port)
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*dev-server.mjs*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" 2>nul

echo.
echo   La Cave aux Instrum - apercu local
echo   -------------------------------------------
echo   Le navigateur va s'ouvrir automatiquement.
echo   Laissez CETTE fenetre ouverte pendant la consultation.
echo   Pour arreter : fermez la fenetre ou faites Ctrl + C.
echo.

node tools\dev-server.mjs

echo.
echo   Serveur arrete.
pause
