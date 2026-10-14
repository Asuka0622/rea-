param([Parameter(Mandatory=$true)][string]$PythonExecutable)
$ErrorActionPreference = 'Stop'
$reaUnityRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$reaPortablePython = Join-Path $reaUnityRoot 'runtime\python\python.exe'
$reaProvidedPython = [IO.Path]::GetFullPath($PythonExecutable)
if ((Test-Path -LiteralPath $reaPortablePython) -and $reaProvidedPython -eq [IO.Path]::GetFullPath($reaPortablePython)) {
    $reaPortableVersion = & $reaPortablePython -c "import UnityPy; print(UnityPy.__version__)"
    if ($LASTEXITCODE -ne 0 -or $reaPortableVersion -ne '1.25.4') { throw 'Portable UnityPy runtime is incomplete; extract the full release archive again' }
} else {
    $reaUnityEnvironment = Join-Path $reaUnityRoot 'data\tools\unitypy\venv'
    $reaUnityPython = Join-Path $reaUnityEnvironment 'Scripts\python.exe'
    if (-not (Test-Path -LiteralPath $reaUnityPython)) {
        & $PythonExecutable -m venv $reaUnityEnvironment
        if ($LASTEXITCODE -ne 0) { throw 'Unable to create project Python environment' }
    }
    & $reaUnityPython -m pip install --no-cache-dir --disable-pip-version-check -r (Join-Path $reaUnityRoot 'docs\unity\requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'UnityPy installation failed' }
}
$reaUnitySampleDirectory = Join-Path $reaUnityRoot 'samples\unity'
New-Item -ItemType Directory -Path $reaUnitySampleDirectory -Force | Out-Null
$reaUnitySamples = @(
    @{Name='atlas_test.bundle'; Upstream='atlas_test'; Hash='61ee5afb5f5c64f0a4f65f039d09b2509198363e713423289c895067ac215177'},
    @{Name='mesh_test.bundle'; Upstream='xinzexi_2_n_tex'; Hash='a9f6e6bba7110cce647ef752d66655d13ce5850b013a60d80d4e8b08953e02ea'},
    @{Name='mesh_expected.obj'; Upstream='xinzexi_2_n_tex_mesh'; Hash='8bb2082b9586b3f8f3bad2d22d33346ec0492053f2a76323aa8b4b4047368ca8'}
)
foreach ($reaUnityItem in $reaUnitySamples) {
    $reaUnityFile = Join-Path $reaUnitySampleDirectory $reaUnityItem.Name
    if (-not (Test-Path -LiteralPath $reaUnityFile)) {
        $reaUnityUrl = 'https://media.githubusercontent.com/media/K0lb3/UnityPy/417d59522a998fdee9a9c2b29fe35f3063222457/tests/samples/' + $reaUnityItem.Upstream
        Invoke-WebRequest -Uri $reaUnityUrl -OutFile $reaUnityFile -TimeoutSec 60
    }
    if ((Get-FileHash -LiteralPath $reaUnityFile -Algorithm SHA256).Hash.ToLower() -ne $reaUnityItem.Hash) {
        throw ('Unity sample digest mismatch; existing file kept: ' + $reaUnityItem.Name)
    }
}
Write-Output 'UnityPy, texture and mesh samples are ready. Use atlas_test.bundle or mesh_test.bundle in the workbench.'
