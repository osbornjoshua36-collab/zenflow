import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Building, Wrench, Truck, Users, X } from 'lucide-react';

const TYPE_ICONS = { staff: User, space: Building, equipment: Wrench, vehicle: Truck, team: Users };

const SLOT_MINUTES = 15;

function timeToMinutes(hhmm) {
  const [h, m] = (hhmm || '08:00').split(':').map(Number);
  return h * 60 + m;
}

function buildSlots(startHHMM, endHHMM) {
  const start = timeToMinutes(startHHMM);
  const end = timeToMinutes(endHHMM);
  const slots = [];
  for (let t = start; t < end; t += SLOT_MINUTES) {
    const hh = String(Math.floor(t / 60)).padStart(2, '0');
    const mm = String(t % 60).padStart(2, '0');
    const eh = String(Math.floor((t + SLOT_MINUTES) / 60)).padStart(2, '0');
    const em = String((t + SLOT_MINUTES) % 60).padStart(2, '0');
    slots.push({ label: `${hh}:${mm}`, endLabel: `${eh}:${em}`, minuteStart: t, minuteEnd: t + SLOT_MINUTES });
  }
  return slots;
}

function getMinutes(isoStr) {
  const d = new Date(isoStr);
  return d.getHours() * 60 + d.getMinutes();
}

export default function ResourceDayDetail({ resource, day, assignments, jobs, open, onClose }) {
  const navigate = useNavigate();

  const slots = useMemo(() => {
    if (!resource) return [];
    return buildSlots(resource.working_hours_start || '08:00', resource.working_hours_end || '17:00');
  }, [resource]);

  const slotAssignments = useMemo(() => {
    return slots.map(slot => {
      const booked = assignments.filter(a => {
        const aStart = getMinutes(a.start_datetime);
        const aEnd = getMinutes(a.end_datetime);
        return aStart < slot.minuteEnd && aEnd > slot.minuteStart;
      });
      return { slot, booked };
    });
  }, [slots, assignments]);

  const totalSlots = slots.length;
  const bookedSlots = slotAssignments.filter(s => s.booked.length > 0).length;
  const freeSlots = totalSlots - bookedSlots;
  const availPct = totalSlots > 0 ? Math.round((freeSlots / totalSlots) * 100) : 100;

  if (!resource || !day) return null;

  const dayLabel = day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const TypeIcon = TYPE_ICONS[resource.resource_type] || User;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: (resource.colour || '#3B82F6') + '22' }}>
              <TypeIcon className="w-4 h-4" style={{ color: resource.colour || '#3B82F6' }} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base leading-tight">{resource.name}</DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">{dayLabel}</p>
            </div>
          </div>

          {/* Availability bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{freeSlots * SLOT_MINUTES} min free · {bookedSlots * SLOT_MINUTES} min booked</span>
              <span className={`font-semibold ${availPct >= 70 ? 'text-green-600' : availPct >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                {availPct}% available
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${availPct >= 70 ? 'bg-green-500' : availPct >= 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${availPct}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        {/* Slot list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-0.5">
          {slotAssignments.map(({ slot, booked }) => {
            const isBusy = booked.length > 0;
            return (
              <div key={slot.label} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-10 shrink-0 font-mono">{slot.label}</span>
                {isBusy ? (
                  <div className="flex-1 space-y-0.5">
                    {booked.map(a => {
                      const job = jobs[a.job_id];
                      return (
                        <div
                          key={a.id}
                          onClick={() => job && navigate(`/jobs/${job.id}`)}
                          className="flex-1 rounded px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity truncate"
                          style={{
                            background: (resource.colour || '#3B82F6') + '22',
                            borderLeft: `3px solid ${resource.colour || '#3B82F6'}`,
                            color: '#1e293b',
                          }}
                          title={job?.title || a.slot_label}
                        >
                          {job?.title || a.slot_label || 'Booked'}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 rounded px-2 py-0.5 text-xs text-slate-300 bg-slate-50">
                    Free
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}