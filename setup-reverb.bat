@echo off
REM Doble clic para configurar Laravel Reverb (WebSockets) en esta
REM maquina Windows con Herd -- ver scripts/setup-reverb-windows.ps1
REM para el detalle de que hace y por que.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-reverb-windows.ps1" %*
pause
