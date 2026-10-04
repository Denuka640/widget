import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  Clock,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  GripHorizontal,
  MapPin,
  Music,
  Palette,
  Pause,
  Play,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  Sun,
  Thermometer,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react'
import './App.css'

interface WeatherData {
  temp: number
  high: number
  low: number
  humidity: number
  wind: number
  code: number
  city: string
  isDay: boolean
}

interface MediaTrack {
  title: string
  artist: string
  app: string
  isPlaying: boolean
}

type ClockType = 'digital' | 'analog'
type ThemePreset = 'light_frosted' | 'dark_obsidian' | 'pixel_sunset' | 'emerald_mint' | 'cyber_violet' | 'custom'

function getWeatherInfo(code: number) {
  if (code === 0) return { label: 'Clear Sky', Icon: Sun, color: '#f6d365' }
  if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', Icon: CloudSun, color: '#4a90e2' }
  if (code >= 45 && code <= 48) return { label: 'Foggy', Icon: CloudFog, color: '#7f8c8d' }
  if (code >= 51 && code <= 67) return { label: 'Rain Drizzle', Icon: CloudDrizzle, color: '#2980b9' }
  if (code >= 71 && code <= 77) return { label: 'Snowfall', Icon: CloudSnow, color: '#bdc3c7' }
  if (code >= 80 && code <= 82) return { label: 'Heavy Rain', Icon: CloudRain, color: '#2980b9' }
  if (code >= 95) return { label: 'Thunderstorm', Icon: CloudLightning, color: '#e67e22' }
  return { label: 'Mild', Icon: CloudSun, color: '#4a90e2' }
}

function hexToRgba(hex: string, alpha: number) {
  let c = hex.replace('#', '')
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('')
  }
  const num = parseInt(c, 16) || 0
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Pre-computed static tick angles for Analog Clock face (prevents dynamic allocations)
const CLOCK_TICKS = Array.from({ length: 12 }).map((_, i) => {
  const angle = (i * 30 * Math.PI) / 180
  const isMain = i % 3 === 0
  const r1 = isMain ? 70 : 76
  const r2 = 83
  return {
    id: i,
    isMain,
    x1: 100 + r1 * Math.sin(angle),
    y1: 100 - r1 * Math.cos(angle),
    x2: 100 + r2 * Math.sin(angle),
    y2: 100 - r2 * Math.cos(angle),
  }
})

// Lightweight Vector Analog Clock Component
const AnalogClock = memo(function AnalogClock({ time }: { time: Date }) {
  const ms = time.getMilliseconds()
  const sec = time.getSeconds() + ms / 1000
  const min = time.getMinutes() + sec / 60
  const hour = (time.getHours() % 12) + min / 60

  const secAngle = sec * 6
  const minAngle = min * 6
  const hourAngle = hour * 30

  return (
    <div className="analog-clock-container">
      <svg className="analog-clock-svg" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="clockFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.15)" />
          </linearGradient>
        </defs>

        {/* Outer Face */}
        <circle cx="100" cy="100" r="90" fill="url(#clockFaceGrad)" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="2" />

        {/* Hour Ticks */}
        {CLOCK_TICKS.map((t) => (
          <line
            key={t.id}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="var(--text-main)"
            strokeWidth={t.isMain ? 3 : 1.5}
            strokeLinecap="round"
            opacity={t.isMain ? 0.85 : 0.45}
          />
        ))}

        {/* Hour Hand */}
        <line
          x1="100"
          y1="100"
          x2={100 + 46 * Math.sin((hourAngle * Math.PI) / 180)}
          y2={100 - 46 * Math.cos((hourAngle * Math.PI) / 180)}
          stroke="var(--text-main)"
          strokeWidth="5.5"
          strokeLinecap="round"
        />

        {/* Minute Hand */}
        <line
          x1="100"
          y1="100"
          x2={100 + 68 * Math.sin((minAngle * Math.PI) / 180)}
          y2={100 - 68 * Math.cos((minAngle * Math.PI) / 180)}
          stroke="var(--text-main)"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Second Hand */}
        <line
          x1={100 - 14 * Math.sin((secAngle * Math.PI) / 180)}
          y1={100 + 14 * Math.cos((secAngle * Math.PI) / 180)}
          x2={100 + 76 * Math.sin((secAngle * Math.PI) / 180)}
          y2={100 - 76 * Math.cos((secAngle * Math.PI) / 180)}
          stroke="var(--accent-cyan)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Center Cap */}
        <circle cx="100" cy="100" r="5" fill="var(--accent-cyan)" stroke="var(--text-main)" strokeWidth="1.5" />
      </svg>
    </div>
  )
})

