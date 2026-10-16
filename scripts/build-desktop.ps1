param(
  [string]$NodeVersion = '24.21.0',
  # Required for the full build (Unity reading); the demo needs no Python.
  [string]$PythonBase = '',
  [switch]$IncludeArtcraft,
  [switch]$IncludeGameSources,
  # 预告测试版: the game's detective agency and three cases (about 30 minutes); starts with REA_DEMO=1.
  [switch]$Demo
)
$ErrorActionPreference = 'Stop'
$reaBuildRoot = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$reaBuildVersion = (Get-Content -LiteralPath (Join-Path $reaBuildRoot 'package.json') -Raw | ConvertFrom-Json).version
if ($reaBuildVersion -notmatch '^\d+\.\d+\.\d+$' -or $NodeVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid release version' }
$reaBuildDist = [IO.Path]::GetFullPath((Join-Path $reaBuildRoot 'dist'))
$reaBuildCache = Join-Path $reaBuildDist '.cache'
$reaBuildName = if ($Demo) { "BitTown-Detective-Demo-v$reaBuildVersion-win-x64" } else { "REA-Workbench-v$reaBuildVersion-win-x64" }
$reaBuildStage = [IO.Path]::GetFullPath((Join-Path $reaBuildDist $reaBuildName))
if (-not $reaBuildStage.StartsWith($reaBuildDist + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Build stage must remain within dist' }
$reaUnityPackages = Join-Path $reaBuildRoot 'data\tools\unitypy\venv\Lib\site-packages'
if (-not $Demo) {
  if (-not $PythonBase) { throw '-PythonBase is required for the full build (or build the demo with -Demo)' }
  $PythonBase = [IO.Path]::GetFullPath($PythonBase)
  if (-not (Test-Path -LiteralPath (Join-Path $PythonBase 'python312.dll')) -or -not (Test-Path -LiteralPath (Join-Path $reaUnityPackages 'UnityPy'))) { throw 'CPython 3.12 and project UnityPy environment are required; see docs/unity/README.md' }
}
New-Item -ItemType Directory -Force -Path $reaBuildCache | Out-Null
if (Test-Path -LiteralPath $reaBuildStage) { Remove-Item -LiteralPath $reaBuildStage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $reaBuildStage | Out-Null

# Pinned Node binary, verified against its official checksum record.
$reaNodeArchiveName = "node-v$NodeVersion-win-x64.zip"
$reaNodeArchive = Join-Path $reaBuildCache $reaNodeArchiveName
$reaNodeSums = Join-Path $reaBuildCache "SHASUMS256-v$NodeVersion.txt"
$reaNodeBase = "https://nodejs.org/dist/v$NodeVersion"
$reaCurl = Join-Path $env:SystemRoot 'System32\curl.exe'
if (-not (Test-Path -LiteralPath $reaNodeSums)) {
  & $reaCurl --silent --show-error --location --fail --connect-timeout 15 --max-time 120 -o $reaNodeSums "$reaNodeBase/SHASUMS256.txt"
  if ($LASTEXITCODE) { throw 'Node checksum download failed' }
}
$reaNodeExpected = ((Get-Content -LiteralPath $reaNodeSums) | Where-Object { $_ -match "\s$([regex]::Escape($reaNodeArchiveName))$" } | Select-Object -First 1) -split '\s+' | Select-Object -First 1
if (-not $reaNodeExpected) { throw 'Missing Node checksum' }
if (-not (Test-Path -LiteralPath $reaNodeArchive)) {
  & $reaCurl --silent --show-error --location --fail --connect-timeout 15 --max-time 180 -o $reaNodeArchive "$reaNodeBase/$reaNodeArchiveName"
  if ($LASTEXITCODE) { throw 'Node runtime download failed' }
}
if ((Get-FileHash -LiteralPath $reaNodeArchive -Algorithm SHA256).Hash.ToLower() -ne $reaNodeExpected) { throw 'Node checksum mismatch; cached file kept for inspection' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$reaRuntime = Join-Path $reaBuildStage 'runtime'
New-Item -ItemType Directory -Force -Path $reaRuntime | Out-Null
$reaNodeZip = [IO.Compression.ZipFile]::OpenRead($reaNodeArchive)
try {
  foreach ($reaEntry in $reaNodeZip.Entries) {
    if ($reaEntry.FullName -match '^[^/]+/(node\.exe|LICENSE)$') {
      $reaLeaf = $reaEntry.FullName.Split('/')[-1]
      [IO.Compression.ZipFileExtensions]::ExtractToFile($reaEntry,(Join-Path $reaRuntime $reaLeaf),$true)
    }
  }
} finally { $reaNodeZip.Dispose() }

# Portable CPython: relative isolated search paths, no venv or developer-machine paths. (Not in the demo.)
if (-not $Demo) {
$reaPython = Join-Path $reaRuntime 'python'
New-Item -ItemType Directory -Force -Path $reaPython | Out-Null
foreach ($reaPythonFile in @('python.exe','python3.dll','python312.dll','vcruntime140.dll','vcruntime140_1.dll','LICENSE.txt')) {
  Copy-Item -LiteralPath (Join-Path $PythonBase $reaPythonFile) -Destination $reaPython
}
Copy-Item -LiteralPath (Join-Path $PythonBase 'DLLs') -Destination $reaPython -Recurse
$reaPythonLib = Join-Path $reaPython 'Lib'
New-Item -ItemType Directory -Force -Path $reaPythonLib | Out-Null
foreach ($reaPythonEntry in Get-ChildItem -LiteralPath (Join-Path $PythonBase 'Lib')) {
  if ($reaPythonEntry.Name -notin @('site-packages','__pycache__','test','idlelib','tkinter','turtledemo')) { Copy-Item -LiteralPath $reaPythonEntry.FullName -Destination $reaPythonLib -Recurse }
}
$reaPackagedPackages = Join-Path $reaPythonLib 'site-packages'
New-Item -ItemType Directory -Force -Path $reaPackagedPackages | Out-Null
foreach ($reaPackage in Get-ChildItem -LiteralPath $reaUnityPackages) {
  if ($reaPackage.Name -ne '__pycache__' -and $reaPackage.Name -notmatch '^(pip|setuptools)(-|$)') { Copy-Item -LiteralPath $reaPackage.FullName -Destination $reaPackagedPackages -Recurse }
}
[IO.File]::WriteAllText((Join-Path $reaPython 'python312._pth'),((@('.','DLLs','Lib','Lib/site-packages','import site') -join [Environment]::NewLine) + [Environment]::NewLine),[Text.UTF8Encoding]::new($false))
}

# Application and small educational examples. No user data, credentials or extracted artwork.
$reaAppItems = @('server.mjs','mcp-proxy.mjs','package.json','package-lock.json','README.md','RELEASE.md','LICENSE','THIRD-PARTY-NOTICES.md','lib','public','node_modules')
if (-not $Demo) { $reaAppItems += 'docs' }
foreach ($reaItem in $reaAppItems) {
  Copy-Item -LiteralPath (Join-Path $reaBuildRoot $reaItem) -Destination $reaBuildStage -Recurse
}
# Original portrait art and art sources are not shipped (the game uses the prepared faces).
foreach ($reaArtSource in @('public\art\portraits','public\art\source')) {
  $reaArtPath = Join-Path $reaBuildStage $reaArtSource
  if (Test-Path -LiteralPath $reaArtPath) { Remove-Item -LiteralPath $reaArtPath -Recurse -Force }
}
$reaSamples = Join-Path $reaBuildStage 'samples'
New-Item -ItemType Directory -Force -Path $reaSamples | Out-Null
# The case library (small: the detective cases' sample programs) goes in every build.
foreach ($reaItem in @('notes-demo','game-mods','cases')) {
  $reaSampleDir = Join-Path $reaSamples $reaItem
  New-Item -ItemType Directory -Force -Path $reaSampleDir | Out-Null
  foreach ($reaSampleEntry in Get-ChildItem -LiteralPath (Join-Path $reaBuildRoot "samples\$reaItem")) {
    if ($reaSampleEntry.Name -ne '.drafts') { Copy-Item -LiteralPath $reaSampleEntry.FullName -Destination $reaSampleDir -Recurse }
  }
}
foreach ($reaCatalog in @('games','artcraft','unity')) {
  $reaCatalogDest = Join-Path $reaSamples $reaCatalog
  New-Item -ItemType Directory -Force -Path $reaCatalogDest | Out-Null
  foreach ($reaCatalogEntry in Get-ChildItem -LiteralPath (Join-Path $reaBuildRoot "samples\$reaCatalog") -File) {
    if ($reaCatalogEntry.Extension -in @('.json','.md')) { Copy-Item -LiteralPath $reaCatalogEntry.FullName -Destination $reaCatalogDest }
  }
}
foreach ($reaChoice in @(@{Name='games';Enabled=$IncludeGameSources},@{Name='artcraft';Enabled=$IncludeArtcraft})) {
  if ($reaChoice.Enabled) {
    foreach ($reaDir in Get-ChildItem -LiteralPath (Join-Path $reaBuildRoot ("samples\"+$reaChoice.Name)) -Directory) {
      Copy-Item -LiteralPath $reaDir.FullName -Destination (Join-Path $reaSamples $reaChoice.Name) -Recurse
    }
  }
}
$reaPackagedScripts = Join-Path $reaBuildStage 'scripts'
New-Item -ItemType Directory -Force -Path $reaPackagedScripts | Out-Null
foreach ($reaScript in @('inspect-unity.py','setup-unity.ps1','prepare-artcraft.ps1','prepare-game-sources.ps1')) {
  Copy-Item -LiteralPath (Join-Path $reaBuildRoot ("scripts\"+$reaScript)) -Destination $reaPackagedScripts
}
if ($Demo) {
$reaLauncher = @'
@echo off
chcp 65001 >nul
title 比特镇 · 侦探事务所 预告测试版
cd /d "%~dp0"
set "REA_WORKBENCH_HOME=%~dp0data"
set "REA_DEMO=1"
if not exist "runtime\node.exe" (
  echo 请先完整解压，再打开此文件。
  pause
  exit /b 1
)
echo 正在启动预告测试版，浏览器会自动打开。游戏期间请保持本窗口打开。
"runtime\node.exe" server.mjs
pause
'@
[IO.File]::WriteAllText((Join-Path $reaBuildStage '开始游戏.bat'),($reaLauncher -replace "`r?`n","`r`n"),[Text.UTF8Encoding]::new($false))
$reaInstructions = @"
比特镇 · 侦探事务所 预告测试版 v$reaBuildVersion · Windows x64 免安装

1. 完整解压到一个可写的文件夹。
2. 双击「开始游戏.bat」，浏览器会自动打开游戏。
3. 大约 30 到 45 分钟：跟着路米认识比特镇，接下三份委托，把可疑的软件拆开查清楚。
4. 玩完关闭启动窗口即可。进度保存在浏览器里。

键盘：WASD 或方向键走路，E 进门，M 地图，J 任务日志，K 技能和成就。鼠标右键点地面也能走过去。
游戏里分析的都是自带的教学示例，不会读取你电脑上的其他文件，不需要联网。
"@
[IO.File]::WriteAllText((Join-Path $reaBuildStage '使用说明.txt'),($reaInstructions -replace "`r?`n","`r`n"),[Text.UTF8Encoding]::new($true))
} else {
$reaLauncher = @'
@echo off
chcp 65001 >nul
title REA 工作台
cd /d "%~dp0"
set "REA_WORKBENCH_HOME=%~dp0data"
set "REA_UNITY_PYTHON=%~dp0runtime\python\python.exe"
set "PYTHONNOUSERSITE=1"
if not exist "runtime\node.exe" (
  echo 请先完整解压安装包，再打开此文件。
  pause
  exit /b 1
)
echo 正在启动 REA 工作台。使用期间请保持本窗口打开。
"runtime\node.exe" server.mjs
pause
'@
[IO.File]::WriteAllText((Join-Path $reaBuildStage '启动 REA 工作台.bat'),($reaLauncher -replace "`r?`n","`r`n"),[Text.UTF8Encoding]::new($false))
$reaInstructions = @"
REA 工作台 v$reaBuildVersion · Windows x64 免安装包

1. 完整解压到一个可写文件夹。
2. 双击「启动 REA 工作台.bat」，浏览器会自动打开。
3. 从「试用笔记示例」开始；用完关闭启动窗口即可。

已包含 Node.js、CPython 3.12 和 UnityPy，无需安装开发环境即可启动、分析笔记示例及读取自己的 Unity 自包含资源包。
数据保存在本文件夹的 data / exports 子文件夹。
ArtCraft 和四个游戏案例的大型源码没有放进最小包，可按 RELEASE.md 下载。
外部 AI、可选分析引擎和源码下载需要网络及相应服务；不是工作台首次启动的必需条件。
Unity 当前提供贴图与 OBJ 网格导出，不包含完整工程、骨骼动画或游戏内修改验证。
"@
[IO.File]::WriteAllText((Join-Path $reaBuildStage '使用说明.txt'),($reaInstructions -replace "`r?`n","`r`n"),[Text.UTF8Encoding]::new($true))
}
$reaRuntimeInfo = @{node=$NodeVersion;nodeArchiveSHA256=$reaNodeExpected;python=$(if ($Demo) { $null } else { '3.12.14' });unitypy=$(if ($Demo) { $null } else { '1.25.4' });gameSources=[bool]$IncludeGameSources;artcraftSources=[bool]$IncludeArtcraft;demo=[bool]$Demo}
$reaRuntimeInfo | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $reaBuildStage 'runtime-info.json') -Encoding utf8
$reaBuildArchive = Join-Path $reaBuildDist "$reaBuildName.zip"
if (Test-Path -LiteralPath $reaBuildArchive) { Remove-Item -LiteralPath $reaBuildArchive }
[IO.Compression.ZipFile]::CreateFromDirectory($reaBuildStage,$reaBuildArchive,[IO.Compression.CompressionLevel]::Optimal,$true,[Text.Encoding]::UTF8)
$reaBuildHash = (Get-FileHash -LiteralPath $reaBuildArchive -Algorithm SHA256).Hash.ToLower()
[IO.File]::WriteAllText((Join-Path $reaBuildDist "$reaBuildName.sha256"),"$reaBuildHash  $reaBuildName.zip`n",[Text.UTF8Encoding]::new($false))
Write-Output ("Built: {0} ({1:N1} MiB)" -f $reaBuildArchive,((Get-Item -LiteralPath $reaBuildArchive).Length / 1MB))
Write-Output "SHA-256: $reaBuildHash"
