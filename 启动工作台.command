#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "没有找到 Node.js。请先安装 Node.js 22 或更新版本（LTS 版即可），装好后再双击本文件。"
  open "https://nodejs.org/zh-cn/download"
  exit 1
fi
if [ ! -d node_modules/rea-agents ]; then
  echo "第一次启动，正在安装 REA（约 1 分钟）..."
  npm install --no-audit --no-fund || { echo "安装失败，请检查网络后重试。"; exit 1; }
fi
exec node server.mjs
