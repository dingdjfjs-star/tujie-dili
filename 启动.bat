@echo off
chcp 65001 >nul
title 图解地理 · AI 地理图表精读
cd /d "%~dp0"
echo.
echo  正在启动 图解地理 ...
echo  （启动后请保持本窗口开着，关掉窗口网站就停了）
start "" http://localhost:8947
node server.js
pause
