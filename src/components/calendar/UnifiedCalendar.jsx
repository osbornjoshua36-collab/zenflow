import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Ban, CalendarPlus, Plus, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import BlockTimeDialog from '@/components/BlockTimeDialog';
import CalendarProfileDialog from '@/components/CalendarProfileDialog';
import PersonalTaskDialog from '@/components/calendar/PersonalTaskDialog';
import BookingRequestActions from '@/components/calendar/BookingRequestActions';

const JOB_COLORS = {
  blue:   'bg-blue-100 border-blue-400 text-blue-900',
  green:  'bg-green-100 border-green-400 text-green-900',
  purple: 'bg-purple-100 border-purple-400 text-purple-900',
  orange: 'bg-orange-100 border-orange-400 text-orange-900',
  red:    'bg-red-100 border-red-400 text-red-900',
  pink:   'bg-pink-100 border-pink-400 text-pink-900',
};

const PERSONAL_STYLE = 'bg-terracotta-light text-terracotta-dark border-l-2 border-terracotta';
const BLOCKED_STYLE = 'bg-slate-100 text-slate-600 border-l-2 border-slate-400';
const BOOKING_STYLE = 'bg-amber-50 text-amber-900 border-2 border-dashed border-amber-400';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

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
    const lastDay = days[days.length - 1].date;
    const next = new Date(lastDay);
    next.setDate(lastDay.getDate() + 1);
    days.push({ date: next, inMonth: false });
  }
  return days;
}

