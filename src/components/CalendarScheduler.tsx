'use client';

import { useState } from 'react';
import { useChatContext } from '@/context/chat-context';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Fixed time slots — shown when no availability data or as fallback
const DEFAULT_SLOTS = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface CalendarSchedulerProps {
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CalendarScheduler({ onClose }: CalendarSchedulerProps) {
  const { sendMessage, role } = useChatContext();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState('General Plumbing');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // Go to prev/next month, don't allow going before today's month
  const prevMonth = () => {
    if (year === today.getFullYear() && month === today.getMonth()) return;
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null); setSlots([]); setSelectedSlot(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null); setSlots([]); setSelectedSlot(null);
  };

  // Fetch available slots for a date via the chat API.
  // No useCallback — Next 16's React Compiler memoizes automatically and the
  // manual deps tripped react-hooks/preserve-manual-memoization.
  const fetchSlots = async (dateStr: string) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Check plumber availability for ${dateStr} for ${serviceType}`,
          role,
          _silent: true,
        }),
      });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const available = data?.toolResult?.data?.availableSlots
        ?? data?.toolResult?.data?.[0]?.availableSlots
        ?? null;
      if (Array.isArray(available) && available.length > 0) {
        setSlots(available.map(String));
      } else {
        setSlots(DEFAULT_SLOTS);
      }
    } catch {
      setSlots(DEFAULT_SLOTS);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDayClick = (day: number) => {
    const dateStr = toDateStr(year, month, day);
    // Don't allow past dates
    if (dateStr < toDateStr(today.getFullYear(), today.getMonth(), today.getDate())) return;
    setSelectedDate(dateStr);
    fetchSlots(dateStr);
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedSlot) return;
    setConfirming(true);
    const prompt = `Schedule a plumbing appointment for ${formatDisplayDate(selectedDate)} at ${selectedSlot}. Service type: ${serviceType}.${notes ? ` Notes: ${notes}` : ''}`;
    onClose();
    await sendMessage(prompt);
    setConfirming(false);
  };

  const isPast = (day: number) => {
    const dateStr = toDateStr(year, month, day);
    return dateStr < toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  };
  const isToday = (day: number) => toDateStr(year, month, day) === toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2416]/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 w-full max-w-xl rounded-xl border-2 border-[#d9cec2] bg-[#fffdf9] shadow-xl overflow-hidden flex flex-col"
        style={{ animation: 'scale-in 200ms cubic-bezier(0.16,1,0.3,1)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#d9cec2] bg-green-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <div>
              <h2 className="text-sm font-semibold text-[#2c2416]">Schedule an Appointment</h2>
              <p className="text-[11px] text-[#7a6a58]">Pick a date and available time slot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Service type selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
              Service Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['General Plumbing','Emergency Repair','Drain Cleaning','Water Heater','Inspection'].map(s => (
                <button
                  key={s}
                  onClick={() => { setServiceType(s); if (selectedDate) fetchSlots(selectedDate); }}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                    serviceType === s
                      ? 'border-[#d4651a] bg-orange-50 text-[#d4651a] font-semibold'
                      : 'border-[#d9cec2] bg-[#f4ede4] text-[#7a6a58] hover:border-[#c4b8aa] hover:text-[#2c2416]'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div>
            {/* Month nav */}
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={prevMonth}
                disabled={year === today.getFullYear() && month === today.getMonth()}
                className="rounded-md p-1.5 text-[#7a6a58] transition-colors hover:bg-[#e8ddd0] hover:text-[#2c2416] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <span className="text-sm font-semibold">{MONTHS[month]} {year}</span>
              <button
                onClick={nextMonth}
                className="rounded-md p-1.5 text-[#7a6a58] transition-colors hover:bg-[#e8ddd0] hover:text-[#2c2416]"
              >
                ›
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-0.5">
              {DAYS.map(d => (
                <div key={d} className="py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = toDateStr(year, month, day);
                const past = isPast(day);
                const todayDay = isToday(day);
                const selected = selectedDate === dateStr;
                const weekend = (firstDay + i) % 7 === 0 || (firstDay + i) % 7 === 6;
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    disabled={past}
                    className={cn(
                      'aspect-square w-full rounded-md text-xs font-medium transition-all duration-150',
                      past && 'text-[#c4b8aa] cursor-not-allowed',
                      !past && !selected && 'hover:bg-[#e8ddd0] hover:text-[#2c2416]',
                      !past && weekend && !selected && 'text-[#b09880]',
                      !past && !weekend && !selected && 'text-[#2c2416]',
                      todayDay && !selected && 'ring-1 ring-[#d4651a] text-[#d4651a] font-semibold',
                      selected && 'bg-[#d4651a] text-white font-bold',
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div style={{ animation: 'fade-slide-in 200ms ease both' }}>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Available Times — {formatDisplayDate(selectedDate)}
              </label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-xs text-[#7a6a58] py-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#d9cec2] border-t-[#d4651a]" />
                  Checking availability…
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        'rounded-md border py-2 text-xs font-medium transition-all duration-150',
                        selectedSlot === slot
                          ? 'border-[#d4651a] bg-orange-50 text-[#d4651a] font-semibold'
                          : 'border-[#d9cec2] bg-[#f4ede4] text-[#7a6a58] hover:border-[#c4b8aa] hover:bg-[#e8ddd0] hover:text-[#2c2416]'
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {selectedSlot && (
            <div style={{ animation: 'fade-slide-in 200ms ease both' }}>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Notes (optional)
              </label>
              <input
                className="w-full rounded-md border-2 border-[#d9cec2] bg-[#f4ede4] px-3 py-2 text-sm text-[#2c2416] placeholder:text-[#b09880] focus:outline-none focus:border-[#d4651a]"
                placeholder="e.g. Gate code is 1234, leaking under sink…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer — sticky so Confirm is always visible */}
        <div className="flex shrink-0 items-center justify-between border-t-2 border-[#d9cec2] bg-[#f4ede4] px-5 py-3">
          <div className="text-xs text-muted-foreground">
            {selectedDate && selectedSlot
              ? <span className="text-[#d4651a] font-semibold text-xs">{formatDisplayDate(selectedDate)} at {selectedSlot}</span>
              : 'Select a date and time to continue'}
          </div>
          <button
            id="confirm-appointment-btn"
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedSlot || confirming}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              selectedDate && selectedSlot && !confirming
                ? 'bg-[#d4651a] text-white hover:bg-[#b8541a] font-semibold'
                : 'bg-[#e8ddd0] text-[#b09880] cursor-not-allowed opacity-50'
            )}
          >
            {confirming ? 'Booking…' : 'Confirm Appointment'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fade-slide-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
