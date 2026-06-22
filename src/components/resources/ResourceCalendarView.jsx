import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, User, Building, Wrench, Truck, Users, GripVertical } from 'lucide-react';

const TYPE_ICONS = { staff: User, space: Building, equipment: Wrench, vehicle: Truck, team: Users };

const RESOURCE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

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

function dropId(resourceId, day) {
  return `${resourceId}__${day.toISOString().slice(0, 10)}`;
}

function parseDropId(id) {
  const [resourceId, dateStr] = id.split('__');
  return { resourceId, date: new Date(dateStr + 'T00:00:00') };
}

export default function ResourceCalendarView({ businessId }) {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(new Date());
  const [resources, setResources] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [jobs, setJobs] = useState({});
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [draggingOver, setDraggingOver] = useState(null);

  const weekDays = getWeekDays(cursor);
  const today = new Date();

  const load = async () => {
    setLoading(true);
    const filters = businessId ? { business_id: businessId, is_active: true } : { is_active: true };
    const [resourcesData, assignmentsData, jobsData] = await Promise.all([
      base44.entities.Resource.filter(filters),
      base44.entities.ResourceAssignment.list('-start_datetime', 500),
      base44.entities.Job.list('-scheduled_date', 500),
    ]);
    const jobMap = {};
    jobsData.forEach(j => { jobMap[j.id] = j; });
    setResources(resourcesData);
    setAssignments(assignmentsData);
    setJobs(jobMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, [businessId]);

  const shiftWeek = (dir) => {
    const d = new Date(cursor);
    d.setDate(d.getDate() + dir * 7);
    setCursor(d);
  };

  const filteredResources = typeFilter === 'all'
    ? resources
    : resources.filter(r => r.resource_type === typeFilter);

  const getAssignmentsForCell = (resourceId, day) =>
    assignments.filter(a =>
      a.resource_id === resourceId &&
      a.status !== 'cancelled' &&
      a.start_datetime &&
      isSameDay(new Date(a.start_datetime), day)
    );

  const onDragEnd = async (result) => {
    setDraggingOver(null);
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const assignmentId = draggableId;
    const { resourceId: newResourceId, date: newDate } = parseDropId(destination.droppableId);
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    // Compute duration and rebuild datetimes on the new date
    const origStart = new Date(assignment.start_datetime);
    const origEnd = new Date(assignment.end_datetime);
    const durationMs = origEnd - origStart;

    const newStart = new Date(newDate);
    newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const updates = {
      resource_id: newResourceId,
      start_datetime: newStart.toISOString(),
      end_datetime: newEnd.toISOString(),
    };

    // Optimistic update
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, ...updates } : a));

    await base44.entities.ResourceAssignment.update(assignmentId, updates);

    // If job's technician_name needs updating when moved to a new staff resource
    const newResource = resources.find(r => r.id === newResourceId);
    if (newResource?.resource_type === 'staff' && assignment.job_id) {
      const job = jobs[assignment.job_id];
      if (job) {
        await base44.entities.Job.update(assignment.job_id, { technician_name: newResource.name });
        setJobs(prev => ({ ...prev, [assignment.job_id]: { ...job, technician_name: newResource.name } }));
      }
    }
  };

  const headerLabel = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
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

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Loading resources…</div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No {typeFilter !== 'all' ? typeFilter : ''} resources found.{' '}
          <a href="/settings/resources" className="text-blue-600 underline">Add resources in Settings.</a>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd} onDragUpdate={u => setDraggingOver(u.destination?.droppableId || null)}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm border-collapse">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-44 border-r sticky left-0 bg-slate-50 z-10">Resource</th>
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
                {filteredResources.map((resource, rIdx) => {
                  const TypeIcon = TYPE_ICONS[resource.resource_type] || User;
                  const accentColor = resource.colour || RESOURCE_COLORS[rIdx % RESOURCE_COLORS.length];
                  const workingDays = resource.working_days ?? [1, 2, 3, 4, 5];

                  return (
                    <tr key={resource.id} className="border-b hover:bg-slate-50/30">
                      <td className="px-3 py-2.5 border-r sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-full min-h-[32px] rounded-full shrink-0" style={{ background: accentColor, width: 3 }} />
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: accentColor + '22' }}>
                            <TypeIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 text-xs leading-tight truncate">{resource.name}</div>
                            {resource.role && <div className="text-xs text-slate-400 truncate">{resource.role}</div>}
                          </div>
                        </div>
                      </td>
                      {weekDays.map((day, di) => {
                        const cellId = dropId(resource.id, day);
                        const isToday = isSameDay(day, today);
                        const isWorkday = workingDays.includes(day.getDay());
                        const dayAssignments = getAssignmentsForCell(resource.id, day);
                        const isDropTarget = draggingOver === cellId;

                        return (
                          <td
                            key={di}
                            className={`border-l align-top min-w-[110px] p-0 transition-colors ${isToday ? 'bg-blue-50/20' : ''} ${!isWorkday ? 'bg-slate-50/60' : ''}`}
                          >
                            <Droppable droppableId={cellId} direction="vertical">
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`min-h-[52px] px-1 py-1 transition-colors rounded ${snapshot.isDraggingOver ? 'bg-blue-100/60 ring-1 ring-blue-300 ring-inset' : ''}`}
                                >
                                  {!isWorkday && dayAssignments.length === 0 ? (
                                    <div className="text-xs text-slate-300 text-center py-2 select-none">—</div>
                                  ) : dayAssignments.length === 0 ? (
                                    <div className="text-xs text-slate-300 text-center py-3 select-none">free</div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      {dayAssignments.map((a, ai) => {
                                        const job = jobs[a.job_id];
                                        const startTime = new Date(a.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                        const label = job?.title || a.slot_label || 'Job';
                                        return (
                                          <Draggable key={a.id} draggableId={a.id} index={ai}>
                                            {(drag, dragSnapshot) => (
                                              <div
                                                ref={drag.innerRef}
                                                {...drag.draggableProps}
                                                className={`group text-xs rounded px-1.5 py-1 flex items-start gap-1 cursor-grab active:cursor-grabbing transition-shadow ${dragSnapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400 opacity-90' : 'hover:shadow-sm'}`}
                                                style={{
                                                  background: accentColor + '20',
                                                  borderLeft: `3px solid ${accentColor}`,
                                                  color: '#1e293b',
                                                  ...drag.draggableProps.style,
                                                }}
                                              >
                                                <span {...drag.dragHandleProps} className="mt-0.5 shrink-0 opacity-40 group-hover:opacity-70">
                                                  <GripVertical className="w-3 h-3" />
                                                </span>
                                                <div
                                                  className="flex-1 min-w-0"
                                                  onClick={() => job && navigate(`/jobs/${job.id}`)}
                                                >
                                                  <div className="font-medium truncate leading-tight">{label}</div>
                                                  <div className="text-slate-500 text-[10px]">{startTime}</div>
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DragDropContext>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><GripVertical className="w-3 h-3" /> Drag to reassign</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> Drop target highlights blue</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-200" /> Click appointment to open job</span>
      </div>
    </div>
  );
}