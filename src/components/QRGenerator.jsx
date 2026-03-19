import { QRCode } from 'react-qr-code'
import { CheckCircle2, MapPin, Clock, IndianRupee } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function QRGenerator({ ticket, onBookAnother }) {
  if (!ticket) return null

  const qrValue = JSON.stringify({
    ticket_id: ticket.ticket_id,
    commuter_name: ticket.commuter_name,
    from_station: ticket.from_station,
    to_station: ticket.to_station,
    mode: ticket.mode,
    timestamp: ticket.timestamp,
    issued_at: ticket.issued_at,
  })

  return (
    <div className="flex flex-col items-center w-full">

      {/* Success banner */}
      <div className="w-full flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-3 mb-6">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Booking confirmed! Your ticket is ready.
      </div>

      {/* Brand */}
      <h2 className="text-xl font-bold text-cyan-400 tracking-widest uppercase mb-1">
        TransitOS
      </h2>
      <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-3">
        Mumbai Unified Transit
      </p>

      {/* Active badge */}
      <span className={cn(
        "inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full mb-6",
        "bg-green-500/10 border border-green-500/30 text-green-400"
      )}>
        <CheckCircle2 className="w-3 h-3" />
        ACTIVE
      </span>

      {/* QR Code */}
      <div className="bg-white p-4 rounded-2xl mb-6 shadow-lg shadow-cyan-500/10">
        <QRCode
          value={qrValue}
          size={200}
          level="H"
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* Ticket info */}
      <div className="w-full bg-slate-800/60 border border-white/10 rounded-xl p-5 space-y-3 mb-4">
        {[
          {
            label: 'Ticket ID',
            value: ticket.ticket_id.split('-')[0].toUpperCase(),
          },
          {
            label: 'Route',
            value: `${ticket.from_station} → ${ticket.to_station}`,
            icon: <MapPin className="w-3 h-3" />,
          },
          {
            label: 'Mode',
            value: ticket.mode,
          },
          {
            label: 'Issued At',
            value: new Date(ticket.issued_at).toLocaleString('en-IN'),
            icon: <Clock className="w-3 h-3" />,
          },
          {
            label: 'Valid Until',
            value: new Date(ticket.valid_until).toLocaleString('en-IN'),
          },
        ].map(({ label, value, icon }) => (
          <div key={label} className="flex items-start justify-between gap-4 text-sm">
            <span className="text-[10px] text-slate-500 tracking-widest uppercase shrink-0 pt-0.5">
              {label}
            </span>
            <span className="text-white font-medium text-right flex items-center gap-1">
              {icon}
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Stored locally notice */}
      <div className="w-full bg-slate-800/40 border border-white/5 rounded-xl px-4 py-3 mb-6">
        <p className="text-[10px] text-slate-500 text-center tracking-wide">
          This ticket is stored locally and works offline
        </p>
      </div>

      <p className="text-xs text-slate-600 mb-1 text-center">
        Show this QR code to validators during your journey
      </p>
      <p className="text-[10px] text-slate-700 tracking-widest uppercase mb-6 text-center">
        One ID · One Ticket · Any Mode
      </p>

      {/* Book another */}
      {onBookAnother && (
        <button
          onClick={onBookAnother}
          className={cn(
            "w-full border border-white/10 text-slate-400",
            "hover:text-white hover:border-white/20",
            "text-sm font-medium py-3 rounded-xl transition-colors"
          )}
        >
          Book Another Trip
        </button>
      )}
    </div>
  )
}