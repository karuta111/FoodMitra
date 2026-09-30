// web/src/components/shared/brand-logo.tsx
import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4', text: 'text-base' },
  md: { box: 'w-9 h-9 rounded-lg', icon: 'w-5 h-5', text: 'text-lg' },
  lg: { box: 'w-12 h-12 rounded-xl', icon: 'w-7 h-7', text: 'text-2xl' },
};

export function BrandLogo({ size = 'md', showLabel = true, className }: BrandLogoProps) {
  const s = SIZE_MAP[size];
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('bg-orange-500 flex items-center justify-center text-white shadow-sm', s.box)}>
        <UtensilsCrossed className={s.icon} />
      </div>
      {showLabel && (
        <span className={cn('font-semibold text-slate-800', s.text)}>FoodMitra</span>
      )}
    </div>
  );
}
