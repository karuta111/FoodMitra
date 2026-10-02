// src/components/shared/logo-uploader.tsx
'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { toastApiError } from '@/lib/toast-errors';
import { toast } from 'sonner';

interface LogoUploaderProps {
  /** Current logo URL (null = no logo yet). */
  value: string | null;
  /** Called with the uploaded Cloudinary URL once the upload completes. Pass null to clear. */
  onChange: (url: string | null) => void;
  /** Fallback letter shown in the placeholder when there's no logo. */
  fallbackLetter?: string;
  /** Upload endpoint — defaults to /api/v1/admin/upload. */
  uploadPath?: string;
  /** Square size in px — defaults to 80. */
  size?: number;
  /** Label shown beside the uploader. Defaults to "Restaurant photo". */
  label?: string;
  /** Hint shown under the label. Defaults to the restaurant hint. */
  hint?: string;
  className?: string;
}

/**
 * Square logo uploader with preview.
 * - Click the square (or the camera button) to pick a file.
 * - The file is read as base64 and POSTed to the upload endpoint (Cloudinary on the backend).
 * - On success, onChange is called with the returned URL and the preview updates instantly.
 * - An X button in the top-right corner clears the logo (calls onChange(null)).
 */
export function LogoUploader({
  value,
  onChange,
  fallbackLetter = 'R',
  uploadPath = '/api/v1/admin/upload',
  size = 80,
  label = 'Restaurant photo',
  hint = 'Shown to customers in the restaurant list. PNG / JPG / WebP, under 4 MB.',
  className,
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please pick an image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image is too large — please pick one under 4 MB.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });
      const result = await api.post<{ url: string }>(uploadPath, { imageDataUrl: dataUrl });
      onChange(result.url);
      toast.success('Photo uploaded');
    } catch (e) {
      toastApiError(e, 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative group" style={{ width: size, height: size }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50 flex items-center justify-center overflow-hidden transition-colors shrink-0 disabled:opacity-60"
          aria-label={label}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : uploading ? (
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-slate-400">
              <Camera className="w-4 h-4" />
              <span className="text-[10px] font-medium">Upload</span>
            </div>
          )}
        </button>
        {/* Clear button — only when there's a logo */}
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 hover:bg-red-600 text-white flex items-center justify-center shadow-sm transition-colors"
            aria-label="Remove photo"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        {/* Fallback letter overlay shown briefly when there's no logo + not uploading */}
        {!value && !uploading && fallbackLetter && (
          <span className="absolute inset-0 flex items-center justify-center font-bold text-orange-200 pointer-events-none select-none" style={{ fontSize: size * 0.35 }}>
            {fallbackLetter.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-500">{hint}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
