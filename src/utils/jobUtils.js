/**
 * Append an activity entry to a job's activity log array.
 * Returns the new array (does not mutate).
 */
export const addActivityEntry = (existingActivity, event_type, description, actor = 'system') => {
  const current = Array.isArray(existingActivity) ? existingActivity : [];
  return [
    ...current,
    {
      timestamp: new Date().toISOString(),
      event_type,
      description,
      actor,
    },
  ];
};

/**
 * Format a datetime string for display.
 */
export const formatJobDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Get HH:MM string from a datetime string for <input type="time">.
 */
export const getTimeValue = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};