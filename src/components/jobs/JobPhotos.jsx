import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PhotoSection({ label, fieldKey, images = [], onUpdate, onActivity }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (images.length + files.length > 5) {
      alert('Maximum 5 photos per section.');
      return;
    }
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    const updated = [...images, ...urls];
    await onUpdate({ [fieldKey]: updated });
    if (onActivity) {
      await onActivity(`${label} added (${urls.length} photo${urls.length > 1 ? 's' : ''})`);
    }
    setUploading(false);
    e.target.value = '';
  };

  const remove = async (url) => {
    await onUpdate({ [fieldKey]: images.filter((u) => u !== url) });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={uploading || images.length >= 5}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            'Uploading…'
          ) : (
            <>
              <Upload className="w-3 h-3" /> Add photos
            </>
          )}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={url}
                alt=""
                className="w-16 h-16 object-cover rounded-lg border border-slate-200"
              />
              <button
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => remove(url)}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center">
          <Image className="w-4 h-4 text-slate-300 mx-auto mb-1" />
          <p className="text-xs text-slate-400">No photos yet</p>
        </div>
      )}
    </div>
  );
}

export default function JobPhotos({ job, onUpdate, onActivity }) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-slate-700">Photos</h3>
      <PhotoSection
        label="Before photos"
        fieldKey="photos_before"
        images={job.photos_before || []}
        onUpdate={onUpdate}
        onActivity={onActivity}
      />
      <PhotoSection
        label="After photos"
        fieldKey="photos_after"
        images={job.photos_after || []}
        onUpdate={onUpdate}
        onActivity={onActivity}
      />
    </div>
  );
}