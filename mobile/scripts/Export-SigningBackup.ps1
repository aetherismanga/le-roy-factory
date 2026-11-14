[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Destination, [Parameter(Mandatory=$true)][Security.SecureString]$RecoveryPassword, [string]$SigningDirectory=(Join-Path $env:LOCALAPPDATA 'LE ROY FACTORY\AndroidSigning'), [string]$JavaHome=$env:JAVA_HOME)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'Assert-ExternalSigningPath.ps1')
$backupPath=(Assert-ExternalSigningPath -Path $Destination)
$repoPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if ($backupPath.StartsWith($repoPath,[StringComparison]::OrdinalIgnoreCase)) { throw 'Backup must be outside the repository.' }
if (Test-Path $backupPath) { throw 'Destination already exists; no overwrite allowed.' }
if ($RecoveryPassword.Length -lt 20) { throw 'Use a recovery passphrase of at least 20 characters, stored in your password manager.' }
$sourceSecret=(Get-Content -LiteralPath (Join-Path $SigningDirectory 'password.dpapi') -Raw).Trim() | ConvertTo-SecureString
$p1=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($sourceSecret)
$p2=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($RecoveryPassword)
try {
 $env:LRF_BACKUP_SOURCE_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p1)
 $env:LRF_BACKUP_RECOVERY_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p2)
 & (Join-Path $JavaHome 'bin/keytool.exe') -importkeystore -srckeystore (Join-Path $SigningDirectory 'lrf-upload.p12') -srcstoretype PKCS12 -srcstorepass:env LRF_BACKUP_SOURCE_PASSWORD -srcalias lrf-upload -destkeystore $backupPath -deststoretype PKCS12 -deststorepass:env LRF_BACKUP_RECOVERY_PASSWORD -destkeypass:env LRF_BACKUP_RECOVERY_PASSWORD -noprompt
 if ($LASTEXITCODE -ne 0) { throw 'Backup export failed.' }
 & (Join-Path $JavaHome 'bin/keytool.exe') -list -keystore $backupPath -storepass:env LRF_BACKUP_RECOVERY_PASSWORD -alias lrf-upload
 if ($LASTEXITCODE -ne 0) { throw 'Backup verification failed.' }
 Write-Output 'Encrypted portable backup verified. Store it on separate secure media and keep the recovery passphrase separately.'
} finally {
 [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p1); [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p2)
 Remove-Item Env:LRF_BACKUP_SOURCE_PASSWORD,Env:LRF_BACKUP_RECOVERY_PASSWORD -ErrorAction SilentlyContinue
 $sourceSecret.Dispose()
}
