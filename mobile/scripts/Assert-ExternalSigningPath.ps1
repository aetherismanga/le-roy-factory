function Assert-ExternalSigningPath {
    param([Parameter(Mandatory=$true)][string]$Path)
    $candidate = [IO.Path]::GetFullPath($Path)
    $cursor = $candidate
    while ($cursor) {
        if (Test-Path -LiteralPath (Join-Path $cursor '.git')) {
            throw 'Signing material and backups must be outside every Git working tree.'
        }
        $parent = [IO.Directory]::GetParent($cursor)
        if ($null -eq $parent) { break }
        $cursor = $parent.FullName
    }
    return $candidate
}
