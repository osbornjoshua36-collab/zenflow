import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookingRequestDialog from '@/components/BookingRequestDialog';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function getDaysOfWeek(baseDate) {
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - baseDate.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isBusy(jobs, date, hour) {
  return jobs.some(j => {
    const d = new Date(j.scheduled_date);
    return d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate() &&
      d.getHours() === hour;
  });
}

export default function BusinessAvailabilityView({ business, jobs }) {
  const [weekBase, setWeekBase] = useState(new Date());
  const [bookingSlot, setBookingSlot] = useState(null);
  const days = getDaysOfWeek(weekBase);
  const today = new Date();

  const prevWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); };
  const nextWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); };

  const businessJobs = jobs.filter(j => j.business_id === business.id && j.status === 'Scheduled');

  const handleSlotClick = (day, hour) => {
    const slot = new Date(day);
    slot.setHours(hour, 0, 0, 0);
    if (slot < today) return;
    if (!isBusy(businessJobs, day, hour)) {
      setBookingSlot(slot);
    }
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <div>
          <h3 className="font-semibold text-slate-800">{business.name} — Weekly Availability</h3>
          <p className="text-xs text-slate-500 mt-0.5">Click a green slot to request a booking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-slate-600 w-28 text-center">
            {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-2" />
            {days.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={i} className={`p-2 text-center text-xs font-medium ${isToday ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}>
                  <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className={`text-base font-bold ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Time rows */}
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
              <div className="p-2 text-xs text-slate-400 text-right pr-3 pt-2.5">
                {hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
              </div>
              {days.map((d, di) => {
                const busy = isBusy(businessJobs, d, hour);
                const past = new Date(d).setHours(hour) < today;
                return (
                  <div
                    key={di}
                    onClick={() => handleSlotClick(d, hour)}
                    className={`h-10 border-l transition-colors text-xs flex items-center justify-center
                      ${past ? 'bg-slate-50 cursor-not-allowed' :
                        busy ? 'bg-red-100 cursor-not-allowed' :
                        'bg-green-50 hover:bg-green-100 cursor-pointer'}`}
                  >
                    {busy && <span className="text-red-500 font-medium">Busy</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-4 py-2.5 border-t bg-slate-50 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" />Booked</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />Past</span>
      </div>

      <BookingRequestDialog
        open={!!bookingSlot}
        onClose={() => setBookingSlot(null)}
        business={business}
        selectedDate={bookingSlot}
        onBooked={() => setBookingSlot(null)}
      />
    </div>
  );
}