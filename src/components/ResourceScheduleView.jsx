import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, User, Building, Wrench, Truck, Users } from 'lucide-react';
import ResourceDayDetail from '@/components/ResourceDayDetail';

const TYPE_ICONS = { staff: User, space: Building, equipment: Wrench, vehicle: Truck, team: Users };
const TYPE_COLORS = {
  staff: 'bg-blue-100 text-blue-700',
  space: 'bg-green-100 text-green-700',
  equipment: 'bg-orange-100 text-orange-700',
  vehicle: 'bg-purple-100 text-purple-700',
  team: 'bg-pink-100 text-pink-700',
};

const SLOT_MINUTES = 15;

function getWeekDays(base) {
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeToMinutes(hhmm) {
  const [h, m] = (hhmm || '08:00').split(':').map(Number);
  return h * 60 + m;
}

function getMinutes(isoStr) {
  const d = new Date(isoStr);
  return d.getHours() * 60 + d.getMinutes();
}

function calcAvailPct(resource, dayAssignments) {
  const start = timeToMinutes(resource.working_hours_start || '08:00');
  const end = timeToMinutes(resource.working_hours_end || '17:00');
  const totalSlots = Math.max(0, Math.floor((end - start) / SLOT_MINUTES));
  if (totalSlots === 0) return 100;

  let bookedSlots = 0;
  for (let t = start; t < end; t += SLOT_MINUTES) {
    const slotEnd = t + SLOT_MINUTES;
    const busy = dayAssignments.some(a => {
      const aStart = getMinutes(a.start_datetime);
      const aEnd = getMinutes(a.end_datetime);
      return aStart < slotEnd && aEnd > t;
    });
    if (busy) bookedSlots++;
  }
  return Math.round(((totalSlots - bookedSlots) / totalSlots) * 100);
}

export default function ResourceScheduleView() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(new Date());
  const [resources, setResources] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [jobs, setJobs] = useState({});
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // { resource, day }

  const weekDays = getWeekDays(cursor);
  const today = new Date();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [resourcesData, assignmentsData, jobsData] = await Promise.all([
        base44.entities.Resource.filter({ is_active: true }),
        base44.entities.ResourceAssignment.list('-start_datetime', 500),
        base44.entities.Job.list('-scheduled_date', 500),
      ]);
      const jobMap = {};
      jobsData.forEach(j => { jobMap[j.id] = j; });
      setResources(resourcesData);
      setAssignments(assignmentsData);
      setJobs(jobMap);
      setLoading(false);
    })();
  }, []);

  const shiftWeek = (dir) => {
    const d = new Date(cursor);
    d.setDate(d.getDate() + dir * 7);
    setCursor(d);
  };

  const filteredResources = typeFilter === 'all'
    ? resources
    : resources.filter(r => r.resource_type === typeFilter);

  const getAssignmentsForResourceDay = (resourceId, day) =>
    assignments.filter(a =>
      a.resource_id === resourceId &&
      a.status !== 'cancelled' &&
      a.start_datetime &&
      isSameDay(new Date(a.start_datetime), day)
    );

  const headerLabel = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const detailAssignments = detail
    ? getAssignmentsForResourceDay(detail.resource.id, detail.day)
    : [];

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftWeek(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-semibold text-slate-700 min-w-[210px] text-center">{headerLabel}</span>
            <Button variant="outline" size="icon" onClick={() => shiftWeek(1)}><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCursor(new Date())}>Today</Button>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {['all', 'staff', 'space', 'equipment', 'vehicle', 'team'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${typeFilter === t ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-600 border-slate-300 hover:bg-slate-50'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Loading resources…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm border-collapse">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-44 border-r">Resource</th>
                  {weekDays.map((d, i) => {
                    const isToday = isSameDay(d, today);
                    return (
                      <th key={i} className={`text-center px-2 py-2 border-l ${isToday ? 'bg-blue-50' : ''}`}>
                        <div className="text-xs text-slate-400">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{d.getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-slate-400 text-sm">
                      No {typeFilter !== 'all' ? typeFilter : ''} resources found.{' '}
                      <a href="/settings/resources" className="text-blue-600 underline">Add resources in Settings.</a>
                    </td>
                  </tr>
                ) : filteredResources.map(resource => {
                  const TypeIcon = TYPE_ICONS[resource.resource_type] || User;
                  const typeBadge = TYPE_COLORS[resource.resource_type] || TYPE_COLORS.staff;
                  return (
                    <tr key={resource.id} className="border-b hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 border-r">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${typeBadge}`}>
                            <TypeIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 text-xs leading-tight">{resource.name}</div>
                            {resource.role && <div className="text-xs text-slate-400">{resource.role}</div>}
                          </div>
                        </div>
                      </td>
                      {weekDays.map((day, di) => {
                        const dayAssignments = getAssignmentsForResourceDay(resource.id, day);
                        const isToday = isSameDay(day, today);
                        const workingDays = resource.working_days ?? [1, 2, 3, 4, 5];
                        const isWorkday = workingDays.includes(day.getDay());
                        const availPct = isWorkday ? calcAvailPct(resource, dayAssignments) : null;

                        return (
                          <td
                            key={di}
                            onClick={() => isWorkday && setDetail({ resource, day })}
                            className={`border-l px-1 py-1.5 align-middle min-w-[100px] transition-colors ${isToday ? 'bg-blue-50/30' : ''} ${!isWorkday ? 'bg-slate-50' : 'cursor-pointer hover:bg-slate-100/60'}`}
                          >
                            {!isWorkday ? (
                              <div className="text-xs text-slate-300 text-center py-1">—</div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 py-1">
                                {/* Percent badge */}
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  availPct >= 70 ? 'bg-green-100 text-green-700' :
                                  availPct >= 30 ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-600'
                                }`}>
                                  {availPct}%
                                </span>
                                {/* Mini progress bar */}
                                <div className="w-full px-2">
                                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${availPct >= 70 ? 'bg-green-500' : availPct >= 30 ? 'bg-amber-400' : 'bg-red-400'}`}
                                      style={{ width: `${availPct}%` }}
                                    />
                                  </div>
                                </div>
                                {/* Job count hint */}
                                {dayAssignments.length > 0 && (
                                  <span className="text-[10px] text-slate-400">{dayAssignments.length} job{dayAssignments.length !== 1 ? 's' : ''}</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /> ≥70% free</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> 30–69% free</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> &lt;30% free</span>
          <span className="flex items-center gap-1.5 text-slate-400">Click any cell for 15-min breakdown</span>
        </div>
      </div>

      {/* Day detail modal */}
      <ResourceDayDetail
        open={!!detail}
        resource={detail?.resource}
        day={detail?.day}
        assignments={detailAssignments}
        jobs={jobs}
        onClose={() => setDetail(null)}
      />
    </>
  );
}