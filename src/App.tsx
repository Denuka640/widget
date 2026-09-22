import { useEffect, useState } from 'react'
import { CloudSun, GripVertical, Headphones, MapPin, Music2, Pause, Play, Settings2, SkipBack, SkipForward, SunMedium, Volume2 } from 'lucide-react'
import './App.css'

function App() {
  const [time, setTime] = useState(new Date())
  const [mode, setMode] = useState<'digital' | 'analog'>('digital')
  const [isPlaying, setIsPlaying] = useState(false)
  const [is24Hour, setIs24Hour] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const hours = is24Hour ? time.getHours() : time.getHours() % 12 || 12
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const meridiem = time.getHours() >= 12 ? 'PM' : 'AM'

  return (
    <main className="desktop-stage">
      <section className="widget-shell" aria-label="Frosted glass desktop widget">
        <header className="widget-header"><div className="brand-lockup"><span className="brand-mark"><SunMedium size={16} /></span><span>Daylight</span></div><div className="header-actions"><button className="icon-button" aria-label="Move widget"><GripVertical size={18} /></button><button className="icon-button" aria-label="Widget settings"><Settings2 size={17} /></button></div></header>
        <section className="clock-section"><div className="section-label"><span>LOCAL TIME</span><span className="live-dot">LIVE</span></div>{mode === 'digital' ? <div className="digital-clock"><span>{hours}:{minutes}</span><small>{seconds} <b>{meridiem}</b></small></div> : <AnalogClock time={time} />}<div className="clock-meta"><MapPin size={14} /> Seattle, WA <span className="meta-divider">•</span> Monday, September 22</div><div className="mode-switch" role="group" aria-label="Clock style"><button className={mode === 'digital' ? 'selected' : ''} onClick={() => setMode('digital')}>Digital</button><button className={mode === 'analog' ? 'selected' : ''} onClick={() => setMode('analog')}>Analog</button></div></section>
        <div className="info-grid"><section className="info-card weather-card"><div className="card-heading"><span>WEATHER</span><CloudSun size={16} /></div><div className="weather-main"><div><strong>68°</strong><span>Partly cloudy</span></div><div className="weather-icon"><CloudSun size={42} strokeWidth={1.3} /></div></div><div className="weather-range"><span>H 72°</span><span>L 54°</span><span>Feels like 67°</span></div></section><section className="info-card music-card"><div className="card-heading"><span>NOW PLAYING</span><Headphones size={16} /></div><div className="track"><div className="album-art"><Music2 size={20} /></div><div className="track-copy"><strong>Dreams</strong><span>Fleetwood Mac</span></div><button className="volume-button" aria-label="Volume"><Volume2 size={16} /></button></div><div className="progress"><span></span></div><div className="player-controls"><button aria-label="Previous track"><SkipBack size={16} fill="currentColor" /></button><button className="play-button" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><button aria-label="Next track"><SkipForward size={16} fill="currentColor" /></button></div></section></div>
        <footer className="widget-footer"><span><span className="status-dot"></span> Updated just now</span><button onClick={() => setIs24Hour(!is24Hour)}>{is24Hour ? '24-hour time' : '12-hour time'}</button></footer>
      </section>
    </main>
  )
}

function AnalogClock({ time }: { time: Date }) {
  const hourAngle = (time.getHours() % 12) * 30 + time.getMinutes() * 0.5
  const minuteAngle = time.getMinutes() * 6
  const secondAngle = time.getSeconds() * 6
  return <div className="analog-clock"><span className="clock-number n12">12</span><span className="clock-number n3">3</span><span className="clock-number n6">6</span><span className="clock-number n9">9</span><span className="hand hour" style={{ transform: `rotate(${hourAngle}deg)` }} /><span className="hand minute" style={{ transform: `rotate(${minuteAngle}deg)` }} /><span className="hand second" style={{ transform: `rotate(${secondAngle}deg)` }} /><span className="clock-center" /></div>
}

export default App
