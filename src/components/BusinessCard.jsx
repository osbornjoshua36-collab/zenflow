import { MapPin, Phone, Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BusinessCard({ business, availability }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 text-lg leading-tight">{business.name}</h3>
            <div className="flex items-center gap-1 mt-1 text-slate-500 text-sm">
              <Briefcase className="w-3.5 h-3.5" />
              <span>{business.industry}</span>
            </div>
          </div>
          {business.logo_url && (
            <img src={business.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover ml-2" />
          )}
        </div>

        {/* Availability badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${availability.color}`}>
            <span className={`w-2 h-2 rounded-full ${availability.dot}`}></span>
            {availability.label}
          </span>
          {availability.count > 0 && (
            <span className="text-xs text-slate-400">{availability.count} job{availability.count !== 1 ? 's' : ''} this week</span>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-1.5 text-sm text-slate-600">
          {business.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{business.phone}</span>
            </div>
          )}
          {business.timezone && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{business.timezone}</span>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <Badge
            className={
              business.status === 'Active' ? 'bg-green-100 text-green-700' :
              business.status === 'Paused' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-600'
            }
          >
            {business.status || 'Active'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}