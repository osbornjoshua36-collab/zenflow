import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function ProtectedAdminRoute() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'admin' | 'denied'

  useEffect(() => {
    base44.auth.me()
      .then(user => setStatus(user?.role === 'admin' ? 'admin' : 'denied'))
      .catch(() => setStatus('denied'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}