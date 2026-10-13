@echo off
chcp 65001 >nul
title REA 工作台
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 没有找到 Node.js。请先安装 Node.js 22 或更新版本（LTS 版即可），装好后再双击本文件。
  start "" "https://nodejs.org/zh-cn/download"
  pause
  exit /b 1
)
if not exist "node_modules\rea-agents" (
  echo 第一次启动，正在安装 REA（约 1 分钟）...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo 安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)
node server.mjs
pause
