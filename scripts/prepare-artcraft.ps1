param([string]$SampleRoot = (Join-Path $PSScriptRoot '../samples/artcraft'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$reaSampleRoot = [IO.Path]::GetFullPath($SampleRoot)
$reaSources = Get-Content -LiteralPath (Join-Path $reaSampleRoot 'SOURCES.json') -Raw | ConvertFrom-Json
$reaAllowed = @('photocraft','vectorcraft','filmcraft','lightcraft','printcraft','effectcraft','designcraft')
foreach($reaSource in $reaSources) {
  if($reaSource.id -notin $reaAllowed -or $reaSource.commit -notmatch '^[0-9a-f]{40}$' -or $reaSource.sha256 -notmatch '^[0-9a-f]{64}$'){throw 'Invalid sample source'}
  $reaTarget = [IO.Path]::GetFullPath((Join-Path $reaSampleRoot $reaSource.id))
  if(-not $reaTarget.StartsWith($reaSampleRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid sample path'}
  if(Test-Path -LiteralPath $reaTarget){Write-Host "$($reaSource.id): already present; existing files preserved"; continue}
  $reaArchivePath = [IO.Path]::GetTempFileName()
  try {
    Invoke-WebRequest -Uri "https://codeload.github.com/storytold/$($reaSource.id)/zip/$($reaSource.commit)" -OutFile $reaArchivePath -TimeoutSec 180
    $reaActualHash=(Get-FileHash -LiteralPath $reaArchivePath -Algorithm SHA256).Hash.ToLower()
    if($reaActualHash -ne $reaSource.sha256){throw "Archive checksum mismatch: $($reaSource.id)"}
    New-Item -ItemType Directory -Path $reaTarget -Force | Out-Null
    $reaZip = [IO.Compression.ZipFile]::OpenRead($reaArchivePath)
    try {
      foreach($reaEntry in $reaZip.Entries) {
        $reaRelative = ($reaEntry.FullName -split '/',2)[1]
        if(-not $reaRelative -or $reaEntry.FullName.EndsWith('/')){continue}
        $reaOutput = [IO.Path]::GetFullPath((Join-Path $reaTarget $reaRelative))
        if(-not $reaOutput.StartsWith($reaTarget + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Archive path escapes sample directory'}
        New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($reaOutput)) -Force | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($reaEntry,$reaOutput,$false)
      }
    } finally {$reaZip.Dispose()}
    Write-Host "$($reaSource.id): ready"
  } finally {Remove-Item -LiteralPath $reaArchivePath -ErrorAction SilentlyContinue}
}
