[CmdletBinding()]
param([string]$SigningDirectory = (Join-Path $env:LOCALAPPDATA 'LE ROY FACTORY\AndroidSigning'), [string]$JavaHome = $env:JAVA_HOME)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Assert-ExternalSigningPath.ps1')
if (!$JavaHome -or !(Test-Path (Join-Path $JavaHome 'bin/keytool.exe'))) { throw 'Set JAVA_HOME to a JDK.' }
$vaultPath = (Assert-ExternalSigningPath -Path $SigningDirectory)
$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if ($vaultPath.StartsWith($repoPath, [StringComparison]::OrdinalIgnoreCase)) { throw 'Signing keys must be OUTSIDE the repository.' }
if (Test-Path $vaultPath) { throw 'The signing directory already exists. Reuse its key; do not overwrite it.' }
New-Item -ItemType Directory -Path $vaultPath | Out-Null
$currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $vaultPath /inheritance:r /grant:r ('*' + $currentSid + ':(OI)(CI)F') | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot restrict the signing directory ACL.' }
$randomBytes = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($randomBytes); $rng.Dispose()
$secret = [Convert]::ToBase64String($randomBytes)
$env:LRF_TEMP_STORE_PASSWORD = $secret
try {
    & (Join-Path $JavaHome 'bin/keytool.exe') -genkeypair -keystore (Join-Path $vaultPath 'lrf-upload.p12') -storetype PKCS12 -storepass:env LRF_TEMP_STORE_PASSWORD -keypass:env LRF_TEMP_STORE_PASSWORD -alias lrf-upload -keyalg RSA -keysize 4096 -sigalg SHA256withRSA -validity 10000 -dname 'CN=LE ROY FACTORY, O=LE ROY FACTORY, C=FR' -noprompt
    if ($LASTEXITCODE -ne 0) { throw 'Key generation failed; inspect the partial vault before retrying.' }
    $secret | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $vaultPath 'password.dpapi') -Encoding ASCII
    & (Join-Path $JavaHome 'bin/keytool.exe') -exportcert -rfc -keystore (Join-Path $vaultPath 'lrf-upload.p12') -storepass:env LRF_TEMP_STORE_PASSWORD -alias lrf-upload -file (Join-Path $vaultPath 'upload-certificate.pem')
    if ($LASTEXITCODE -ne 0) { throw 'Public certificate export failed.' }
    @{ alias='lrf-upload'; storeFile='lrf-upload.p12'; purpose='Google Play upload key'; createdUtc=[DateTime]::UtcNow.ToString('o'); recovery='Password protected with Windows DPAPI CurrentUser; export a portable backup before changing Windows profile.' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $vaultPath 'vault-info.json') -Encoding UTF8
    Write-Output ('Signing vault created outside Git: ' + $vaultPath)
} finally { Remove-Item Env:LRF_TEMP_STORE_PASSWORD -ErrorAction SilentlyContinue; $secret=$null; [Array]::Clear($randomBytes,0,$randomBytes.Length) }
