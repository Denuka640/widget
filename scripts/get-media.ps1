[cmdletbinding()]
param()

$ErrorActionPreference = 'SilentlyContinue'
$list = @()

try {
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
    $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $i = 0
    while ($asyncOp.Status -eq 'Started' -and $i -lt 12) { Start-Sleep -Milliseconds 40; $i++ }
    if ($asyncOp.Status -eq 'Completed') {
        $mgr = $asyncOp.GetResults()
        if ($mgr) {
            $sessions = $mgr.GetSessions()
            foreach ($s in $sessions) {
                $op = $s.TryGetMediaPropertiesAsync()
                $j = 0
                while ($op.Status -eq 'Started' -and $j -lt 12) { Start-Sleep -Milliseconds 40; $j++ }
                if ($op.Status -eq 'Completed') {
                    $p = $op.GetResults()
                    $pb = $s.GetPlaybackInfo()
                    if ($p -and ($p.Title -or $p.Artist)) {
                        $list += [PSCustomObject]@{
                            title = [string]$p.Title
                            artist = if ([string]$p.Artist) { [string]$p.Artist } else { [string]$p.AlbumArtist }
                            app = [string]$s.SourceAppUserModelId
                            status = if ($pb) { [string]$pb.PlaybackStatus.ToString() } else { "Playing" }
                        }
                    }
                }
            }
        }
    }
} catch {}

$spotify = Get-Process Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" -and $_.MainWindowTitle -ne "Spotify" -and $_.MainWindowTitle -ne "Spotify Premium" -and $_.MainWindowTitle -ne "Spotify Free" } | Select-Object -First 1
if ($spotify) {
    $parts = $spotify.MainWindowTitle -split " - ", 2
    $spTitle = if ($parts.Count -ge 2) { $parts[1].Trim() } else { $spotify.MainWindowTitle.Trim() }
    $spArtist = if ($parts.Count -ge 2) { $parts[0].Trim() } else { "Spotify" }
    
    $exists = $list | Where-Object { $_.title -eq $spTitle }
    if (-not $exists) {
        $list += [PSCustomObject]@{
            title = $spTitle
            artist = $spArtist
            app = "Spotify"
            status = "Playing"
        }
    }
}

$browsers = Get-Process chrome, msedge, vlc, Music.UI, AppleMusic, foobar2000 -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "* - *" }
foreach ($b in $browsers) {
    $cleanTitle = $b.MainWindowTitle -replace " - Google Chrome$", "" -replace " - Microsoft Edge$", "" -replace " - YouTube$", "" -replace " - VLC media player$", ""
    $parts = $cleanTitle -split " - ", 2
    $bTitle = if ($parts.Count -ge 2) { $parts[0].Trim() } else { $cleanTitle.Trim() }
    $bArtist = if ($parts.Count -ge 2) { $parts[1].Trim() } else { $b.ProcessName }
    $exists = $list | Where-Object { $_.title -eq $bTitle }
    if (-not $exists) {
        $list += [PSCustomObject]@{
            title = $bTitle
            artist = $bArtist
            app = $b.ProcessName
            status = "Playing"
        }
    }
}

if ($list.Count -eq 0) {
    Write-Output "[]"
} else {
    $json = $list | ConvertTo-Json -Compress
    if ($json.StartsWith("{")) {
        Write-Output "[$json]"
    } else {
        Write-Output $json
    }
}