// Isolated Clock Display Component to keep 1-second ticks scoped
const HeroClockCard = memo(function HeroClockCard({
  clockType,
  is24Hour,
  setIs24Hour,
  weatherCity,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  searchError,
  handleCitySearch,
}: {
  clockType: ClockType
  is24Hour: boolean
  setIs24Hour: (val: boolean) => void
  weatherCity: string
  showSearch: boolean
  setShowSearch: (val: boolean) => void
  searchQuery: string
  setSearchQuery: (val: string) => void
  searchError: string
  handleCitySearch: (e: React.FormEvent) => void
}) {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const hours = is24Hour ? time.getHours().toString().padStart(2, '0') : (time.getHours() % 12 || 12).toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const meridiem = time.getHours() >= 12 ? 'PM' : 'AM'

  return (
    <section className="glass-card hero-clock-card">
      {clockType === 'analog' ? (
        <div className="analog-hero-wrapper">
          <AnalogClock time={time} />
          <div className="analog-time-digital-sub">
            <span>
              {hours}:{minutes} <small>{seconds}</small> {!is24Hour && meridiem}
            </span>
          </div>
        </div>
      ) : (
        <div className="clock-time-wrapper">
          <span className="pixel-big-digits">{hours}:{minutes}</span>
          <div className="clock-sub-digits">
            <span className="clock-sec-badge">{seconds}</span>
            {!is24Hour && <span className="clock-ampm-badge">{meridiem}</span>}
          </div>
        </div>
      )}

      <div className="clock-footer-row">
        <button className="location-tag-btn" onClick={() => setShowSearch(!showSearch)} title="Search city">
          <MapPin size={13} /> <span>{weatherCity}</span> <Search size={10} className="search-icon-hint" />
        </button>

        {clockType === 'digital' && (
          <button className="glass-pill-btn sm" onClick={() => setIs24Hour(!is24Hour)}>
            {is24Hour ? '24-HOUR' : '12-HOUR'}
          </button>
        )}
      </div>

      {showSearch && (
        <form className="city-search-box" onSubmit={handleCitySearch}>
          <input
            type="text"
            className="city-input"
            placeholder="Type city (e.g. Colombo, Paris)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className="glass-pill-btn sm accent">
            <Check size={12} />
          </button>
          <button type="button" className="glass-pill-btn sm" onClick={() => setShowSearch(false)}>
            <X size={12} />
          </button>
        </form>
      )}
      {searchError && <div className="search-err-msg">{searchError}</div>}
    </section>
  )
})

