[cmdletbinding()]
param()

$out = @{
    title = ""
    artist = ""
    app = ""
    status = "Stopped"
}

try {
    # 1. Try Windows WinRT GSMTC
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
    $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $i = 0
    while ($asyncOp.Status -eq 'Started' -and $i -lt 15) { Start-Sleep -Milliseconds 40; $i++ }
    if ($asyncOp.Status -eq 'Completed') {
        $mgr = $asyncOp.GetResults()
        if ($mgr) {
            $session = $mgr.GetCurrentSession()
            if ($session) {
                $mediaOp = $session.TryGetMediaPropertiesAsync()
                $j = 0
                while ($mediaOp.Status -eq 'Started' -and $j -lt 15) { Start-Sleep -Milliseconds 40; $j++ }
                if ($mediaOp.Status -eq 'Completed') {
                    $props = $mediaOp.GetResults()
                    $pb = $session.GetPlaybackInfo()
                    if ($props -and $props.Title) {
                        $out.title = [string]$props.Title
                        $out.artist = if ([string]$props.Artist) { [string]$props.Artist } else { [string]$props.AlbumArtist }
                        $out.app = [string]$session.SourceAppUserModelId
                        $out.status = if ($pb) { [string]$pb.PlaybackStatus.ToString() } else { "Playing" }
                        $out | ConvertTo-Json -Compress
                        exit 0
                    }
                }
            }
        }
    }
} catch {
    # WinRT reflection fallback
}

# 2. Process Window Title Fallback (Spotify, Chrome, Edge, VLC, Music)
$spotify = Get-Process Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" -and $_.MainWindowTitle -ne "Spotify" -and $_.MainWindowTitle -ne "Spotify Premium" -and $_.MainWindowTitle -ne "Spotify Free" } | Select-Object -First 1
if ($spotify) {
    $parts = $spotify.MainWindowTitle -split " - ", 2
    if ($parts.Count -ge 2) {
        $out.artist = $parts[0].Trim()
        $out.title = $parts[1].Trim()
    } else {
        $out.title = $spotify.MainWindowTitle.Trim()
        $out.artist = "Spotify"
    }
    $out.app = "Spotify"
    $out.status = "Playing"
    $out | ConvertTo-Json -Compress
    exit 0
}

# Browser / Media player window title check (e.g. YouTube, SoundCloud)
$browsers = Get-Process chrome, msedge, vlc, Music.UI -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "* - *" } | Select-Object -First 1
if ($browsers) {
    $rawTitle = $browsers.MainWindowTitle
    # Clean common suffixes like " - YouTube - Google Chrome"
    $cleanTitle = $rawTitle -replace " - Google Chrome$", "" -replace " - Microsoft Edge$", "" -replace " - YouTube$", "" -replace " - VLC media player$", ""
    $parts = $cleanTitle -split " - ", 2
    if ($parts.Count -ge 2) {
        $out.title = $parts[0].Trim()
        $out.artist = $parts[1].Trim()
    } else {
        $out.title = $cleanTitle.Trim()
        $out.artist = $browsers.ProcessName
    }
    $out.app = $browsers.ProcessName
    $out.status = "Playing"
    $out | ConvertTo-Json -Compress
    exit 0
}

# Return default empty JSON
$out | ConvertTo-Json -Compress
