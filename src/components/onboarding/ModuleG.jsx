import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, AlertCircle } from 'lucide-react';

export default function ModuleG({ seller, onComplete, onSkip, skipLabel }) {
  const [connected, setConnected] = useState(null); // null | 'google' | 'outlook'
  const [connectedEmail, setConnectedEmail] = useState('');
  const [confirmSwitch, setConfirmSwitch] = useState(null); // which provider user wants to switch to
  const [error, setError] = useState('');

  const handleConnect = async (provider) => {
    setError('');
    if (connected && connected !== provider) {
      setConfirmSwitch(provider);
      return;
    }
    // OAuth would be initiated here via app connectors — stub for now
    setError(`Calendar connection failed. Please try again or skip this step.`);
  };

  const handleConfirmSwitch = () => {
    setConnected(null);
    setConnectedEmail('');
    setConfirmSwitch(null);
    setError('Calendar connection failed. Please try again or skip this step.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>Calendar connect</h2>
        <p className="text-sm text-slate-500">Sync your existing calendar to prevent double-bookings.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Calendar className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">Calendar sync prevents double-bookings by blocking time when you're busy. You can connect any time from Settings.</p>
      </div>

      {confirmSwitch && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800 mb-3">This will replace your {connected === 'google' ? 'Google Calendar' : 'Outlook'} connection. Continue?</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirmSwitch} variant="outline" className="text-xs">Yes, switch</Button>
            <Button size="sm" onClick={() => setConfirmSwitch(null)} variant="ghost" className="text-xs">Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <CalendarOption
          provider="google"
          label="Google Calendar"
          logo="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg"
          isConnected={connected === 'google'}
          connectedEmail={connectedEmail}
          onConnect={() => handleConnect('google')}
          onDisconnect={() => { setConnected(null); setConnectedEmail(''); }}
        />
        <CalendarOption
          provider="outlook"
          label="Microsoft Outlook"
          logo="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018–present%29.svg"
          isConnected={connected === 'outlook'}
          connectedEmail={connectedEmail}
          onConnect={() => handleConnect('outlook')}
          onDisconnect={() => { setConnected(null); setConnectedEmail(''); }}
        />
      </div>

      {error && (
        <div className="flex gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {onSkip && <Button variant="outline" onClick={onSkip} className="flex-1 text-sm">{skipLabel}</Button>}
        <Button onClick={() => onComplete({})} disabled={!connected} className="flex-1" style={connected ? { background: '#E8945A', color: '#fff' } : {}}>
          {connected ? 'Save and continue →' : 'Connect a calendar to continue'}
        </Button>
      </div>
    </div>
  );
}

function CalendarOption({ label, logo, isConnected, connectedEmail, onConnect, onDisconnect }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${isConnected ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-3">
        <img src={logo} alt={label} className="w-7 h-7" />
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          {isConnected && connectedEmail && <p className="text-xs text-green-600">{connectedEmail}</p>}
        </div>
        {isConnected && <CheckCircle className="w-4 h-4 text-green-500" />}
      </div>
      {isConnected ? (
        <button onClick={onDisconnect} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Disconnect</button>
      ) : (
        <Button size="sm" variant="outline" onClick={onConnect} className="text-xs">Connect</Button>
      )}
    </div>
  );
}