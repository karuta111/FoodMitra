// web/src/components/shared/promo-carousel.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface PromoBanner {
  id: string;
  imageUrl: string;
  title: string | null;
  displayOrder: number;
  isActive: boolean;
}

const SLIDE_INTERVAL_MS = 5000;
const BACKEND_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

function resolveImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${BACKEND_BASE}${url}`;
  return url;
}

export function PromoCarousel() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PromoBanner[]>('/api/v1/promo-banners')
      .then((r) => setBanners(r || []))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, []);

  const next = useCallback(() => {
    setCurrentIdx((i) => (i + 1) % Math.max(banners.length, 1));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [next, banners.length]);

  useEffect(() => { setCurrentIdx(0); }, [banners]);

  if (loading) {
    return <div className="relative w-full aspect-[16/5] sm:aspect-[16/4] rounded-xl overflow-hidden bg-slate-800 animate-pulse" />;
  }

  if (banners.length === 0) return null;

  if (banners.length === 1) {
    return (
      <div className="relative w-full aspect-[16/5] sm:aspect-[16/4] rounded-xl overflow-hidden bg-slate-800 shadow-sm">
        <img
          src={resolveImageUrl(banners[0].imageUrl)}
          alt={banners[0].title || 'Promo banner'}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/5] sm:aspect-[16/4] rounded-xl overflow-hidden bg-slate-800 shadow-sm group">
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIdx * 100}%)` }}
      >
        {banners.map((b) => (
          <div key={b.id} className="relative w-full h-full flex-shrink-0">
            <img
              src={resolveImageUrl(b.imageUrl)}
              alt={b.title || 'Promo banner'}
              className="w-full h-full object-contain"
              draggable={false}
            />
            {b.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                <p className="text-white text-sm font-medium drop-shadow-sm">{b.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setCurrentIdx((i) => (i - 1 + banners.length) % banners.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-slate-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Previous banner"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-slate-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Next banner"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {banners.map((b, idx) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setCurrentIdx(idx)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              idx === currentIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/80',
            )}
            aria-label={`Go to banner ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