// Isolated At-A-Glance Date Display Header
const AtAGlanceHeader = memo(function AtAGlanceHeader({
  temp,
  code,
  displayTemp,
  tempUnit,
  setTempUnit,
  detectLocationAndWeather,
  weatherLoading,
  showSettings,
  setShowSettings,
  handlePointerDown,
  handlePointerMove,
  handlePointerEnd,
}: {
  temp: number
  code: number
  displayTemp: (c: number) => string
  tempUnit: 'C' | 'F'
  setTempUnit: (u: 'C' | 'F') => void
  detectLocationAndWeather: () => void
  weatherLoading: boolean
  showSettings: boolean
  setShowSettings: (val: boolean) => void
  handlePointerDown: (e: React.PointerEvent<HTMLElement>) => void
  handlePointerMove: (e: React.PointerEvent<HTMLElement>) => void
  handlePointerEnd: (e: React.PointerEvent<HTMLElement>) => void
}) {
  const dateStr = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    []
  )
  const weatherInfo = getWeatherInfo(code)
  const WeatherIcon = weatherInfo.Icon

  return (
    <header
      className="widget-header-bar drag-region"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="pixel-at-a-glance">
        <span className="at-date">{dateStr}</span>
        <span className="at-sep">•</span>
        <span className="at-weather">
          <WeatherIcon size={14} style={{ color: weatherInfo.color }} /> {displayTemp(temp)}
        </span>
      </div>

      <div className="drag-handle-pill">
        <GripHorizontal size={14} />
      </div>

      <div className="header-quick-toggles">
        <button className="glass-pill-btn" onClick={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')} title="Toggle Temperature Unit">
          °{tempUnit}
        </button>
        <button className="glass-pill-btn" onClick={detectLocationAndWeather} disabled={weatherLoading} title="Refresh Location & Weather">
          <RefreshCw size={12} className={weatherLoading ? 'spin' : ''} />
        </button>
        <button
          className={`glass-pill-btn ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title="Settings & Appearance"
        >
          <Settings size={12} />
        </button>
      </div>
    </header>
  )
})

// Isolated Weather Card
const WeatherHeroCard = memo(function WeatherHeroCard({
  weather,
  displayTemp,
}: {
  weather: WeatherData
  displayTemp: (c: number) => string
}) {
  const weatherInfo = getWeatherInfo(weather.code)
  const WeatherIcon = weatherInfo.Icon

  return (
    <section className="glass-card weather-hero-card">
      <div className="weather-header-row">
        <div className="weather-condition-lockup">
          <WeatherIcon size={32} style={{ color: weatherInfo.color }} />
          <div>
            <span className="weather-temp-hero">{displayTemp(weather.temp)}</span>
            <span className="weather-desc">{weatherInfo.label}</span>
          </div>
        </div>

        <div className="weather-hl">
          <span>H {displayTemp(weather.high)}</span>
          <span>L {displayTemp(weather.low)}</span>
        </div>
      </div>

      <div className="weather-details-grid">
        <div className="weather-detail-item">
          <Droplets size={13} />
          <span>Humidity</span>
          <strong>{weather.humidity}%</strong>
        </div>
        <div className="weather-detail-item">
          <Wind size={13} />
          <span>Wind</span>
          <strong>{weather.wind} km/h</strong>
        </div>
        <div className="weather-detail-item">
          <Thermometer size={13} />
          <span>Unit</span>
          <strong>Celsius (°C)</strong>
        </div>
      </div>
    </section>
  )
})

// Isolated Media Player Card
const MediaPlayerCard = memo(function MediaPlayerCard({
  mediaInfo,
  tracksList,
  activeTrackIndex,
  handleCycleTrack,
  handleMediaControl,
}: {
  mediaInfo: MediaTrack
  tracksList: MediaTrack[]
  activeTrackIndex: number
  handleCycleTrack: () => void
  handleMediaControl: (action: 'playpause' | 'next' | 'prev') => void
}) {
  const [progress, setProgress] = useState(45)
  const [isMuted, setIsMuted] = useState(false)

  // Media Seekbar Simulation (scoped to media player only)
  useEffect(() => {
    let interval: number | undefined
    if (mediaInfo.isPlaying) {
      interval = window.setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 1))
      }, 1000)
    }
    return () => window.clearInterval(interval)
  }, [mediaInfo.isPlaying])

  return (
    <section className="glass-card media-player-card">
      <div className="media-top-info">
        <div className={`media-art-container ${mediaInfo.isPlaying ? 'pulse-art' : ''}`}>
          <Music size={18} className="media-art-icon" />
        </div>

        <div className="media-meta-text">
          <span className="media-title">{mediaInfo.title}</span>
          <div className="media-artist-row">
            <span className="media-artist">{mediaInfo.artist}</span>
            {tracksList.length > 1 && (
              <span className="media-track-badge">
                {activeTrackIndex + 1}/{tracksList.length}
              </span>
            )}
          </div>
        </div>

        {tracksList.length > 1 && (
          <button className="media-cycle-arrow-btn" onClick={handleCycleTrack} title="Switch to next active media player">
            <ChevronRight size={16} />
          </button>
        )}

        <button className="media-icon-btn" onClick={() => setIsMuted(!isMuted)}>
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>

      <div className="media-progress-bar">
        <div className="media-progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="media-controls-row">
        <button className="media-ctrl-btn" onClick={() => handleMediaControl('prev')} title="Previous Track">
          <SkipBack size={16} />
        </button>

        <button className="media-play-btn" onClick={() => handleMediaControl('playpause')} title="Play / Pause">
          {mediaInfo.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="play-icon-offset" />}
        </button>

        <button className="media-ctrl-btn" onClick={() => handleMediaControl('next')} title="Next Track">
          <SkipForward size={16} />
        </button>
      </div>
    </section>
  )
})

// Main App Container
function App() {
  const loadSavedPrefs = () => {
    try {
      const saved = localStorage.getItem('daylight_widget_prefs_v2')
      if (saved) return JSON.parse(saved)
    } catch {
      /* ignore */
    }
    return null
  }

  const savedPrefs = loadSavedPrefs()

  const [is24Hour, setIs24Hour] = useState<boolean>(savedPrefs?.is24Hour ?? false)
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>(savedPrefs?.tempUnit ?? 'C')
  const [clockType, setClockType] = useState<ClockType>(savedPrefs?.clockType ?? 'digital')
  const [clockTheme, setClockTheme] = useState<ThemePreset>(savedPrefs?.clockTheme ?? 'light_frosted')
  const [customColor1, setCustomColor1] = useState<string>(savedPrefs?.customColor1 ?? '#ffffff')
  const [customColor2, setCustomColor2] = useState<string>(savedPrefs?.customColor2 ?? '#dbeaff')
  const [customOpacity, setCustomOpacity] = useState<number>(savedPrefs?.customOpacity ?? 0.78)
  const [textColor, setTextColor] = useState<string>(savedPrefs?.textColor ?? '#1c1b1f')

  const [autoStart, setAutoStart] = useState(false)

  useEffect(() => {
    if (window.widgetAPI?.getAutoStart) {
      window.widgetAPI.getAutoStart().then((enabled) => setAutoStart(Boolean(enabled)))
    }
  }, [])

  const handleToggleAutoStart = async () => {
    if (window.widgetAPI?.setAutoStart) {
      const nextState = !autoStart
      const updated = await window.widgetAPI.setAutoStart(nextState)
      setAutoStart(Boolean(updated))
    }
  }

  // UI Modals
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchError, setSearchError] = useState('')

  // Weather State
  const [weather, setWeather] = useState<WeatherData>({
    temp: 28,
    high: 31,
    low: 24,
    humidity: 78,
    wind: 14,
    code: 1,
    city: 'Colombo, LK',
    isDay: true,
  })
  const [weatherLoading, setWeatherLoading] = useState(false)

  // Live Media State
  const [tracksList, setTracksList] = useState<MediaTrack[]>([])
  const [activeTrackIndex, setActiveTrackIndex] = useState(0)
  const [mediaInfo, setMediaInfo] = useState<MediaTrack>({
    title: 'No media playing',
    artist: 'Spotify / Media Player',
    isPlaying: false,
    app: '',
  })

  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number } | null>(null)
  const syncChannelRef = useRef<BroadcastChannel | null>(null)
  const isSyncingRef = useRef(false)

  const applyPrefs = useCallback((data: any) => {
    if (!data) return
    isSyncingRef.current = true
    if (typeof data.is24Hour === 'boolean') setIs24Hour(data.is24Hour)
    if (data.tempUnit === 'C' || data.tempUnit === 'F') setTempUnit(data.tempUnit)
    if (data.clockType) setClockType(data.clockType)
    if (data.clockTheme) setClockTheme(data.clockTheme)
    if (data.customColor1) setCustomColor1(data.customColor1)
    if (data.customColor2) setCustomColor2(data.customColor2)
    if (typeof data.customOpacity === 'number') setCustomOpacity(data.customOpacity)
    if (data.textColor) setTextColor(data.textColor)
    setTimeout(() => {
      isSyncingRef.current = false
    }, 50)
  }, [])

  useEffect(() => {
    try {
      syncChannelRef.current = new BroadcastChannel('daylight_widget_prefs_sync')
      syncChannelRef.current.onmessage = (e) => {
        if (e.data && e.data.type === 'PREFS_SYNC') {
          applyPrefs(e.data.payload)
        }
      }
    } catch {
      /* ignore */
    }

    let unsubSettingsSync: (() => void) | undefined
    if (window.widgetAPI?.onSettingsSync) {
      unsubSettingsSync = window.widgetAPI.onSettingsSync((data) => {
        applyPrefs(data)
      })
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'daylight_widget_prefs_v2' && e.newValue) {
        try {
          applyPrefs(JSON.parse(e.newValue))
        } catch {
          /* ignore */
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      if (syncChannelRef.current) syncChannelRef.current.close()
      if (unsubSettingsSync) unsubSettingsSync()
    }
  }, [applyPrefs])

  useEffect(() => {
    const prefs = {
      is24Hour,
      tempUnit,
      clockType,
      clockTheme,
      customColor1,
      customColor2,
      customOpacity,
      textColor,
    }
    localStorage.setItem('daylight_widget_prefs_v2', JSON.stringify(prefs))

    if (!isSyncingRef.current) {
      try {
        syncChannelRef.current?.postMessage({ type: 'PREFS_SYNC', payload: prefs })
      } catch {
        /* ignore */
      }
      window.widgetAPI?.syncSettings(prefs)
    }
  }, [is24Hour, tempUnit, clockType, clockTheme, customColor1, customColor2, customOpacity, textColor])

  // Single mount IPC Media Listener with clean cleanup
  useEffect(() => {
    let unsubMedia: (() => void) | undefined
    if (window.widgetAPI?.onLiveMediaUpdate) {
      unsubMedia = window.widgetAPI.onLiveMediaUpdate((raw: any) => {
        let items: any[] = []
        if (Array.isArray(raw)) {
          items = raw
        } else if (raw && typeof raw === 'object' && raw.title) {
          items = [raw]
        }

        const validTracks: MediaTrack[] = items
          .filter((t) => t && t.title && t.title.trim())
          .map((t) => ({
            title: t.title.trim(),
            artist: t.artist && t.artist.trim() ? t.artist.trim() : 'Media Player',
            app: t.app || '',
            isPlaying: t.status === 'Playing' || t.status === '1',
          }))

        setTracksList(validTracks)
      })
    }
    return () => {
      if (unsubMedia) unsubMedia()
    }
  }, [])

  // Sync active track index to display item
  useEffect(() => {
    if (tracksList.length > 0) {
      const idx = activeTrackIndex % tracksList.length
      setMediaInfo(tracksList[idx])
    } else {
      setMediaInfo({
        title: 'No media playing',
        artist: 'Spotify / Media Player',
        isPlaying: false,
        app: '',
      })
    }
  }, [tracksList, activeTrackIndex])

  const handleCycleTrack = useCallback(() => {
    if (tracksList.length > 1) {
      const nextIdx = (activeTrackIndex + 1) % tracksList.length
      setActiveTrackIndex(nextIdx)
      setMediaInfo(tracksList[nextIdx])
    }
  }, [tracksList, activeTrackIndex])

  // Fetch Weather by Lat / Lon with AbortController timeout
  const fetchWeatherForCoords = useCallback(async (lat: number, lon: number, cityName: string) => {
    setWeatherLoading(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
        { signal: controller.signal }
      )
      if (res.ok) {
        const data = await res.json()
        const current = data.current
        const daily = data.daily

        setWeather({
          temp: Math.round(current.temperature_2m),
          high: Math.round(daily.temperature_2m_max[0]),
          low: Math.round(daily.temperature_2m_min[0]),
          humidity: Math.round(current.relative_humidity_2m),
          wind: Math.round(current.wind_speed_10m),
          code: current.weather_code,
          city: cityName,
          isDay: current.is_day === 1,
        })
      }
    } catch (err) {
      console.error('Weather fetch error:', err)
    } finally {
      clearTimeout(timeoutId)
      setWeatherLoading(false)
    }
  }, [])

  // Automatic Location Detection
  const detectLocationAndWeather = useCallback(async () => {
    setWeatherLoading(true)
    try {
      const controller1 = new AbortController()
      const timer1 = setTimeout(() => controller1.abort(), 4000)
      const ipRes = await fetch('https://ipwho.is/', { signal: controller1.signal })
      clearTimeout(timer1)

      if (ipRes.ok) {
        const ipData = await ipRes.json()
        if (ipData.success && ipData.latitude && ipData.longitude) {
          const locName = `${ipData.city || ipData.region}, ${ipData.country_code || 'LK'}`
          await fetchWeatherForCoords(ipData.latitude, ipData.longitude, locName)
          return
        }
      }

      const controller2 = new AbortController()
      const timer2 = setTimeout(() => controller2.abort(), 4000)
      const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller2.signal })
      clearTimeout(timer2)

      if (geoRes.ok) {
        const geoData = await geoRes.json()
        if (geoData.latitude && geoData.longitude) {
          const locName = `${geoData.city || 'Local'}, ${geoData.country_code || 'LK'}`
          await fetchWeatherForCoords(parseFloat(geoData.latitude), parseFloat(geoData.longitude), locName)
          return
        }
      }

      await fetchWeatherForCoords(6.9271, 79.8612, 'Colombo, Sri Lanka')
    } catch {
      await fetchWeatherForCoords(6.9271, 79.8612, 'Colombo, Sri Lanka')
    }
  }, [fetchWeatherForCoords])

  useEffect(() => {
    detectLocationAndWeather()
    const interval = window.setInterval(detectLocationAndWeather, 10 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [detectLocationAndWeather])

  // City Search Handler
  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setWeatherLoading(true)
    setSearchError('')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery.trim())}&count=1&language=en&format=json`,
        { signal: controller.signal }
      )
      if (geoRes.ok) {
        const geoData = await geoRes.json()
        if (geoData.results && geoData.results.length > 0) {
          const loc = geoData.results[0]
          await fetchWeatherForCoords(loc.latitude, loc.longitude, `${loc.name}, ${loc.country_code ? loc.country_code.toUpperCase() : ''}`)
          setShowSearch(false)
          setSearchQuery('')
        } else {
          setSearchError('City not found!')
        }
      }
    } catch {
      setSearchError('Failed to search city.')
    } finally {
      clearTimeout(timer)
      setWeatherLoading(false)
    }
  }

  // System Media Controls IPC
  const handleMediaControl = useCallback((action: 'playpause' | 'next' | 'prev') => {
    setMediaInfo((prev) => ({ ...prev, isPlaying: action === 'playpause' ? !prev.isPlaying : prev.isPlaying }))
    window.widgetAPI?.sendMediaControl(action)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button, input')) return
    dragRef.current = { active: true, lastX: e.screenX, lastY: e.screenY }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || !drag.active) return
    const dx = e.screenX - drag.lastX
    const dy = e.screenY - drag.lastY
    if (dx === 0 && dy === 0) return
    drag.lastX = e.screenX
    drag.lastY = e.screenY
    window.widgetAPI?.moveWindowBy(dx, dy)
  }, [])

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLElement>) => {
    dragRef.current = null
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  const displayTemp = useCallback(
    (c: number) => (tempUnit === 'C' ? `${c}°C` : `${Math.round((c * 9) / 5 + 32)}°F`),
    [tempUnit]
  )

  // Memoized Theme Styles calculation
  const widgetThemeStyles = useMemo<React.CSSProperties>(() => {
    if (clockTheme === 'dark_obsidian') {
      return {
        '--glass-bg': 'linear-gradient(135deg, rgba(26, 28, 44, 0.88), rgba(14, 16, 28, 0.82))',
        '--card-bg': 'rgba(255, 255, 255, 0.08)',
        '--card-hover-bg': 'rgba(255, 255, 255, 0.14)',
        '--glass-border': '1px solid rgba(255, 255, 255, 0.18)',
        '--text-main': '#ffffff',
        '--text-muted': 'rgba(255, 255, 255, 0.7)',
        '--accent-cyan': '#70a1ff',
      } as React.CSSProperties
    }
    if (clockTheme === 'pixel_sunset') {
      return {
        '--glass-bg': 'linear-gradient(135deg, rgba(255, 210, 195, 0.88), rgba(255, 170, 190, 0.80))',
        '--card-bg': 'rgba(255, 255, 255, 0.52)',
        '--card-hover-bg': 'rgba(255, 255, 255, 0.72)',
        '--glass-border': '1px solid rgba(255, 255, 255, 0.9)',
        '--text-main': '#3d1624',
        '--text-muted': '#6b3648',
        '--accent-cyan': '#d53f8c',
      } as React.CSSProperties
    }
    if (clockTheme === 'emerald_mint') {
      return {
        '--glass-bg': 'linear-gradient(135deg, rgba(195, 245, 225, 0.88), rgba(165, 230, 210, 0.80))',
        '--card-bg': 'rgba(255, 255, 255, 0.52)',
        '--card-hover-bg': 'rgba(255, 255, 255, 0.72)',
        '--glass-border': '1px solid rgba(255, 255, 255, 0.9)',
        '--text-main': '#0f3a2e',
        '--text-muted': '#2c6353',
        '--accent-cyan': '#2f855a',
      } as React.CSSProperties
    }
    if (clockTheme === 'cyber_violet') {
      return {
        '--glass-bg': 'linear-gradient(135deg, rgba(230, 215, 255, 0.88), rgba(195, 200, 255, 0.80))',
        '--card-bg': 'rgba(255, 255, 255, 0.52)',
        '--card-hover-bg': 'rgba(255, 255, 255, 0.72)',
        '--glass-border': '1px solid rgba(255, 255, 255, 0.9)',
        '--text-main': '#1e1b4b',
        '--text-muted': '#4338ca',
        '--accent-cyan': '#6366f1',
      } as React.CSSProperties
    }
    if (clockTheme === 'custom') {
      const isLightText = textColor === '#ffffff'
      return {
        '--glass-bg': `linear-gradient(135deg, ${hexToRgba(customColor1, customOpacity)}, ${hexToRgba(customColor2, customOpacity)})`,
        '--card-bg': isLightText ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.52)',
        '--card-hover-bg': isLightText ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.72)',
        '--glass-border': isLightText ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(255, 255, 255, 0.85)',
        '--text-main': textColor,
        '--text-muted': isLightText ? 'rgba(255, 255, 255, 0.75)' : 'rgba(50, 50, 50, 0.75)',
        '--accent-cyan': isLightText ? '#60a5fa' : '#2563eb',
      } as React.CSSProperties
    }

    return {
      '--glass-bg': 'linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(236, 242, 255, 0.68))',
      '--card-bg': 'rgba(255, 255, 255, 0.55)',
      '--card-hover-bg': 'rgba(255, 255, 255, 0.75)',
      '--glass-border': '1px solid rgba(255, 255, 255, 0.85)',
      '--text-main': '#1c1b1f',
      '--text-muted': '#49454f',
      '--accent-cyan': '#2b6cb0',
    } as React.CSSProperties
  }, [clockTheme, customColor1, customColor2, customOpacity, textColor])

  const resetSettings = () => {
    setIs24Hour(false)
    setTempUnit('C')
    setClockType('digital')
    setClockTheme('light_frosted')
    setCustomColor1('#ffffff')
    setCustomColor2('#dbeaff')
    setCustomOpacity(0.78)
    setTextColor('#1c1b1f')
    localStorage.removeItem('daylight_widget_prefs_v2')
  }

  return (
    <main className="pixel-glass-stage">
      <div className="pixel-glass-widget" style={widgetThemeStyles}>
        {/* At-a-Glance Header Ribbon */}
        <AtAGlanceHeader
          temp={weather.temp}
          code={weather.code}
          displayTemp={displayTemp}
          tempUnit={tempUnit}
          setTempUnit={setTempUnit}
          detectLocationAndWeather={detectLocationAndWeather}
          weatherLoading={weatherLoading}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerEnd={handlePointerEnd}
        />

        {/* Settings & Customization Drawer Modal */}
        {showSettings && (
          <section className="glass-card settings-drawer-card">
            <div className="drawer-header">
              <div className="drawer-title">
                <Palette size={15} /> <span>Settings & Theme</span>
              </div>
              <button className="glass-pill-btn sm" onClick={() => setShowSettings(false)}>
                <X size={12} />
              </button>
            </div>

            {/* Clock Style Control */}
            <div className="settings-group">
              <label className="settings-label">
                <Clock size={13} /> Clock Style
              </label>
              <div className="segmented-control">
                <button
                  className={`segmented-btn ${clockType === 'digital' ? 'active' : ''}`}
                  onClick={() => setClockType('digital')}
                >
                  Digital Clock
                </button>
                <button
                  className={`segmented-btn ${clockType === 'analog' ? 'active' : ''}`}
                  onClick={() => setClockType('analog')}
                >
                  Modern Analog
                </button>
              </div>
            </div>

            {/* Theme Presets */}
            <div className="settings-group">
              <label className="settings-label">
                <Palette size={13} /> Color & Glass Preset
              </label>
              <div className="theme-presets-grid">
                <button
                  className={`preset-chip ${clockTheme === 'light_frosted' ? 'active' : ''}`}
                  onClick={() => setClockTheme('light_frosted')}
                >
                  <span className="chip-swatch light-swatch"></span> Light Frosted
                </button>
                <button
                  className={`preset-chip ${clockTheme === 'dark_obsidian' ? 'active' : ''}`}
                  onClick={() => setClockTheme('dark_obsidian')}
                >
                  <span className="chip-swatch dark-swatch"></span> Obsidian
                </button>
                <button
                  className={`preset-chip ${clockTheme === 'pixel_sunset' ? 'active' : ''}`}
                  onClick={() => setClockTheme('pixel_sunset')}
                >
                  <span className="chip-swatch sunset-swatch"></span> Sunset
                </button>
                <button
                  className={`preset-chip ${clockTheme === 'emerald_mint' ? 'active' : ''}`}
                  onClick={() => setClockTheme('emerald_mint')}
                >
                  <span className="chip-swatch mint-swatch"></span> Mint
                </button>
                <button
                  className={`preset-chip ${clockTheme === 'cyber_violet' ? 'active' : ''}`}
                  onClick={() => setClockTheme('cyber_violet')}
                >
                  <span className="chip-swatch violet-swatch"></span> Violet
                </button>
                <button
                  className={`preset-chip ${clockTheme === 'custom' ? 'active' : ''}`}
                  onClick={() => setClockTheme('custom')}
                >
                  <span className="chip-swatch custom-swatch"></span> Custom
                </button>
              </div>
            </div>

            {/* Custom Color Controls */}
            {clockTheme === 'custom' && (
              <div className="settings-group custom-color-controls">
                <div className="color-picker-row">
                  <div className="color-picker-item">
                    <span>Gradient 1</span>
                    <input type="color" value={customColor1} onChange={(e) => setCustomColor1(e.target.value)} />
                  </div>
                  <div className="color-picker-item">
                    <span>Gradient 2</span>
                    <input type="color" value={customColor2} onChange={(e) => setCustomColor2(e.target.value)} />
                  </div>
                  <div className="color-picker-item">
                    <span>Text Color</span>
                    <select value={textColor} onChange={(e) => setTextColor(e.target.value)} className="select-pill">
                      <option value="#1c1b1f">Dark Text</option>
                      <option value="#ffffff">Light Text</option>
                    </select>
                  </div>
                </div>

                <div className="slider-row">
                  <span>Glass Opacity ({Math.round(customOpacity * 100)}%)</span>
                  <input
                    type="range"
                    min="0.3"
                    max="0.95"
                    step="0.05"
                    value={customOpacity}
                    onChange={(e) => setCustomOpacity(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}

            {/* Windows Startup Option */}
            <div className="settings-group">
              <label className="settings-label">
                <Power size={13} /> Windows Startup
              </label>
              <button
                type="button"
                className={`glass-pill-btn full-width ${autoStart ? 'active-accent' : ''}`}
                onClick={handleToggleAutoStart}
                title="Automatically launch DaylightWidget when Windows starts"
              >
                <Power size={12} /> {autoStart ? 'Run at Windows Startup: ENABLED' : 'Run at Windows Startup: DISABLED'}
              </button>
            </div>

            <div className="drawer-footer-actions">
              <button className="glass-pill-btn sm danger" onClick={resetSettings}>
                <RotateCcw size={11} /> Reset Defaults
              </button>
            </div>
          </section>
        )}

        {/* Hero Clock Card */}
        <HeroClockCard
          clockType={clockType}
          is24Hour={is24Hour}
          setIs24Hour={setIs24Hour}
          weatherCity={weather.city}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchError={searchError}
          handleCitySearch={handleCitySearch}
        />

        {/* Live Weather Card */}
        <WeatherHeroCard weather={weather} displayTemp={displayTemp} />

        {/* Real-time Spotify / System Media Player */}
        <MediaPlayerCard
          mediaInfo={mediaInfo}
          tracksList={tracksList}
          activeTrackIndex={activeTrackIndex}
          handleCycleTrack={handleCycleTrack}
          handleMediaControl={handleMediaControl}
        />

        {/* Footer */}
        <footer className="pixel-glass-footer">
          <span>Pixel Glass Widget</span>
          <span>Right-Click Menu</span>
        </footer>
      </div>
    </main>
  )
}

export default App
