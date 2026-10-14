// web/src/components/shared/brand-logo.tsx
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { img: 'w-8 h-8 rounded-lg', text: 'text-base' },
  md: { img: 'w-9 h-9 rounded-lg', text: 'text-lg' },
  lg: { img: 'w-12 h-12 rounded-xl', text: 'text-2xl' },
};

export function BrandLogo({ size = 'md', showLabel = true, className }: BrandLogoProps) {
  const s = SIZE_MAP[size];
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="FoodMitra" className={cn('object-cover shadow-sm', s.img)} />
      {showLabel && (
        <span className={cn('font-semibold text-slate-800', s.text)}>FoodMitra</span>
      )}
    </div>
  );
}
