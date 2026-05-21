import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from 'date-fns';

const STATUS_COLORS = {
  Scheduled: 'bg-blue-500',
  'In Progress': 'bg-amber-500',
  Completed: 'bg-green-500',
  Cancelled: 'bg-red-400',
  'No-Show': 'bg-slate-400',
};

export default function AppointmentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState({});
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [jobsData, customersData] = await Promise.all([
        base44.entities.Job.list('-scheduled_date', 200),
        base44.entities.Customer.list('-created_date', 100),
      ]);
      const cmap = {};
      customersData.forEach(c => { cmap[c.id] = c; });
      setJobs(jobsData);
      setCustomers(cmap);
      setLoading(false);
    };
    fetchData();
  }, []);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDayOfWeek = startOfMonth(currentMonth).getDay(); // 0=Sun

  const getJobsForDay = (day) =>
    jobs.filter(j => j.scheduled_date && isSameDay(parseISO(j.scheduled_date), day));

  const handleDragStart = (e, job) => {
    setDragging(job);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(day.toISOString());
  };

  const handleDrop = async (e, day) => {
    e.preventDefault();
    if (!dragging) return;
    const newDate = new Date(dragging.scheduled_date ? parseISO(dragging.scheduled_date) : day);
    newDate.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    const updated = { ...dragging, scheduled_date: newDate.toISOString() };
    setJobs(prev => prev.map(j => j.id === dragging.id ? updated : j));
    await base44.entities.Job.update(dragging.id, { scheduled_date: newDate.toISOString() });
    setDragging(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  if (loading) return <div className="text-sm text-slate-500 py-4">Loading calendar...</div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800">Appointment Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1 rounded hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-700 w-32 text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1 rounded hover:bg-slate-100">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Empty cells before month start */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] rounded-lg bg-slate-50/50" />
          ))}

          {days.map(day => {
            const dayJobs = getJobsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isDragTarget = dragOver === day.toISOString();

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] rounded-lg p-1 border transition-colors ${
                  isToday ? 'border-blue-400 bg-blue-50' :
                  isDragTarget ? 'border-blue-300 bg-blue-50/70' :
                  'border-slate-100 bg-white hover:bg-slate-50'
                }`}
                onDragOver={(e) => handleDragOver(e, day)}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-500 text-white' : 'text-slate-600'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayJobs.map(job => (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job)}
                      onDragEnd={handleDragEnd}
                      className={`text-[10px] text-white rounded px-1 py-0.5 cursor-grab active:cursor-grabbing flex items-center gap-0.5 ${
                        STATUS_COLORS[job.status] || 'bg-slate-500'
                      } ${dragging?.id === job.id ? 'opacity-40' : 'opacity-100'}`}
                      title={`${job.title} — ${customers[job.customer_id]?.name || 'Customer'}`}
                    >
                      <GripVertical className="w-2 h-2 flex-shrink-0" />
                      <span className="truncate">{job.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
              <span className="text-[10px] text-slate-500">{status}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}