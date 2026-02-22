$root = 'C:\Users\THEMBA\Downloads\centreconnect-app\centreconnect-app'
$manifest = Join-Path 'C:\Users\THEMBA\AppData\Local\Temp' 'manifest.txt'
$files = Get-ChildItem -Path $root -Recurse -File |
    Where-Object {
        ($_.FullName -notmatch '\\node_modules\\') -and
        ($_.FullName -notmatch '\\.next\\') -and
        ($_.FullName -notmatch '\\.git\\') -and
        (@('.tsx','.ts','.css','.sql') -contains $_.Extension)
    }
$files | Sort-Object FullName | Select-Object -ExpandProperty FullName | Set-Content $manifest
Write-Output $files.Count
Get-Content $manifest
