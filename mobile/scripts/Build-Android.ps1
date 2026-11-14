[CmdletBinding()]
param([string]$SigningDirectory = (Join-Path $env:LOCALAPPDATA 'LE ROY FACTORY\AndroidSigning'), [string]$JavaHome = $env:JAVA_HOME, [string]$AndroidSdk = $env:ANDROID_HOME)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'Assert-ExternalSigningPath.ps1')
if (!$JavaHome -or !$AndroidSdk) { throw 'Set JAVA_HOME and ANDROID_HOME.' }
$env:JAVA_HOME=$JavaHome; $env:ANDROID_HOME=$AndroidSdk
$vaultPath=(Assert-ExternalSigningPath -Path $SigningDirectory)
$repoPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if ($vaultPath.StartsWith($repoPath,[StringComparison]::OrdinalIgnoreCase)) { throw 'Signing vault must be outside Git.' }
$secret=(Get-Content -LiteralPath (Join-Path $vaultPath 'password.dpapi') -Raw).Trim() | ConvertTo-SecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    $env:LRF_SIGNING_STORE_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $env:LRF_SIGNING_KEY_PASSWORD=$env:LRF_SIGNING_STORE_PASSWORD
    $env:LRF_SIGNING_STORE_FILE=Join-Path $vaultPath 'lrf-upload.p12'
    $env:LRF_SIGNING_KEY_ALIAS='lrf-upload'
    Push-Location (Join-Path $PSScriptRoot '../android')
    try {
        & .\gradlew.bat testDebugUnitTest lintRelease bundleRelease assembleRelease --no-daemon
        if ($LASTEXITCODE -ne 0) { throw 'Android validation/build failed.' }
        $delivery=Join-Path $PSScriptRoot '../release-output'
        New-Item -ItemType Directory -Force -Path $delivery | Out-Null
        # Canonical JAR entry order also makes JarInputStream verification unambiguous.
        & (Join-Path $JavaHome 'bin/jarsigner.exe') -keystore $env:LRF_SIGNING_STORE_FILE -storetype PKCS12 -storepass:env LRF_SIGNING_STORE_PASSWORD -keypass:env LRF_SIGNING_KEY_PASSWORD -sigalg SHA256withRSA -digestalg SHA-256 -signedjar (Join-Path $delivery 'LE-ROY-FACTORY-1.0.0.aab') 'app/build/outputs/bundle/release/app-release.aab' $env:LRF_SIGNING_KEY_ALIAS
        if ($LASTEXITCODE -ne 0) { throw 'AAB signing failed.' }
        Copy-Item -LiteralPath 'app/build/outputs/apk/release/app-release.apk' -Destination (Join-Path $delivery 'LE-ROY-FACTORY-1.0.0.apk')
        Copy-Item -LiteralPath (Join-Path $vaultPath 'upload-certificate.pem') -Destination $delivery
        & (Join-Path $JavaHome 'bin/jarsigner.exe') -verify (Join-Path $delivery 'LE-ROY-FACTORY-1.0.0.aab')
        if ($LASTEXITCODE -ne 0) { throw 'AAB signature verification failed.' }
        Get-ChildItem -LiteralPath $delivery -File | Where-Object { $_.Extension -in '.aab','.apk','.pem' } | Get-FileHash -Algorithm SHA256 | Select-Object @{N='file';E={Split-Path $_.Path -Leaf}},Hash | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $delivery 'SHA256.json') -Encoding UTF8
        Write-Output ('Signed artifacts: ' + [IO.Path]::GetFullPath($delivery))
    } finally { Pop-Location }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    foreach ($item in @('LRF_SIGNING_STORE_PASSWORD','LRF_SIGNING_KEY_PASSWORD','LRF_SIGNING_STORE_FILE','LRF_SIGNING_KEY_ALIAS')) { Remove-Item ('Env:'+ $item) -ErrorAction SilentlyContinue }
    $secret.Dispose()
}
