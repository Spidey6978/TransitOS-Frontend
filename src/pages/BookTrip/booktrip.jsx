import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/lib/utils'
import api from '../../service/api'
import QRGenerator from '../../components/QRGenerator'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin, ArrowRight, Clock, GitMerge,
  ChevronLeft, Train, Bus, Zap, Anchor,
  AlertCircle, RefreshCw
} from 'lucide-react'

const MODES = [
  "Local Train (Western)",
  "Local Train (Central)",
  "Metro Line 1",
  "BEST Bus (AC)",
  "Monorail",
  "Ferry / Water Taxi",
  "Uber/Auto",
]

const MODE_FILTERS = [
  { label: 'All Modes', value: 'all' },
  { label: 'Metro',     value: 'metro' },
  { label: 'Bus',       value: 'bus' },
  { label: 'Rail',      value: 'rail' },
  { label: 'Ferry',     value: 'ferry' },
]

const POPULAR = ['Ghatkopar', 'Andheri', 'Bandra', 'Churchgate', 'Dadar']

function getModeIcon(mode) {
  if (!mode) return <Train className="w-3.5 h-3.5" />
  const m = mode.toLowerCase()
  if (m.includes('metro') || m.includes('monorail')) return <Zap className="w-3.5 h-3.5" />
  if (m.includes('bus') || m.includes('uber'))       return <Bus className="w-3.5 h-3.5" />
  if (m.includes('ferry'))                           return <Anchor className="w-3.5 h-3.5" />
  return <Train className="w-3.5 h-3.5" />
}

function getFilteredModes(filter) {
  if (filter === 'metro') return MODES.filter(m => m.toLowerCase().includes('metro') || m.toLowerCase().includes('monorail'))
  if (filter === 'bus')   return MODES.filter(m => m.toLowerCase().includes('bus')   || m.toLowerCase().includes('uber'))
  if (filter === 'rail')  return MODES.filter(m => m.toLowerCase().includes('train'))
  if (filter === 'ferry') return MODES.filter(m => m.toLowerCase().includes('ferry'))
  return MODES
}

function buildRoutes(modeFilter) {
  const available = getFilteredModes(modeFilter)
  if (available.length === 0) return []
  return available.slice(0, 3).map((mode, i) => ({
    id: i,
    mode,
    duration: 25 + Math.floor(Math.random() * 55),
    transfers: Math.floor(Math.random() * 3),
    fare: parseFloat((15 + Math.random() * 75).toFixed(2)),
  }))
}

function saveTicketLocally(ticket) {
  const existing = JSON.parse(localStorage.getItem('transitos_tickets') || '[]')
  localStorage.setItem('transitos_tickets', JSON.stringify([ticket, ...existing]))
}

function queueOfflineTicket(ticket) {
  const queue = JSON.parse(localStorage.getItem('transitos_offline_queue') || '[]')
  queue.push({
    commuter_name: ticket.commuter_name,
    from_station:  ticket.from_station,
    to_station:    ticket.to_station,
    mode:          ticket.mode,
    ticket_id:     ticket.ticket_id,
  })
  localStorage.setItem('transitos_offline_queue', JSON.stringify(queue))
}

