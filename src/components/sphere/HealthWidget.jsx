import { Moon, Footprints, HeartPulse } from 'lucide-react';

export default function HealthWidget() {
  const stats = [
    { icon: Moon, label: 'sleep', value: '7h', color: 'text-sky' },
    { icon: Footprints, label: 'steps', value: '4.8k', color: 'text-sage' },
    { icon: HeartPulse, label: 'HRV', value: '62', color: 'text-rose' },
  ];

  return (
    <div className="rounded-xl p-4 bg-card border border-border">
      <p className="text-xs font-medium text-muted-foreground">❤️ health today</p>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="text-center">
              <Icon className={`w-4 h-4 mx-auto ${s.color}`} />
              <p className="text-sm font-bold mt-1">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3 bg-sky-light rounded-lg p-2">
        🤖 Good sleep — higher focus today. Schedule deep work now.
      </p>
    </div>
  );
}