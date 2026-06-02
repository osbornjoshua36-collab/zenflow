import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Ban, CalendarPlus } from 'lucide-react';
import BlockTimeDialog from '@/components/BlockTimeDialog';
import CalendarProfileDialog from '@/components/CalendarProfileDialog';

const COLOR_MAP = {
  blue:   { job: 'bg-blue-100 border-blue-400 text-blue-900',   block: 'bg-slate-200 border-slate-400 text-slate-700' },
  green:  { job: 'bg-green-100 border-green-400 text-green-900', block: 'bg-slate-200 border-slate-400 text-slate-700' },
  purple: { job: 'bg-purple-100 border-purple-400 text-purple-900', block: 'bg-slate-200 border-slate-400 text-slate-700' },
  orange: { job: 'bg-orange-100 border-orange-400 text-orange-900', block: 'bg-slate-200 border-slate-400 text-slate-700' },
  red:    { job: 'bg-red-100 border-red-400 text-red-900',        block: 'bg-slate-200 border-slate-400 text-slate-700' },
  pink:   { job: 'bg-pink-100 border-pink-400 text-pink-900',     block: 'bg-slate-200 border-slate-400 text-slate-700' },
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am-9pm

function formatHour(h) {
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekDays(base) {
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let i = 0; i < first.getDay(); i++) {
    const d = new Date(year, month, -first.getDay() + i + 1);
    days.push({ date: d, inMonth: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    days.push({ date: next, inMonth: false });
  }
  return days;
}

function getEventsForDay(jobs, blocked, calId, day) {
  const jobsFiltered = calId
    ? jobs.filter(j => j.technician_name && calId === j._calProfile)
    : jobs;
  const blockedFiltered = calId
    ? blocked.filter(b => !b.calendar_profile_id || b.calendar_profile_id === calId)
    : blocked;
  const dayJobs = jobsFiltered.filter(j => j.scheduled_date && isSameDay(new Date(j.scheduled_date), day));
  const dayBlocked = blockedFiltered.filter(b => isSameDay(new Date(b.start_time), day));
  return { dayJobs, dayBlocked };
}

export default function AppointmentCalendar() {
  const routerNavigate = useNavigate();
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(new Date());
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState({});
  const [blocked, setBlocked] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState('all');
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [blockPrefill, setBlockPrefill] = useState(null);
  const [dragging, setDragging] = useState(null);

  const loadData = async () => {
    const [jobsData, customersData, blockedData, profilesData] = await Promise.all([
      base44.entities.Job.list('-scheduled_date', 200),
      base44.entities.Customer.list('-created_date', 100),
      base44.entities.BlockedTime.list('-start_time', 200),
      base44.entities.CalendarProfile.list('-created_date', 50),
    ]);
    const cMap = {};
    customersData.forEach(c => { cMap[c.id] = c; });
    setCustomers(cMap);
    setJobs(jobsData);
    setBlocked(blockedData);
    setProfiles(profilesData);
  };

  useEffect(() => { loadData(); }, []);

  const navigate = (dir) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };

  const getFilteredJobs = () => {
    if (activeProfile === 'all') return jobs;
    const profile = profiles.find(p => p.id === activeProfile);
    if (!profile) return jobs;
    return jobs.filter(j => j.technician_name === profile.technician_name);
  };

  const getFilteredBlocked = () => {
    if (activeProfile === 'all') return blocked;
    return blocked.filter(b => !b.calendar_profile_id || b.calendar_profile_id === activeProfile);
  };

  const handleDrop = async (date, hour) => {
    if (!dragging) return;
    const newDate = new Date(date);
    if (hour !== undefined) newDate.setHours(hour, 0, 0, 0);
    await base44.entities.Job.update(dragging.id, { scheduled_date: newDate.toISOString() });
    const dateStr = newDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    if (dragging.scheduling_status === 'confirmed') {
      const notify = window.confirm(`Rescheduled "${dragging.title}" to ${dateStr}. Notify customer?`);
      if (notify) {
        await base44.entities.Notification.create({
          business_id: dragging.business_id,
          message: `Your appointment "${dragging.title}" has been rescheduled to ${dateStr}.`,
          type: 'job_update',
          related_entity_id: dragging.id,
        });
      }
    }
    setDragging(null);
    loadData();
  };

  const profileColor = (job) => {
    const p = profiles.find(pr => pr.technician_name === job.technician_name);
    return p?.color || 'blue';
  };

  const headerLabel = () => {
    if (view === 'month') return cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const days = getWeekDays(cursor);
      return `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return cursor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const today = new Date();

  // ── MONTH VIEW ─────────────────────────────────────────────────────────────
  const MonthView = () => {
    const days = getMonthDays(cursor.getFullYear(), cursor.getMonth());
    const filteredJobs = getFilteredJobs();
    const filteredBlocked = getFilteredBlocked();

    return (
      <div className="overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-2 text-center text-xs font-semibold text-slate-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map(({ date, inMonth }, idx) => {
            const { dayJobs, dayBlocked } = getEventsForDay(filteredJobs, filteredBlocked, null, date);
            const isToday = isSameDay(date, today);
            return (
              <div
                key={idx}
                className={`min-h-[90px] border-r border-b p-1 ${!inMonth ? 'bg-slate-50' : ''}`}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(date)}
              >
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                  {date.getDate()}
                </div>
                {dayBlocked.map(b => (
                  <div key={b.id} className="text-xs bg-slate-200 text-slate-600 rounded px-1 py-0.5 mb-0.5 truncate border-l-2 border-slate-400">
                    🚫 {b.title}
                  </div>
                ))}
                {dayJobs.map(j => {
                  const c = COLOR_MAP[profileColor(j)]?.job || COLOR_MAP.blue.job;
                  return (
                    <div
                      key={j.id}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); setDragging(j); }}
                      onClick={(e) => { e.stopPropagation(); routerNavigate(`/jobs/${j.id}`); }}
                      className={`text-xs rounded px-1 py-0.5 mb-0.5 truncate border-l-2 cursor-pointer ${c}`}
                      title={`${j.title} — ${customers[j.customer_id]?.name || ''}`}
                    >
                      {new Date(j.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {j.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── WEEK VIEW ──────────────────────────────────────────────────────────────
  const WeekView = () => {
    const days = getWeekDays(cursor);
    const filteredJobs = getFilteredJobs();
    const filteredBlocked = getFilteredBlocked();

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-8 border-b">
            <div className="p-2" />
            {days.map((d, i) => {
              const isToday = isSameDay(d, today);
              return (
                <div key={i} className={`p-2 text-center border-l ${isToday ? 'bg-blue-50' : ''}`}>
                  <div className="text-xs text-slate-500">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className={`text-base font-bold ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b">
              <div className="text-xs text-slate-400 text-right pr-2 pt-2">{formatHour(hour)}</div>
              {days.map((d, di) => {
                const dayJobs = filteredJobs.filter(j => {
                  if (!j.scheduled_date) return false;
                  const jd = new Date(j.scheduled_date);
                  return isSameDay(jd, d) && jd.getHours() === hour;
                });
                const dayBlocked = filteredBlocked.filter(b => {
                  const bd = new Date(b.start_time);
                  return isSameDay(bd, d) && bd.getHours() <= hour && new Date(b.end_time).getHours() > hour;
                });
                const isBlocked = dayBlocked.length > 0;
                return (
                  <div
                    key={di}
                    className={`border-l min-h-[44px] p-0.5 ${isBlocked ? 'bg-slate-100' : ''}`}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(d, hour)}
                    onClick={() => {
                      if (!isBlocked && dayJobs.length === 0) {
                        const prefill = new Date(d);
                        prefill.setHours(hour, 0, 0, 0);
                        setBlockPrefill(prefill);
                        setShowBlockDialog(true);
                      }
                    }}
                  >
                    {isBlocked && <div className="text-xs text-slate-500 px-1 truncate">🚫 {dayBlocked[0].title}</div>}
                    {dayJobs.map(j => {
                      const c = COLOR_MAP[profileColor(j)]?.job || COLOR_MAP.blue.job;
                      return (
                        <div
                          key={j.id}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); setDragging(j); }}
                          onClick={(e) => { e.stopPropagation(); routerNavigate(`/jobs/${j.id}`); }}
                          className={`text-xs rounded px-1 py-0.5 mb-0.5 cursor-pointer border-l-2 ${c}`}
                        >
                          {j.title}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── DAY VIEW ───────────────────────────────────────────────────────────────
  const DayView = () => {
    const filteredJobs = getFilteredJobs();
    const filteredBlocked = getFilteredBlocked();

    return (
      <div>
        {HOURS.map(hour => {
          const dayJobs = filteredJobs.filter(j => {
            if (!j.scheduled_date) return false;
            const jd = new Date(j.scheduled_date);
            return isSameDay(jd, cursor) && jd.getHours() === hour;
          });
          const dayBlocked = filteredBlocked.filter(b => {
            const bd = new Date(b.start_time);
            return isSameDay(bd, cursor) && bd.getHours() <= hour && new Date(b.end_time).getHours() > hour;
          });
          const isBlocked = dayBlocked.length > 0;
          return (
            <div
              key={hour}
              className={`flex gap-3 border-b min-h-[52px] px-3 py-1 ${isBlocked ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(cursor, hour)}
              onClick={() => {
                if (!isBlocked && dayJobs.length === 0) {
                  const prefill = new Date(cursor);
                  prefill.setHours(hour, 0, 0, 0);
                  setBlockPrefill(prefill);
                  setShowBlockDialog(true);
                }
              }}
            >
              <div className="text-xs text-slate-400 w-12 pt-1 shrink-0">{formatHour(hour)}</div>
              <div className="flex-1 flex flex-wrap gap-1.5 py-0.5">
                {isBlocked && (
                  <div className="text-xs bg-slate-200 border border-slate-300 rounded px-2 py-1 text-slate-600">
                    🚫 {dayBlocked[0].title}
                  </div>
                )}
                {dayJobs.map(j => {
                  const c = COLOR_MAP[profileColor(j)]?.job || COLOR_MAP.blue.job;
                  return (
                    <div
                      key={j.id}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); setDragging(j); }}
                      onClick={(e) => { e.stopPropagation(); routerNavigate(`/jobs/${j.id}`); }}
                      className={`text-xs rounded px-2 py-1 cursor-pointer border-l-2 ${c}`}
                    >
                      <span className="font-medium">{j.title}</span>
                      {customers[j.customer_id] && <span className="ml-1 opacity-70">— {customers[j.customer_id].name}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-slate-50">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-semibold text-slate-700 min-w-[180px] text-center">{headerLabel()}</span>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCursor(new Date())}>Today</Button>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white border rounded-lg p-0.5">
          {['month', 'week', 'day'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${view === v ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Calendar / Person filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveProfile('all')}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${activeProfile === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-600 border-slate-300 hover:bg-slate-50'}`}
            >
              All
            </button>
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProfile(activeProfile === p.id ? 'all' : p.id)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${activeProfile === p.id ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-slate-300 hover:bg-slate-50'}`}
              >
                {p.name}
              </button>
            ))}
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Add calendar" onClick={() => setShowProfileDialog(true)}>
              <CalendarPlus className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setBlockPrefill(null); setShowBlockDialog(true); }}>
            <Ban className="w-3 h-3" /> Block Time
          </Button>
        </div>
      </div>

      {/* Calendar body */}
      <div className={view === 'month' ? '' : 'max-h-[540px] overflow-y-auto'}>
        {view === 'month' && <MonthView />}
        {view === 'week' && <WeekView />}
        {view === 'day' && <DayView />}
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-3 px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
        <span>Drag appointments to reschedule</span>
        {profiles.map(p => (
          <span key={p.id} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full bg-${p.color}-400`} />
            {p.name}
          </span>
        ))}
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" />Blocked</span>
      </div>

      <BlockTimeDialog
        open={showBlockDialog}
        onClose={() => setShowBlockDialog(false)}
        onSaved={loadData}
        calendarProfiles={profiles}
        prefillDate={blockPrefill}
      />
      <CalendarProfileDialog
        open={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
        onSaved={loadData}
      />
    </div>
  );
}