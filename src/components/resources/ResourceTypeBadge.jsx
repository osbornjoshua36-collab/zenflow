const LABELS = { staff: 'Staff', space: 'Space', equipment: 'Equipment', vehicle: 'Vehicle', team: 'Team' };
const COLORS = {
  staff: 'bg-blue-100 text-blue-700',
  space: 'bg-purple-100 text-purple-700',
  equipment: 'bg-amber-100 text-amber-700',
  vehicle: 'bg-green-100 text-green-700',
  team: 'bg-slate-100 text-slate-700',
};

export default function ResourceTypeBadge({ type }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${COLORS[type] || COLORS.staff}`}>
      {LABELS[type] || type}
    </span>
  );
}