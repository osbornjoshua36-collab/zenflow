import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isSameDay, isAfter, addDays } from 'date-fns';
import { X, Plus, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StaffScheduleEditor({ resource, assignments, jobs, onClose, onSaved }) {
  const [workingDays, setWorkingDays] = useState(resource.working_days || [1, 2, 3, 4, 5]);
  const [workStart, setWorkStart] = useState(resource.working_hours_start || '08:00');
  const [workEnd, setWorkEnd] = useState(resource.working_hours_end || '17:00');
  const [exceptions, setExceptions] = useState(
    (resource.availability_exceptions || []).filter(ex =>
      isAfter(parseISO(ex.date), addDays(new Date(), -1))
    )
  );
  const [newEx, setNewEx] = useState({ date: '', type: 'off', reason: '', start: '08:00', end: '17:00' });
  const [saving, setSaving] = useState(false);

  // Assignments affected by the new exception
  const affectedByNewEx = newEx.date
    ? assignments.filter(a => isSameDay(new Date(a.start_datetime), new Date(newEx.date)))
    : [];

  const toggleDay = (day) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const addException = () => {
    if (!newEx.date) return;
    const ex = {
      date: newEx.date,
      is_available: newEx.type !== 'off',
      reason: newEx.reason || (newEx.type === 'off' ? 'Out of office' : 'Modified hours'),
      ...(newEx.type !== 'off' && { working_hours_start: newEx.start, working_hours_end: newEx.end }),
    };
    setExceptions(prev => [...prev.filter(e => e.date !== newEx.date), ex]);
    setNewEx({ date: '', type: 'off', reason: '', start: '08:00', end: '17:00' });
  };

  const removeException = (date) => {
    setExceptions(prev => prev.filter(e => e.date !== date));
  };

  const handleSave = async () => {
    setSaving(true);
    const updated = await base44.entities.Resource.update(resource.id, {
      working_days: workingDays,
      working_hours_start: workStart,
      working_hours_end: workEnd,
      availability_exceptions: exceptions,
    });
    onSaved(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-900">Edit My Availability</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Regular working days */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-3 block">Regular Working Days</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_NAMES.map((day, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-12 h-10 rounded-lg text-sm font-medium transition-colors ${
                    workingDays.includes(i)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Regular working hours */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-3 block">Regular Working Hours</label>
            <div className="flex items-center gap-3">
              <Input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className="w-36" />
              <span className="text-slate-400 text-sm">to</span>
              <Input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className="w-36" />
            </div>
          </div>

          {/* Add date exception */}
          <div className="border rounded-xl p-4 space-y-3 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Add Day Exception
            </p>
            <div className="flex gap-2 flex-wrap">
              <Input
                type="date"
                value={newEx.date}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setNewEx(p => ({ ...p, date: e.target.value }))}
                className="flex-1 min-w-[140px]"
              />
              <select
                value={newEx.type}
                onChange={e => setNewEx(p => ({ ...p, type: e.target.value }))}
                className="border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="off">Call out / Full day off</option>
                <option value="modified">Modified hours</option>
              </select>
            </div>

            {newEx.type === 'modified' && (
              <div className="flex items-center gap-3">
                <Input type="time" value={newEx.start} onChange={e => setNewEx(p => ({ ...p, start: e.target.value }))} className="w-32" />
                <span className="text-slate-400 text-sm">to</span>
                <Input type="time" value={newEx.end} onChange={e => setNewEx(p => ({ ...p, end: e.target.value }))} className="w-32" />
              </div>
            )}

            <Input
              placeholder="Reason (optional) e.g. sick day, appointment"
              value={newEx.reason}
              onChange={e => setNewEx(p => ({ ...p, reason: e.target.value }))}
            />

            {/* Conflict warning */}
            {affectedByNewEx.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {affectedByNewEx.length} assignment{affectedByNewEx.length > 1 ? 's' : ''} on this day
                </p>
                {affectedByNewEx.map(a => (
                  <p key={a.id} className="text-xs text-amber-600">
                    · {jobs[a.job_id]?.title || 'Job'} at {format(new Date(a.start_datetime), 'h:mm a')}
                  </p>
                ))}
                <p className="text-xs text-amber-600 mt-1.5">
                  After saving, you can manage each assignment from the schedule view.
                </p>
              </div>
            )}

            <Button
              onClick={addException}
              disabled={!newEx.date}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Exception
            </Button>
          </div>

          {/* Existing exceptions */}
          {exceptions.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Saved Exceptions</label>
              <div className="space-y-2">
                {exceptions
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((ex, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {format(parseISO(ex.date), 'EEE, MMM d')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {ex.is_available === false
                            ? `Out of office${ex.reason ? ` — ${ex.reason}` : ''}`
                            : `Modified: ${ex.working_hours_start}–${ex.working_hours_end}${ex.reason ? ` — ${ex.reason}` : ''}`
                          }
                        </p>
                      </div>
                      <button onClick={() => removeException(ex.date)} className="text-slate-300 hover:text-red-500 ml-3">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t flex gap-3 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}