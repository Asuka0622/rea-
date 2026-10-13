$ErrorActionPreference = 'Stop'
# Downloads the pinned upstream game/Mod sources into samples/games.
# Each archive is verified against the SHA-256 recorded in SOURCES.json (when present),
# only the parts the lessons use are extracted, and the archive itself is not kept.
$sampleRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'samples\games'
$headers = @{'User-Agent'='REA-workbench-real-game-cases'}
# keep: top-level paths to extract (empty = whole project). Licenses and readmes always stay with the code.
$projects = @(
  @{id='terraria-examplemod';repo='tModLoader/tModLoader';commit='c90e19230b4cd82181776812b0513ac8f0fbb596';subdir='ExampleMod';license='MIT';keep=@('ExampleMod','LICENSE','README.md','TERMS_OF_USE.md')},
  @{id='stardew-cjb';repo='CJBok/SDV-Mods';commit='9bf8e959209eb19b047c6bfca81783408ade1db8';subdir='CJBCheatsMenu';license='MIT';keep=@()},
  @{id='minecraft-fabric';repo='FabricMC/fabric-example-mod';commit='1685ed178a113092f8aa002c4f7d78181643d75b';subdir='';license='CC0-1.0';keep=@()},
  @{id='godot-open-rpg';repo='gdquest-demos/godot-open-rpg';commit='19bd328fae9e4b534d3bb6db380a3d871d6ea58f';subdir='';license='MIT';keep=@()}
)
New-Item -ItemType Directory -Path $sampleRoot -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$existing=@(); $receiptPath=Join-Path $sampleRoot 'SOURCES.json'
if(Test-Path -LiteralPath $receiptPath){$existing=@(ConvertFrom-Json -InputObject (Get-Content -LiteralPath $receiptPath -Raw))}
$records=@()
foreach ($item in $projects) {
  $target=Join-Path $sampleRoot $item.id
  $receipt=$existing | Where-Object {$_.id -eq $item.id -and $_.commit -eq $item.commit}
  if(Test-Path -LiteralPath $target){
    if(-not $receipt){throw ('Preserving existing source without matching receipt: '+$target)}
    $records+=$receipt; Write-Output ('Preserved local source: '+$item.id); continue
  }
  $url='https://codeload.github.com/'+$item.repo+'/zip/'+$item.commit
  $zipPath=[IO.Path]::GetTempFileName()
  try {
    Write-Output ('Downloading '+$item.id)
    Invoke-WebRequest -Uri $url -Headers $headers -OutFile $zipPath -TimeoutSec 600
    $hash=(Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if($receipt -and $receipt.sha256 -and $hash -ne $receipt.sha256){throw ('Archive hash mismatch for '+$item.id+': expected '+$receipt.sha256+', got '+$hash)}
    $zip=[IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
      New-Item -ItemType Directory -Path $target -Force | Out-Null
      $base=[IO.Path]::GetFullPath($target)+[IO.Path]::DirectorySeparatorChar
      $prefix=$zip.Entries[0].FullName.Split('/')[0]+'/'
      foreach($entry in $zip.Entries) {
        if(-not $entry.FullName.StartsWith($prefix)) {throw 'Unexpected archive root'}
        $relative=$entry.FullName.Substring($prefix.Length)
        if(-not $relative) {continue}
        if($item.keep.Count -gt 0 -and ($item.keep -notcontains $relative.Split('/')[0])) {continue}
        $destination=[IO.Path]::GetFullPath((Join-Path $target $relative))
        if(-not $destination.StartsWith($base,[StringComparison]::OrdinalIgnoreCase)) {throw 'Archive path outside sample target'}
        if($entry.FullName.EndsWith('/')) {New-Item -ItemType Directory -Path $destination -Force | Out-Null}
        else {New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($destination)) -Force | Out-Null;[IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$destination,$false)}
      }
    } finally {$zip.Dispose()}
  } finally {Remove-Item -LiteralPath $zipPath -ErrorAction SilentlyContinue}
  $analysisTarget=if($item.subdir){Join-Path $target $item.subdir}else{$target}
  $marker=@{format='rea-upstream-game-v1';id=$item.id;repository='https://github.com/'+$item.repo;commit=$item.commit}
  [IO.File]::WriteAllText((Join-Path $analysisTarget 'workbench-source.json'),($marker|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
  $bytes=(Get-ChildItem -LiteralPath $target -Recurse -File | Measure-Object Length -Sum).Sum
  $scope=if($item.keep.Count -gt 0){'Upstream archive verified; kept only '+($item.keep -join ', ')}else{'Complete upstream source archive'}
  $records+=@{id=$item.id;repository='https://github.com/'+$item.repo;commit=$item.commit;archive=$url;sha256=$hash;acquired=(Get-Date -Format 'yyyy-MM-dd');license=$item.license;scope=$scope+'; analysis focuses on '+$(if($item.subdir){$item.subdir}else{'project root'})+'; local workbench-source.json metadata added; not built or executed';subdir=$item.subdir;bytes=$bytes}
  Write-Output ($item.id+' extracted: '+[math]::Round($bytes/1MB,1)+' MiB')
}
[IO.File]::WriteAllText($receiptPath,(ConvertTo-Json -InputObject $records -Depth 8),[Text.UTF8Encoding]::new($false))