export default function BookTrip() {
  const [step,          setStep]          = useState(0)
  const [stations,      setStations]      = useState([])
  const [stationsError, setStationsError] = useState(false)
  const [from,          setFrom]          = useState('')
  const [to,            setTo]            = useState('')
  const [name,          setName]          = useState('Mumbai Commuter')
  const [modeFilter,    setModeFilter]    = useState('all')
  const [routes,        setRoutes]        = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [ticket,        setTicket]        = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')

  useEffect(() => {
    api.get('/stations')
      .then(res => setStations(Array.isArray(res.data) ? res.data : []))
      .catch(() => {
        setStationsError(true)
        setStations([])
      })
  }, [])

  function handlePlanJourney() {
    if (!from || !to) {
      setError('Please select both origin and destination.')
      return
    }
    if (from === to) {
      setError('Origin and destination cannot be the same.')
      return
    }
    const built = buildRoutes(modeFilter)
    if (built.length === 0) {
      setError('No routes for selected mode. Try All Modes.')
      return
    }
    setError('')
    setRoutes(built)
    setStep(1)
  }

  function handleSelectRoute(route) {
    setSelectedRoute(route)
    setStep(2)
  }

  function handleConfirm() {
    setLoading(true)
    setError('')
    const ticket_id   = uuidv4()
    const now         = new Date()
    const valid_until = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    const newTicket   = {
      ticket_id,
      commuter_name: name,
      from_station:  from,
      to_station:    to,
      mode:          selectedRoute.mode,
      fare:          selectedRoute.fare,
      duration:      selectedRoute.duration,
      timestamp:     now.getTime(),
      issued_at:     now.toISOString(),
      valid_until:   valid_until.toISOString(),
    }
    saveTicketLocally(newTicket)
    queueOfflineTicket(newTicket)
    setTicket(newTicket)
    setLoading(false)
    setStep(3)
  }

  function handleReset() {
    setStep(0)
    setFrom('')
    setTo('')
    setModeFilter('all')
    setRoutes([])
    setSelectedRoute(null)
    setTicket(null)
    setError('')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-8">

      {/* Leaflet map — fullscreen background */}
      <div className="absolute inset-0 z-0 opacity-100">
        <MapContainer
          center={[19.0760, 72.8777]}
          zoom={11}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 z-[1] bg-slate-900/0 pointer-events-none" />

      {/* Content */}
      <div className="relative z-[2] w-full max-w-2xl">

        {/* ── STEP 0: Plan Journey ── */}
        {step === 0 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <h1 className="text-3xl font-bold text-white mb-1">Plan Your Journey</h1>
            <p className="text-slate-400 text-sm mb-7">Search for routes across metro, bus, and rail</p>

            {stationsError && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-xl px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Backend offline — stations unavailable. Start the FastAPI server.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Name */}
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase mb-1.5 block">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-800/80 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
                placeholder="Enter your name"
              />
            </div>

            {/* FROM */}
            <div className="mb-4">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase mb-1.5 block">From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="w-full bg-slate-800/80 border border-white/10 text-white rounded-xl pl-9 pr-4 py-3 text-sm appearance-none focus:outline-none focus:border-cyan-500/50 transition-colors"
                >
                  <option value="">Select origin</option>
                  {stations.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* TO */}
            <div className="mb-6">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase mb-1.5 block">To</label>
              <div className="relative">
                <ArrowRight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="w-full bg-slate-800/80 border border-white/10 text-white rounded-xl pl-9 pr-4 py-3 text-sm appearance-none focus:outline-none focus:border-cyan-500/50 transition-colors"
                >
                  <option value="">Select destination</option>
                  {stations.filter(s => s !== from).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Mode filter */}
            <div className="mb-6">
              <label className="text-[10px] text-slate-500 tracking-widest uppercase mb-2 block">Transit Mode</label>
              <div className="flex flex-wrap gap-2">
                {MODE_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setModeFilter(f.value)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150",
                      modeFilter === f.value
                        ? "bg-cyan-500 text-white border-cyan-500"
                        : "bg-transparent text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handlePlanJourney}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <MapPin className="w-4 h-4" />
              Plan Journey
            </button>

            {/* Popular */}
            <div className="mt-6">
              <p className="text-[10px] text-slate-600 tracking-widest uppercase mb-2">Popular Destinations</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map(p => (
                  <button
                    key={p}
                    onClick={() => setTo(p)}
                    className="px-3 py-1 text-xs text-slate-400 border border-white/10 rounded-lg hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Route Options ── */}
        {step === 1 && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-bold text-white mb-1">Route Options</h2>
            <p className="text-slate-400 text-sm mb-6">{from} → {to}</p>
            <div className="space-y-4">
              {routes.map(route => (
                <div
                  key={route.id}
                  className="bg-slate-800/60 border border-white/10 rounded-xl p-5 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 text-xs px-2.5 py-1 rounded-lg border border-cyan-500/20">
                      {getModeIcon(route.mode)}
                      {route.mode}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-slate-400 mb-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {route.duration} min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <GitMerge className="w-3.5 h-3.5" />
                      {route.transfers} transfer{route.transfers !== 1 ? 's' : ''}
                    </span>
                    <span className="text-cyan-400 font-semibold">₹{route.fare}</span>
                  </div>
                  <button
                    onClick={() => handleSelectRoute(route)}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Book Route
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Confirm Journey ── */}
        {step === 2 && selectedRoute && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-bold text-white mb-1">Confirm Your Journey</h2>
            <p className="text-slate-400 text-sm mb-6">Review your trip details before booking</p>

            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Journey details */}
            <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5 mb-4">
              <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-4">Journey Details</p>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Origin</p>
                  <p className="text-white font-semibold">{from}</p>
                </div>
              </div>
              <div className="ml-1 border-l border-white/10 pl-4 py-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {getModeIcon(selectedRoute.mode)}
                  {selectedRoute.mode} · {selectedRoute.duration} min
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Destination</p>
                  <p className="text-white font-semibold">{to}</p>
                </div>
              </div>
            </div>

            {/* Fare breakdown */}
            <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5 mb-6">
              <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-4">Fare Breakdown</p>
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Base fare</span>
                <span>₹{(selectedRoute.fare * 0.4).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400 mb-3">
                <span>Distance charge</span>
                <span>₹{(selectedRoute.fare * 0.6).toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between font-semibold">
                <span className="text-white">Total Fare</span>
                <span className="text-cyan-400">₹{selectedRoute.fare}</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                "w-full font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2",
                loading
                  ? "bg-cyan-500/40 text-white/60 cursor-not-allowed"
                  : "bg-cyan-500 hover:bg-cyan-400 text-white"
              )}
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating ticket...</>
                : 'Confirm & Book'
              }
            </button>

            <p className="text-[10px] text-slate-600 text-center mt-3 tracking-wide">
              Ticket generated locally · Syncs to blockchain when online
            </p>
          </div>
        )}

        {/* ── STEP 3: QR Ticket ── */}
        {step === 3 && ticket && (
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <QRGenerator
              ticket={ticket}
              onBookAnother={handleReset}
            />
          </div>
        )}

      </div>
    </div>
  )
}