export default function UnifiedCalendar({ defaultView = 'month' }) {
  const navigate = useNavigate();
  const [view, setView] = useState(defaultView);
  const [cursor, setCursor] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // User & access
  const [me, setMe] = useState(null);
  const [business, setBusiness] = useState(null);
  const [businessAccess, setBusinessAccess] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  // Data
  const [personalTasks, setPersonalTasks] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [customers, setCustomers] = useState({});

  // UI
  const [activeFilter, setActiveFilter] = useState('all');
  const [dragging, setDragging] = useState(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [blockPrefill, setBlockPrefill] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showPersonalTaskCreate, setShowPersonalTaskCreate] = useState(false);
  const [personalTaskPrefill, setPersonalTaskPrefill] = useState(null);
  const [selectedBookingRequest, setSelectedBookingRequest] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      if (!user) { setLoading(false); return; }
      setMe(user);

      // Find or create personal CalendarProfile
      let personalCals = await base44.entities.CalendarProfile.filter({ user_email: user.email });

      // Check if owner
      const ownerBiz = await base44.asServiceRole.entities.Business.filter({ owner_email: user.email });
      const myOwnerBiz = ownerBiz[0] || null;
      const hasActiveBusiness = myOwnerBiz && ['active', 'trial'].includes(myOwnerBiz.subscription_status);

      if (personalCals.length === 0 && !hasActiveBusiness) {
        personalCals = [await base44.entities.CalendarProfile.create({
          user_email: user.email,
          name: 'My Personal Calendar',
          color: 'blue',
        })];
      }

      // Load personal tasks (always)
      const tasks = await base44.entities.PersonalTask.list('-scheduled_date', 200);
      setPersonalTasks(tasks);

      // Determine business access
      let myBusiness = null;
      let accessLevel = null;
      let ownerFlag = false;

      if (myOwnerBiz) {
        ownerFlag = true;
        const sub = myOwnerBiz.subscription_status;
        if (sub === 'active' || sub === 'trial') {
          myBusiness = myOwnerBiz;
          accessLevel = 'full';
        } else if (sub === 'past_due') {
          myBusiness = myOwnerBiz;
          accessLevel = 'past_due';
        }
      }

      if (!accessLevel) {
        // Check if employee (active staff resource with matching user_email)
        const staffResources = await base44.asServiceRole.entities.Resource.filter({
          resource_type: 'staff',
          user_email: user.email,
          is_active: true,
        });
        if (staffResources[0]) {
          const employerBiz = await base44.asServiceRole.entities.Business.filter({ id: staffResources[0].business_id });
          if (employerBiz[0]) {
            const sub = employerBiz[0].subscription_status;
            if (sub === 'active' || sub === 'trial') {
              myBusiness = employerBiz[0];
              accessLevel = 'full';
            } else if (sub === 'past_due') {
              myBusiness = employerBiz[0];
              accessLevel = 'past_due';
            }
          }
        }
      }

      setBusiness(myBusiness);
      setBusinessAccess(accessLevel);
      setIsOwner(ownerFlag);

      // Load business data if access
      if (accessLevel && myBusiness) {
        const [jobsData, blockedData, bookingData, profilesData, customersData] = await Promise.all([
          base44.asServiceRole.entities.Job.filter({ business_id: myBusiness.id }, '-scheduled_date', 200),
          base44.asServiceRole.entities.BlockedTime.filter({ business_id: myBusiness.id }, '-start_time', 200),
          base44.asServiceRole.entities.BookingRequest.filter({ business_id: myBusiness.id, status: 'Pending' }, '-created_date', 50),
          base44.asServiceRole.entities.CalendarProfile.filter({ business_id: myBusiness.id }, '-created_date', 50),
          base44.asServiceRole.entities.Customer.list('-created_date', 100),
        ]);
        setJobs(jobsData);
        setBlocked(blockedData);
        setBookingRequests(bookingData);
        setProfiles(profilesData);
        const cMap = {};
        customersData.forEach(c => { cMap[c.id] = c; });
        setCustomers(cMap);
      } else {
        setJobs([]);
        setBlocked([]);
        setBookingRequests([]);
        setProfiles([]);
        setCustomers({});
      }
    } catch (e) {
      console.error('Failed to load calendar data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Build unified events ─────────────────────────────────────────────────
  const buildEvents = () => {
    const events = [];

    personalTasks.forEach(t => {
      if (!t.scheduled_date) return;
      const timeStr = t.scheduled_time || '09:00';
      const start = new Date(`${t.scheduled_date}T${timeStr}:00`);
      events.push({
        id: `task_${t.id}`,
        type: 'personal',
        title: t.title,
        start,
        raw: t,
      });
    });

    jobs.forEach(j => {
      if (!j.scheduled_date) return;
      events.push({
        id: `job_${j.id}`,
        type: 'job',
        title: j.title,
        start: new Date(j.scheduled_date),
        raw: j,
      });
    });

    blocked.forEach(b => {
      events.push({
        id: `block_${b.id}`,
        type: 'blocked',
        title: b.title,
        start: new Date(b.start_time),
        end: new Date(b.end_time),
        raw: b,
      });
    });

    bookingRequests.forEach(br => {
      if (!br.requested_date) return;
      events.push({
        id: `booking_${br.id}`,
        type: 'booking_request',
        title: br.service_type || 'Booking',
        start: new Date(br.requested_date),
        raw: br,
      });
    });

    return events;
  };

  const getFilteredEvents = () => {
    const events = buildEvents();
    if (!businessAccess) return events.filter(e => e.type === 'personal');
    if (activeFilter === 'all') return events;
    if (activeFilter === 'personal') return events.filter(e => e.type === 'personal');
    const profile = profiles.find(p => p.id === activeFilter);
    if (!profile) return events;
    return events.filter(e => {
      if (e.type === 'job') return e.raw.technician_name === profile.technician_name;
      if (e.type === 'blocked') return !e.raw.calendar_profile_id || e.raw.calendar_profile_id === activeFilter;
      return false;
    });
  };

  const getEventStyle = (event) => {
    if (event.type === 'personal') return PERSONAL_STYLE;
    if (event.type === 'blocked') return BLOCKED_STYLE;
    if (event.type === 'booking_request') return BOOKING_STYLE;
    const profile = profiles.find(p => p.technician_name === event.raw.technician_name);
    const color = profile?.color || 'blue';
    return JOB_COLORS[color] || JOB_COLORS.blue;
  };

  // ── Drag and drop ────────────────────────────────────────────────────────
  const handleDrop = async (date, hour) => {
    if (!dragging) return;
    const newDate = new Date(date);
    if (hour !== undefined) newDate.setHours(hour, 0, 0, 0);

    if (dragging.type === 'personal') {
      const dateStr = newDate.toISOString().split('T')[0];
      const timeStr = hour !== undefined
        ? `${String(hour).padStart(2, '0')}:00`
        : dragging.raw.scheduled_time || '09:00';
      await base44.entities.PersonalTask.update(dragging.raw.id, {
        scheduled_date: dateStr,
        scheduled_time: timeStr,
      });
    } else if (dragging.type === 'job') {
      await base44.asServiceRole.entities.Job.update(dragging.raw.id, { scheduled_date: newDate.toISOString() });
      if (dragging.raw.scheduling_status === 'confirmed') {
        const dateStr = newDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        const notify = window.confirm(`Rescheduled "${dragging.raw.title}" to ${dateStr}. Notify customer?`);
        if (notify) {
          await base44.asServiceRole.entities.Notification.create({
            business_id: dragging.raw.business_id,
            message: `Your appointment "${dragging.raw.title}" has been rescheduled to ${dateStr}.`,
            type: 'job_update',
            related_entity_id: dragging.raw.id,
          });
        }
      }
    }

    setDragging(null);
    loadData();
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    if (event.type === 'personal') {
      setEditingTask(event.raw);
    } else if (event.type === 'job') {
      navigate(`/jobs/${event.raw.id}`);
    } else if (event.type === 'booking_request') {
      setSelectedBookingRequest(event.raw);
    }
  };

  // ── Navigation ───────────────────────────────────────────────────────────
  const navigateCursor = (dir) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
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
  const filteredEvents = getFilteredEvents();

  const renderEventPill = (event, showTime = false) => {
    const style = getEventStyle(event);
    const isDraggable = event.type === 'personal' || event.type === 'job';
    const timeStr = event.type === 'personal'
      ? `${event.raw.scheduled_time || '09:00'}`
      : new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return (
      <div
        key={event.id}
        draggable={isDraggable}
        onDragStart={(e) => { e.stopPropagation(); setDragging(event); }}
        onClick={(e) => handleEventClick(event, e)}
        className={`text-xs rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer ${style} ${isDraggable ? 'cursor-grab' : ''}`}
        title={`${event.title}${event.type === 'job' && event.raw.customer_id ? ' — ' + (customers[event.raw.customer_id]?.name || '') : ''}`}
      >
        {showTime && <span className="opacity-70">{timeStr} </span>}
        {event.type === 'blocked' && '🚫 '}
        {event.title}
      </div>
    );
  };

  // ── MONTH VIEW ────────────────────────────────────────────────────────────
  const MonthView = () => {
    const days = getMonthDays(cursor.getFullYear(), cursor.getMonth());
    return (
      <div className="overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-2 text-center text-xs font-semibold text-slate-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map(({ date, inMonth }, idx) => {
            const dayEvents = filteredEvents.filter(e => isSameDay(e.start, date));
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
                {dayEvents.map(e => renderEventPill(e, true))}
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
                const hourEvents = filteredEvents.filter(e => {
                  if (!isSameDay(e.start, d)) return false;
                  if (e.type === 'blocked') {
                    return new Date(e.raw.start_time).getHours() <= hour && new Date(e.raw.end_time).getHours() > hour;
                  }
                  return e.start.getHours() === hour;
                });
                const hasBlocked = hourEvents.some(e => e.type === 'blocked');
                return (
                  <div
                    key={di}
                    className={`border-l min-h-[44px] p-0.5 ${hasBlocked ? 'bg-slate-50' : ''}`}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(d, hour)}
                    onClick={() => {
                      if (hourEvents.length === 0) {
                        if (businessAccess) {
                          const prefill = new Date(d);
                          prefill.setHours(hour, 0, 0, 0);
                          setBlockPrefill(prefill);
                          setShowBlockDialog(true);
                        }
                      }
                    }}
                  >
                    {hourEvents.map(e => renderEventPill(e))}
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
    return (
      <div>
        {HOURS.map(hour => {
          const hourEvents = filteredEvents.filter(e => {
            if (!isSameDay(e.start, cursor)) return false;
            if (e.type === 'blocked') {
              return new Date(e.raw.start_time).getHours() <= hour && new Date(e.raw.end_time).getHours() > hour;
            }
            return e.start.getHours() === hour;
          });
          const hasBlocked = hourEvents.some(e => e.type === 'blocked');
          return (
            <div
              key={hour}
              className={`flex gap-3 border-b min-h-[52px] px-3 py-1 ${hasBlocked ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(cursor, hour)}
              onClick={() => {
                if (hourEvents.length === 0) {
                  if (businessAccess) {
                    const prefill = new Date(cursor);
                    prefill.setHours(hour, 0, 0, 0);
                    setBlockPrefill(prefill);
                    setShowBlockDialog(true);
                  }
                }
              }}
            >
              <div className="text-xs text-slate-400 w-12 pt-1 shrink-0">{formatHour(hour)}</div>
              <div className="flex-1 flex flex-wrap gap-1.5 py-0.5">
                {hourEvents.map(e => {
                  const style = getEventStyle(e);
                  const isDraggable = e.type === 'personal' || e.type === 'job';
                  return (
                    <div
                      key={e.id}
                      draggable={isDraggable}
                      onDragStart={(ev) => { ev.stopPropagation(); setDragging(e); }}
                      onClick={(ev) => handleEventClick(e, ev)}
                      className={`text-xs rounded px-2 py-1 cursor-pointer ${style} ${isDraggable ? 'cursor-grab' : ''}`}
                    >
                      {e.type === 'blocked' && '🚫 '}
                      <span className="font-medium">{e.title}</span>
                      {e.type === 'job' && e.raw.customer_id && customers[e.raw.customer_id] && (
                        <span className="ml-1 opacity-70">— {customers[e.raw.customer_id].name}</span>
                      )}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasBusiness = !!businessAccess;

  return (
    <div className="space-y-3">
      {/* Past-due banner */}
      {businessAccess === 'past_due' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Your business subscription is past due. Business calendar data is still visible — update your subscription to restore full access.</span>
          <Link to="/seller/subscription" className="ml-auto text-xs font-medium text-amber-900 hover:underline whitespace-nowrap">Update →</Link>
        </div>
      )}

      {/* Reconnect link for lapsed owners */}
      {isOwner && !businessAccess && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-slate-600">
          <LinkIcon className="w-4 h-4 shrink-0" />
          <span>Your business subscription is no longer active.</span>
          <Link to="/seller/subscription" className="ml-auto text-xs font-medium text-blue-600 hover:underline whitespace-nowrap">Reconnect your business calendar →</Link>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateCursor(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-semibold text-slate-700 min-w-[180px] text-center">{headerLabel()}</span>
            <Button variant="outline" size="icon" onClick={() => navigateCursor(1)}><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCursor(new Date())}>Today</Button>
          </div>

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

          <div className="flex items-center gap-2">
            {/* Filter chips — only if business access */}
            {hasBusiness && (
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${activeFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveFilter(activeFilter === 'personal' ? 'all' : 'personal')}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${activeFilter === 'personal' ? 'bg-terracotta text-white border-terracotta' : 'text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                >
                  Personal
                </button>
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveFilter(activeFilter === p.id ? 'all' : p.id)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${activeFilter === p.id ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                  >
                    {p.name}
                  </button>
                ))}
                {isOwner && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Add calendar" onClick={() => setShowProfileDialog(true)}>
                    <CalendarPlus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Personal task quick-add */}
            <Button variant="outline" size="sm" className="gap-1 text-xs border-terracotta text-terracotta-dark hover:bg-terracotta-light" onClick={() => { setPersonalTaskPrefill(null); setShowPersonalTaskCreate(true); }}>
              <Plus className="w-3 h-3" /> Personal task
            </Button>

            {/* Block Time — only if business access */}
            {hasBusiness && (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setBlockPrefill(null); setShowBlockDialog(true); }}>
                <Ban className="w-3 h-3" /> Block Time
              </Button>
            )}
          </div>
        </div>

        {/* Calendar body */}
        <div className={view === 'month' ? '' : 'max-h-[540px] overflow-y-auto'}>
          {view === 'month' && <MonthView />}
          {view === 'week' && <WeekView />}
          {view === 'day' && <DayView />}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-terracotta" />Personal</span>
          {hasBusiness && profiles.map(p => {
            const colorMap = { blue: 'bg-blue-400', green: 'bg-green-400', purple: 'bg-purple-400', orange: 'bg-orange-400', red: 'bg-red-400', pink: 'bg-pink-400' };
            return (
              <span key={p.id} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${colorMap[p.color] || 'bg-blue-400'}`} />
                {p.name}
              </span>
            );
          })}
          {hasBusiness && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" />Blocked</span>}
          {hasBusiness && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-dashed border-amber-400" />Pending</span>}
          <span>Drag to reschedule</span>
        </div>
      </div>

      {/* Dialogs */}
      <BlockTimeDialog
        open={showBlockDialog}
        onClose={() => setShowBlockDialog(false)}
        onSaved={loadData}
        calendarProfiles={profiles}
        prefillDate={blockPrefill}
        businessId={business?.id}
      />
      <CalendarProfileDialog
        open={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
        onSaved={loadData}
        businessId={business?.id}
      />
      <PersonalTaskDialog
        open={showPersonalTaskCreate}
        onClose={() => setShowPersonalTaskCreate(false)}
        onSaved={loadData}
        prefillDate={personalTaskPrefill}
      />
      <PersonalTaskDialog
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSaved={loadData}
        task={editingTask}
      />
      <BookingRequestActions
        bookingRequest={selectedBookingRequest}
        onClose={() => setSelectedBookingRequest(null)}
        onSaved={loadData}
      />
    </div>
  );
}